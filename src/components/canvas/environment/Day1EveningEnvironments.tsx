'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FabricGeometry } from '../characters/FabricGeometry';
import {
  buildConnectedHillGeometry,
  ConnectedHillTerrain,
} from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import type { WalkBounds, WalkHotspot } from '@/hooks/useWalkController';
import { getOffroadDirtTrackTexture } from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createTerrainMeshSampler } from '@/lib/terrainMeshSampler';
import { MarketRoadLife, MarketShopSign } from './MarketRoadLife';

export const DAY1_WATERFALL_WALK_BOUNDS: WalkBounds = {
  minX: -4.2,
  maxX: 2.35,
  minZ: -4.2,
  maxZ: 3.6,
};

export const DAY1_WATERFALL_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'sit_boulders',
    label: 'Sit Together by the Stream Stones',
    x: 0.95,
    z: -1.45,
    radius: 1.95,
    actionType: 'interact',
  },
  {
    id: 'depart_waterfall',
    label: 'Ride to Roadside Maggi Stop (~5 PM)',
    x: -2.85,
    z: -1.0,
    radius: 1.85,
    actionType: 'interact',
  },
];

export const DAY1_MAGGI_WALK_BOUNDS: WalkBounds = {
  minX: -3.2,
  maxX: 3.2,
  minZ: -2.4,
  maxZ: 3.6,
};

export const DAY1_MAGGI_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'finish_maggi_return',
    label: 'Head Back to Stay',
    x: -2.2,
    z: 2.2,
    radius: 2.0,
    actionType: 'interact',
  },
];

export const DAY1_MAGGI_TABLE_CENTER = { x: 0.55, z: -0.55 } as const;

export const DAY1_MAGGI_SEATS = {
  ishaan: { x: 0.55, z: 0.32, yaw: 0 },
  srishti: { x: 0.55, z: -1.42, yaw: Math.PI },
  friend_plaid: { x: -0.78, z: -0.55, yaw: -Math.PI / 2 },
  friend_black_tee: { x: 1.88, z: -0.55, yaw: Math.PI / 2 },
} as const;

export const DAY1_WATERFALL_ROCK_SEATS = {
  ishaan: { x: 1.95, z: -1.15, rockTopY: 0.44, yaw: -1.12 },
  srishti: { x: 1.85, z: -2.05, rockTopY: 0.46, yaw: -1.35 },
  friend_black_tee: { x: 1.15, z: -2.65, rockTopY: 0.42, yaw: -1.08 },
  friend_plaid: { x: 1.12, z: -0.45, rockTopY: 0.41, yaw: -1.45 },
} as const;

export function sampleMarketStreetY(z: number): number {
  // Real Rishikesh interior bazaar contour: higher uphill at z = +12 dipping naturally toward highway dhaba at z = -12
  return Math.max(-0.08, (z + 10.5) * 0.048 + Math.sin(z * 0.32) * 0.09);
}

export const DAY1_MARKET_WALK_BOUNDS: WalkBounds = {
  minX: -4.55,
  maxX: -3.0,
  minZ: -10.8,
  maxZ: 11.4,
};

export const DAY1_MARKET_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'join_dhaba',
    label: 'Walk Inside for Dinner Together',
    x: -3.8,
    z: -9.4,
    radius: 2.35,
    actionType: 'interact',
  },
];

export const DAY1_NIGHT_DHABA_TABLE_CENTER = { x: 0.4, z: -0.9 } as const;

export const DAY1_NIGHT_DHABA_SEATS = {
  ishaan: { x: 0.4, z: -0.04, yaw: 0 },
  srishti: { x: 0.4, z: -1.76, yaw: Math.PI },
  friend_plaid: { x: -0.92, z: -0.9, yaw: -Math.PI / 2 },
  friend_black_tee: { x: 1.72, z: -0.9, yaw: Math.PI / 2 },
} as const;

function smooth01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function sampleWaterfallGorgeY(wx: number, wz: number): number {
  // Keep left road shoulder / gravel turnout gentle & drivable around x = -6..-0.6,
  // drop cleanly into stream channel on the RIGHT (x = +2.4..+6.8), and rise steeply up forest walls.
  if (wx >= -6.2 && wx <= 0.8 && wz >= -8 && wz <= 26) {
    return 0.02 + Math.sin(wz * 0.14) * 0.03;
  }
  if (wx > 2.2 && wx < 6.4 && wz > -5.5 && wz < 12) {
    // Shallow rocky stream bed on right side
    const bedDepth = smooth01(Math.min(wx - 2.2, 6.4 - wx) / 1.4);
    return -0.28 * bedDepth + (wz < -2.4 ? (-(wz + 2.4) * 0.42) : 0);
  }
  const cliffRight = Math.max(0, wx - 6.2);
  const cliffLeft = Math.max(0, -6.4 - wx);
  const cliffNorth = Math.max(0, -5.5 - wz);
  const rise = cliffRight * 0.72 + cliffLeft * 0.52 + cliffNorth * 0.82;
  const undulate = Math.sin(wx * 0.18 + wz * 0.12) * 0.85 + Math.cos(wz * 0.22) * 0.55;
  return 0.04 + Math.pow(rise + 0.001, 0.9) * 0.95 + undulate * smooth01(rise / 4);
}

const _wfMud = new THREE.Color('#665c4b');
const _wfMoss = new THREE.Color('#355638');
const _wfSlate = new THREE.Color('#4a5562');
const _wfForest = new THREE.Color('#24412c');

function sampleWaterfallGorgeColor(wx: number, wz: number, y: number, out: THREE.Color): void {
  const noise = Math.sin(wx * 0.45 + wz * 0.35) * 0.5 + 0.5;
  if (wx >= -5.8 && wx <= 0.9 && y < 0.25) {
    out.copy(_wfMud).lerp(_wfSlate, 0.32 * noise);
    return;
  }
  out.copy(_wfSlate).lerp(_wfMoss, smooth01(y / 2.2) * 0.72);
  if (y > 2.0) {
    out.lerp(_wfForest, smooth01((y - 2.0) / 5.5) * 0.78 + noise * 0.15);
  }
}

const WATERFALL_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-42, -8, -58], scale: [46, 26, 22], rotationY: 0.25, color: '#414f5e' },
  { position: [36, -6, -64], scale: [54, 30, 24], rotationY: -0.2, color: '#394857' },
  { position: [-6, -9, -82], scale: [64, 36, 28], rotationY: 0.05, color: '#4d5b72' },
];

export interface Day1WaterfallEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  /** True once scooters finish riding in and friends settle by the stream boulders. */
  scootersParked: boolean;
  sittingOnBoulders?: boolean;
}

/**
 * Day 1 Golden-Hour / Dusk Waterfall Gorge:
 * Winding left forest lane turning off beside a lush green mountain gorge with a
 * cascading rocky waterfall & terraced stream on the RIGHT side (`DAY 1 1.mp4` & `DAY 1 2 .mp4`).
 */
export function Day1WaterfallEnvironment({
  qualityProfile,
  paused,
  scootersParked,
  sittingOnBoulders = false,
}: Day1WaterfallEnvironmentProps) {
  const { scene } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const dirtTex = useMemo(() => getOffroadDirtTrackTexture(), []);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#c88b68');
    scene.fog = new THREE.Fog('#c99473', 28, 128);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 110,
        depth: 105,
        centerX: 2,
        centerZ: 0,
        segX: 68,
        segZ: 68,
        heightFn: sampleWaterfallGorgeY,
        colorFn: sampleWaterfallGorgeColor,
      }),
    []
  );

  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  const terrainSampler = useMemo(
    () => createTerrainMeshSampler([terrainGeometry], 2.5),
    [terrainGeometry]
  );

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const streamSheetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const foamRingRef = useRef<THREE.Mesh>(null);
  const flowRef = useRef(0);

  const MAX_TREES = 72;
  const trees = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_TREES; i += 1) {
      const rightSide = i % 2 === 0;
      let x = rightSide ? 7.4 + (i % 7) * 2.6 : -7.6 - (i % 6) * 2.5;
      const z = -18 + ((i * 2.45) % 40);
      if (rightSide && x < 11.4 && z > -6.5 && z < 4.2) {
        x += 4.4;
      }
      const scale = 0.92 + (i % 5) * 0.14;
      const gy = terrainSampler.trySampleY(x, z) ?? sampleWaterfallGorgeY(x, z);
      items.push([x, gy - 0.25 * scale, z, scale]);
    }
    return items;
  }, [terrainSampler]);

  useEffect(() => {
    if (!trunkRef.current || !crownRef.current) return;
    trunkRef.current.count = MAX_TREES;
    crownRef.current.count = MAX_TREES;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < MAX_TREES; i += 1) {
      const [x, y, z, s] = trees[i];
      dummy.position.set(x, y + 1.05 * s, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.85 * s, z);
      dummy.scale.set(s * 1.15, s * 1.35, s * 1.15);
      dummy.updateMatrix();
      crownRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.instanceMatrix.needsUpdate = true;
  }, [trees]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion) return;
    flowRef.current += Math.min(rawDelta, 0.05);
    const t = flowRef.current;
    streamSheetRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const baseZ = idx === 0 ? 0.45 : idx === 1 ? 1.15 : 1.75;
      mesh.position.z = baseZ + Math.sin(t * 5.4 + idx * 1.4) * 0.03;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.62 + Math.sin(t * 4.8 + idx) * 0.1;
    });
    if (foamRingRef.current) {
      const pulse = 1 + Math.sin(t * 4.2) * 0.06;
      foamRingRef.current.scale.set(pulse, 1, pulse);
    }
  });

  return (
    <>
      <color attach="background" args={['#9ec3dc']} />
      <fog attach="fog" args={['#bdd4e3', 28, 128]} />

      <hemisphereLight args={['#eef6ff', '#2e4a34', 1.02]} />
      <directionalLight
        position={[-24, 22, -22]}
        intensity={1.75}
        color="#ffe8bd"
        castShadow={shadowsEnabled}
        shadow-mapSize-width={qualityProfile === 'high' ? 1024 : 512}
        shadow-mapSize-height={qualityProfile === 'high' ? 1024 : 512}
      />
      <pointLight position={[4.6, 1.8, -1.6]} intensity={1.1} color="#bae6fd" distance={10} />

      <ConnectedHillTerrain
        width={110}
        depth={105}
        centerX={2}
        centerZ={0}
        segX={68}
        segZ={68}
        heightFn={sampleWaterfallGorgeY}
        colorFn={sampleWaterfallGorgeColor}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={WATERFALL_RIDGES} />

      {/* Dense surrounding hill pines */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, MAX_TREES]} castShadow={shadowsEnabled}>
        <cylinderGeometry args={[0.13, 0.2, 2.1, 7]} />
        <meshStandardMaterial color="#4a3122" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, MAX_TREES]} castShadow={shadowsEnabled}>
        <coneGeometry args={[1.15, 2.75, 7]} />
        <meshStandardMaterial color="#214229" roughness={0.9} flatShading />
      </instancedMesh>

      {/* Believable paved Rishikesh hill road along LEFT + gravel turnout shoulder leading inward */}
      <mesh position={[-5.4, 0.022, 4.5]} rotation={[-Math.PI / 2, 0, 0.02]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[3.4, 34]} />
        <meshStandardMaterial color="#475569" roughness={0.88} />
      </mesh>
      <mesh position={[-3.82, 0.025, 4.5]} rotation={[-Math.PI / 2, 0, 0.02]}>
        <planeGeometry args={[0.1, 34]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
      </mesh>
      {[-8, -4, 0, 4, 8, 12, 16].map((rz) => (
        <mesh key={`wf-dash-${rz}`} position={[-5.4, 0.026, rz]} rotation={[-Math.PI / 2, 0, 0.02]}>
          <planeGeometry args={[0.1, 1.4]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.8} />
        </mesh>
      ))}
      {[-9, -3, 3, 9, 15].map((pz) => (
        <mesh key={`wf-post-${pz}`} position={[-6.9, 0.35, pz]}>
          <cylinderGeometry args={[0.055, 0.06, 0.7, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[-2.95, 0.015, 4.5]} rotation={[-Math.PI / 2, 0, 0.05]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[2.9, 24]} />
        <meshStandardMaterial color="#756859" map={dirtTex ?? undefined} roughness={0.94} />
      </mesh>
      <mesh position={[-5.2, 0.22, -2.5]} castShadow={shadowsEnabled}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#64748b" roughness={0.92} flatShading />
      </mesh>

      {/* Natural Green Rocky Mountain Creek Bed & Subtle Trickle Water Flow (`x = +3.1 .. +7.6`) */}
      <group position={[4.75, 0, -2.35]}>
        {/* Pale-grey & warm tan stream boulders matching real Day 1 creek stones */}
        <mesh position={[1.05, 0.45, -0.78]} scale={[1.25, 0.65, 1.15]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[0.98, 1]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[-0.25, 0.34, -0.35]} scale={[1.15, 0.52, 1.0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[0.88, 0]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-1.08, 0.28, -0.78]} scale={[0.95, 0.46, 0.92]}>
          <dodecahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[1.18, 0.32, 0.85]} scale={[0.92, 0.44, 0.88]}>
          <dodecahedronGeometry args={[0.76, 0]} />
          <meshStandardMaterial color="#78716c" roughness={0.92} flatShading />
        </mesh>

        {/* Delicate translucent mountain water threads weaving between boulders */}
        <mesh
          ref={(el) => {
            streamSheetRefs.current[0] = el;
          }}
          position={[0.15, 0.38, 0.45]}
          rotation={[0.36, -0.25, 0]}
        >
          <boxGeometry args={[0.42, 0.03, 0.92]} />
          <meshStandardMaterial
            color="#67b9ce"
            emissive="#bae6fd"
            emissiveIntensity={0.08}
            transparent
            opacity={0.44}
            roughness={0.22}
          />
        </mesh>
        <mesh
          ref={(el) => {
            streamSheetRefs.current[1] = el;
          }}
          position={[-0.12, 0.22, 1.15]}
          rotation={[0.3, -0.22, 0]}
        >
          <boxGeometry args={[0.52, 0.03, 0.98]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#bae6fd"
            emissiveIntensity={0.08}
            transparent
            opacity={0.42}
            roughness={0.24}
          />
        </mesh>
        <mesh
          ref={(el) => {
            streamSheetRefs.current[2] = el;
          }}
          position={[-0.38, 0.09, 1.75]}
          rotation={[0.2, -0.15, 0]}
        >
          <boxGeometry args={[0.64, 0.025, 0.85]} />
          <meshStandardMaterial
            color="#67b9ce"
            emissive="#bae6fd"
            emissiveIntensity={0.06}
            transparent
            opacity={0.4}
            roughness={0.22}
          />
        </mesh>

        {/* Subtle clear shallow pebble pool edge */}
        <mesh ref={foamRingRef} position={[-0.65, 0.028, 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.58, 18]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.36} roughness={0.3} />
        </mesh>
      </group>

      {/* Rocky damp creek gravel bed + narrow meandering shallow water ribbon (zero flat neon rectangle) */}
      <mesh position={[3.85, 0.012, 2.2]} rotation={[-Math.PI / 2, 0, 0.08]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[2.75, 12.2]} />
        <meshStandardMaterial color="#6e6a64" roughness={0.94} />
      </mesh>
      <mesh position={[3.65, 0.02, 2.2]} rotation={[-Math.PI / 2, 0, 0.14]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[0.78, 11.4]} />
        <meshStandardMaterial
          color="#9fb8c9"
          transparent
          opacity={0.5}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[4.28, 0.018, 1.1]} rotation={[-Math.PI / 2, 0, -0.06]}>
        <planeGeometry args={[1.2, 7.6]} />
        <meshStandardMaterial
          color="#67b9ce"
          transparent
          opacity={0.72}
          roughness={0.2}
        />
      </mesh>

      {/* Pale-grey & tan boulders supporting the seated friends along the forest creek */}
      {Object.entries(DAY1_WATERFALL_ROCK_SEATS).map(([key, seat], idx) => (
        <group key={`rock-seat-${key}`} position={[seat.x, 0, seat.z]}>
          <mesh
            position={[0, seat.rockTopY * 0.5, 0]}
            scale={[1.08, seat.rockTopY / 0.42, 0.96]}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <cylinderGeometry args={[0.44, 0.56, 0.42, 9]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#9ca3af' : '#a8a29e'}
              roughness={0.92}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* Pale-tan & slate river stones + lush forest creek ferns & leafy bushes */}
      {[
        [2.75, 0.25, 0.34],
        [2.55, -2.95, 0.44],
        [4.95, 1.45, 0.38],
        [2.95, 1.85, 0.31],
        [1.45, -3.55, 0.4],
        [0.45, 0.95, 0.34],
        [2.15, 0.55, 0.28],
        [3.35, -0.85, 0.3],
        [4.15, 3.15, 0.36],
        [3.42, 4.35, 0.32],
      ].map(([rx, rz, rs], idx) => (
        <mesh key={`cobble-${idx}`} position={[rx, rs * 0.26, rz]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[rs, 0]} />
          <meshStandardMaterial color={idx % 2 === 0 ? '#a8a29e' : '#94a3b8'} roughness={0.92} flatShading />
        </mesh>
      ))}
      {[
        [5.35, -3.4, 0.72],
        [5.65, 0.85, 0.78],
        [5.85, 3.25, 0.85],
        [-5.15, -3.85, 0.75],
        [-5.45, 1.95, 0.72],
        [3.15, -4.15, 0.68],
        [0.35, -4.25, 0.64],
      ].map(([fx, fz, fs], idx) => (
        <mesh key={`wf-shrub-${idx}`} position={[fx, fs * 0.42, fz]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[fs, 1]} />
          <meshStandardMaterial color={idx % 3 === 0 ? '#1e4620' : idx % 3 === 1 ? '#2b5232' : '#35613b'} roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* Parked Scooters once everyone dismounts on the left turnout */}
      {sittingOnBoulders && [DAY1_WATERFALL_ROCK_SEATS.ishaan, DAY1_WATERFALL_ROCK_SEATS.friend_black_tee].map((seat, i) => (
        <group key={`chips-${i}`} position={[seat.x + 0.2, seat.rockTopY + 0.1, seat.z - 0.05]} rotation={[0.15, seat.yaw, -0.2]}>
          <mesh><boxGeometry args={[0.13, 0.2, 0.06]} /><meshStandardMaterial color={i ? '#dc2626' : '#eab308'} roughness={0.65} /></mesh>
          <mesh position={[0, 0.025, -0.032]}><circleGeometry args={[0.04, 12]} /><meshStandardMaterial color="#fef3c7" side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
      {scootersParked && (
        <>
          <group position={[-3.35, 0.02, -1.6]} rotation={[0, -0.25, 0]}>
            <PrototypeScooter variant="lead" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
          </group>
          <group position={[-4.55, 0.02, -0.35]} rotation={[0, -0.32, 0]}>
            <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
          </group>
          {!sittingOnBoulders && (
            <HotspotBeaconSparkle
              position={[DAY1_WATERFALL_HOTSPOTS[0].x, 0.06, DAY1_WATERFALL_HOTSPOTS[0].z]}
              color="#fbbf24"
              paused={paused}
              reducedMotion={reducedMotion}
            />
          )}
          <HotspotBeaconSparkle
            position={[DAY1_WATERFALL_HOTSPOTS[1].x, 0.06, DAY1_WATERFALL_HOTSPOTS[1].z]}
            color="#38bdf8"
            paused={paused}
            reducedMotion={reducedMotion}
          />
        </>
      )}
    </>
  );
}

const NIGHT_DHABA_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-45, -10, -72], scale: [55, 28, 26], rotationY: 0.16, color: '#141d30' },
  { position: [24, -10, -78], scale: [64, 32, 28], rotationY: -0.12, color: '#172238' },
];

const NIGHT_STARS: ReadonlyArray<[number, number, number]> = [
  [-28, 19, -46],
  [-18, 22, -48],
  [-9, 17, -45],
  [-2, 24, -49],
  [7, 20, -47],
  [16, 23, -46],
  [25, 18, -48],
  [-24, 15, -44],
  [11, 15, -45],
  [21, 25, -49],
];

const MARKET_STREET_SLOTS = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10] as const;

const MARKET_SHOP_BUILDINGS = [
  { z: 8.4, side: -1, w: 3.1, h: 3.2, wall: '#e5d3bc', sign: '#0284c7', awning: '#d97706' },
  { z: 4.1, side: -1, w: 3.3, h: 2.9, wall: '#d8e2dc', sign: '#15803d', awning: '#0f766e' },
  { z: -0.6, side: -1, w: 3.0, h: 3.4, wall: '#f3d9b8', sign: '#b91c1c', awning: '#ea580c' },
  { z: -5.2, side: -1, w: 3.4, h: 2.8, wall: '#dcd4c6', sign: '#7c2d12', awning: '#b45309' },
  { z: 7.8, side: 1, w: 3.2, h: 3.0, wall: '#ebd7c3', sign: '#9333ea', awning: '#2563eb' },
  { z: 3.2, side: 1, w: 3.1, h: 3.3, wall: '#cfd8dc', sign: '#b45309', awning: '#047857' },
  { z: -1.4, side: 1, w: 3.4, h: 2.9, wall: '#e8d0ba', sign: '#0369a1', awning: '#ca8a04' },
  { z: -6.0, side: 1, w: 3.0, h: 3.1, wall: '#dde5df', sign: '#be123c', awning: '#c2410c' },
] as const;

const MARKET_BYSTANDERS = [
  { x: -2.05, z: 7.4, rotY: 1.5, top: '#dc2626', pants: '#1e293b' },
  { x: -2.05, z: 4.5, rotY: 1.4, top: '#0ea5e9', pants: '#1e293b' },
  { x: 2.02, z: 5.8, rotY: -1.4, top: '#ca8a04', pants: '#0f172a' },
  { x: 2.02, z: 0.4, rotY: -1.6, top: '#d97706', pants: '#334155' },
  { x: -1.88, z: -0.9, rotY: 1.15, top: '#7c3aed', pants: '#1e293b' },
  { x: -1.98, z: -4.2, rotY: 1.2, top: '#16a34a', pants: '#1f2937' },
  { x: 1.85, z: -3.1, rotY: -1.75, top: '#0284c7', pants: '#0f172a' },
  { x: 1.95, z: -6.8, rotY: -1.35, top: '#e11d48', pants: '#1e293b' },
  { x: -1.92, z: -8.1, rotY: 0.85, top: '#f59e0b', pants: '#1e293b' },
] as const;

/**
 * Day 1 ~5:00 PM — Warm Golden Roadside Maggi & Chai Stop:
 * Distinct afternoon stop right after the stream visit where all four eat hot Maggi before returning to the stay.
 */
export function Day1MaggiStopEnvironment({
  qualityProfile,
  paused,
}: {
  qualityProfile: QualityProfile;
  paused: boolean;
}) {
  const { scene } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#c99a74');
    scene.fog = new THREE.Fog('#d6ab88', 22, 95);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#c99a74']} />
      <fog attach="fog" args={['#d6ab88', 22, 95]} />

      <hemisphereLight args={['#ffe3bd', '#334d34', 0.96]} />
      <directionalLight
        position={[-18, 13, -18]}
        intensity={1.75}
        color="#ffbe76"
        castShadow={shadowsEnabled}
      />
      <pointLight position={[-1.95, 2.05, -2.15]} intensity={1.9} color="#fbbf24" distance={10} />

      <DistantHimalayanRidges ridges={WATERFALL_RIDGES} />

      {/* Hillside gravel apron + Rishikesh hill road */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[76, 60]} />
        <meshStandardMaterial color="#5f584c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.005, 5.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[72, 4.2]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      {[-12, -6, 0, 6, 12].map((dx) => (
        <mesh key={`maggi-dash-${dx}`} position={[dx, 0.006, 5.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 0.11]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.85} />
        </mesh>
      ))}

      {/* Roadside pine & sal trees framing background */}
      {[
        [-6.5, -5.2, 1.15],
        [-2.8, -6.2, 1.3],
        [2.2, -5.8, 1.2],
        [6.4, -4.8, 1.1],
        [5.8, 1.5, 1.05],
      ].map(([tx, tz, ts], idx) => (
        <group key={`mg-tree-${idx}`} position={[tx, 0, tz]} scale={[ts, ts, ts]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.13, 0.19, 2.2, 7]} />
            <meshStandardMaterial color="#4a3122" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.9, 0]} castShadow={shadowsEnabled}>
            <coneGeometry args={[1.1, 2.5, 7]} />
            <meshStandardMaterial color="#274c2e" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}

      {/* Hillside shrubs, boulders & golden signboard glow grounding the 5 PM Maggi stop */}
      {[
        [-4.2, -3.6, 0.72],
        [4.2, -3.4, 0.78],
        [3.8, 0.4, 0.65],
        [-4.8, 0.2, 0.68],
      ].map(([sx, sz, ss], idx) => (
        <mesh key={`mg-shrub-${idx}`} position={[sx, ss * 0.45, sz]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[ss, 1]} />
          <meshStandardMaterial color={idx % 2 === 0 ? '#2b5232' : '#35613b'} roughness={0.92} flatShading />
        </mesh>
      ))}
      {[
        [-3.2, -4.4, 0.46],
        [4.5, -2.1, 0.52],
        [2.9, -4.6, 0.48],
      ].map(([rx, rz, rs], idx) => (
        <mesh key={`mg-rock-${idx}`} position={[rx, rs * 0.35, rz]}>
          <dodecahedronGeometry args={[rs, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* Hillside Roadside Maggi Tapri Counter + Signboard + Brass Kettle */}
      <group position={[-2.15, 0, -2.35]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 1.25, -0.82]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.8, 2.5, 0.16]} />
          <meshStandardMaterial color="#6b442b" roughness={0.9} />
        </mesh>
        {[
          [-1.25, -0.7],
          [1.25, -0.7],
          [-1.25, 0.7],
          [1.25, 0.7],
        ].map(([px, pz], idx) => (
          <mesh key={`mg-post-${idx}`} position={[px, 1.25, pz]}>
            <cylinderGeometry args={[0.05, 0.055, 2.5, 7]} />
            <meshStandardMaterial color="#4e2e19" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 2.52, 0]} rotation={[0.15, 0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.2, 0.09, 1.85]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        {/* Bright Yellow Maggi Signboard */}
        <mesh position={[0, 2.26, 0.88]}>
          <boxGeometry args={[1.65, 0.36, 0.06]} />
          <meshStandardMaterial color="#facc15" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.45, 0.15]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.35, 0.9, 0.76]} />
          <meshStandardMaterial color="#784a2a" roughness={0.85} />
        </mesh>
        <mesh position={[0.45, 1.02, 0.12]}>
          <cylinderGeometry args={[0.16, 0.18, 0.22, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.45, 0.96, 0.15]}>
          <cylinderGeometry args={[0.2, 0.22, 0.1, 12]} />
          <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Wooden Maggi Table at Center (`DAY1_MAGGI_TABLE_CENTER`) */}
      <group position={[DAY1_MAGGI_TABLE_CENTER.x, 0, DAY1_MAGGI_TABLE_CENTER.z]}>
        <mesh position={[0, 0.73, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.55, 0.06, 1.12]} />
          <meshStandardMaterial color="#784a2a" roughness={0.84} />
        </mesh>
        {[
          [-0.65, -0.45],
          [0.65, -0.45],
          [-0.65, 0.45],
          [0.65, 0.45],
        ].map(([lx, lz], idx) => (
          <mesh key={`mg-leg-${idx}`} position={[lx, 0.36, lz]}>
            <boxGeometry args={[0.07, 0.72, 0.07]} />
            <meshStandardMaterial color="#4e2e19" roughness={0.88} />
          </mesh>
        ))}
        {/* 4 Steaming Yellow Maggi Bowls + Kulhad Chai Cups */}
        {[
          [0, 0.32],
          [0, -0.32],
          [-0.45, 0],
          [0.45, 0],
        ].map(([px, pz], idx) => (
          <group key={`mg-bowl-${idx}`} position={[px, 0.765, pz]}>
            <mesh>
              <cylinderGeometry args={[0.13, 0.09, 0.065, 12]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <sphereGeometry args={[0.1, 10, 6]} />
              <meshStandardMaterial color="#facc15" roughness={0.75} />
            </mesh>
            <mesh position={[0.14, 0.04, 0.05]}>
              <cylinderGeometry args={[0.036, 0.026, 0.075, 10]} />
              <meshStandardMaterial color="#b45309" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Four Grounded Wooden Stools */}
      {Object.entries(DAY1_MAGGI_SEATS).map(([key, seat]) => (
        <group key={`mg-stool-${key}`} position={[seat.x, 0, seat.z]}>
          <mesh position={[0, 0.41, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
            <meshStandardMaterial color="#784a2a" roughness={0.86} />
          </mesh>
          {[
            [-0.16, -0.16],
            [0.16, -0.16],
            [-0.16, 0.16],
            [0.16, 0.16],
          ].map(([lx, lz], idx) => (
            <mesh key={`mg-stleg-${idx}`} position={[lx, 0.2, lz]}>
              <boxGeometry args={[0.055, 0.4, 0.055]} />
              <meshStandardMaterial color="#4e2e19" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Both Parked Scooters on Roadside */}
      <group position={[-2.95, 0, 2.35]} rotation={[0, -0.25, 0]}>
        <PrototypeScooter variant="lead" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>
      <group position={[-4.25, 0, 2.15]} rotation={[0, -0.35, 0]}>
        <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>

      <HotspotBeaconSparkle
        position={[DAY1_MAGGI_HOTSPOTS[0].x, 0.06, DAY1_MAGGI_HOTSPOTS[0].z]}
        color="#fbbf24"
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

/**
 * Day 1 Night — Sloped Narrow Rishikesh Market Street:
 * Connects the interior residential lanes downhill toward the bright roadside dhaba turnout.
 */
export function Day1MarketWalkEnvironment({
  qualityProfile,
  paused,
}: {
  qualityProfile: QualityProfile;
  paused: boolean;
}) {
  const { scene } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#091020');
    scene.fog = new THREE.Fog('#0c1528', 16, 78);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#091020']} />
      <fog attach="fog" args={['#0c1528', 16, 78]} />

      <hemisphereLight args={['#3b537a', '#26212c', 0.54]} />
      <directionalLight position={[-6, 8, 12]} intensity={0.85} color="#ffe0ab" />
      <directionalLight position={[-10, 16, 12]} intensity={0.42} color="#93c5fd" />
      <pointLight position={[0, 2.5, 6]} intensity={2.2} color="#fbbf24" distance={13} />
      <pointLight position={[-4.0, 3.2, 5]} intensity={9} color="#ffd9a1" distance={18} />
      <pointLight position={[0, 2.2, -1]} intensity={2.4} color="#f59e0b" distance={14} />
      <pointLight position={[0, 2.1, -8.5]} intensity={3.1} color="#fbbf24" distance={15} />

      <DistantHimalayanRidges ridges={NIGHT_DHABA_RIDGES} />

      {NIGHT_STARS.map(([sx, sy, sz], idx) => (
        <mesh key={`mkt-star-${idx}`} position={[sx, sy, sz]}>
          <sphereGeometry args={[0.14, 6, 6]} />
          <meshBasicMaterial color="#fef9c3" />
        </mesh>
      ))}

      {/* Base hillside earth under street & flanking bazaar buildings */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[68, 56]} />
        <meshStandardMaterial color="#232833" roughness={0.96} />
      </mesh>

      {/* Sloped narrow Rishikesh cobbled market street segments following sampleMarketStreetY(z) */}
      {MARKET_STREET_SLOTS.map((sz, idx) => {
        const yCenter = (sampleMarketStreetY(sz - 1) + sampleMarketStreetY(sz + 1)) * 0.5;
        const slopePitch = Math.atan2(
          sampleMarketStreetY(sz + 1) - sampleMarketStreetY(sz - 1),
          2
        );
        return (
          <group key={`mkt-road-${idx}`} position={[0, yCenter, sz]} rotation={[slopePitch, 0, 0]}>
            <mesh position={[0, -0.04, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[9.4, 0.14, 2.25]} />
              <meshStandardMaterial color={idx % 2 === 0 ? '#5b5852' : '#53514c'} roughness={0.93} />
            </mesh>
            {/* Raised narrow concrete shop sidewalks */}
            <mesh position={[-4.15, 0.06, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[1.15, 0.22, 2.25]} />
              <meshStandardMaterial color="#6e685f" roughness={0.94} />
            </mesh>
            <mesh position={[4.15, 0.06, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[1.15, 0.22, 2.25]} />
              <meshStandardMaterial color="#6e685f" roughness={0.94} />
            </mesh>
          </group>
        );
      })}

      {/* Lit Small Market Shops Along Both Sides of Street */}
      {MARKET_SHOP_BUILDINGS.map((b, idx) => {
        const baseY = sampleMarketStreetY(b.z);
        const cx = b.side * 6.1;
        const innerFaceOffset = -b.side * 1.32;
        return (
          <group key={`shop-${idx}`} position={[cx, baseY, b.z]}>
            <mesh position={[0, b.h * 0.5, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[2.55, b.h, b.w]} />
              <meshStandardMaterial color={b.wall} roughness={0.88} />
            </mesh>
            {/* Lit shop window / open shutter glow */}
            <mesh position={[innerFaceOffset, 1.08, 0]}>
              <boxGeometry args={[0.12, 1.55, b.w * 0.68]} />
              <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.62} />
            </mesh>
            {/* Colorful awning + illuminated signboard */}
            <mesh position={[innerFaceOffset - b.side * 0.42, 2.08, 0]} rotation={[0, 0, b.side * 0.22]}>
              <boxGeometry args={[0.92, 0.08, b.w * 0.85]} />
              <meshStandardMaterial color={b.awning} roughness={0.78} />
            </mesh>
            <mesh position={[innerFaceOffset - b.side * 0.08, 2.45, 0]}>
              <boxGeometry args={[0.1, 0.42, b.w * 0.72]} />
              <meshStandardMaterial color={b.sign} emissive={b.sign} emissiveIntensity={0.28} />
            </mesh>
            <MarketShopSign side={b.side} label={['Ganga Cafe', 'Pahadi Dhaba', 'Valley Stay', 'Chai & Books', 'Handloom House'][idx % 5]} />
          </group>
        );
      })}

      {/* Warm Hanging Overhead Festoon Bulb Strings & Curbs Along 9 PM Market */}
      {[9.0, 5.5, 2.0, -1.5, -5.0, -8.5].map((fz, fIdx) => {
        const y = sampleMarketStreetY(fz) + 3.25;
        return (
          <group key={`festoon-${fIdx}`} position={[0, y, fz]}>
            <mesh>
              <boxGeometry args={[6.4, 0.02, 0.02]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            {[-2.4, -1.4, -0.45, 0.45, 1.4, 2.4].map((bx, bIdx) => (
              <mesh key={`fbulb-${bIdx}`} position={[bx, -0.09 - Math.cos(bx * 0.45) * 0.08, 0]}>
                <sphereGeometry args={[0.075, 8, 8]} />
                <meshStandardMaterial
                  color={bIdx % 2 === 0 ? '#fef08a' : '#fed7aa'}
                  emissive="#fbbf24"
                  emissiveIntensity={1.65}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Colorful Street-Side Stalls & Textile Displays Outside Open Market Shutters */}
      {[-6.5, -2.0, 2.5, 6.2].map((sz, sIdx) => (
        <group
          key={`curb-stall-${sIdx}`}
          position={[sIdx % 2 === 0 ? -5.0 : 5.0, sampleMarketStreetY(sz), sz]}
        >
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.72, 0.84, 1.45]} />
            <meshStandardMaterial color={sIdx % 2 === 0 ? '#92400e' : '#0f766e'} roughness={0.85} />
          </mesh>
          <mesh position={[sIdx % 2 === 0 ? 0.2 : -0.2, 0.92, -0.28]}>
            <cylinderGeometry args={[0.18, 0.14, 0.22, 10]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.65} />
          </mesh>
          <mesh position={[sIdx % 2 === 0 ? 0.2 : -0.2, 0.92, 0.28]}>
            <cylinderGeometry args={[0.18, 0.14, 0.22, 10]} />
            <meshStandardMaterial color="#e11d48" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* Warm Hanging Bazaar Streetlamps & Parked Curb Scooters */}
      {[-7.2, -1.2, 4.8].map((lz, idx) => {
        const side = idx % 2 === 0 ? -1 : 1;
        const y = sampleMarketStreetY(lz);
        return (
          <group key={`lamp-${idx}`} position={[side * 2.55, y, lz]}>
            <mesh position={[0, 1.85, 0]}>
              <cylinderGeometry args={[0.045, 0.06, 3.7, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[-side * 0.55, 3.55, 0]}>
              <sphereGeometry args={[0.11, 8, 8]} />
              <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1.65} />
            </mesh>
          </group>
        );
      })}
      <group position={[-5.0, sampleMarketStreetY(2.2), 2.2]} rotation={[0, 0.14, 0]}>
        <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>
      <group position={[5.0, sampleMarketStreetY(-4.4), -4.4]} rotation={[0, -0.18, 0]}>
        <PrototypeScooter variant="lead" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>

      {/* Shopkeepers & Evening Locals Walking/Standing Beside Open Market Stalls */}
      {MARKET_BYSTANDERS.map((p, idx) => (
        <group
          key={`mkt-person-${idx}`}
          position={[p.x < 0 ? -5.15 : 5.15, sampleMarketStreetY(p.z), p.z]}
          rotation={[0, p.rotY, 0]}
        >
          <mesh position={[-0.07, 0.39, 0]}>
            <cylinderGeometry args={[0.065, 0.058, 0.78, 8]} />
            <meshStandardMaterial color={p.pants} roughness={0.88} />
          </mesh>
          <mesh position={[0.07, 0.39, 0]}>
            <cylinderGeometry args={[0.065, 0.058, 0.78, 8]} />
            <meshStandardMaterial color={p.pants} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow={shadowsEnabled}>
            <FabricGeometry top={0.16} bottom={0.14} height={0.54} />
            <meshStandardMaterial color={p.top} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.43, 0]}>
            <sphereGeometry args={[0.115, 10, 8]} />
            <meshStandardMaterial color="#d29c76" roughness={0.76} />
          </mesh>
        </group>
      ))}

      <MarketRoadLife paused={paused} sampleY={sampleMarketStreetY} />
      {/* Glowing Dhaba Entry Beacon Ahead at Road Bottom (`z = -9.4`) */}
      <group position={[0, sampleMarketStreetY(-11.5), -11.6]}>
        <mesh position={[0, 1.65, -0.5]}>
          <boxGeometry args={[4.4, 2.8, 1.8]} />
          <meshStandardMaterial color="#583724" roughness={0.88} />
        </mesh>
        <mesh position={[0, 2.55, 0.45]}>
          <boxGeometry args={[2.5, 0.45, 0.08]} />
          <meshStandardMaterial color="#b45309" emissive="#f59e0b" emissiveIntensity={0.65} />
        </mesh>
      </group>
      <HotspotBeaconSparkle
        position={[DAY1_MARKET_HOTSPOTS[0].x, sampleMarketStreetY(DAY1_MARKET_HOTSPOTS[0].z) + 0.06, DAY1_MARKET_HOTSPOTS[0].z]}
        color="#fbbf24"
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

const DHABA_PATRON_TABLES = [
  {
    tx: -3.45,
    tz: 2.15,
    patrons: [
      { x: -3.45, z: 2.95, yaw: Math.PI, top: '#2563eb' },
      { x: -2.45, z: 2.15, yaw: -Math.PI * 0.5, top: '#16a34a' },
    ],
  },
  {
    tx: 3.75,
    tz: -1.65,
    patrons: [
      { x: 3.75, z: -2.45, yaw: 0, top: '#d97706' },
      { x: 2.85, z: -1.65, yaw: Math.PI * 0.5, top: '#dc2626' },
    ],
  },
] as const;

/**
 * Day 1 Night Roadside Dhaba Scene:
 * Deep starry night sky, warm glowing amber bulbs, lively tandoor cook + multiple occupied diner tables,
 * roadside guardrail, parked scooters, and grounded wooden stools for late dinner.
 */
export function Day1NightDhabaEnvironment({
  qualityProfile,
}: {
  qualityProfile: QualityProfile;
}) {
  const { scene } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#070c18');
    scene.fog = new THREE.Fog('#0a1122', 18, 95);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#070c18']} />
      <fog attach="fog" args={['#0a1122', 18, 95]} />

      <hemisphereLight args={['#4e6a96', '#262430', 0.64]} />
      <directionalLight position={[-12, 18, -14]} intensity={0.55} color="#bfdbfe" />
      {/* Warm hanging tungsten bulbs above the dinner table & dhaba kitchen */}
      <pointLight
        position={[DAY1_NIGHT_DHABA_TABLE_CENTER.x, 2.35, DAY1_NIGHT_DHABA_TABLE_CENTER.z]}
        intensity={4.1}
        color="#fbbf24"
        distance={15}
      />
      <pointLight position={[-2.9, 2.1, -2.5]} intensity={3.1} color="#f59e0b" distance={12} />
      <pointLight position={[3.8, 2.1, -1.6]} intensity={2.2} color="#fbbf24" distance={10} />
      {/* Roadside perimeter trees & neighbor lit shop glow behind highway dhaba */}
      {[
        [-7.5, -5.8, 1.15],
        [6.8, -5.2, 1.2],
        [8.2, -0.5, 1.05],
      ].map(([tx, tz, ts], idx) => (
        <group key={`dh-tree-${idx}`} position={[tx, 0, tz]} scale={[ts, ts, ts]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.13, 0.18, 2.0, 7]} />
            <meshStandardMaterial color="#3b271c" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[1.05, 2.3, 7]} />
            <meshStandardMaterial color="#1f3b26" roughness={0.92} flatShading />
          </mesh>
        </group>
      ))}
      <group position={[5.6, 0, -4.8]}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[2.6, 2.8, 1.8]} />
          <meshStandardMaterial color="#4a3b32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.2, 0.94]}>
          <boxGeometry args={[1.8, 1.4, 0.08]} />
          <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.55} />
        </mesh>
      </group>

      <DistantHimalayanRidges ridges={NIGHT_DHABA_RIDGES} />

      {/* Crisp twinkling stars across the night sky */}
      {NIGHT_STARS.map(([sx, sy, sz], idx) => (
        <mesh key={`star-${idx}`} position={[sx, sy, sz]}>
          <sphereGeometry args={[0.14, 6, 6]} />
          <meshBasicMaterial color="#fef9c3" />
        </mesh>
      ))}

      {/* Ground gravel dhaba apron & paved highway strip */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[76, 62]} />
        <meshStandardMaterial color="#2b2f38" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.01, 6.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[66, 4.4]} />
        <meshStandardMaterial color="#1f242d" roughness={0.92} />
      </mesh>

      {/* Cozy Nighttime Dhaba Kitchen Shed & Glowing Amber Bulbs */}
      <group position={[-2.9, 0, -2.6]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 1.35, -0.95]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.4, 2.7, 0.2]} />
          <meshStandardMaterial color="#4a3122" roughness={0.9} />
        </mesh>
        {[
          [-1.5, -0.75],
          [1.5, -0.75],
          [-1.5, 0.85],
          [1.5, 0.85],
        ].map(([px, pz], idx) => (
          <mesh key={`dh-post-${idx}`} position={[px, 1.35, pz]}>
            <cylinderGeometry args={[0.055, 0.065, 2.7, 7]} />
            <meshStandardMaterial color="#3c2618" roughness={0.9} />
          </mesh>
        ))}
        {/* Sloped corrugated dhaba roof */}
        <mesh position={[0, 2.75, 0]} rotation={[0.16, 0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.9, 0.1, 2.3]} />
          <meshStandardMaterial color="#475569" roughness={0.78} metalness={0.3} />
        </mesh>
        {/* Dhaba signboard */}
        <mesh position={[0, 2.48, 1.08]}>
          <boxGeometry args={[1.85, 0.34, 0.06]} />
          <meshStandardMaterial color="#92400e" roughness={0.7} />
        </mesh>
        {/* Food preparation counter + glowing tandoor coal embers */}
        <mesh position={[0, 0.48, 0.12]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.6, 0.96, 0.85]} />
          <meshStandardMaterial color="#6d482f" roughness={0.86} />
        </mesh>
        <mesh position={[-0.75, 1.02, 0.1]}>
          <cylinderGeometry args={[0.24, 0.26, 0.16, 12]} />
          <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.1} />
        </mesh>
        {/* Warm hanging fairy bulbs along eaves */}
        {[-1.2, 0, 1.2].map((bx) => (
          <mesh key={bx} position={[bx, 2.52, 0.96]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1.5} />
          </mesh>
        ))}
      </group>

      {/* Overhead Hanging Warm Bulb String Over Dinner Table */}
      <mesh position={[DAY1_NIGHT_DHABA_TABLE_CENTER.x, 2.46, DAY1_NIGHT_DHABA_TABLE_CENTER.z]}>
        <sphereGeometry args={[0.085, 10, 10]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fbbf24" emissiveIntensity={1.7} />
      </mesh>

      {/* Grounded 4-Person Wooden Dhaba Table (Top surface y = 0.76m) */}
      <group position={[DAY1_NIGHT_DHABA_TABLE_CENTER.x, 0, DAY1_NIGHT_DHABA_TABLE_CENTER.z]}>
        <mesh position={[0, 0.73, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.55, 0.06, 1.12]} />
          <meshStandardMaterial color="#784a2a" roughness={0.84} />
        </mesh>
        {[
          [-0.65, -0.45],
          [0.65, -0.45],
          [-0.65, 0.45],
          [0.65, 0.45],
        ].map(([lx, lz], idx) => (
          <mesh key={`tbl-leg-${idx}`} position={[lx, 0.36, lz]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.075, 0.72, 0.075]} />
            <meshStandardMaterial color="#4e2e19" roughness={0.88} />
          </mesh>
        ))}
        {/* 4 Steaming Dinner Thalis with Curry Bowls */}
        {[
          [0, 0.32],
          [0, -0.32],
          [-0.45, 0],
          [0.45, 0],
        ].map(([px, pz], idx) => (
          <group key={`thali-${idx}`} position={[px, 0.765, pz]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.14, 0.025, 14]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.28} />
            </mesh>
            <mesh position={[0.04, 0.028, -0.02]}>
              <cylinderGeometry args={[0.055, 0.045, 0.04, 10]} />
              <meshStandardMaterial color="#eab308" roughness={0.65} />
            </mesh>
            <mesh position={[-0.04, 0.02, 0.03]}>
              <cylinderGeometry args={[0.06, 0.06, 0.015, 10]} />
              <meshStandardMaterial color="#f5e1b8" roughness={0.82} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Four Proper 4-Legged Grounded Wooden Stools (`seatTopY = 0.44m`, flush to thighs at groundY = 0) */}
      {Object.entries(DAY1_NIGHT_DHABA_SEATS).map(([key, seat]) => (
        <group key={`stool-${key}`} position={[seat.x, 0, seat.z]}>
          <mesh position={[0, 0.41, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
            <meshStandardMaterial color="#784a2a" roughness={0.86} />
          </mesh>
          {[
            [-0.16, -0.16],
            [0.16, -0.16],
            [-0.16, 0.16],
            [0.16, 0.16],
          ].map(([lx, lz], idx) => (
            <mesh key={`stleg-${idx}`} position={[lx, 0.2, lz]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.055, 0.4, 0.055]} />
              <meshStandardMaterial color="#4e2e19" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Parked Scooters Outside Lively Night Dhaba */}
      <group position={[2.85, 0, 2.25]} rotation={[0, -1.9, 0]}>
        <PrototypeScooter variant="lead" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>
      <group position={[4.15, 0, 2.35]} rotation={[0, -2.05, 0]}>
        <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>
      <group position={[-6.0, 0, 3.65]} rotation={[0, 1.45, 0]}>
        <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders outfitMode="day1" />
      </group>

      {/* Dhaba Cook Busy Behind the Steaming Kitchen Counter */}
      <group position={[-2.9, 0, -2.6]} rotation={[0, 0.25, 0]}>
        <group position={[0.15, 0, -0.35]}>
          <mesh position={[0, 1.0, 0]}>
            <FabricGeometry top={0.17} bottom={0.15} height={0.56} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.43, 0]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color="#d29c76" roughness={0.76} />
          </mesh>
        </group>
      </group>

      {/* Additional Occupied Roadside Dhaba Tables & Patrons for Bustling Lively Atmosphere */}
      {DHABA_PATRON_TABLES.map((tbl, tIdx) => (
        <group key={`extra-dhaba-${tIdx}`}>
          <group position={[tbl.tx, 0, tbl.tz]}>
            <mesh position={[0, 0.72, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.25, 0.06, 0.92]} />
              <meshStandardMaterial color="#784a2a" roughness={0.84} />
            </mesh>
            {[
              [-0.5, -0.36],
              [0.5, -0.36],
              [-0.5, 0.36],
              [0.5, 0.36],
            ].map(([lx, lz], lIdx) => (
              <mesh key={`exleg-${lIdx}`} position={[lx, 0.35, lz]}>
                <boxGeometry args={[0.065, 0.7, 0.065]} />
                <meshStandardMaterial color="#4e2e19" roughness={0.88} />
              </mesh>
            ))}
            <mesh position={[0, 2.35, 0]}>
              <sphereGeometry args={[0.075, 8, 8]} />
              <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1.55} />
            </mesh>
          </group>
          {tbl.patrons.map((p, pIdx) => (
            <group key={`patron-${tIdx}-${pIdx}`} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
              {/* Wooden four-legged stool + seat slab */}
              <mesh position={[0, 0.41, 0]}>
                <boxGeometry args={[0.42, 0.055, 0.42]} />
                <meshStandardMaterial color="#6e4324" roughness={0.86} />
              </mesh>
              {[
                [-0.16, -0.16],
                [0.16, -0.16],
                [-0.16, 0.16],
                [0.16, 0.16],
              ].map(([lx, lz], lIdx) => (
                <mesh key={`pleg-${lIdx}`} position={[lx, 0.2, lz]}>
                  <boxGeometry args={[0.05, 0.4, 0.05]} />
                  <meshStandardMaterial color="#4e2e19" roughness={0.9} />
                </mesh>
              ))}
              {/* Seated patron lower legs + thighs resting solidly on stool (y=0.44 -> ground y=0.04) */}
              <mesh position={[-0.08, 0.48, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.062, 0.058, 0.34, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.88} />
              </mesh>
              <mesh position={[0.08, 0.48, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.062, 0.058, 0.34, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.88} />
              </mesh>
              <mesh position={[-0.08, 0.24, -0.26]}>
                <cylinderGeometry args={[0.058, 0.052, 0.42, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.88} />
              </mesh>
              <mesh position={[0.08, 0.24, -0.26]}>
                <cylinderGeometry args={[0.058, 0.052, 0.42, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.88} />
              </mesh>
              {/* Torso seated flush at y=0.72 */}
              <mesh position={[0, 0.72, 0]} castShadow={shadowsEnabled}>
                <FabricGeometry top={0.15} bottom={0.14} height={0.48} />
                <meshStandardMaterial color={p.top} roughness={0.82} />
              </mesh>
              <mesh position={[0, 1.1, 0]}>
                <sphereGeometry args={[0.11, 10, 8]} />
                <meshStandardMaterial color="#c9936d" roughness={0.76} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Roadside Reflective W-Beam Crash Guardrail Framing Highway Margin */}
      <mesh position={[0, 0.48, 8.35]}>
        <boxGeometry args={[42, 0.14, 0.09]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.45} />
      </mesh>
    </>
  );
}

