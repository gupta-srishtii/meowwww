'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ConnectedHillTerrain } from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Total logical step count displayed cleanly across 4 playable mountain staircase segments.
 */
export const BAAL_KUWARI_TOTAL_STEPS = 400;

interface StairSegmentSpec {
  zStart: number; // downhill edge (less negative Z)
  zEnd: number; // uphill edge (more negative Z)
  yStart: number;
  yEnd: number;
  kind: 'flight' | 'landing';
  stepsAtStart: number;
  stepsAtEnd: number;
}

export const STAIR_SEGMENTS: readonly StairSegmentSpec[] = [
  { zStart: 2.5, zEnd: 0, yStart: 0, yEnd: 0, kind: 'landing', stepsAtStart: 0, stepsAtEnd: 0 },
  { zStart: 0, zEnd: -21, yStart: 0, yEnd: 6.3, kind: 'flight', stepsAtStart: 0, stepsAtEnd: 100 },
  { zStart: -21, zEnd: -26, yStart: 6.3, yEnd: 6.3, kind: 'landing', stepsAtStart: 100, stepsAtEnd: 100 },
  { zStart: -26, zEnd: -47, yStart: 6.3, yEnd: 12.6, kind: 'flight', stepsAtStart: 100, stepsAtEnd: 200 },
  { zStart: -47, zEnd: -52, yStart: 12.6, yEnd: 12.6, kind: 'landing', stepsAtStart: 200, stepsAtEnd: 200 },
  { zStart: -52, zEnd: -73, yStart: 12.6, yEnd: 18.9, kind: 'flight', stepsAtStart: 200, stepsAtEnd: 300 },
  { zStart: -73, zEnd: -78, yStart: 18.9, yEnd: 18.9, kind: 'landing', stepsAtStart: 300, stepsAtEnd: 300 },
  { zStart: -78, zEnd: -99, yStart: 18.9, yEnd: 25.2, kind: 'flight', stepsAtStart: 300, stepsAtEnd: 400 },
  { zStart: -99, zEnd: -105.5, yStart: 25.2, yEnd: 25.2, kind: 'landing', stepsAtStart: 400, stepsAtEnd: 400 },
];

export const STAIR_MIN_Z = -104.2;
export const STAIR_MAX_Z = 2.0;

/**
 * Computes exact world elevation along the 4-flight Baal Kuwari forest staircase.
 */
export function sampleStaircaseHeight(z: number): number {
  if (z >= 0) return 0;
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (z <= seg.zStart && z >= seg.zEnd) {
      if (seg.kind === 'landing') return seg.yStart;
      const t = (seg.zStart - z) / Math.max(0.01, seg.zStart - seg.zEnd);
      return THREE.MathUtils.lerp(seg.yStart, seg.yEnd, t);
    }
  }
  return 25.2;
}

/**
 * Returns `true` when `z` lies on an inclined flight of steps rather than a flat rest terrace.
 */
export function isOnStairFlight(z: number): boolean {
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (seg.kind === 'flight' && z < seg.zStart - 0.15 && z > seg.zEnd + 0.15) {
      return true;
    }
  }
  return false;
}

/**
 * Maps world Z smoothly to logical step progress (`0 .. 400`) across all 4 segmented flights.
 */
export function computeStepCountFromZ(z: number): number {
  if (z >= 0) return 0;
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (z <= seg.zStart && z >= seg.zEnd) {
      if (seg.kind === 'landing') return seg.stepsAtEnd;
      const t = (seg.zStart - z) / Math.max(0.01, seg.zStart - seg.zEnd);
      return Math.round(THREE.MathUtils.lerp(seg.stepsAtStart, seg.stepsAtEnd, t));
    }
  }
  return BAAL_KUWARI_TOTAL_STEPS;
}

/**
 * Maps a logical milestone step count (`e.g. 200`) back onto its landing world Z position.
 */
export function getZForMilestoneStep(step: number): number {
  if (step >= 300) return -75.5;
  if (step >= 200) return -49.5;
  if (step >= 100) return -23.5;
  return 0.9;
}

/**
 * Returns walkable corridor half-width at `z` (wider on flat scenic rest landings, narrower along flights).
 */
export function getStairWalkHalfWidth(z: number): number {
  for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
    const seg = STAIR_SEGMENTS[i];
    if (seg.kind === 'landing' && z <= seg.zStart + 0.35 && z >= seg.zEnd - 0.35) {
      return z < -98.5 ? 3.2 : 2.35;
    }
  }
  return 1.28;
}

function sampleStairTerrainY(x: number, z: number): number {
  const spineY = sampleStaircaseHeight(z);
  const absX = Math.abs(x);
  const clearHalf = getStairWalkHalfWidth(z) + 0.75;
  if (absX <= clearHalf) {
    return spineY - 0.35;
  }
  const sideDist = absX - clearHalf;
  const ridgeWave = Math.sin(z * 0.14 + x * 0.11) * 0.7 + Math.cos(z * 0.08 - x * 0.09) * 0.5;
  // Left side climbs gently into forested slope; right side drops organically toward deep valley
  if (x < 0) {
    return spineY - 0.2 + Math.pow(sideDist, 0.88) * 0.45 + ridgeWave * 0.4;
  }
  return spineY - 0.2 - Math.pow(sideDist, 0.9) * 0.48 + ridgeWave * 0.45;
}

const STAIRS_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-62, 12, -88], scale: [46, 30, 38], rotationY: 0.25, color: '#3e5e4b' },
  { position: [74, -4, -66], scale: [50, 30, 42], rotationY: -0.32, color: '#587892' },
  { position: [88, 2, -118], scale: [64, 38, 48], rotationY: -0.18, color: '#6b8ba4' },
  { position: [-18, 18, -155], scale: [72, 40, 44], rotationY: 0.06, color: '#476a56' },
];

const MAX_PINE_TREES = 110;
const FLAG_COLORS = ['#ef4444', '#f59e0b', '#f8fafc', '#22c55e', '#3b82f6'];

export interface BaalKuwariStairsEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  canEnterSummit: boolean;
  canCaptureLandingPhoto?: boolean;
  assistBeaconPos?: readonly [number, number, number] | null;
}

/**
 * Forest hillside staircase diorama representing ~400 Baal Kuwari steps across 4 playable flights
 * joined by flat scenic rest landings at steps 100, 200, 300, and 400.
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
  const flagRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phaseRef = useRef(0);

  const treadPositions = useMemo(() => {
    const items: Array<{ z: number; y: number }> = [];
    for (let i = 0; i < STAIR_SEGMENTS.length; i += 1) {
      const seg = STAIR_SEGMENTS[i];
      if (seg.kind !== 'flight') continue;
      const stepsInVisualFlight = 42;
      for (let s = 0; s < stepsInVisualFlight; s += 1) {
        const frac = (s + 0.5) / stepsInVisualFlight;
        const z = THREE.MathUtils.lerp(seg.zStart, seg.zEnd, frac);
        const y = THREE.MathUtils.lerp(seg.yStart, seg.yEnd, frac);
        items.push({ z, y });
      }
    }
    return items;
  }, []);

  const pinePlacements = useMemo(() => {
    const list: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINE_TREES; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 4 - ((i * 1.07) % 114);
      const laneOffset = 3.8 + (i % 7) * 3.1 + ((i * 5) % 4) * 0.4;
      const x = side * laneOffset;
      const y = sampleStairTerrainY(x, z) - 0.22;
      const scale = 0.85 + ((i * 13) % 8) * 0.075;
      list.push([x, y, z, scale]);
    }
    return list;
  }, []);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = pineCount;
    crownInstRef.current.count = pineCount;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i += 1) {
      const [x, y, z, s] = pinePlacements[i];
      dummy.position.set(x, y + 0.88 * s, z);
      dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.5 * s, z);
      dummy.updateMatrix();
      crownInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    crownInstRef.current.instanceMatrix.needsUpdate = true;
  }, [pineCount, pinePlacements]);

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

  const flightSpecs = STAIR_SEGMENTS.filter((s) => s.kind === 'flight');
  const landingSpecs = STAIR_SEGMENTS.filter((s) => s.kind === 'landing');

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
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />

      {/* Contoured Mountain Hillside & Valley Canyon Surrounding Staircase */}
      <ConnectedHillTerrain
        width={90}
        depth={136}
        centerX={0}
        centerZ={-52}
        segX={46}
        segZ={72}
        heightFn={sampleStairTerrainY}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={STAIRS_RIDGES} />

      {/* Solid Sloped Foundations & Side Railings under Every Flight */}
      {flightSpecs.map((seg, idx) => {
        const dz = seg.zStart - seg.zEnd;
        const dy = seg.yEnd - seg.yStart;
        const hyp = Math.hypot(dz, dy);
        const pitch = Math.atan2(dy, dz);
        const midZ = (seg.zStart + seg.zEnd) * 0.5;
        const midY = (seg.yStart + seg.yEnd) * 0.5;
        return (
          <group key={`flight-${idx}`} position={[0, midY, midZ]} rotation={[pitch, 0, 0]}>
            <mesh position={[0, -0.45, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[3.2, 0.9, hyp + 0.6]} />
              <meshStandardMaterial color="#685e50" roughness={0.95} />
            </mesh>
            {/* Side handrails framing stone steps cleanly */}
            {[-1.5, 1.5].map((rx) => (
              <mesh key={rx} position={[rx, 0.95, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[0.09, 0.08, hyp]} />
                <meshStandardMaterial color="#b45309" roughness={0.75} />
              </mesh>
            ))}
            {/* Upright handrail posts */}
            {[-0.38, 0, 0.38].map((u) =>
              [-1.5, 1.5].map((rx) => (
                <mesh
                  key={`post-${u}-${rx}`}
                  position={[rx, 0.45, u * hyp]}
                  castShadow={shadowsEnabled}
                >
                  <boxGeometry args={[0.1, 0.95, 0.1]} />
                  <meshStandardMaterial color="#78716c" roughness={0.85} />
                </mesh>
              ))
            )}
          </group>
        );
      })}

      {/* Individual Stone Stair Treads along all 4 Flights */}
      {treadPositions.map((tread, idx) => (
        <mesh
          key={`tread-${idx}`}
          position={[0, tread.y - 0.05, tread.z]}
          receiveShadow={shadowsEnabled}
        >
          <boxGeometry args={[2.95, 0.18, 0.52]} />
          <meshStandardMaterial color={idx % 2 === 0 ? '#9e9280' : '#918573'} roughness={0.93} />
        </mesh>
      ))}

      {/* Flat Stone Rest Landings (Start, 100, 200, 300, 400 Summit) with Benches & Prayer Flags */}
      {landingSpecs.map((seg, idx) => {
        const len = seg.zStart - seg.zEnd;
        const midZ = (seg.zStart + seg.zEnd) * 0.5;
        const halfW = seg.zEnd < -99 ? 4.2 : 3.1;
        return (
          <group key={`landing-${idx}`} position={[0, seg.yStart, midZ]}>
            <mesh position={[0, -0.5, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[halfW * 2, 1.0, len + 0.5]} />
              <meshStandardMaterial color="#736757" roughness={0.94} />
            </mesh>
            <mesh position={[0, -0.02, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[halfW * 2 - 0.2, 0.08, len]} />
              <meshStandardMaterial color="#a89b87" roughness={0.9} />
            </mesh>

            {/* Rest bench & milestone stone on Landings 100, 200, 300 */}
            {seg.stepsAtEnd > 0 && seg.stepsAtEnd < 400 && (
              <>
                <group position={[2.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
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
                {/* Fluttering overhead prayer flags spanning landing */}
                {[-2.4, 2.4].map((px) => (
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

      {/* Summit Archway crowning Step 400 (`z = -104.0, y = 25.2`) */}
      <group position={[0, 25.2, -104.2]}>
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

      {/* Instanced Flanking Forest Pines */}
      <instancedMesh
        ref={trunkInstRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.14, 0.22, 1.75, 7]} />
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
        position={[0, 25.35, -102.8]}
        visible={canEnterSummit}
        color="#f59e0b"
        height={1.15}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[-1.6, 12.6, -49.5]}
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
