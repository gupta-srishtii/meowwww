'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StallCookCharacter } from '@/components/canvas/characters/StallCookCharacter';
import {
  buildConnectedHillGeometry,
  ConnectedHillTerrain,
} from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  createTerrainMeshSampler,
  sampleTerrainFootprint,
} from '@/lib/terrainMeshSampler';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getOffroadDirtTrackTexture } from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export const BAAL_KUWARI_MAGGI_WALK_BOUNDS: WalkBounds = {
  minX: -5.8,
  maxX: 5.8,
  minZ: -4.1,
  maxZ: 4.15,
};

export const BAAL_KUWARI_MAGGI_TABLE_CENTER = { x: 0.45, z: -1.35 } as const;

export const BAAL_KUWARI_MAGGI_SEAT_SLOTS = {
  ishaan: { x: 0.45, z: -0.48, facingYaw: 0 },
  srishti: { x: 0.45, z: -2.22, facingYaw: Math.PI },
  friend_plaid: { x: -0.92, z: -1.35, facingYaw: -Math.PI / 2 },
  friend_black_tee: { x: 1.82, z: -1.35, facingYaw: Math.PI / 2 },
} as const;

/**
 * Walk-mode obstacles include the four stools (`circle`) so no character ever walks
 * onto or stands inside a stool. Dining animation temporarily bypasses these.
 */
export const BAAL_KUWARI_MAGGI_OBSTACLES: readonly WalkObstacle[] = [
  // Authentic forest tapri stall shelter
  { kind: 'box', minX: -5.05, maxX: -2.15, minZ: -3.75, maxZ: -1.1 },
  // Wooden dining table footprint
  { kind: 'box', minX: -0.56, maxX: 1.46, minZ: -1.94, maxZ: -0.76 },
  // Individual wooden stools around table (prevents standing/clipping onto stools)
  { kind: 'circle', x: BAAL_KUWARI_MAGGI_SEAT_SLOTS.srishti.x, z: BAAL_KUWARI_MAGGI_SEAT_SLOTS.srishti.z, radius: 0.28 },
  { kind: 'circle', x: BAAL_KUWARI_MAGGI_SEAT_SLOTS.ishaan.x, z: BAAL_KUWARI_MAGGI_SEAT_SLOTS.ishaan.z, radius: 0.28 },
  { kind: 'circle', x: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_plaid.x, z: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_plaid.z, radius: 0.28 },
  { kind: 'circle', x: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_black_tee.x, z: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_black_tee.z, radius: 0.28 },
  // Natural flanking pine-slope boulders at rear of clearing
  { kind: 'circle', x: -1.85, z: -4.05, radius: 0.65 },
  { kind: 'circle', x: 1.95, z: -4.0, radius: 0.68 },
  // Rustic timber resting log on east bank
  { kind: 'box', minX: 3.15, maxX: 4.55, minZ: -1.85, maxZ: -0.85 },
  // Parked scooters along forest dirt pull-off
  { kind: 'box', minX: 0.4, maxX: 2.3, minZ: 2.7, maxZ: 3.6 },
  { kind: 'box', minX: -2.1, maxX: -0.2, minZ: 2.7, maxZ: 3.6 },
];

export const BAAL_KUWARI_MAGGI_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'trail_maggi',
    label: 'Gather & Eat Hot Maggi Together',
    x: 0.45,
    z: 0.28,
    radius: 1.75,
    actionType: 'interact',
  },
  {
    id: 'ride_to_stairs',
    label: 'Ride Scooters Toward Baal Kuwari Stairs',
    x: 0.25,
    z: 2.25,
    radius: 1.85,
    actionType: 'interact',
  },
  {
    id: 'back_to_road',
    label: 'Replay Off-Road Mountain Ride',
    x: 0.25,
    z: 2.25,
    radius: 1.55,
    actionType: 'interact',
  },
];

export interface BaalKuwariMaggiStopEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  ateMaggi: boolean;
  eatingActive: boolean;
}

const MAX_PINE_COUNT = 64;

const TRAILHEAD_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-56, -4, -56], scale: [44, 26, 34], rotationY: 0.2, color: '#395b45' },
  { position: [6, 2, -74], scale: [58, 36, 40], rotationY: -0.08, color: '#476878' },
  { position: [58, -3, -52], scale: [46, 26, 34], rotationY: -0.25, color: '#3d5f4a' },
];

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Natural mountain forest clearing terrain height: level (y = 0) across the playable
 * earthen clearing so furniture & feet meet ground cleanly, curving organically into
 * wooded ridges & gullies outside without a flat rectangular platform silhouette.
 */
function sampleClearingTerrainY(x: number, z: number): number {
  // Normalized elliptical distance from walkable clearing core
  const nx = Math.max(0, (Math.abs(x) - 5.2) / 5.5);
  const nzBack = z < -3.9 ? (-3.9 - z) / 5.2 : 0;
  const nzFront = z > 4.4 ? (z - 4.4) / 6.0 : 0;

  // Keep a narrow winding dirt footpath trough curving softly uphill to -Z at x near sin(z)
  const pathCenter = z < -3.8 ? Math.sin((-3.8 - z) * 0.14) * 1.4 : 0;
  const distToNorthPath = z < -3.8 ? Math.abs(x - pathCenter) : 99;
  const onNorthPath = z < -3.8 ? 1 - smoothStep01((distToNorthPath - 1.1) / 1.5) : 0;

  const noise =
    Math.sin(x * 0.15 + z * 0.11) * 0.65 +
    Math.cos(x * 0.08 - z * 0.16) * 0.45 +
    Math.sin(x * 0.31 - z * 0.23) * 0.16;

  if (Math.abs(x) <= 5.2 && z >= -3.9 && z <= 4.4) {
    return 0;
  }

  const backRise = smoothStep01(nzBack) * (0.45 + Math.max(0, -3.9 - z) * 0.28);
  const sideRise = smoothStep01(nx) * (0.4 + Math.max(0, Math.abs(x) - 5.2) * 0.24);
  const frontDip = smoothStep01(nzFront) * Math.min(6.2, Math.max(0, z - 4.4) * 0.28);
  const pathCarve = onNorthPath * Math.max(0, (-3.9 - z) * 0.14);
  const edgeBlend = smoothStep01(Math.max(nx, nzBack, nzFront));

  return Math.max(-7.5, backRise + sideRise - frontDip - pathCarve + noise * edgeBlend * 0.55);
}

const _dirtFloor = new THREE.Color('#6c5c47');
const _gravelPath = new THREE.Color('#786852');
const _mossGrass = new THREE.Color('#426239');
const _forestNeedle = new THREE.Color('#324d2f');
const _rockyGrey = new THREE.Color('#5f6563');

function sampleClearingColor(wx: number, wz: number, h: number, target: THREE.Color): void {
  // Packed dirt in central dining spot, scooter pull-off & winding north footpath
  const radialClear = Math.hypot(wx * 0.85, (wz + 0.3) * 0.9);
  const pathCenter = wz < -3.8 ? Math.sin((-3.8 - wz) * 0.14) * 1.4 : 0;
  const onPath = wz < -3.6 && Math.abs(wx - pathCenter) < 1.35;
  const onTrack = Math.abs(wz - 4.9) < 2.2;

  const dirtMask =
    onTrack || onPath
      ? 0.92
      : 1 - smoothStep01((radialClear - 3.0) / 3.2);

  const patchNoise = Math.sin(wx * 0.45 + wz * 0.38) * 0.5 + 0.5;
  target.copy(_mossGrass).lerp(_forestNeedle, patchNoise * 0.55);
  if (h > 1.8) {
    target.lerp(_rockyGrey, THREE.MathUtils.clamp((h - 1.8) / 5.5, 0, 0.45));
  }
  target.lerp(patchNoise > 0.5 ? _dirtFloor : _gravelPath, dirtMask);
}

const CLEARING_BOULDERS: ReadonlyArray<{
  pos: [number, number];
  scale: [number, number, number];
  rot: [number, number, number];
  color: string;
}> = [
  { pos: [-1.85, -4.05], scale: [0.85, 0.62, 0.72], rot: [0.15, 0.4, 0.1], color: '#6b727a' },
  { pos: [1.95, -4.0], scale: [0.92, 0.68, 0.78], rot: [0.1, -0.5, 0.15], color: '#626971' },
  { pos: [-4.95, 1.35], scale: [1.05, 0.74, 0.88], rot: [0.2, 0.8, -0.1], color: '#5c646d' },
  { pos: [-5.4, 1.78], scale: [0.68, 0.56, 0.62], rot: [-0.2, 0.3, 0.25], color: '#64748b' },
  { pos: [4.8, 0.75], scale: [0.95, 0.65, 0.82], rot: [-0.1, 1.1, 0.12], color: '#6b727a' },
  { pos: [4.1, -3.5], scale: [1.15, 0.82, 0.95], rot: [0.18, -0.35, 0.08], color: '#5d656e' },
  { pos: [4.62, -3.82], scale: [0.74, 0.62, 0.68], rot: [0.25, 0.45, -0.15], color: '#525861' },
  { pos: [-3.4, -4.9], scale: [1.3, 0.95, 1.1], rot: [0.12, 0.65, -0.08], color: '#687079' },
  { pos: [3.4, -5.1], scale: [1.25, 0.9, 1.05], rot: [-0.15, 0.95, 0.1], color: '#606870' },
  { pos: [6.2, -1.8], scale: [1.4, 1.05, 1.15], rot: [0.22, -0.7, 0.05], color: '#666e77' },
];

function createClearingSignTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 31px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAHADI CLEARING', 256, 56);
  ctx.fillStyle = '#fde68a';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('SECOND MAGGI & CHAI BREAK', 256, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Natural forested mountain roadside Maggi clearing along the Baal Kuwari off-road route.
 * Geographically separated from the ~400-step staircase; opens northward into a pine footpath.
 */
export function BaalKuwariMaggiStopEnvironment({
  qualityProfile,
  paused,
  ateMaggi,
  eatingActive,
}: BaalKuwariMaggiStopEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_PINE_COUNT, Math.round(MAX_PINE_COUNT * densityRatio));
  const dirtTex = useMemo(() => getOffroadDirtTrackTexture(), []);
  const clearingSignTex = useMemo(() => createClearingSignTexture(), []);

  useEffect(() => {
    return () => {
      clearingSignTex?.dispose();
    };
  }, [clearingSignTex]);

  const steamRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const animTimeRef = useRef(0);

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 140,
        depth: 120,
        centerX: 0,
        centerZ: -18,
        segX: 76,
        segZ: 68,
        heightFn: sampleClearingTerrainY,
        colorFn: sampleClearingColor,
      }),
    []
  );

  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  const terrainSampler = useMemo(
    () => createTerrainMeshSampler([terrainGeometry], 3.5),
    [terrainGeometry]
  );

  const pineTransforms = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINE_COUNT; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const inBackHill = i % 3 === 0;
      let x: number;
      let z: number;
      if (inBackHill) {
        x = -24 + ((i * 7.8) % 48);
        // Leave wide forested flank clear around winding north footpath cut
        if (Math.abs(x) < 5.0) x += x >= 0 ? 5.2 : -5.2;
        z = -6.2 - (i % 6) * 3.8;
      } else {
        x = side * (6.8 + (i % 6) * 3.9 + ((i * 3) % 5) * 0.45);
        z = -16 + ((i * 4.5) % 24);
      }
      const scale = 0.85 + ((i * 11) % 7) * 0.08;
      const footprint = sampleTerrainFootprint(terrainSampler, x, z, 0.45 * scale);
      const surfaceY = footprint ? footprint.minY : sampleClearingTerrainY(x, z);
      items.push([x, surfaceY - 0.3 * scale, z, scale]);
    }
    return items;
  }, [terrainSampler]);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = pineCount;
    crownInstRef.current.count = pineCount;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i += 1) {
      const [x, y, z, s] = pineTransforms[i];
      dummy.position.set(x, y + 0.9 * s, z);
      dummy.rotation.set(0, (i * 0.9) % (Math.PI * 2), 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.55 * s, z);
      dummy.updateMatrix();
      crownInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    crownInstRef.current.instanceMatrix.needsUpdate = true;
  }, [pineCount, pineTransforms]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      animTimeRef.current += delta;
    }
    const t = animTimeRef.current;

    if (steamRef.current && !reducedMotion) {
      steamRef.current.children.forEach((child, idx) => {
        const phase = (t * 0.78 + idx * 0.34) % 1;
        child.position.y = phase * 0.55;
        child.position.x = Math.sin(t * 2.1 + idx) * 0.035;
        child.scale.setScalar(0.6 + phase * 0.55);
      });
    }

    if (rightArmRef.current && rightForearmRef.current && !reducedMotion) {
      rightArmRef.current.rotation.x = 0.65 + Math.cos(t * 2.8) * 0.08;
      rightArmRef.current.rotation.y = Math.sin(t * 2.8) * 0.14;
      rightForearmRef.current.rotation.x = 0.48 + Math.cos(t * 2.8) * 0.05;
    }
    if (torsoRef.current && headRef.current && !reducedMotion) {
      torsoRef.current.position.y = 0.82 + Math.sin(t * 2.0) * 0.008;
      headRef.current.rotation.y = Math.sin(t * 0.7) * 0.18;
    }
  });

  const served = ateMaggi || eatingActive;

  return (
    <group>
      <color attach="background" args={['#c8dce8']} />
      <fog attach="fog" args={['#ded9cc', 30, 115]} />

      <hemisphereLight args={['#fff5dc', '#4b5b44', 0.98]} />
      <directionalLight
        position={[18, 25, 12]}
        intensity={1.88}
        color="#ffdc9c"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Contoured organic forested mountain clearing floor (zero boxy platform) */}
      <ConnectedHillTerrain
        width={140}
        depth={120}
        centerX={0}
        centerZ={-18}
        segX={76}
        segZ={68}
        heightFn={sampleClearingTerrainY}
        colorFn={sampleClearingColor}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={TRAILHEAD_RIDGES} />

      {/* Textured mountain dirt track running past the roadside clearing */}
      <mesh rotation={[-Math.PI / 2, 0, 0.04]} position={[0, 0.008, 4.9]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[120, 3.6]} />
        <meshStandardMaterial
          color="#9b8164"
          map={dirtTex ?? undefined}
          roughness={0.98}
        />
      </mesh>

      {/* Natural trail boulders & rustic timber log seating */}
      {CLEARING_BOULDERS.map((b, idx) => {
        const groundY =
          terrainSampler.trySampleY(b.pos[0], b.pos[1]) ?? sampleClearingTerrainY(b.pos[0], b.pos[1]);
        return (
          <mesh
            key={`boulder-${idx}`}
            position={[b.pos[0], groundY + b.scale[1] * 0.22, b.pos[1]]}
            rotation={b.rot}
            scale={b.scale}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <dodecahedronGeometry args={[0.72, 0]} />
            <meshStandardMaterial color={b.color} roughness={0.95} flatShading />
          </mesh>
        );
      })}

      {/* Rustic mountain fern & grass bushes tucked around edge boulders */}
      {[
        [-2.7, -3.9],
        [2.7, -3.8],
        [-5.3, -0.4],
        [5.1, -0.8],
        [-3.9, 2.2],
        [4.2, 2.3],
      ].map(([fx, fz], idx) => {
        const groundY = terrainSampler.trySampleY(fx, fz) ?? sampleClearingTerrainY(fx, fz);
        return (
          <mesh
            key={`fern-${idx}`}
            position={[fx, groundY + 0.14, fz]}
            scale={[0.8, 0.52, 0.8]}
          >
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#365e32' : '#4a7038'} roughness={0.93} flatShading />
          </mesh>
        );
      })}

      {/* Weathered trail log bench on east side */}
      <group position={[3.85, 0, -1.35]} rotation={[0, 0.2, 0]}>
        <mesh position={[0, 0.24, 0]} rotation={[0, 0, Math.PI / 2]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.24, 0.26, 1.55, 10]} />
          <meshStandardMaterial color="#654935" roughness={0.94} />
        </mesh>
      </group>

      {/* Hillside pine-ridge boulders & painted Pahadi Clearing Maggi signboard */}
      <group position={[0, 0, -4.2]}>
        <mesh position={[-1.45, 0.92, 0.15]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.055, 0.072, 1.95, 7]} />
          <meshStandardMaterial color="#5c4033" roughness={0.92} />
        </mesh>
        <mesh position={[-1.12, 1.58, 0.18]} rotation={[0, 0.18, 0.02]} castShadow={shadowsEnabled}>
          <boxGeometry args={[1.65, 0.44, 0.07]} />
          <meshStandardMaterial
            color="#ffffff"
            map={clearingSignTex ?? undefined}
            roughness={0.78}
          />
        </mesh>
      </group>

      {/* Authentic Mountain Maggi & Chai Tapri Stall (`x = -3.65, z = -2.45`) with weathered amber + blue tarp canopy */}
      <group position={[-3.65, 0, -2.45]} rotation={[0, -0.45, 0]}>
        {[
          [-1.25, -1.0],
          [1.05, -1.0],
          [-1.25, 1.0],
          [1.05, 1.0],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.32, pz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.06, 0.072, 2.8, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}

        {/* Weathered terracotta-amber metal roof + draped royal-blue pahadi tarpaulin overhang */}
        <mesh position={[-0.1, 2.74, 0]} rotation={[0, 0, -0.09]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.98, 0.09, 2.55]} />
          <meshStandardMaterial color="#b45309" roughness={0.84} />
        </mesh>
        <mesh position={[0.25, 2.71, 0]} rotation={[0, 0, -0.14]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.25, 0.06, 2.68]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.86} />
        </mesh>
        <mesh position={[1.25, 2.5, 0]} rotation={[0, 0, -0.42]}>
          <boxGeometry args={[0.45, 0.04, 2.66]} />
          <meshStandardMaterial color="#1e40af" roughness={0.88} />
        </mesh>
        {/* Painted signboard fascia along stall eaves */}
        <mesh position={[1.18, 2.34, 0]}>
          <boxGeometry args={[0.09, 0.34, 2.15]} />
          <meshStandardMaterial
            color="#ffffff"
            map={clearingSignTex ?? undefined}
            roughness={0.75}
          />
        </mesh>
        {[-0.2, 0.08, 0.36].map((my, idx) => (
          <mesh key={idx} position={[1.05, 1.85 - my * 0.9, 0.92]}>
            <boxGeometry args={[0.08, 0.22, 0.16]} />
            <meshStandardMaterial color="#facc15" roughness={0.62} />
          </mesh>
        ))}

        {/* Cooking counter, stove, aluminum Maggi pot & brass chai kettle */}
        <mesh position={[0.25, 0.43, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.85, 0.9, 1.95]} />
          <meshStandardMaterial color="#654321" roughness={0.88} />
        </mesh>
        <mesh position={[0.25, 0.91, 0]}>
          <boxGeometry args={[0.92, 0.06, 2.02]} />
          <meshStandardMaterial color="#785233" roughness={0.8} />
        </mesh>
        <mesh position={[0.28, 1.03, -0.35]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.2, 0.17, 0.14, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.68} roughness={0.32} />
        </mesh>
        <mesh position={[0.28, 1.09, -0.35]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 14]} />
          <meshStandardMaterial color="#facc15" roughness={0.75} />
        </mesh>
        {/* Brass chai kettle & stacked cups */}
        <mesh position={[0.26, 1.03, 0.38]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.13, 0.16, 0.18, 12]} />
          <meshStandardMaterial color="#d97706" metalness={0.65} roughness={0.3} />
        </mesh>
        <group ref={steamRef} position={[0.28, 1.15, -0.35]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.14, 0]}>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.44} depthWrite={false} />
            </mesh>
          ))}
        </group>

        <StallCookCharacter
          variant="helper"
          torsoRef={torsoRef}
          headRef={headRef}
          rightArmRef={rightArmRef}
          rightForearmRef={rightForearmRef}
          position={[-0.48, 0, -0.2]}
          rotationY={-Math.PI / 2}
          castShadow={shadowsEnabled}
        />
      </group>

      {/* Wooden Dining Table & Four Grounded Stools around Seat Slots */}
      <group position={[BAAL_KUWARI_MAGGI_TABLE_CENTER.x, 0, BAAL_KUWARI_MAGGI_TABLE_CENTER.z]}>
        {[
          [0, 0.87],
          [0, -0.87],
          [-1.37, 0],
          [1.37, 0],
        ].map(([sx, sz], idx) => (
          <group key={idx} position={[sx, 0, sz]}>
            <mesh position={[0, 0.42, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.24, 0.25, 0.05, 12]} />
              <meshStandardMaterial color="#8c5e42" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.06, 0.09, 0.42, 8]} />
              <meshStandardMaterial color="#5c4033" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {[
          [-0.78, -0.4],
          [0.78, -0.4],
          [-0.78, 0.4],
          [0.78, 0.4],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.35, lz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.04, 0.035, 0.72, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.71, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[2.0, 0.06, 1.1]} />
          <meshStandardMaterial color="#9a6b48" roughness={0.82} />
        </mesh>

        {served && (
          <>
            {[
              [0, 0.3],
              [0, -0.3],
              [-0.64, 0],
              [0.64, 0],
            ].map(([bx, bz], idx) => (
              <group key={idx} position={[bx, 0.76, bz]}>
                <mesh castShadow={shadowsEnabled}>
                  <cylinderGeometry args={[0.16, 0.12, 0.04, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.025, 0]}>
                  <sphereGeometry args={[0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                  <meshStandardMaterial color="#eab308" roughness={0.78} />
                </mesh>
                {/* Warm kulhad chai cup beside each plate */}
                <mesh position={[0.21, 0.055, 0.08]}>
                  <cylinderGeometry args={[0.048, 0.036, 0.11, 10]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} />
                </mesh>
              </group>
            ))}
          </>
        )}
      </group>

      {/* Parked Scooters along Forest Dirt Pull-Off */}
      <group position={[1.35, 0, 3.15]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.15, 0, 3.15]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Grounded Flanking Himalayan Pines (deeper trunks anchor cleanly on sloped earth) */}
      <instancedMesh
        ref={trunkInstRef}
        args={[undefined, undefined, MAX_PINE_COUNT]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5c4033" roughness={0.94} />
      </instancedMesh>
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, MAX_PINE_COUNT]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.38, 3.6, 7]} />
        <meshStandardMaterial color="#275036" roughness={0.88} />
      </instancedMesh>

      {/* Interaction Beacons */}
      <HotspotBeaconSparkle
        position={[0.45, 0, 0.28]}
        visible={!ateMaggi && !eatingActive}
        color="#f59e0b"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0, 0.05, -3.65]}
        visible={ateMaggi}
        color="#38bdf8"
        height={1.1}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
