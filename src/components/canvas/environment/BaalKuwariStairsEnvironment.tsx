'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ConnectedHillTerrain,
  buildConnectedHillGeometry,
} from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { DevotionalGate } from './DevotionalGate';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { createTerrainMeshSampler } from '@/lib/terrainMeshSampler';

/**
 * Total logical step count displayed cleanly across 4 winding mountain hillside flights.
 */
export const BAAL_KUWARI_TOTAL_STEPS = 400;

interface StairWaypoint {
  x: number;
  y: number;
  z: number;
  kind: 'flight' | 'landing';
  stepsAtEnd: number;
}

const WAYPOINTS: readonly StairWaypoint[] = [
  // Base arrival pad meeting forest footpath
  { x: 0, y: 0, z: 2.8, kind: 'landing', stepsAtEnd: 0 },
  { x: 0, y: 0, z: 0, kind: 'landing', stepsAtEnd: 0 },
  // Flight 1 (0 -> 100): Angles NW up wooded mountain shoulder
  { x: -7.2, y: 6.0, z: -20.5, kind: 'flight', stepsAtEnd: 100 },
  // Bend Landing 100: Flat rest terrace turning toward NE ridge
  { x: -6.0, y: 6.0, z: -25.6, kind: 'landing', stepsAtEnd: 100 },
  // Flight 2 (100 -> 200): Sweeps NE across forested slope
  { x: 2.6, y: 12.6, z: -44.8, kind: 'flight', stepsAtEnd: 200 },
  // Bend Landing 200: Scenic overlook plateau (Milestone Checkpoint + Polaroid spot)
  { x: 3.2, y: 12.6, z: -50.4, kind: 'landing', stepsAtEnd: 200 },
  // Flight 3 (200 -> 300): Steeper rocky pitch climbing back NW
  { x: -6.2, y: 20.4, z: -69.8, kind: 'flight', stepsAtEnd: 300 },
  // Bend Landing 300: High mountain terrace beneath prayer flags
  { x: -5.1, y: 20.4, z: -75.0, kind: 'landing', stepsAtEnd: 300 },
  // Flight 4 (300 -> 400): Final winding ascent cresting to hilltop temple arch
  { x: 0.4, y: 27.2, z: -95.8, kind: 'flight', stepsAtEnd: 400 },
  // Summit Gate Terrace (Step 400)
  { x: 0.4, y: 27.2, z: -102.2, kind: 'landing', stepsAtEnd: 400 },
];

export interface StairSegmentSpec {
  index: number;
  kind: 'flight' | 'landing';
  xStart: number;
  yStart: number;
  zStart: number;
  xEnd: number;
  yEnd: number;
  zEnd: number;
  len2D: number;
  sStart: number;
  sEnd: number;
  ux: number; // unit forward X toward uphill (-Z overall)
  uz: number; // unit forward Z toward uphill
  rx: number; // unit right X perpendicular to path (`-uz`)
  rz: number; // unit right Z perpendicular to path (`+ux`)
  yaw: number; // Y rotation aligning local `-Z` onto `(ux, uz)`
  halfWidth: number;
  stepsAtStart: number;
  stepsAtEnd: number;
}

export const STAIR_SEGMENTS: readonly StairSegmentSpec[] = (() => {
  const list: StairSegmentSpec[] = [];
  let accumS = -2.8;
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2D = Math.max(0.01, Math.hypot(dx, dz));
    const ux = dx / len2D;
    const uz = dz / len2D;
    // Right perpendicular to (ux, uz) in Three.js XZ plane (`forward (0,-1) => right (1,0)`): (-uz, ux)
    const rx = -uz;
    const rz = ux;
    const yaw = Math.atan2(-ux, -uz);
    const kind = b.kind;
    const sStart = accumS;
    const sEnd = accumS + len2D;
    accumS = sEnd;

    list.push({
      index: i,
      kind,
      xStart: a.x,
      yStart: a.y,
      zStart: a.z,
      xEnd: b.x,
      yEnd: b.y,
      zEnd: b.z,
      len2D,
      sStart,
      sEnd,
      ux,
      uz,
      rx,
      rz,
      yaw,
      halfWidth: kind === 'landing' ? (b.stepsAtEnd >= 400 ? 3.25 : 2.55) : 1.38,
      stepsAtStart: a.stepsAtEnd,
      stepsAtEnd: b.stepsAtEnd,
    });
  }
  return list;
})();

export const STAIR_TOTAL_S = STAIR_SEGMENTS[STAIR_SEGMENTS.length - 1].sEnd;
export const STAIR_MIN_S = -2.2;
export const STAIR_MAX_S = STAIR_TOTAL_S - 1.2;

export interface StairProjection {
  seg: StairSegmentSpec;
  s: number;
  t: number;
  centerX: number;
  centerZ: number;
  heightY: number;
  lateralSigned: number;
  perpDist: number;
  halfWidth: number;
  tangentX: number;
  tangentZ: number;
  rightX: number;
  rightZ: number;
}

/**
 * Projects any world `(x, z)` cleanly onto the winding multi-flight hillside staircase polyline.
 */
export function projectPointOntoStairPath(wx: number, wz: number): StairProjection {
  let bestDistSq = Number.POSITIVE_INFINITY;
  let bestProj: StairProjection | null = null;

  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    const vx = wx - seg.xStart;
    const vz = wz - seg.zStart;
    const rawDot = vx * seg.ux + vz * seg.uz;
    const clampedProj = THREE.MathUtils.clamp(rawDot, 0, seg.len2D);
    const t = clampedProj / seg.len2D;
    const cx = seg.xStart + seg.ux * clampedProj;
    const cz = seg.zStart + seg.uz * clampedProj;
    const dx = wx - cx;
    const dz = wz - cz;
    const distSq = dx * dx + dz * dz;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      const latSigned = dx * seg.rx + dz * seg.rz;
      bestProj = {
        seg,
        s: THREE.MathUtils.lerp(seg.sStart, seg.sEnd, t),
        t,
        centerX: cx,
        centerZ: cz,
        heightY: THREE.MathUtils.lerp(seg.yStart, seg.yEnd, t),
        lateralSigned: latSigned,
        perpDist: Math.sqrt(distSq),
        halfWidth: seg.halfWidth,
        tangentX: seg.ux,
        tangentZ: seg.uz,
        rightX: seg.rx,
        rightZ: seg.rz,
      };
    }
  }

  return bestProj!;
}

/**
 * Evaluates smooth blended world transform along the winding staircase path distance `s`.
 * Interpolates yaw gently across ±1.6m around landing bends (`0.00m` lateral jump on corners).
 */
export function sampleStairTransformAtS(s: number): {
  x: number;
  y: number;
  z: number;
  yaw: number;
  ux: number;
  uz: number;
  rx: number;
  rz: number;
  kind: 'flight' | 'landing';
} {
  if (s <= STAIR_SEGMENTS[0].sStart) {
    const seg = STAIR_SEGMENTS[0];
    return {
      x: seg.xStart,
      y: seg.yStart,
      z: seg.zStart,
      yaw: seg.yaw,
      ux: seg.ux,
      uz: seg.uz,
      rx: seg.rx,
      rz: seg.rz,
      kind: seg.kind,
    };
  }
  const blendHalfSpan = 1.6;
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (s <= seg.sEnd || i === STAIR_SEGMENTS.length - 1) {
      const t = THREE.MathUtils.clamp((s - seg.sStart) / seg.len2D, 0, 1);
      const x = THREE.MathUtils.lerp(seg.xStart, seg.xEnd, t);
      const y = THREE.MathUtils.lerp(seg.yStart, seg.yEnd, t);
      const z = THREE.MathUtils.lerp(seg.zStart, seg.zEnd, t);
      let yaw = seg.yaw;

      // Smoothly blend yaw across transition boundaries into adjacent segment
      if (i > 0 && s - seg.sStart < blendHalfSpan) {
        const prev = STAIR_SEGMENTS[i - 1];
        const blend = smoothStep01((s - seg.sStart + blendHalfSpan) / (blendHalfSpan * 2));
        let diff = seg.yaw - prev.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw = prev.yaw + diff * blend;
      } else if (i < STAIR_SEGMENTS.length - 1 && seg.sEnd - s < blendHalfSpan) {
        const next = STAIR_SEGMENTS[i + 1];
        const blend = smoothStep01((s - (seg.sEnd - blendHalfSpan)) / (blendHalfSpan * 2));
        let diff = next.yaw - seg.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw = seg.yaw + diff * blend;
      }

      const ux = -Math.sin(yaw);
      const uz = -Math.cos(yaw);
      const rx = -uz;
      const rz = ux;
      return {
        x,
        y,
        z,
        yaw,
        ux,
        uz,
        rx,
        rz,
        kind: seg.kind,
      };
    }
  }
  const last = STAIR_SEGMENTS[STAIR_SEGMENTS.length - 1];
  return {
    x: last.xEnd,
    y: last.yEnd,
    z: last.zEnd,
    yaw: last.yaw,
    ux: last.ux,
    uz: last.uz,
    rx: last.rx,
    rz: last.rz,
    kind: last.kind,
  };
}

export function isOnStairFlightAtS(s: number): boolean {
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (seg.kind === 'flight' && s > seg.sStart + 0.15 && s < seg.sEnd - 0.15) {
      return true;
    }
  }
  return false;
}

export function computeStepCountFromS(s: number): number {
  if (s <= 0) return 0;
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (s <= seg.sEnd) {
      if (seg.kind === 'landing') return seg.stepsAtEnd;
      const t = THREE.MathUtils.clamp((s - seg.sStart) / seg.len2D, 0, 1);
      return Math.round(THREE.MathUtils.lerp(seg.stepsAtStart, seg.stepsAtEnd, t));
    }
  }
  return BAAL_KUWARI_TOTAL_STEPS;
}

export function getTransformForMilestoneStep(step: number): {
  x: number;
  y: number;
  z: number;
  yaw: number;
  s: number;
} {
  const targetStep = step >= 300 ? 300 : step >= 200 ? 200 : step >= 100 ? 100 : 0;
  const match = STAIR_SEGMENTS.find(
    (seg) => seg.kind === 'landing' && seg.stepsAtEnd === targetStep
  );
  const seg = match ?? STAIR_SEGMENTS[0];
  const s = (seg.sStart + seg.sEnd) * 0.5;
  const pt = sampleStairTransformAtS(s);
  return { x: pt.x, y: pt.y, z: pt.z, yaw: pt.yaw, s };
}

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Smooth hillside terrain height sculpted beneath and flanking every turn of the staircase
 * without piecewise edge cliffs so vertex triangles and foliage placement stay continuous.
 */
function sampleStairTerrainY(wx: number, wz: number): number {
  const proj = projectPointOntoStairPath(wx, wz);
  const clearInner = proj.halfWidth + 0.55;
  const sideDist = Math.max(0, proj.perpDist - clearInner);
  const slopeBlend = smoothStep01(sideDist / 2.2);
  const smoothSide = Math.max(0, sideDist - 0.4) * slopeBlend;
  const ridgeWave =
    Math.sin(wz * 0.12 + wx * 0.11) * 0.62 + Math.cos(wz * 0.08 - wx * 0.09) * 0.42;

  // Smooth lateral slope blending without discrete +/- cliff jumps near path axis
  const lateralSlopeWeight = THREE.MathUtils.clamp(-proj.lateralSigned / 2.8, -1, 1);
  const offsetDelta = lateralSlopeWeight * 0.46 * smoothSide;
  const baseDrop = -0.34 - (1 - Math.abs(lateralSlopeWeight)) * 0.12 * slopeBlend;

  return proj.heightY + baseDrop + offsetDelta + ridgeWave * 0.4 * slopeBlend;
}

const _rockSkirt = new THREE.Color('#6a645a');
const _mossSlope = new THREE.Color('#3b5d37');
const _pineShade = new THREE.Color('#2c4a2d');

function sampleStairTerrainColor(wx: number, wz: number, _h: number, out: THREE.Color): void {
  const proj = projectPointOntoStairPath(wx, wz);
  const nearSteps = 1 - smoothStep01((proj.perpDist - proj.halfWidth) / 2.8);
  const mottle = Math.sin(wx * 0.35 + wz * 0.32) * 0.5 + 0.5;
  out.copy(_mossSlope).lerp(_pineShade, mottle * 0.55);
  out.lerp(_rockSkirt, nearSteps * 0.85);
}

const STAIRS_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-68, 12, -88], scale: [48, 30, 40], rotationY: 0.25, color: '#3e5e4b' },
  { position: [76, -4, -64], scale: [52, 30, 42], rotationY: -0.32, color: '#587892' },
  { position: [90, 2, -118], scale: [64, 38, 48], rotationY: -0.18, color: '#6b8ba4' },
  { position: [-18, 18, -158], scale: [74, 40, 44], rotationY: 0.06, color: '#476a56' },
];

const MAX_PINE_TREES = 115;
const MAX_STAIR_BOULDERS = STAIR_SEGMENTS.length * 2;
const MAX_STAIR_POSTS = 24;
const MAX_STAIR_TREADS = 4 * 42;
const FLAG_COLORS = ['#ef4444', '#f59e0b', '#f8fafc', '#22c55e', '#3b82f6'];

function RoadsideWaterStall({
  position,
  rotationY = 0,
  castShadow = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  castShadow?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Stone / Timber foundation pad */}
      <mesh position={[0, -0.05, 0]} receiveShadow={castShadow}>
        <boxGeometry args={[1.9, 0.1, 1.5]} />
        <meshStandardMaterial color="#4a3f35" roughness={0.92} />
      </mesh>

      {/* Main wooden stall counter */}
      <mesh position={[0, 0.42, 0.15]} castShadow={castShadow} receiveShadow={castShadow}>
        <boxGeometry args={[1.65, 0.84, 0.65]} />
        <meshStandardMaterial color="#6b4423" roughness={0.88} />
      </mesh>
      {/* Counter top shelf */}
      <mesh position={[0, 0.85, 0.15]} castShadow={castShadow}>
        <boxGeometry args={[1.75, 0.04, 0.75]} />
        <meshStandardMaterial color="#50331a" roughness={0.82} />
      </mesh>

      {/* 4 Canopy Support Poles */}
      {[-0.78, 0.78].map((px) =>
        [-0.45, 0.45].map((pz) => (
          <mesh key={`pole-${px}-${pz}`} position={[px, 1.15, pz]} castShadow={castShadow}>
            <cylinderGeometry args={[0.035, 0.035, 2.3, 8]} />
            <meshStandardMaterial color="#543722" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Canvas Awning / Canopy */}
      <mesh position={[0, 2.3, 0]} rotation={[-0.1, 0, 0]} castShadow={castShadow}>
        <boxGeometry args={[1.9, 0.04, 1.6]} />
        <meshStandardMaterial color="#166534" roughness={0.85} />
      </mesh>
      {/* Front scalloped / hanging awning flap */}
      <mesh position={[0, 2.2, 0.78]} castShadow={castShadow}>
        <boxGeometry args={[1.9, 0.22, 0.03]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.85} />
      </mesh>

      {/* Wooden crate with water bottles on counter */}
      <mesh position={[-0.42, 0.94, 0.15]} castShadow={castShadow}>
        <boxGeometry args={[0.55, 0.14, 0.38]} />
        <meshStandardMaterial color="#854d0e" roughness={0.9} />
      </mesh>

      {/* Crate Water Bottles */}
      {[-0.18, -0.06, 0.06, 0.18].map((bx, bIdx) =>
        [-0.1, 0.1].map((bz, zIdx) => (
          <group key={`crate-bot-${bIdx}-${zIdx}`} position={[-0.42 + bx, 1.05, 0.15 + bz]}>
            <mesh castShadow={castShadow}>
              <cylinderGeometry args={[0.038, 0.038, 0.22, 10]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.2} transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.035, 8]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
            </mesh>
          </group>
        ))
      )}

      {/* Standalone cold water bottles & packaged snacks on right counter */}
      <group position={[0.42, 0.98, 0.15]}>
        <mesh position={[-0.1, 0, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.042, 0.042, 0.24, 10]} />
          <meshStandardMaterial color="#0284c7" roughness={0.18} transparent opacity={0.9} />
        </mesh>
        <mesh position={[-0.1, 0.13, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.035, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0, 0.04]} castShadow={castShadow}>
          <cylinderGeometry args={[0.042, 0.042, 0.24, 10]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} transparent opacity={0.85} />
        </mesh>
        {/* Biscuits / Glucose snack pack */}
        <mesh position={[0.08, -0.04, -0.12]} castShadow={castShadow}>
          <boxGeometry args={[0.22, 0.08, 0.12]} />
          <meshStandardMaterial color="#eab308" roughness={0.7} />
        </mesh>
      </group>

      {/* Local Pahadi Stallkeeper standing behind counter */}
      <group position={[0, 0, -0.32]}>
        {/* Body / Kurta */}
        <mesh position={[0, 0.9, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.18, 0.16, 0.65, 10]} />
          <meshStandardMaterial color="#991b1b" roughness={0.85} />
        </mesh>
        {/* Pahadi cap / Topi */}
        <mesh position={[0, 1.34, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.12, 0.12, 0.12, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.25, 0]} castShadow={castShadow}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.75} />
        </mesh>
      </group>

      {/* Wooden Signboard */}
      <mesh position={[0, 2.5, 0.05]} castShadow={castShadow}>
        <boxGeometry args={[1.3, 0.26, 0.04]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </mesh>
    </group>
  );
}

export interface BaalKuwariStairsEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  canEnterSummit: boolean;
  canCaptureLandingPhoto?: boolean;
  assistBeaconPos?: readonly [number, number, number] | null;
}

/**
 * Winding forested hillside Baal Kuwari staircase (~400 steps across 4 turned mountain flights
 * with rest landings, boulder outcrops, overhead prayer flags, and grounded forest slopes).
 */
export function BaalKuwariStairsEnvironment({
  qualityProfile,
  paused,
  canEnterSummit,
  canCaptureLandingPhoto = false,
  assistBeaconPos = null,
}: BaalKuwariStairsEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_PINE_TREES, Math.round(MAX_PINE_TREES * densityRatio));

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);
  const boulderInstRef = useRef<THREE.InstancedMesh>(null);
  const postInstRef = useRef<THREE.InstancedMesh>(null);
  const treadInstRef = useRef<THREE.InstancedMesh>(null);
  const flagRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phaseRef = useRef(0);

  const flightMeshes = useMemo(() => {
    return STAIR_SEGMENTS.filter((seg) => seg.kind === 'flight').map((seg) => {
      const stepsVisual = 42;
      const dy = seg.yEnd - seg.yStart;
      const hyp = Math.hypot(seg.len2D, dy);
      const pitch = Math.atan2(dy, seg.len2D);
      const midX = (seg.xStart + seg.xEnd) * 0.5;
      const midY = (seg.yStart + seg.yEnd) * 0.5;
      const midZ = (seg.zStart + seg.zEnd) * 0.5;

      const treads: Array<{ localY: number; localZ: number }> = [];
      for (let s = 0; s < stepsVisual; s += 1) {
        const frac = (s + 0.5) / stepsVisual;
        treads.push({
          localY: THREE.MathUtils.lerp(seg.yStart, seg.yEnd, frac) - midY,
          localZ: (0.5 - frac) * seg.len2D,
        });
      }
      return { seg, hyp, pitch, midX, midY, midZ, treads };
    });
  }, []);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 98,
        depth: 136,
        centerX: 0,
        centerZ: -50,
        segX: 76,
        segZ: 96,
        heightFn: sampleStairTerrainY,
        colorFn: sampleStairTerrainColor,
      }),
    []
  );

  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  const terrainSampler = useMemo(
    () => createTerrainMeshSampler([terrainGeometry], 3.0),
    [terrainGeometry]
  );

  const pinePlacements = useMemo(() => {
    const list: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINE_TREES * 3 && list.length < MAX_PINE_TREES; i += 1) {
      const z = 4 - ((i * 0.78) % 112);
      const side = i % 2 === 0 ? -1 : 1;
      const baseProj = sampleStairTransformAtS(Math.max(0, Math.min(STAIR_TOTAL_S, -z)));
      const offset = 3.9 + (i % 7) * 3.1 + ((i * 5) % 4) * 0.5;
      const x = baseProj.x + side * offset;

      // Guarantee zero overlap against turned flight segments or landings
      const actualProj = projectPointOntoStairPath(x, z);
      if (actualProj.perpDist < actualProj.halfWidth + 2.5) continue;

      const meshY = terrainSampler.trySampleY(x, z);
      if (meshY === null) continue;

      const scale = 0.85 + ((i * 13) % 8) * 0.075;
      // Anchor squarely on the rendered mesh triangle height (0.00m analytic divergence)
      list.push([x, meshY - 0.12 * scale, z, scale]);
    }
    return list;
  }, [terrainSampler]);

  const landingBoulders = useMemo(() => {
    const rocks: Array<{ pos: [number, number, number]; scale: [number, number, number]; yaw: number }> = [];
    STAIR_SEGMENTS.forEach((seg, sIdx) => {
      [-1, 1].forEach((side) => {
        const x = seg.xEnd + seg.rx * side * (seg.halfWidth + 1.35);
        const z = seg.zEnd + seg.rz * side * (seg.halfWidth + 1.35);
        const y = terrainSampler.sampleY(x, z, sampleStairTerrainY(x, z)) + 0.14;
        rocks.push({
          pos: [x, y, z],
          scale: [0.95 + (sIdx % 3) * 0.2, 0.72, 0.88],
          yaw: sIdx * 0.7 + side,
        });
      });
    });
    return rocks;
  }, [terrainSampler]);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    const count = Math.min(pineCount, pinePlacements.length);
    trunkInstRef.current.count = count;
    crownInstRef.current.count = count;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const [x, y, z, s] = pinePlacements[i];
      dummy.position.set(x, y + 0.92 * s, z);
      dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.55 * s, z);
      dummy.updateMatrix();
      crownInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    crownInstRef.current.instanceMatrix.needsUpdate = true;
  }, [pineCount, pinePlacements]);

  useEffect(() => {
    const dummy = new THREE.Object3D();

    if (boulderInstRef.current) {
      const count = Math.min(MAX_STAIR_BOULDERS, landingBoulders.length);
      boulderInstRef.current.count = count;
      for (let i = 0; i < count; i += 1) {
        const rock = landingBoulders[i];
        dummy.position.set(rock.pos[0], rock.pos[1], rock.pos[2]);
        dummy.rotation.set(0.1, rock.yaw, 0.08);
        dummy.scale.set(rock.scale[0], rock.scale[1], rock.scale[2]);
        dummy.updateMatrix();
        boulderInstRef.current.setMatrixAt(i, dummy.matrix);
      }
      boulderInstRef.current.instanceMatrix.needsUpdate = true;
    }

    if (postInstRef.current && treadInstRef.current) {
      const flightMat = new THREE.Matrix4();
      const pitchMat = new THREE.Matrix4();
      const localMat = new THREE.Matrix4();
      const composedMat = new THREE.Matrix4();
      const lightStone = new THREE.Color('#9e9280');
      const darkStone = new THREE.Color('#918573');

      let postIdx = 0;
      let treadIdx = 0;
      for (let f = 0; f < flightMeshes.length; f += 1) {
        const { seg, hyp, pitch, midX, midY, midZ, treads } = flightMeshes[f];
        flightMat.makeRotationY(seg.yaw);
        flightMat.setPosition(midX, midY, midZ);
        pitchMat.makeRotationX(pitch);

        const uStops = [-0.38, 0, 0.38];
        const rxStops = [-1.5, 1.5];
        for (let ui = 0; ui < uStops.length; ui += 1) {
          for (let ri = 0; ri < rxStops.length; ri += 1) {
            if (postIdx >= MAX_STAIR_POSTS) break;
            localMat.makeTranslation(rxStops[ri], 0.45, uStops[ui] * hyp);
            composedMat.multiplyMatrices(flightMat, pitchMat).multiply(localMat);
            postInstRef.current.setMatrixAt(postIdx, composedMat);
            postIdx += 1;
          }
        }

        for (let tIdx = 0; tIdx < treads.length; tIdx += 1) {
          if (treadIdx >= MAX_STAIR_TREADS) break;
          const tread = treads[tIdx];
          localMat.makeTranslation(0, tread.localY - 0.05, tread.localZ);
          composedMat.multiplyMatrices(flightMat, localMat);
          treadInstRef.current.setMatrixAt(treadIdx, composedMat);
          treadInstRef.current.setColorAt(treadIdx, tIdx % 2 === 0 ? lightStone : darkStone);
          treadIdx += 1;
        }
      }
      postInstRef.current.count = postIdx;
      postInstRef.current.instanceMatrix.needsUpdate = true;
      treadInstRef.current.count = treadIdx;
      treadInstRef.current.instanceMatrix.needsUpdate = true;
      if (treadInstRef.current.instanceColor) {
        treadInstRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [flightMeshes, landingBoulders]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    phaseRef.current += Math.min(rawDelta, 0.05);
    const t = phaseRef.current;
    for (let i = 0; i < flagRefs.current.length; i += 1) {
      const flag = flagRefs.current[i];
      if (!flag) continue;
      flag.rotation.x = Math.sin(t * 4.2 + i * 0.5) * 0.2;
    }
  });

  const landingSpecs = STAIR_SEGMENTS.filter((s) => s.kind === 'landing');
  const step200Spot = getTransformForMilestoneStep(200);
  const waterSpot = sampleStairTransformAtS(THREE.MathUtils.lerp(STAIR_SEGMENTS[1].sStart, STAIR_SEGMENTS[1].sEnd, 0.30));
  const summitSpot = getTransformForMilestoneStep(400);
  const summitWaypoint = WAYPOINTS[WAYPOINTS.length - 1];

  return (
    <group>
      <color attach="background" args={['#b9d9ee']} />
      <fog attach="fog" args={['#cfe4f5', 45, 160]} />

      <hemisphereLight args={['#eef6ff', '#4b5f47', 0.96]} />
      <directionalLight
        position={[24, 48, 12]}
        intensity={1.72}
        color="#ffefd1"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={5}
        shadow-camera-far={160}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
      />

      {/* Contoured Mountain Hillside Terrain tightly sculpted around winding stair turns */}
      <ConnectedHillTerrain
        geometry={terrainGeometry}
        width={98}
        depth={136}
        centerX={0}
        centerZ={-50}
        segX={76}
        segZ={96}
        heightFn={sampleStairTerrainY}
        colorFn={sampleStairTerrainColor}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={STAIRS_RIDGES} />

      {/* Instanced Natural Boulders Anchoring Turn Landings */}
      <instancedMesh
        ref={boulderInstRef}
        args={[undefined, undefined, MAX_STAIR_BOULDERS]}
        castShadow={shadowsEnabled}
        receiveShadow={shadowsEnabled}
      >
        <dodecahedronGeometry args={[0.75, 0]} />
        <meshStandardMaterial color="#676f78" roughness={0.95} flatShading />
      </instancedMesh>

      {/* Instanced Railing Posts & 168 Stone Treads Across All 4 Flights */}
      <instancedMesh
        ref={postInstRef}
        args={[undefined, undefined, MAX_STAIR_POSTS]}
        castShadow={shadowsEnabled}
      >
        <boxGeometry args={[0.1, 0.95, 0.1]} />
        <meshStandardMaterial color="#78716c" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={treadInstRef}
        args={[undefined, undefined, MAX_STAIR_TREADS]}
        receiveShadow={shadowsEnabled}
      >
        <boxGeometry args={[2.95, 0.18, 0.58]} />
        <meshStandardMaterial color="#ffffff" roughness={0.93} />
      </instancedMesh>

      {/* Winding Angled Flights with Deep Hillside Masonry Skirts & Handrails */}
      {flightMeshes.map(({ seg, hyp, pitch, midX, midY, midZ }, idx) => (
        <group key={`flight-${idx}`} position={[midX, midY, midZ]} rotation={[0, seg.yaw, 0]}>
          {/* Solid pitched masonry stringer & deep foundation embedding cleanly into mountain slope */}
          <group rotation={[pitch, 0, 0]}>
            <mesh position={[0, -1.25, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[3.35, 2.5, hyp + 0.9]} />
              <meshStandardMaterial color="#685e50" roughness={0.95} />
            </mesh>
            {[-1.5, 1.5].map((rx) => (
              <mesh key={rx} position={[rx, 0.95, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[0.09, 0.08, hyp]} />
                <meshStandardMaterial color="#b45309" roughness={0.75} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Flat Turned Rest Landings (Start, 100, 200, 300, 400 Summit) w/ Deep Plinths, Benches & Prayer Flags */}
      {landingSpecs.map((seg, idx) => {
        const midX = (seg.xStart + seg.xEnd) * 0.5;
        const midZ = (seg.zStart + seg.zEnd) * 0.5;
        const halfW = seg.stepsAtEnd >= 400 ? 3.85 : 2.95;
        const deckLen = seg.len2D + 1.4;
        return (
          <group
            key={`landing-${idx}`}
            position={[midX, seg.yStart, midZ]}
            rotation={[0, seg.yaw, 0]}
          >
            {/* Deep grounded terrace plinth */}
            <mesh position={[0, -1.65, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[halfW * 2, 3.3, deckLen]} />
              <meshStandardMaterial color="#706454" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.02, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[halfW * 2 - 0.15, 0.1, deckLen - 0.15]} />
              <meshStandardMaterial color="#a89b87" roughness={0.9} />
            </mesh>

            {seg.stepsAtEnd > 0 && seg.stepsAtEnd < 400 && (
              <>
                <group position={[2.0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                  <mesh position={[0, 0.42, 0]} castShadow={shadowsEnabled}>
                    <boxGeometry args={[1.65, 0.08, 0.52]} />
                    <meshStandardMaterial color="#8c5e42" roughness={0.86} />
                  </mesh>
                  {[-0.65, 0.65].map((bx) => (
                    <mesh key={bx} position={[bx, 0.21, 0]}>
                      <boxGeometry args={[0.14, 0.42, 0.44]} />
                      <meshStandardMaterial color="#57534e" roughness={0.92} />
                    </mesh>
                  ))}
                </group>
                {[-2.35, 2.35].map((px) => (
                  <mesh key={px} position={[px, 1.45, 0]} castShadow={shadowsEnabled}>
                    <cylinderGeometry args={[0.045, 0.055, 2.9, 8]} />
                    <meshStandardMaterial color="#5c4033" roughness={0.9} />
                  </mesh>
                ))}
                {FLAG_COLORS.map((color, fIdx) => (
                  <mesh
                    key={`${idx}-${color}`}
                    ref={(el) => {
                      flagRefs.current[idx * 5 + fIdx] = el;
                    }}
                    position={[-1.6 + fIdx * 0.8, 2.65, 0]}
                  >
                    <planeGeometry args={[0.42, 0.28]} />
                    <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.82} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        );
      })}

      {/* Roadside Cold Water & Refreshment Stall at Flight 1, Step ~30 */}
      <RoadsideWaterStall
        position={[waterSpot.x - waterSpot.rx * 2.1, waterSpot.y, waterSpot.z - waterSpot.rz * 2.1]}
        rotationY={waterSpot.yaw}
        castShadow={shadowsEnabled}
      />

      <DevotionalGate position={[WAYPOINTS[0].x, WAYPOINTS[0].y, WAYPOINTS[0].z]} />
      <DevotionalGate position={[summitWaypoint.x, summitWaypoint.y, summitWaypoint.z - 1.2]} />
      {/* Summit Archway crowning Step 400 */}
      <group position={[summitWaypoint.x, summitWaypoint.y, summitWaypoint.z]}>
        <mesh position={[-1.8, 1.6, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.65, 3.2, 0.65]} />
          <meshStandardMaterial color="#9e8e7b" roughness={0.88} />
        </mesh>
        <mesh position={[1.8, 1.6, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.65, 3.2, 0.65]} />
          <meshStandardMaterial color="#9e8e7b" roughness={0.88} />
        </mesh>
        <mesh position={[0, 3.35, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.6, 0.65, 0.78]} />
          <meshStandardMaterial color="#d97706" roughness={0.78} />
        </mesh>
        <mesh position={[0, 3.9, 0]}>
          <coneGeometry args={[0.25, 0.65, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>

      {/* Instanced Flanking Forest Pines (deeper trunks anchor cleanly on sloped terrain) */}
      <instancedMesh
        ref={trunkInstRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5c4033" roughness={0.94} />
      </instancedMesh>
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.4, 3.65, 7]} />
        <meshStandardMaterial color="#275036" roughness={0.88} />
      </instancedMesh>

      <HotspotBeaconSparkle
        position={[summitSpot.x, summitSpot.y + 0.15, summitSpot.z]}
        visible={canEnterSummit}
        color="#f59e0b"
        height={1.15}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[step200Spot.x - 1.5, step200Spot.y + 0.1, step200Spot.z]}
        visible={canCaptureLandingPhoto}
        color="#38bdf8"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      {assistBeaconPos && (
        <HotspotBeaconSparkle
          position={assistBeaconPos}
          visible
          color="#34d399"
          height={1.05}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}
