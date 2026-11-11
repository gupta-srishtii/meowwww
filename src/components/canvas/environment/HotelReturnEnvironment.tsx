'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
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
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getAsphaltRoadTexture, getStoneCourtyardTexture } from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { createTerrainMeshSampler } from '@/lib/terrainMeshSampler';

export const TERRACE_Y = 4.65;

export const HOTEL_WALK_BOUNDS: WalkBounds = {
  minX: -5.1,
  maxX: 5.1,
  minZ: -0.25,
  maxZ: 7.45,
};

export const TERRACE_WALK_BOUNDS: WalkBounds = {
  minX: -4.15,
  maxX: 4.15,
  minZ: -5.35,
  maxZ: -0.95,
};

export const HOTEL_OBSTACLES: readonly WalkObstacle[] = [
  // Parked scooters on left yard corner
  { kind: 'box', minX: -4.75, maxX: -2.25, minZ: 1.55, maxZ: 2.85 },
  // Lane border planter boxes flanking interior alley mouth
  { kind: 'box', minX: -5.4, maxX: -2.55, minZ: 3.85, maxZ: 7.6 },
  { kind: 'box', minX: 2.55, maxX: 5.4, minZ: 3.85, maxZ: 7.6 },
  // Exterior staircase side parapet block
  { kind: 'box', minX: 2.45, maxX: 4.55, minZ: -0.35, maxZ: 0.72 },
  // Srishti's original Rishikesh trip friends standing in a natural casual circle
  { kind: 'circle', x: 0.92, z: 3.05, radius: 0.36 },
  { kind: 'circle', x: 1.85, z: 3.65, radius: 0.36 },
  { kind: 'circle', x: 0.62, z: 4.18, radius: 0.36 },
];

export const TERRACE_OBSTACLES: readonly WalkObstacle[] = [
  // Water tank platform on NW corner
  { kind: 'box', minX: -4.45, maxX: -2.85, minZ: -5.65, maxZ: -4.25 },
  // Plastic tea table & chairs
  { kind: 'circle', x: 1.15, z: -4.15, radius: 0.72 },
];

export const HOTEL_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'go_to_terrace',
    label: 'Walk Up to Rooftop Terrace',
    x: 3.32,
    z: 1.25,
    radius: 1.55,
    actionType: 'interact',
  },
  {
    id: 'rejoin_farewell',
    label: "Meet Srishti's Friends & Wave Goodbye",
    x: 0.95,
    z: 2.55,
    radius: 1.95,
    actionType: 'interact',
  },
];

export const TERRACE_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'back_to_lane',
    label: 'Go Downstairs to House Lane',
    x: 3.35,
    z: -1.45,
    radius: 1.6,
    actionType: 'interact',
  },
];

function smooth01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sampleTownBasinY(wx: number, wz: number): number {
  // Keep Rishikesh street, interior lane, and neighboring house blocks flat around y = -0.04
  const edgeX = Math.max(0, Math.abs(wx) - 24.0);
  const edgeNorth = Math.max(0, -14.0 - wz);
  const rise = Math.max(edgeX * 0.65, edgeNorth * 0.78);
  const hillMask = smooth01(rise / 10.0);
  const undulate =
    (Math.sin(wx * 0.085) * 1.4 + Math.cos(wz * 0.075 + 0.6) * 1.6) * hillMask;
  return -0.04 + Math.pow(rise + 0.001, 0.85) * 0.62 + undulate;
}

const _townSoil = new THREE.Color('#65685a');
const _hillPine = new THREE.Color('#35523b');
const _townMoss = new THREE.Color('#4a6643');

function sampleTownTerrainColor(wx: number, _wz: number, y: number, out: THREE.Color): void {
  const greenBlend = smooth01((y - 0.35) / 5.5);
  out.copy(_townSoil).lerp(_townMoss, greenBlend * 0.85);
  if (y > 4.0) {
    out.lerp(_hillPine, smooth01((y - 4.0) / 8.0) * 0.65 + (Math.sin(wx * 0.25) * 0.5 + 0.5) * 0.15);
  }
}

const HOTEL_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-72, -11, -72], scale: [62, 34, 30], rotationY: 0.2, color: '#3b4a5e' },
  { position: [4, -10, -84], scale: [74, 38, 34], rotationY: -0.08, color: '#3f5066' },
  { position: [76, -11, -72], scale: [60, 34, 30], rotationY: -0.24, color: '#3a495d' },
  { position: [-44, -9, -116], scale: [72, 42, 36], rotationY: 0.14, color: '#4f5a75' },
  { position: [50, -9, -120], scale: [72, 42, 36], rotationY: -0.18, color: '#535e79' },
];

export const ORIGIN_FRIEND_SLOTS = [
  { x: 0.82, z: 3.12, rotY: 0.72, shirt: '#db2777', trousers: '#1e293b', hair: '#1c1917' },
  { x: 1.88, z: 3.58, rotY: -1.18, shirt: '#2563eb', trousers: '#334155', hair: '#292524' },
  { x: 0.58, z: 4.22, rotY: 2.35, shirt: '#ea580c', trousers: '#1e293b', hair: '#18181b' },
] as const;

export const DAY1_WALK_BOUNDS: WalkBounds = {
  minX: -4.8,
  maxX: 4.8,
  minZ: -1.95,
  maxZ: 7.45,
};

export const DAY1_OBSTACLES: readonly WalkObstacle[] = [
  // Interior room walls keeping doorway x = [-1.05..0.15] cleanly open into yard
  { kind: 'box', minX: -5.2, maxX: -1.12, minZ: -1.25, maxZ: -0.35 },
  { kind: 'box', minX: 0.22, maxX: 5.2, minZ: -1.25, maxZ: -0.35 },
  // Ground-floor bed & bag inside foyer
  { kind: 'box', minX: -2.05, maxX: -0.85, minZ: -4.3, maxZ: -2.35 },
  // Parked scooters on left yard corner
  { kind: 'box', minX: -4.75, maxX: -2.25, minZ: 1.55, maxZ: 2.85 },
  // Lane borders
  { kind: 'box', minX: -5.4, maxX: -2.55, minZ: 3.85, maxZ: 7.6 },
  { kind: 'box', minX: 2.55, maxX: 5.4, minZ: 3.85, maxZ: 7.6 },
  { kind: 'box', minX: 2.45, maxX: 4.55, minZ: -0.35, maxZ: 0.72 },
  // Shree's original friends waiting separately near side stair/courtyard
  { kind: 'circle', x: 0.92, z: 3.05, radius: 0.36 },
  { kind: 'circle', x: 1.85, z: 3.65, radius: 0.36 },
  { kind: 'circle', x: 0.62, z: 4.18, radius: 0.36 },
];

export const DAY1_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'greet_kanishka',
    label: 'Meet Kanishka & Your Group',
    x: 0.72,
    z: 2.95,
    radius: 1.55,
    actionType: 'interact',
  },
  {
    id: 'go_to_terrace',
    label: 'See the Terrace View',
    x: 3.32,
    z: 1.25,
    radius: 1.55,
    actionType: 'interact',
  },
  {
    id: 'day1_scooter_maggi',
    label: 'Go for Evening Waterfall Ride',
    x: -2.95,
    z: 2.75,
    radius: 1.85,
    actionType: 'interact',
  },
];

export const DAY2_MORNING_WALK_BOUNDS: WalkBounds = {
  minX: -5.1,
  maxX: 18.2,
  minZ: -0.25,
  maxZ: 12.6,
};

export const DAY2_MORNING_OBSTACLES: readonly WalkObstacle[] = [
  { kind: 'box', minX: -4.75, maxX: -2.25, minZ: 1.55, maxZ: 2.85 },
  { kind: 'box', minX: -5.4, maxX: -2.55, minZ: 3.85, maxZ: 7.6 },
  { kind: 'box', minX: 2.55, maxX: 5.4, minZ: 3.85, maxZ: 7.6 },
  { kind: 'box', minX: 4.1, maxX: 8.7, minZ: 3.9, maxZ: 7.6 },
  { kind: 'box', minX: 9.6, maxX: 13.4, minZ: 3.9, maxZ: 7.6 },
  { kind: 'box', minX: 2.45, maxX: 4.55, minZ: -0.35, maxZ: 0.72 },
  // Distant town-road bun-maska & chai stall counter + bench well away from hotel
  { kind: 'box', minX: 14.3, maxX: 16.4, minZ: 7.05, maxZ: 8.35 },
  { kind: 'box', minX: 13.4, maxX: 14.3, minZ: 7.05, maxZ: 7.82 },
];

export const DAY2_MORNING_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'bun_maska_chai',
    label: 'Have Bun Maska & Chai Together',
    x: 15.6,
    z: 9.15,
    radius: 2.0,
    actionType: 'interact',
  },
  {
    id: 'depart_neelkanth',
    label: 'Hop on Scooters Toward Neelkanth',
    x: -2.75,
    z: 2.55,
    radius: 1.85,
    actionType: 'interact',
  },
];

export const TERRACE_GROUP_SLOTS = [
  { x: -1.15, z: -4.45, rotY: -0.22, shirt: '#db2777', trousers: '#1e293b', hair: '#1c1917', isKanishka: true },
  { x: -2.05, z: -4.65, rotY: 0.18, shirt: '#2563eb', trousers: '#334155', hair: '#292524', isKanishka: false },
  { x: -2.65, z: -3.95, rotY: -0.34, shirt: '#ea580c', trousers: '#1e293b', hair: '#18181b', isKanishka: false },
] as const;

export interface HotelReturnEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  farewellDone: boolean;
  onTerrace: boolean;
  variant?: 'evening_return' | 'day1_stay' | 'day2_morning';
  hideOriginFriends?: boolean;
  morningBreakfastActive?: boolean;
  day1Done?: boolean;
  morningBreakfastDone?: boolean;
  nightReturn?: boolean;
}

/**
 * Scene 12 Environment — Rishikesh Main Road Corner turning into a Narrow Residential Lane,
 * Modest 2-Storey House/Guesthouse Stay, Accessible Rooftop Terrace overlooking neighborhood rooftops & hills.
 */
export function HotelReturnEnvironment({
  qualityProfile,
  paused,
  farewellDone,
  onTerrace,
  variant = 'evening_return',
  hideOriginFriends = false,
  day1Done = false,
  morningBreakfastDone = false,
  nightReturn = false,
}: HotelReturnEnvironmentProps) {
  const { scene } = useThree();
  const isDay1 = variant === 'day1_stay';
  const isMorning = variant === 'day2_morning';
  const skyHex = nightReturn
    ? '#0a1224'
    : isMorning
      ? '#cbe6f7'
      : isDay1
        ? '#c5dff3'
        : '#dc9e74';
  const fogHex = nightReturn
    ? '#0d162c'
    : isMorning
      ? '#d9ecfa'
      : isDay1
        ? '#cfe3f3'
        : '#d8a17d';

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.Fog(
      fogHex,
      nightReturn ? 28 : isMorning || isDay1 ? 52 : 42,
      nightReturn ? 120 : isMorning || isDay1 ? 210 : 185
    );
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene, skyHex, fogHex, isMorning, isDay1, nightReturn]);
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const courtyardTex = useMemo(() => getStoneCourtyardTexture(), []);
  const asphaltTex = useMemo(() => getAsphaltRoadTexture(), []);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 170,
        depth: 160,
        centerX: 0,
        centerZ: -20,
        segX: 72,
        segZ: 68,
        heightFn: sampleTownBasinY,
        colorFn: sampleTownTerrainColor,
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

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);
  const friendGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const lanternLightsRef = useRef<(THREE.Mesh | null)[]>([]);
  const phaseRef = useRef(0);

  const MAX_PINES = 48;
  const pineTransforms = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINES; i += 1) {
      const band = i % 3;
      const side = i % 2 === 0 ? -1 : 1;
      const x =
        band === 0
          ? -38 + ((i * 7.2) % 76)
          : side * (19.5 + (i % 7) * 4.4);
      const z =
        band === 0
          ? -20 - (i % 6) * 5.2
          : -28 + ((i * 5.8) % 44);
      const scale = 0.88 + ((i * 5) % 6) * 0.09;
      const groundY = terrainSampler.trySampleY(x, z) ?? sampleTownBasinY(x, z);
      items.push([x, groundY - 0.25 * scale, z, scale]);
    }
    return items;
  }, [terrainSampler]);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = MAX_PINES;
    crownInstRef.current.count = MAX_PINES;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < MAX_PINES; i += 1) {
      const [x, y, z, s] = pineTransforms[i];
      dummy.position.set(x, y + 1.0 * s, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, y + 2.65 * s, z);
      dummy.scale.set(s * 1.1, s * 1.25, s * 1.1);
      dummy.updateMatrix();
      crownInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    crownInstRef.current.instanceMatrix.needsUpdate = true;
  }, [pineTransforms]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion) return;
    const delta = Math.min(rawDelta, 0.05);
    phaseRef.current += delta;

    // Natural staggered conversation idle on Srishti's Rishikesh friends (Kanishka + group)
    friendGroupRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const baseRot = onTerrace
        ? (TERRACE_GROUP_SLOTS[idx]?.rotY ?? 0)
        : (ORIGIN_FRIEND_SLOTS[idx]?.rotY ?? 0);
      const baseY = onTerrace ? TERRACE_Y : 0;
      const sway = Math.sin(phaseRef.current * 1.15 + idx * 1.7);
      grp.rotation.y = baseRot + sway * 0.07;
      grp.position.y = baseY + Math.abs(Math.sin(phaseRef.current * 1.9 + idx * 1.3)) * 0.015;
    });

    lanternLightsRef.current.forEach((bulb, idx) => {
      if (!bulb) return;
      const mat = bulb.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.85 + Math.sin(phaseRef.current * 2.2 + idx * 0.9) * 0.18;
    });
  });

  return (
    <>
      {/* Horizon backdrop (fresh morning/daytime, warm dusk return, or quiet starry night) */}
      <color attach="background" args={[skyHex]} />
      <fog
        attach="fog"
        args={[fogHex, nightReturn ? 28 : isMorning || isDay1 ? 52 : 42, nightReturn ? 120 : isMorning || isDay1 ? 210 : 185]}
      />

      <hemisphereLight
        args={[
          nightReturn ? '#3b537a' : isMorning ? '#e0f2fe' : isDay1 ? '#e2f0fc' : '#ffd7b0',
          nightReturn ? '#1e202b' : isMorning || isDay1 ? '#4d6048' : '#48545c',
          nightReturn ? 0.56 : isMorning ? 1.02 : 0.94,
        ]}
      />
      <directionalLight
        position={isMorning ? [28, 36, 18] : isDay1 ? [20, 32, -24] : [-34, 24, -46]}
        intensity={nightReturn ? 0.52 : isMorning ? 1.7 : 1.55}
        color={nightReturn ? '#93c5fd' : isMorning ? '#fff6de' : isDay1 ? '#fff1d6' : '#ffbe7e'}
        castShadow={shadowsEnabled}
        shadow-mapSize-width={qualityProfile === 'high' ? 1024 : 512}
        shadow-mapSize-height={qualityProfile === 'high' ? 1024 : 512}
        shadow-camera-near={5}
        shadow-camera-far={110}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />
      <pointLight position={[0, 2.55, 0.5]} intensity={1.7} color="#fbbf24" distance={14} />
      <pointLight position={[0, TERRACE_Y + 2.25, -3.2]} intensity={1.45} color="#fde68a" distance={15} />

      {/* Sculpted Rishikesh Town Basin Connected to Hills & Himalayan Horizon */}
      <ConnectedHillTerrain
        width={170}
        depth={160}
        centerX={0}
        centerZ={-20}
        segX={72}
        segZ={68}
        heightFn={sampleTownBasinY}
        colorFn={sampleTownTerrainColor}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={HOTEL_RIDGES} />

      {/* Foothill pine cluster behind the town neighborhood */}
      <instancedMesh ref={trunkInstRef} args={[undefined, undefined, MAX_PINES]} castShadow={shadowsEnabled}>
        <cylinderGeometry args={[0.13, 0.19, 2.0, 7]} />
        <meshStandardMaterial color="#583c2b" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownInstRef} args={[undefined, undefined, MAX_PINES]} castShadow={shadowsEnabled}>
        <coneGeometry args={[1.05, 2.45, 7]} />
        <meshStandardMaterial color="#2a4e32" roughness={0.9} flatShading />
      </instancedMesh>

      {/* 1. RISHIKESH MAIN ROAD (`z = 7.4..12.6`) + SIDEWALK */}
      <mesh position={[0, -0.005, 10.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[92, 5.4]} />
        <meshStandardMaterial
          color="#5c6674"
          map={asphaltTex ?? undefined}
          roughness={0.9}
        />
      </mesh>
      {[-28, -20, -12, -4, 4, 12, 20, 28].map((rx) => (
        <mesh key={rx} position={[rx, 0.006, 10.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 0.12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
        </mesh>
      ))}
      {/* Main-road shuttered chai/kirana shop LEFT of interior lane turn */}
      <group position={[-6.2, 0, 5.65]}>
        <mesh position={[0, 1.85, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[4.4, 3.7, 3.6]} />
          <meshStandardMaterial color="#e4dac8" roughness={0.88} />
        </mesh>
        {/* Sky-blue rolled shop shutter facing main road */}
        <mesh position={[0, 1.32, 1.82]}>
          <boxGeometry args={[2.75, 2.15, 0.08]} />
          <meshStandardMaterial color="#2563eb" roughness={0.62} metalness={0.28} />
        </mesh>
        {/* Warm orange shopfront sun awning + crate stack */}
        <mesh position={[0, 2.62, 2.25]} rotation={[0.25, 0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.4, 0.08, 1.05]} />
          <meshStandardMaterial color="#c2410c" roughness={0.82} />
        </mesh>
        <mesh position={[1.65, 0.35, 2.05]}>
          <boxGeometry args={[0.62, 0.7, 0.55]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.85} />
        </mesh>
      </group>
      {/* Main-road general provision store RIGHT of interior lane turn */}
      <group position={[6.4, 0, 5.75]}>
        <mesh position={[0, 2.05, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[4.6, 4.1, 3.6]} />
          <meshStandardMaterial color="#d8e3da" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.35, 1.82]}>
          <boxGeometry args={[2.9, 2.2, 0.08]} />
          <meshStandardMaterial color="#0f766e" roughness={0.68} />
        </mesh>
        <mesh position={[0, 2.75, 2.22]} rotation={[0.22, 0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.5, 0.08, 0.95]} />
          <meshStandardMaterial color="#475569" roughness={0.82} />
        </mesh>
      </group>
      {/* Town bakery/provision block down the main road well before the morning bun-maska chai tapri */}
      <group position={[11.4, 0, 5.75]}>
        <mesh position={[0, 1.9, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[3.6, 3.8, 3.4]} />
          <meshStandardMaterial color="#e5dac8" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.25, 1.72]}>
          <boxGeometry args={[2.4, 2.1, 0.08]} />
          <meshStandardMaterial color="#b45309" roughness={0.68} />
        </mesh>
        <mesh position={[0, 2.48, 2.1]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[2.9, 0.08, 0.92]} />
          <meshStandardMaterial color="#047857" roughness={0.82} />
        </mesh>
      </group>
      {/* Extended Rishikesh main-road neighbor buildings continuing smoothly down both sides */}
      <group position={[-11.8, 0, 5.8]}>
        <mesh position={[0, 2.35, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[5.8, 4.7, 3.9]} />
          <meshStandardMaterial color="#ded2c0" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.35, 1.98]}>
          <boxGeometry args={[3.4, 2.1, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
      </group>
      <group position={[12.2, 0, 5.85]}>
        <mesh position={[0, 2.25, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[6.0, 4.5, 3.9]} />
          <meshStandardMaterial color="#dce1e6" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.35, 1.98]}>
          <boxGeometry args={[3.5, 2.1, 0.08]} />
          <meshStandardMaterial color="#b45309" roughness={0.72} />
        </mesh>
      </group>
      {/* Street utility pole beside main road */}
      <group position={[-3.35, 0, 7.25]}>
        <mesh position={[0, 2.8, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.07, 0.09, 5.6, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.75} metalness={0.35} />
        </mesh>
        <mesh position={[0, 4.95, 0]}>
          <boxGeometry args={[0.95, 0.08, 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
      </group>

      {/* 2. NARROW RESIDENTIAL INTERIOR LANE (`x = -2.4..2.4, z = 2.6..7.5`) + BEVELED ROAD APRON + YARD */}
      <mesh position={[0, -0.015, 7.58]} rotation={[0.08, 0, 0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[5.1, 0.06, 0.72]} />
        <meshStandardMaterial color="#7d8490" map={courtyardTex ?? undefined} roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.01, 5.3]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[4.85, 0.06, 4.8]} />
        <meshStandardMaterial color="#878d96" map={courtyardTex ?? undefined} roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.005, 1.55]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[10.8, 0.08, 4.4]} />
        <meshStandardMaterial color="#9c9487" map={courtyardTex ?? undefined} roughness={0.92} />
      </mesh>
      {/* Low painted boundary compound walls enclosing narrow interior lane */}
      {[-2.55, 2.55].map((wx) => (
        <mesh key={wx} position={[wx, 0.62, 5.55]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.24, 1.24, 3.9]} />
          <meshStandardMaterial color="#dfd3be" roughness={0.9} />
        </mesh>
      ))}
      {[-5.35, 5.35].map((wx) => (
        <mesh key={wx} position={[wx, 0.72, 1.35]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.26, 1.44, 5.4]} />
          <meshStandardMaterial color="#dad0be" roughness={0.9} />
        </mesh>
      ))}

      {/* 3. MODEST 2-STOREY HOUSE / GUESTHOUSE STAY (Ground Floor + 1st Floor + Rooftop Terrace) */}
      <group position={[0, 0, -3.25]}>
        {isDay1 ? (
          <>
            {/* Connected Ground-Floor Guest Foyer opening physically into yard & lane (never inside street!) */}
            <mesh position={[0, 0.01, -0.05]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[9.2, 0.04, 5.15]} />
              <meshStandardMaterial color="#b9aa97" roughness={0.9} />
            </mesh>
            {/* Rear wall, side walls, upper 1st-floor mass, and split ground-floor front facade around open door */}
            <mesh position={[0, 2.32, -2.5]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[9.3, 4.65, 0.25]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            <mesh position={[-4.52, 2.32, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[0.25, 4.65, 5.25]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            <mesh position={[4.52, 2.32, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[0.25, 4.65, 5.25]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            {/* 1st Floor solid enclosure above Ground ceiling */}
            <mesh position={[0, 3.52, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[9.3, 2.25, 5.25]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            {/* Front wall piers flanking open wooden doorway (`x = -0.45`) */}
            <mesh position={[-2.9, 1.2, 2.5]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[3.5, 2.4, 0.24]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            <mesh position={[2.45, 1.2, 2.5]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[4.4, 2.4, 0.24]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            <mesh position={[-0.45, 2.25, 2.5]}>
              <boxGeometry args={[1.45, 0.35, 0.28]} />
              <meshStandardMaterial color="#6d4327" roughness={0.82} />
            </mesh>
            {/* Ground-floor cot & warm lamp inside guestroom (`z = -3.25 + (-0.3) = -3.55`) */}
            <group position={[-1.45, 0.03, -0.35]}>
              <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[1.05, 0.36, 1.85]} />
                <meshStandardMaterial color="#785233" roughness={0.86} />
              </mesh>
              <mesh position={[0, 0.43, 0]}>
                <boxGeometry args={[0.98, 0.1, 1.78]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.5, -0.62]}>
                <boxGeometry args={[0.58, 0.09, 0.34]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.88} />
              </mesh>
              <pointLight position={[0.45, 1.4, 0.2]} intensity={1.35} color="#fde68a" distance={6.5} />
            </group>
            {/* Backpacks near bed */}
            <mesh position={[0.45, 0.26, -0.75]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.42, 0.46, 0.28]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.88} />
            </mesh>
          </>
        ) : (
          <>
            {/* House main two-storey plastered concrete mass (`x: -4.65..4.65, z: -5.9..-0.55`) */}
            <mesh position={[0, 2.32, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[9.3, 4.65, 5.25]} />
              <meshStandardMaterial color="#eadbc4" roughness={0.86} />
            </mesh>
            {/* Ground Floor Wooden Front Doorway (`Boys Ground Floor`) */}
            <mesh position={[-0.45, 1.05, 2.65]}>
              <boxGeometry args={[1.18, 2.1, 0.1]} />
              <meshStandardMaterial color="#6d4327" roughness={0.82} />
            </mesh>
          </>
        )}
        {/* Subtle horizontal slab concrete cornice trim between ground and first floors */}
        <mesh position={[0, 2.38, 0.06]}>
          <boxGeometry args={[9.55, 0.16, 5.45]} />
          <meshStandardMaterial color="#c4b59f" roughness={0.88} />
        </mesh>
        <mesh position={[-0.45, 0.06, 2.95]} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[2.4, 0.12, 0.85]} />
          <meshStandardMaterial color="#b0a493" roughness={0.92} />
        </mesh>

        {/* Ground & 1st Floor Window Grilles with Soft Interior Glow */}
        {[
          [-2.8, 1.22],
          [1.65, 1.22],
          [-2.8, 3.45],
          [-0.45, 3.45],
          [1.85, 3.45],
        ].map(([wx, wy], idx) => (
          <group key={`win-${idx}`} position={[wx, wy, 2.64]}>
            <mesh>
              <boxGeometry args={[1.12, 0.94, 0.07]} />
              <meshStandardMaterial
                color="#fef3c7"
                emissive="#f59e0b"
                emissiveIntensity={0.34}
                roughness={0.45}
              />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[1.18, 0.06, 0.03]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          </group>
        ))}

        {/* First-Floor Cantilevered Balcony (`Srishti's 1st-Floor Stay`) & Iron Railing */}
        <mesh position={[-0.95, 2.42, 3.05]} castShadow={shadowsEnabled}>
          <boxGeometry args={[5.8, 0.14, 0.85]} />
          <meshStandardMaterial color="#cdc0ad" roughness={0.88} />
        </mesh>
        <mesh position={[-0.95, 3.16, 3.44]}>
          <boxGeometry args={[5.75, 0.05, 0.05]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
        </mesh>
        {[-3.6, -2.5, -1.4, -0.3, 0.8, 1.85].map((rx) => (
          <mesh key={rx} position={[rx, 2.8, 3.44]}>
            <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
        ))}
        {/* Casual travel towel draped gently on 1st floor rail */}
        <mesh position={[-2.9, 3.0, 3.46]}>
          <boxGeometry args={[0.56, 0.36, 0.07]} />
          <meshStandardMaterial color="#e11d48" roughness={0.88} />
        </mesh>
        {/* Warm bronze porch wall sconces & balcony potted marigold plants */}
        {[-1.25, 0.35].map((sx) => (
          <group key={`porch-lamp-${sx}`} position={[sx, 1.88, 2.66]}>
            <mesh>
              <boxGeometry args={[0.12, 0.16, 0.1]} />
              <meshStandardMaterial color="#78350f" roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.02, 0.04]}>
              <sphereGeometry args={[0.052, 8, 8]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={isMorning ? 0.35 : 1.1}
              />
            </mesh>
          </group>
        ))}
        {[-1.95, 0.55].map((px) => (
          <group key={`balc-pot-${px}`} position={[px, 2.49, 3.02]}>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.14, 0.1, 0.24, 9]} />
              <meshStandardMaterial color="#b45309" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.28, 0]}>
              <dodecahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color="#2f5e36" roughness={0.9} flatShading />
            </mesh>
          </group>
        ))}

        {/* 4. OPEN ROOFTOP TERRACE (`y = TERRACE_Y = 4.65`) */}
        <mesh position={[0, TERRACE_Y - 0.04, 0]} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[9.5, 0.14, 5.45]} />
          <meshStandardMaterial
            color="#d2c6b4"
            map={courtyardTex ?? undefined}
            roughness={0.92}
          />
        </mesh>
        {/* Terrace Concrete Parapet Walls (West, North Overlook, Front-Left, leaving stair opening on East) */}
        <mesh position={[-4.65, TERRACE_Y + 0.44, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.2, 0.88, 5.45]} />
          <meshStandardMaterial color="#ded3c1" roughness={0.88} />
        </mesh>
        <mesh position={[4.65, TERRACE_Y + 0.44, -0.9]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.2, 0.88, 3.65]} />
          <meshStandardMaterial color="#ded3c1" roughness={0.88} />
        </mesh>
        <mesh position={[0, TERRACE_Y + 0.44, -2.65]} castShadow={shadowsEnabled}>
          <boxGeometry args={[9.5, 0.88, 0.2]} />
          <meshStandardMaterial color="#ded3c1" roughness={0.88} />
        </mesh>
        <mesh position={[-1.0, TERRACE_Y + 0.44, 2.65]} castShadow={shadowsEnabled}>
          <boxGeometry args={[7.4, 0.88, 0.2]} />
          <meshStandardMaterial color="#ded3c1" roughness={0.88} />
        </mesh>
        {/* Terracotta parapet coping trim crowning terrace walls */}
        <mesh position={[0, TERRACE_Y + 0.9, -2.65]}>
          <boxGeometry args={[9.65, 0.06, 0.26]} />
          <meshStandardMaterial color="#a85532" roughness={0.85} />
        </mesh>
        <mesh position={[-1.0, TERRACE_Y + 0.9, 2.65]}>
          <boxGeometry args={[7.5, 0.06, 0.26]} />
          <meshStandardMaterial color="#a85532" roughness={0.85} />
        </mesh>

        {/* Terrace Details: Black Roof Water Tank, Potted Plants, Seating & String Fairy Bulbs */}
        <group position={[-3.75, TERRACE_Y, -1.75]}>
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[1.15, 0.28, 1.15]} />
            <meshStandardMaterial color="#8c8376" roughness={0.94} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.48, 0.48, 1.1, 14]} />
            <meshStandardMaterial color="#18181b" roughness={0.55} />
          </mesh>
        </group>
        {/* Patio chairs + side chai table overlooking north mountains */}
        <group position={[1.15, TERRACE_Y, -0.9]}>
          <mesh position={[0, 0.34, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.38, 0.34, 0.06, 12]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.34, 8]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
        </group>
        {[
          [-3.85, 2.05],
          [-2.05, 2.05],
          [0.05, -2.1],
          [2.15, -2.1],
        ].map(([px, pz], idx) => (
          <group key={`pot-${idx}`} position={[px, TERRACE_Y, pz]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.16, 0.12, 0.36, 9]} />
              <meshStandardMaterial color="#b45309" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <dodecahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial color="#2f5e36" roughness={0.92} flatShading />
            </mesh>
          </group>
        ))}
        {/* Overhead terrace fairy string light line */}
        {[-3.4, -1.7, 0, 1.7, 3.4].map((lx, idx) => (
          <mesh
            key={`bulb-${idx}`}
            ref={(el) => {
              lanternLightsRef.current[idx] = el;
            }}
            position={[lx, TERRACE_Y + 2.15, 0.25]}
          >
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#fbbf24"
              emissiveIntensity={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* EXTERIOR MASONRY STAIRCASE FROM YARD (`y=0, z=+1.5`) UP TO TERRACE (`y=TERRACE_Y, z=-1.75`) */}
      <group position={[3.42, 0, 0]}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((step) => {
          const frac = step / 11;
          const sy = THREE.MathUtils.lerp(0.19, TERRACE_Y - 0.18, frac);
          const sz = THREE.MathUtils.lerp(1.32, -1.42, frac);
          return (
            <mesh
              key={`stair-${step}`}
              position={[0, sy, sz]}
              castShadow={shadowsEnabled}
              receiveShadow={shadowsEnabled}
            >
              <boxGeometry args={[1.18, 0.38, 0.32]} />
              <meshStandardMaterial color={step % 2 === 0 ? '#c9bca8' : '#bfb19d'} roughness={0.9} />
            </mesh>
          );
        })}
        {/* Painted outer steel staircase handrail */}
        <mesh position={[0.56, TERRACE_Y * 0.56, -0.05]} rotation={[0.92, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 5.2, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.45} />
        </mesh>
      </group>

      {/* 5. SURROUNDING NEIGHBORHOOD HOUSES & ROOFTOP WATER TANKS FOR TERRACE HORIZON */}
      {[
        { pos: [-11.5, 0, -4.5] as const, w: 6.4, h: 5.2, d: 6.2, col: '#dfd5c6' },
        { pos: [11.8, 0, -5.0] as const, w: 6.8, h: 4.4, d: 5.8, col: '#d4ddd8' },
        { pos: [-10.2, 0, -14.2] as const, w: 7.4, h: 5.6, d: 6.4, col: '#e2d2be' },
        { pos: [1.5, 0, -15.8] as const, w: 6.6, h: 4.2, d: 5.6, col: '#dce0e6' },
        { pos: [12.4, 0, -14.6] as const, w: 7.2, h: 5.0, d: 6.2, col: '#dfd5c4' },
      ].map((n, idx) => (
        <group key={`neigh-${idx}`} position={n.pos}>
          <mesh position={[0, n.h * 0.5, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[n.w, n.h, n.d]} />
            <meshStandardMaterial color={n.col} roughness={0.88} />
          </mesh>
          <mesh position={[0, n.h + 0.3, 0]}>
            <boxGeometry args={[n.w + 0.2, 0.6, n.d + 0.2]} />
            <meshStandardMaterial color="#b8ac99" roughness={0.9} />
          </mesh>
          <mesh position={[n.w * 0.28, n.h + 0.72, -n.d * 0.22]}>
            <cylinderGeometry args={[0.42, 0.42, 0.85, 10]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#18181b' : '#1d4ed8'} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Parked Hero Scooters Beside House Entry Yard (cleanly spaced off walls) */}
      <group position={[-3.82, 0, 2.28]} rotation={[0, 0.34, 0]}>
        <PrototypeScooter
          variant="lead"
          castShadow={shadowsEnabled}
          hideRiders
        />
      </group>
      <group position={[-2.74, 0, 2.4]} rotation={[0, 0.24, 0]}>
        <PrototypeScooter
          variant="companion"
          castShadow={shadowsEnabled}
          hideRiders
        />
      </group>

      {/* Lively Morning Road Bun-Maska & Kulhad Chai Stall Down the Town Road Away from Hotel (Day 2 Morning) */}
      {isMorning && (
        <group position={[15.4, 0, 7.68]}>
          {/* Framed timber posts + colorful striped roadside tea tapri awning */}
          {[
            [-0.86, -0.46],
            [0.86, -0.46],
            [-0.86, 0.46],
            [0.86, 0.46],
          ].map(([px, pz], idx) => (
            <mesh key={`awning-post-${idx}`} position={[px, 1.12, pz]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.036, 0.042, 2.24, 6]} />
              <meshStandardMaterial color="#4e301d" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 2.26, 0]} rotation={[-0.08, 0, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[2.05, 0.07, 1.35]} />
            <meshStandardMaterial color="#d97706" roughness={0.82} />
          </mesh>
          {/* Hanging warm tapri lantern */}
          <mesh position={[0.45, 1.98, 0.25]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1.1} />
          </mesh>
          {/* Wooden roadside tea counter & counter top */}
          <mesh position={[0, 0.48, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[1.7, 0.96, 0.95]} />
            <meshStandardMaterial color="#785233" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <boxGeometry args={[1.82, 0.08, 1.05]} />
            <meshStandardMaterial color="#9a6b44" roughness={0.82} />
          </mesh>
          {/* Crafted 4-legged sidewalk wooden bench clear of walk path */}
          <group position={[-1.44, 0, -0.24]}>
            <mesh position={[0, 0.44, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.96, 0.07, 0.44]} />
              <meshStandardMaterial color="#7c4a26" roughness={0.86} />
            </mesh>
            {[
              [-0.4, -0.16],
              [0.4, -0.16],
              [-0.4, 0.16],
              [0.4, 0.16],
            ].map(([lx, lz], lIdx) => (
              <mesh key={`bench-leg-${lIdx}`} position={[lx, 0.21, lz]} castShadow={shadowsEnabled}>
                <boxGeometry args={[0.07, 0.42, 0.07]} />
                <meshStandardMaterial color="#583319" roughness={0.9} />
              </mesh>
            ))}
          </group>
          {/* Steel kettle + biscuit jar + 2 buttered golden bun-maskas + 2 earthen kulhads */}
          <mesh position={[-0.42, 1.12, -0.1]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.14, 0.16, 0.22, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.32} />
          </mesh>
          <mesh position={[-0.58, 1.12, 0.2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.2, 10]} />
            <meshStandardMaterial color="#fde68a" transparent opacity={0.78} roughness={0.25} />
          </mesh>
          {[0.18, 0.44].map((bx, bIdx) => (
            <group key={`bun-${bIdx}`} position={[bx, 1.05, 0.08]}>
              <mesh castShadow={shadowsEnabled}>
                <sphereGeometry args={[0.1, 10, 8]} />
                <meshStandardMaterial color="#d98a36" roughness={0.78} />
              </mesh>
              <mesh position={[0, 0.07, 0]}>
                <boxGeometry args={[0.08, 0.03, 0.08]} />
                <meshStandardMaterial color="#fde047" roughness={0.45} />
              </mesh>
            </group>
          ))}
          {[0.16, 0.36].map((kx, kIdx) => (
            <mesh key={`kulhad-${kIdx}`} position={[kx, 1.08, -0.22]}>
              <cylinderGeometry args={[0.055, 0.04, 0.12, 10]} />
              <meshStandardMaterial color="#c26a3c" roughness={0.88} />
            </mesh>
          ))}
        </group>
      )}

      {/* Srishti's Original Rishikesh Friends (including Kanishka) in Lane OR Together on Rooftop Terrace */}
      {!hideOriginFriends &&
        (onTerrace ? TERRACE_GROUP_SLOTS : ORIGIN_FRIEND_SLOTS).map((f, idx) => (
          <group
            key={`orig-friend-${onTerrace ? 'terrace' : 'lane'}-${idx}`}
            ref={(el) => {
              friendGroupRefs.current[idx] = el;
            }}
            position={[f.x, onTerrace ? TERRACE_Y : 0, f.z]}
            rotation={[0, f.rotY, 0]}
          >
            <mesh position={[-0.08, 0.4, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.068, 0.06, 0.78, 8]} />
              <meshStandardMaterial color={f.trousers} roughness={0.88} />
            </mesh>
            <mesh position={[0.08, 0.4, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.068, 0.06, 0.78, 8]} />
              <meshStandardMaterial color={f.trousers} roughness={0.88} />
            </mesh>
            <mesh position={[0, 1.03, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.17, 0.145, 0.54, 10]} />
              <meshStandardMaterial color={f.shirt} roughness={0.82} />
            </mesh>
            {/* Kanishka warm cream shawl/dupatta accent across torso + compact badge */}
            {idx === 0 && (
              <>
                <mesh position={[0, 1.08, 0.04]} rotation={[0.1, 0, -0.35]}>
                  <boxGeometry args={[0.38, 0.14, 0.24]} />
                  <meshStandardMaterial color="#fef3c7" roughness={0.85} />
                </mesh>
                <Html
                  center
                  position={[0, 1.84, 0]}
                  zIndexRange={[10, 0]}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-pink-300/75 bg-slate-950/88 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-pink-100 shadow-lg backdrop-blur-sm">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: '#f472b6' }}
                    />
                    Kanishka
                  </div>
                </Html>
              </>
            )}
            <mesh position={[0, 1.44, 0]} castShadow={shadowsEnabled}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <meshStandardMaterial color="#d29c76" roughness={0.76} />
            </mesh>
            <mesh position={[0, 1.49, 0.02]}>
              <sphereGeometry args={[0.125, 10, 8]} />
              <meshStandardMaterial color={f.hair} roughness={0.88} />
            </mesh>
          </group>
        ))}

      {/* Subtle Hotspot Beacons on Active Level */}
      {variant === 'evening_return' && !onTerrace && (
        <>
          <HotspotBeaconSparkle
            position={[HOTEL_HOTSPOTS[0].x, 0.04, HOTEL_HOTSPOTS[0].z]}
            color="#38bdf8"
            paused={paused}
            reducedMotion={reducedMotion}
          />
          {!farewellDone && (
            <HotspotBeaconSparkle
              position={[HOTEL_HOTSPOTS[1].x, 0.04, HOTEL_HOTSPOTS[1].z]}
              color="#fbbf24"
              paused={paused}
              reducedMotion={reducedMotion}
            />
          )}
        </>
      )}
      {variant === 'day1_stay' && !onTerrace && !nightReturn && (
        <>
          <HotspotBeaconSparkle
            position={[DAY1_HOTSPOTS[0].x, 0.04, DAY1_HOTSPOTS[0].z]}
            color="#f472b6"
            paused={paused}
            reducedMotion={reducedMotion}
          />
          <HotspotBeaconSparkle
            position={[DAY1_HOTSPOTS[1].x, 0.04, DAY1_HOTSPOTS[1].z]}
            color="#38bdf8"
            paused={paused}
            reducedMotion={reducedMotion}
          />
          <HotspotBeaconSparkle
            position={[DAY1_HOTSPOTS[2].x, 0.04, DAY1_HOTSPOTS[2].z]}
            color={day1Done ? '#34d399' : '#fbbf24'}
            paused={paused}
            reducedMotion={reducedMotion}
          />
        </>
      )}
      {variant === 'day2_morning' && (
        <>
          {!morningBreakfastDone && (
            <HotspotBeaconSparkle
              position={[DAY2_MORNING_HOTSPOTS[0].x, 0.04, DAY2_MORNING_HOTSPOTS[0].z]}
              color="#fbbf24"
              paused={paused}
              reducedMotion={reducedMotion}
            />
          )}
          <HotspotBeaconSparkle
            position={[DAY2_MORNING_HOTSPOTS[1].x, 0.04, DAY2_MORNING_HOTSPOTS[1].z]}
            color={morningBreakfastDone ? '#fbbf24' : '#38bdf8'}
            paused={paused}
            reducedMotion={reducedMotion}
          />
        </>
      )}
      {onTerrace && (
        <HotspotBeaconSparkle
          position={[TERRACE_HOTSPOTS[0].x, TERRACE_Y + 0.04, TERRACE_HOTSPOTS[0].z]}
          color="#38bdf8"
          paused={paused}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
