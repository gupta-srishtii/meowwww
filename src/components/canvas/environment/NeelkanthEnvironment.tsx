'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ConnectedHillTerrain } from '@/components/canvas/environment/ConnectedHillTerrain';
import { NeelkanthMarketAndCrowd } from '@/components/canvas/environment/NeelkanthMarketAndCrowd';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { StylizedTrafficCar } from '@/components/canvas/RoadTrafficSystem';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  getGopuramDetailTexture,
  getStoneCourtyardTexture,
} from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export const NEELKANTH_WALK_BOUNDS: WalkBounds = {
  minX: -7.2,
  maxX: 7.2,
  minZ: -4.95,
  maxZ: 27.6,
};

export const NEELKANTH_CAFE_TABLE_CENTER = { x: 2.85, z: 20.6 } as const;

export const NEELKANTH_CAFE_SEATS = {
  ishaan: { x: 2.85, z: 21.42, facingYaw: 0 },
  srishti: { x: 2.85, z: 19.78, facingYaw: Math.PI },
  friend_plaid: { x: 1.88, z: 20.6, facingYaw: -Math.PI / 2 },
  friend_black_tee: { x: 3.82, z: 20.6, facingYaw: Math.PI / 2 },
} as const;

export const NEELKANTH_OBSTACLES: readonly WalkObstacle[] = [
  // Sanctum portico & Garbhagriha steps
  { kind: 'box', minX: -3.2, maxX: 3.2, minZ: -7.8, maxZ: -5.0 },
  // Seated Nandi pedestal facing sanctum
  { kind: 'box', minX: -0.62, maxX: 0.62, minZ: -4.65, maxZ: -3.55 },
  // Courtyard Brass Diya Stand
  { kind: 'circle', x: -2.55, z: -2.55, radius: 0.52 },
  // Ancient Banyan Tree trunk & stone platform
  { kind: 'circle', x: 5.7, z: -1.9, radius: 1.25 },
  // Mountain spring water Kund / basin
  { kind: 'box', minX: -6.45, maxX: -4.75, minZ: -0.25, maxZ: 1.45 },
  // Entrance Gopuram left & right gate towers (`wide 3.8m walk opening in middle`)
  { kind: 'box', minX: -7.5, maxX: -1.9, minZ: 3.55, maxZ: 5.05 },
  { kind: 'box', minX: 1.9, maxX: 7.5, minZ: 3.55, maxZ: 5.05 },
  // Continuous left temple bazaar shops & stalls (`z = 6.0..24.6`)
  { kind: 'box', minX: -6.8, maxX: -3.65, minZ: 6.0, maxZ: 24.6 },
  // Right temple bazaar shops (`puja thali -> brass bells -> Chole Bhature cafe -> exit sweets stall`)
  { kind: 'box', minX: 3.65, maxX: 6.8, minZ: 6.0, maxZ: 14.0 },
  { kind: 'box', minX: 4.3, maxX: 6.8, minZ: 14.0, maxZ: 25.4 },
  // Outdoor dining table & 4 chairs at `NEELKANTH_CAFE_TABLE_CENTER` (`z = 20.6`)
  { kind: 'box', minX: 2.15, maxX: 3.55, minZ: 20.05, maxZ: 21.15 },
  { kind: 'circle', x: 2.85, z: 21.42, radius: 0.28 },
  { kind: 'circle', x: 2.85, z: 19.78, radius: 0.28 },
  { kind: 'circle', x: 1.88, z: 20.6, radius: 0.28 },
  { kind: 'circle', x: 3.82, z: 20.6, radius: 0.28 },
  // Parked Scooter 1 & Scooter 2 at Market Exit (`z = 26.2..27.4`)
  { kind: 'box', minX: 1.05, maxX: 2.75, minZ: 26.2, maxZ: 27.4 },
  { kind: 'box', minX: -2.25, maxX: -0.55, minZ: 26.2, maxZ: 27.4 },
  // Respectful darshan queue in courtyard
  { kind: 'circle', x: 3.2, z: -2.35, radius: 0.38 },
  { kind: 'circle', x: 3.3, z: -1.05, radius: 0.38 },
  { kind: 'circle', x: 3.35, z: 0.25, radius: 0.38 },
  { kind: 'circle', x: 3.4, z: 1.55, radius: 0.38 },
];

export const NEELKANTH_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'bell',
    label: 'Ring Brass Temple Bell',
    x: 0.0,
    z: -1.75,
    radius: 1.25,
    actionType: 'interact',
  },
  {
    id: 'diya',
    label: 'Light Oil Diya',
    x: -2.55,
    z: -1.6,
    radius: 1.35,
    actionType: 'interact',
  },
  {
    id: 'darshan',
    label: 'Pray to Mahadev',
    x: 0.0,
    z: -3.1,
    radius: 1.3,
    actionType: 'interact',
  },
  {
    id: 'neelkanth_food',
    label: 'Eat Chhole Bhature at Market Cafe',
    x: 1.35,
    z: 20.6,
    radius: 1.75,
    actionType: 'photo',
  },
  {
    id: 'scooters',
    label: 'Ride Scooters · To Baal Kuwari',
    x: 0.45,
    z: 25.3,
    radius: 2.35,
    actionType: 'interact',
  },
];

export interface NeelkanthEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  rangBell: boolean;
  bellSwingImpulseNonce: number;
  litDiya: boolean;
  hadDarshan: boolean;
  capturedFood?: boolean;
  activeDarshanPan?: boolean;
}

const MAX_FOREST_PINES = 64;

const NEELKANTH_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-52, -8, -56], scale: [44, 28, 36], rotationY: 0.2, color: '#426453' },
  { position: [8, -6, -70], scale: [54, 34, 42], rotationY: -0.1, color: '#456373' },
  { position: [58, -8, -52], scale: [46, 27, 36], rotationY: -0.25, color: '#4a6b58' },
  { position: [-72, -10, -12], scale: [38, 22, 34], rotationY: 0.4, color: '#3e5c48' },
  { position: [72, -9, 6], scale: [38, 23, 34], rotationY: -0.35, color: '#436350' },
];

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Continuous contoured Manikoot hillside terrain surrounding the temple & parking plaza.
 * Clamped safely below stone foundations inside the courtyard & approach apron corridor.
 */
function sampleNeelkanthTerrainY(x: number, z: number): number {
  // Temple + bazaar stone platform spans x in [-15.5, 15.5], z in [-11.0, 36.5];
  // approach road & parking apron spans |x| < 15.8, z in [25.5, 36.5].
  const onParkingApron = z > 25.5 ? 1 : 0;
  const deckHalfX = onParkingApron ? 15.8 : 15.2;
  const sideDist = Math.max(0, Math.abs(x) - deckHalfX);
  const rearDist = z < -11.0 ? -11.0 - z : 0;
  const frontSlopeDist = z > 36.5 ? z - 36.5 : 0;

  const naturalUndulation =
    Math.sin(x * 0.12 + z * 0.09) * 0.85 +
    Math.cos(x * 0.065 - z * 0.14) * 0.65 +
    Math.sin(x * 0.27 + z * 0.23) * 0.24;

  const sideRise = smoothStep01(sideDist / 5.5) * (0.45 + Math.pow(sideDist, 0.86) * 0.36);
  const rearRise = smoothStep01(rearDist / 6.0) * (0.35 + Math.pow(rearDist, 0.88) * 0.34);
  const frontDip = smoothStep01(frontSlopeDist / 8.0) * Math.min(7.0, frontSlopeDist * 0.16);

  const hillBlend = smoothStep01(Math.max(sideDist, rearDist) / 4.8);
  const baseFloor = -0.36;
  const rawY = baseFloor + (sideRise + rearRise + naturalUndulation * 0.72) * hillBlend - frontDip;

  // Guarantee terrain never clips above the stone terrace or paved arrival road.
  if (Math.abs(x) < 15.2 && z > -11.0 && z < 36.5) {
    return -2.5;
  }
  return rawY;
}

const NEELKANTH_BOULDER_COORDS: readonly [number, number, number][] = [
  [-16.8, 9.2, 0.72],
  [-17.2, 3.8, 0.95],
  [-16.9, -4.6, 0.85],
  [-16.5, -10.4, 0.9],
  [16.8, 10.6, 0.76],
  [17.4, 4.1, 0.88],
  [16.9, -3.5, 0.82],
  [16.6, -10.8, 0.92],
  [-5.2, -12.4, 0.78],
  [4.8, -12.6, 0.84],
];

export function NeelkanthEnvironment({
  qualityProfile,
  paused,
  rangBell,
  bellSwingImpulseNonce,
  litDiya,
  hadDarshan,
  capturedFood = false,
  activeDarshanPan = false,
}: NeelkanthEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_FOREST_PINES, Math.round(MAX_FOREST_PINES * densityRatio));

  const stoneTex = useMemo(() => getStoneCourtyardTexture(), []);
  const gopuramTex = useMemo(() => getGopuramDetailTexture(), []);

  const bellPivotRef = useRef<THREE.Group>(null);
  const diyaFlameRef = useRef<THREE.Mesh>(null);
  const flagRefs = useRef<(THREE.Mesh | null)[]>([]);

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);

  const bellStateRef = useRef({
    amplitude: 0,
    phase: 0,
    lastNonce: bellSwingImpulseNonce,
  });
  const animTimeRef = useRef(0);

  useEffect(() => {
    if (bellSwingImpulseNonce !== bellStateRef.current.lastNonce) {
      bellStateRef.current.lastNonce = bellSwingImpulseNonce;
      bellStateRef.current.amplitude = 0.52;
      bellStateRef.current.phase = 0;
    }
  }, [bellSwingImpulseNonce]);

  const forestPositions = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_FOREST_PINES; i++) {
      let x: number;
      let z: number;
      if (i % 5 === 0) {
        // Dense Manikoot sacred grove rising naturally behind the sanctum
        const slot = Math.floor(i / 5);
        x = -24 + ((slot * 7.3) % 48);
        z = -12.6 - ((slot * 4.2) % 24);
      } else {
        const side = i % 2 === 0 ? -1 : 1;
        x = side * (16.2 + (i % 7) * 4.2 + ((i * 3) % 5) * 0.4);
        z = -28 + ((i * 5.3) % 50);
      }
      const groundY = sampleNeelkanthTerrainY(x, z);
      // Embed trunk base ~18cm into sloped ground so uphill/downhill sides never gap
      const y = groundY - 0.18;
      const s = 0.85 + ((i * 13) % 8) * 0.06;
      items.push([x, y, z, s]);
    }
    return items;
  }, []);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = pineCount;
    crownInstRef.current.count = pineCount;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i++) {
      const [x, y, z, s] = forestPositions[i];
      dummy.position.set(x, y + 0.9 * s, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.65 * s, z);
      dummy.updateMatrix();
      crownInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    trunkInstRef.current.instanceMatrix.needsUpdate = true;
    crownInstRef.current.instanceMatrix.needsUpdate = true;
  }, [pineCount, forestPositions]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      animTimeRef.current += delta;
    }
    const t = animTimeRef.current;

    const bell = bellStateRef.current;
    if (bellPivotRef.current) {
      if (bell.amplitude > 0.002) {
        bell.phase += delta * 7.4;
        bell.amplitude = THREE.MathUtils.damp(bell.amplitude, 0, 1.35, delta);
        bellPivotRef.current.rotation.x = Math.sin(bell.phase) * bell.amplitude;
      } else {
        bell.amplitude = 0;
        bellPivotRef.current.rotation.x = reducedMotion ? 0 : Math.sin(t * 1.1) * 0.025;
      }
    }

    if (diyaFlameRef.current && litDiya && !reducedMotion) {
      const f = 1 + Math.sin(t * 12) * 0.12 + Math.cos(t * 7.5) * 0.08;
      diyaFlameRef.current.scale.set(1, f, 1);
    }

    if (!reducedMotion) {
      flagRefs.current.forEach((flag, idx) => {
        if (!flag) return;
        flag.rotation.y = Math.sin(t * 3.8 + idx * 0.9) * 0.22;
      });
    }
  });

  return (
    <group>
      {/* Warm Garhwal early-afternoon mountain light amid Manikoot valley foliage */}
      <color attach="background" args={['#c2ddf0']} />
      <fog attach="fog" args={['#cfe4f4', 42, 160]} />

      <ambientLight intensity={0.7} color="#fff6e6" />
      <hemisphereLight args={['#e6f3fe', '#4b6147', 0.98]} />
      <directionalLight
        position={[22, 32, 18]}
        intensity={1.75}
        color="#ffefd4"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={4}
        shadow-camera-far={95}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />

      {/* Solid stepped sandstone retaining foundation & hillside anchor beneath temple + bazaar + market cafe + exit parking */}
      <mesh position={[0, -2.55, 12.0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[30.6, 4.9, 44.0]} />
        <meshStandardMaterial color="#736655" roughness={0.95} />
      </mesh>
      <mesh position={[0, -2.4, 26.2]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[31.6, 4.6, 12.2]} />
        <meshStandardMaterial color="#675c4e" roughness={0.96} />
      </mesh>
      {/* Rear Garbhagriha stone sanctuary plinth extension (`z = -6.9..-9.5`) & flanking battered retaining walls */}
      <mesh position={[0, -0.12, -8.25]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[16.8, 0.24, 3.0]} />
        <meshStandardMaterial color="#877867" roughness={0.92} />
      </mesh>
      <mesh position={[-15.25, -2.45, 12.0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.9, 4.85, 44.0]} />
        <meshStandardMaterial color="#665b4c" roughness={0.94} />
      </mesh>
      <mesh position={[15.25, -2.45, 12.0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.9, 4.85, 44.0]} />
        <meshStandardMaterial color="#665b4c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -2.45, -10.0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[30.6, 4.85, 1.0]} />
        <meshStandardMaterial color="#665b4c" roughness={0.94} />
      </mesh>

      {/* Zone A+B+C Flagstone Paving spanning Courtyard (`-8.6..+4.2`) & Full Cobblestone Bazaar Street (`+4.2..+27.8`) */}
      <mesh position={[0, -0.1, 12.0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[30.4, 0.2, 44.0]} />
        <meshStandardMaterial
          color="#a89c8a"
          map={stoneTex ?? undefined}
          roughness={0.88}
        />
      </mesh>
      {/* Carved market lane curb borders in the lower bazaar approach (keeping upper temple courtyard completely open & clear) */}
      {[-1.55, 1.55].map((cx) => (
        <mesh key={cx} position={[cx, 0.008, 15.2]} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.16, 0.016, 20.2]} />
          <meshStandardMaterial color="#877865" roughness={0.92} />
        </mesh>
      ))}
      {/* Carved sandstone plaza entry threshold right before market exit parking bay (`z = 25.4`) */}
      <mesh position={[0, 0.008, 25.4]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[6.8, 0.02, 0.9]} />
        <meshStandardMaterial color="#8d7f6c" roughness={0.9} />
      </mesh>

      {/* Outer Parking Bay & Continuing Forest Mountain Highway Behind (`z > 26.0`) */}
      <mesh position={[0, -0.12, 28.0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[22, 0.18, 6.4]} />
        <meshStandardMaterial color="#4b5362" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.12]} position={[4, -0.02, 31.2]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[150, 5.6]} />
        <meshStandardMaterial color="#384152" roughness={0.92} />
      </mesh>
      {/* Side-by-side Parked Scooters at Market Exit apron (`z = 26.8`) */}
      <group position={[1.9, 0, 26.8]} rotation={[0, -Math.PI / 2 + 0.12, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.4, 0, 26.8]} rotation={[0, -Math.PI / 2 - 0.1, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>
      {/* Nearby parked visiting tourist hatchback */}
      <group position={[5.8, -0.015, 27.6]} rotation={[0, -Math.PI / 2 + 0.2, 0]}>
        <StylizedTrafficCar
          color="#e2e8f0"
          style="hatchback"
          withDriver={false}
          castShadow={shadowsEnabled}
        />
      </group>

      {/* Stone Courtyard Cloister Colonnades & Parapets flanking West & East */}
      <mesh position={[-7.8, 0.55, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.55, 1.1, 14.5]} />
        <meshStandardMaterial color="#877b6b" roughness={0.9} />
      </mesh>
      <mesh position={[7.8, 0.55, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.55, 1.1, 14.5]} />
        <meshStandardMaterial color="#877b6b" roughness={0.9} />
      </mesh>
      {/* Sculpted Carved Temple Cloister Columns w/ Stepped Base Plinths & Capitals */}
      {[-3.8, -1.2, 1.4].map((pz, idx) => (
        <group key={idx}>
          {[-7.2, 7.2].map((px) => (
            <group key={px} position={[px, 0, pz]}>
              <mesh position={[0, 0.14, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[0.5, 0.28, 0.5]} />
                <meshStandardMaterial color="#8d7e6a" roughness={0.9} />
              </mesh>
              <mesh position={[0, 1.56, 0]} castShadow={shadowsEnabled}>
                <cylinderGeometry args={[0.16, 0.21, 2.6, 8]} />
                <meshStandardMaterial color="#d8cab4" roughness={0.84} />
              </mesh>
              <mesh position={[0, 2.94, 0]} castShadow={shadowsEnabled}>
                <cylinderGeometry args={[0.28, 0.18, 0.24, 8]} />
                <meshStandardMaterial color="#c2a382" roughness={0.82} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[-7.2, 3.18, -1.2]} castShadow={shadowsEnabled}>
        <boxGeometry args={[1.1, 0.25, 7.2]} />
        <meshStandardMaterial color="#9a4a18" roughness={0.82} />
      </mesh>
      <mesh position={[7.2, 3.18, -1.2]} castShadow={shadowsEnabled}>
        <boxGeometry args={[1.1, 0.25, 7.2]} />
        <meshStandardMaterial color="#9a4a18" roughness={0.82} />
      </mesh>

      {/* Contoured Manikoot Valley Hillside Terrain + Natural Grounded Boulders + Distant Mountain Ridges */}
      <ConnectedHillTerrain
        width={150}
        depth={135}
        centerX={0}
        centerZ={-10}
        segX={68}
        segZ={64}
        heightFn={sampleNeelkanthTerrainY}
        receiveShadow={shadowsEnabled}
      />
      {NEELKANTH_BOULDER_COORDS.map(([bx, bz, bs], idx) => {
        const by = sampleNeelkanthTerrainY(bx, bz) - bs * 0.22;
        return (
          <mesh
            key={`neel-rock-${idx}`}
            position={[bx, by, bz]}
            rotation={[idx * 0.4, idx * 1.1, idx * 0.3]}
            scale={[bs * 1.25, bs * 0.72, bs]}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#646e68' : '#57625c'} roughness={0.96} />
          </mesh>
        );
      })}
      <DistantHimalayanRidges ridges={NEELKANTH_RIDGES} />

      {/* Ornate Colorful Dravidian-Influenced Entrance Gopuram Gate w/ Samudra Manthan Artwork (`z = +4.25`) */}
      <group position={[0, 0, 4.25]}>
        {/* Wide flanked archway towers */}
        <mesh position={[-3.35, 2.0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.8, 4.0, 1.25]} />
          <meshStandardMaterial color="#e59228" map={gopuramTex ?? undefined} roughness={0.78} />
        </mesh>
        <mesh position={[3.35, 2.0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.8, 4.0, 1.25]} />
          <meshStandardMaterial color="#e59228" map={gopuramTex ?? undefined} roughness={0.78} />
        </mesh>
        {/* Sculpted archway stone jamb columns & brass hanging lanterns flanking gate passage */}
        {[-1.85, 1.85].map((jx) => (
          <group key={jx} position={[jx, 0, 0]}>
            <mesh position={[0, 0.16, 0.45]}>
              <boxGeometry args={[0.42, 0.32, 0.42]} />
              <meshStandardMaterial color="#8d7e6a" roughness={0.88} />
            </mesh>
            <mesh position={[0, 1.8, 0.45]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.14, 0.17, 3.0, 8]} />
              <meshStandardMaterial color="#e6d3b3" roughness={0.78} />
            </mesh>
            <mesh position={[0, 3.4, 0.45]}>
              <cylinderGeometry args={[0.24, 0.16, 0.22, 8]} />
              <meshStandardMaterial color="#d97706" roughness={0.72} />
            </mesh>
            {/* Terracotta sacred kalash urns flanking the entrance path */}
            <group position={[jx < 0 ? 0.12 : -0.12, 0, 0.78]}>
              <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled}>
                <cylinderGeometry args={[0.14, 0.18, 0.44, 10]} />
                <meshStandardMaterial color="#b45309" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.48, 0]}>
                <sphereGeometry args={[0.15, 10, 8]} />
                <meshStandardMaterial color="#15803d" roughness={0.82} />
              </mesh>
            </group>
            {/* Brass hanging gateway oil lamp */}
            <mesh position={[jx < 0 ? 0.28 : -0.28, 2.95, 0.48]}>
              <cylinderGeometry args={[0.08, 0.12, 0.24, 8]} />
              <meshStandardMaterial color="#d97706" metalness={0.68} roughness={0.28} />
            </mesh>
            <pointLight position={[jx < 0 ? 0.28 : -0.28, 2.75, 0.48]} intensity={0.48} color="#fbbf24" distance={3.8} />
          </group>
        ))}
        {/* Extending bazaar perimeter wing walls */}
        <mesh position={[-6.15, 1.25, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.8, 2.5, 0.65]} />
          <meshStandardMaterial color="#c2410c" roughness={0.84} />
        </mesh>
        <mesh position={[6.15, 1.25, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.8, 2.5, 0.65]} />
          <meshStandardMaterial color="#c2410c" roughness={0.84} />
        </mesh>

        {/* Towering Multi-Tiered Painted Gopuram Archway Roof (`3.9m clear opening height`) */}
        <mesh position={[0, 4.55, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[9.4, 1.15, 1.4]} />
          <meshStandardMaterial color="#d97706" map={gopuramTex ?? undefined} roughness={0.75} />
        </mesh>
        <mesh position={[0, 5.65, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[7.0, 1.05, 1.15]} />
          <meshStandardMaterial color="#c2410c" map={gopuramTex ?? undefined} roughness={0.75} />
        </mesh>
        <mesh position={[0, 6.62, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.4, 0.85, 0.92]} />
          <meshStandardMaterial color="#0284c7" map={gopuramTex ?? undefined} roughness={0.75} />
        </mesh>
        <mesh position={[0, 7.38, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.6, 0.62, 0.72]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.7} />
        </mesh>
        {[-0.95, 0, 0.95].map((kx, idx) => (
          <mesh key={idx} position={[kx, 8.05, 0]}>
            <coneGeometry args={[0.16, 0.72, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.58} roughness={0.28} />
          </mesh>
        ))}

        {/* Stylized Artistic Tribute: Samudra Manthan Frieze Mounted Above Entrance Arch (`+Z` market face) */}
        <group position={[0, 4.02, 0.74]}>
          {/* Carved frieze backdrop */}
          <mesh>
            <boxGeometry args={[3.9, 0.75, 0.12]} />
            <meshStandardMaterial color="#0f4c75" roughness={0.7} />
          </mesh>
          {/* Stylized central Mount Mandara pivot & emerald Vasuki serpent body */}
          <mesh position={[0, 0.04, 0.08]}>
            <coneGeometry args={[0.32, 0.62, 6]} />
            <meshStandardMaterial color="#d97706" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.05, 0.11]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 3.25, 10]} />
            <meshStandardMaterial color="#16a34a" roughness={0.65} />
          </mesh>
          {/* Central blue Halahala / Neelkanth motif crown */}
          <mesh position={[0, 0.34, 0.11]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color="#2563eb" roughness={0.45} />
          </mesh>
          {/* Sculpted flanking Devas & Asuras relief silhouettes */}
          {[-1.35, -0.95, -0.58].map((dx, i) => (
            <mesh key={`d-${i}`} position={[dx, -0.02, 0.11]}>
              <capsuleGeometry args={[0.075, 0.24, 6, 8]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.6} />
            </mesh>
          ))}
          {[0.58, 0.95, 1.35].map((ax, i) => (
            <mesh key={`a-${i}`} position={[ax, -0.02, 0.11]}>
              <capsuleGeometry args={[0.075, 0.24, 6, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.6} />
            </mesh>
          ))}
        </group>

        {/* Hanging Marigold Torans along both faces of arch */}
        <mesh position={[0, 3.82, 0.62]}>
          <boxGeometry args={[3.8, 0.18, 0.16]} />
          <meshStandardMaterial color="#fb923c" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.82, -0.62]}>
          <boxGeometry args={[3.8, 0.18, 0.16]} />
          <meshStandardMaterial color="#facc15" roughness={0.85} />
        </mesh>
      </group>

      {/* Main Garbhagriha Sanctum & Tall Ornate Dravidian Shikhara (`z = -6.4`) */}
      <group position={[0, 0, -6.4]}>
        <mesh position={[0, 0.25, 0.5]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[7.2, 0.5, 4.6]} />
          <meshStandardMaterial color="#9e8f7b" roughness={0.88} />
        </mesh>

        {/* Left & Right Carved Pilaster Walls */}
        <mesh position={[-2.25, 2.0, 0.4]} castShadow={shadowsEnabled}>
          <boxGeometry args={[1.8, 3.0, 2.7]} />
          <meshStandardMaterial color="#fef3c7" map={gopuramTex ?? undefined} roughness={0.8} />
        </mesh>
        <mesh position={[2.25, 2.0, 0.4]} castShadow={shadowsEnabled}>
          <boxGeometry args={[1.8, 3.0, 2.7]} />
          <meshStandardMaterial color="#fef3c7" map={gopuramTex ?? undefined} roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.0, -0.8]} castShadow={shadowsEnabled}>
          <boxGeometry args={[6.2, 3.0, 0.55]} />
          <meshStandardMaterial color="#b45309" roughness={0.84} />
        </mesh>
        {/* Portico Lintel & Marigold Garlands */}
        <mesh position={[0, 3.65, 0.4]} castShadow={shadowsEnabled}>
          <boxGeometry args={[6.8, 0.68, 3.0]} />
          <meshStandardMaterial color="#d97706" map={gopuramTex ?? undefined} roughness={0.76} />
        </mesh>
        <mesh position={[0, 3.22, 1.92]}>
          <boxGeometry args={[2.95, 0.22, 0.16]} />
          <meshStandardMaterial color="#fb923c" roughness={0.85} />
        </mesh>

        {/* Soaring Ornate Tiered Shikhara Spire (`~10.5m` total sanctum pinnacle height) */}
        <group position={[0, 3.98, -0.15]}>
          <mesh position={[0, 0.72, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[4.8, 1.45, 3.3]} />
            <meshStandardMaterial color="#d97706" map={gopuramTex ?? undefined} roughness={0.74} />
          </mesh>
          <mesh position={[0, 1.98, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[3.75, 1.1, 2.6]} />
            <meshStandardMaterial color="#0284c7" map={gopuramTex ?? undefined} roughness={0.74} />
          </mesh>
          <mesh position={[0, 3.02, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[2.75, 0.92, 1.95]} />
            <meshStandardMaterial color="#c2410c" map={gopuramTex ?? undefined} roughness={0.74} />
          </mesh>
          <mesh position={[0, 3.85, 0]}>
            <boxGeometry args={[1.85, 0.68, 1.3]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.68} />
          </mesh>
          <mesh position={[0, 4.78, 0]}>
            <coneGeometry args={[1.05, 1.3, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.28} />
          </mesh>
          <mesh position={[0, 5.62, 0]}>
            <cylinderGeometry args={[0.09, 0.16, 0.65, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.22} />
          </mesh>
        </group>

        {/* Illuminated Inner Sanctum: Gleaming Shivalinga, Marigold Blossom Collar & Hanging Copper Pot */}
        <pointLight position={[0, 1.95, 0.35]} intensity={hadDarshan ? 2.6 : 1.9} color="#fbbf24" distance={7.5} />
        <mesh position={[0, 0.65, 0.12]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.48, 0.54, 0.28, 18]} />
          <meshStandardMaterial color="#1f2937" roughness={0.42} metalness={0.18} />
        </mesh>
        <mesh position={[0, 0.96, 0.12]} castShadow={shadowsEnabled}>
          <capsuleGeometry args={[0.17, 0.28, 10, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.28} metalness={0.24} />
        </mesh>
        {/* Fresh orange marigold collar garland around Shivalinga base */}
        <mesh position={[0, 0.8, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.055, 8, 16]} />
          <meshStandardMaterial color="#f97316" roughness={0.85} />
        </mesh>
        {/* Hanging copper jalabhishek kalash vessel */}
        <mesh position={[0, 2.45, 0.12]}>
          <cylinderGeometry args={[0.015, 0.015, 0.9, 6]} />
          <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.98, 0.12]}>
          <cylinderGeometry args={[0.15, 0.09, 0.24, 12]} />
          <meshStandardMaterial color="#c2410c" metalness={0.68} roughness={0.3} />
        </mesh>
        {/* Flanking brass sanctum diya glows */}
        {[-0.72, 0.72].map((lx, idx) => (
          <group key={idx} position={[lx, 0.72, 0.52]}>
            <mesh>
              <cylinderGeometry args={[0.075, 0.045, 0.2, 10]} />
              <meshStandardMaterial color="#d97706" metalness={0.62} roughness={0.34} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.052, 8, 8]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
        ))}

        {/* Fluttering Saffron Pennants above Sanctum */}
        {[-2.5, 2.5].map((fx, idx) => (
          <group key={idx} position={[fx, 3.98, 1.35]}>
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.03, 0.035, 1.3, 6]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh
              ref={(el) => {
                flagRefs.current[idx] = el;
              }}
              position={[0.24, 1.12, 0]}
            >
              <planeGeometry args={[0.48, 0.28]} />
              <meshStandardMaterial color="#f97316" side={THREE.DoubleSide} roughness={0.78} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Seated Sacred Black-Stone Nandi facing Shivalinga (`z = -4.1`) */}
      <group position={[0, 0, -4.1]}>
        <mesh position={[0, 0.18, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.08, 0.36, 1.18]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.56, 0.06]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.46, 0.38, 0.78]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.84, -0.3]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.26, 0.28, 0.32]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.12} />
        </mesh>
        <mesh position={[-0.12, 1.0, -0.32]} rotation={[0.2, 0, 0.3]}>
          <coneGeometry args={[0.04, 0.16, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0.12, 1.0, -0.32]} rotation={[0.2, 0, -0.3]}>
          <coneGeometry args={[0.04, 0.16, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
      </group>

      {/* Elevated Bell Archway & Brass Bell (`z = -1.75`) — framed high above Nandi so darshan view of Shivling stays completely clear */}
      <group position={[0, 0, -1.75]}>
        <mesh position={[-2.15, 1.85, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.08, 0.1, 3.7, 8]} />
          <meshStandardMaterial color="#78513c" roughness={0.88} />
        </mesh>
        <mesh position={[2.15, 1.85, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.08, 0.1, 3.7, 8]} />
          <meshStandardMaterial color="#78513c" roughness={0.88} />
        </mesh>
        <mesh position={[0, 3.66, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.55, 0.14, 0.18]} />
          <meshStandardMaterial color="#92400e" roughness={0.85} />
        </mesh>
        <group ref={bellPivotRef} position={[0, 3.58, 0]}>
          <mesh position={[0, -0.44, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.88, 6]} />
            <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.9, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.095, 0.25, 0.36, 16]} />
            <meshStandardMaterial color="#eab308" metalness={0.78} roughness={0.25} />
          </mesh>
          <mesh position={[0, -1.07, 0]}>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshStandardMaterial color="#92400e" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      </group>

      {/* Interactive Brass Deepstambh Oil Diya Stand (`x = -2.55, z = -2.55`) */}
      <group position={[-2.55, 0, -2.55]}>
        <mesh position={[0, 0.48, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.16, 0.25, 0.96, 12]} />
          <meshStandardMaterial color="#5c4738" roughness={0.86} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.35, 0.22, 0.12, 14]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.68} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.11, 0.06, 0.08, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.82} />
        </mesh>
        {litDiya && (
          <>
            <mesh ref={diyaFlameRef} position={[0, 1.22, 0]}>
              <coneGeometry args={[0.055, 0.18, 8]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
            <pointLight position={[0, 1.38, 0]} intensity={2.4} color="#fb923c" distance={7.5} />
          </>
        )}
      </group>

      {/* Sacred Ancient Banyan Tree w/ Stone Chabutra Platform & Tied Mauli Prayer Threads (`x = 5.7, z = -1.9`) */}
      <group position={[5.7, 0, -1.9]}>
        <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <cylinderGeometry args={[1.18, 1.25, 0.44, 14]} />
          <meshStandardMaterial color="#7c7061" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.52, 0.74, 2.7, 10]} />
          <meshStandardMaterial color="#57412e" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.64, 0.65, 0.16, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.32, 0]}>
          <cylinderGeometry args={[0.61, 0.62, 0.09, 12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.88} />
        </mesh>
        {[
          [-0.78, -0.35],
          [0.82, 0.28],
          [0.35, -0.75],
        ].map(([rx, rz], idx) => (
          <mesh key={idx} position={[rx, 1.15, rz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.055, 0.08, 2.3, 6]} />
            <meshStandardMaterial color="#5e4632" roughness={0.94} />
          </mesh>
        ))}
        <mesh position={[0, 3.35, 0]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[2.25, 0]} />
          <meshStandardMaterial color="#275434" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-1.2, 3.05, 0.6]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[1.48, 0]} />
          <meshStandardMaterial color="#31653f" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[1.1, 3.0, -0.5]} castShadow={shadowsEnabled}>
          <dodecahedronGeometry args={[1.4, 0]} />
          <meshStandardMaterial color="#2d5f3a" roughness={0.9} flatShading />
        </mesh>
      </group>

      {/* Natural Sacred Mountain Spring Water Kund / Basin (`x = -5.6, z = 0.6`) */}
      <group position={[-5.6, 0, 0.6]}>
        <mesh position={[0, 0.42, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.45, 0.84, 1.35]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.83, 0]}>
          <boxGeometry args={[1.15, 0.06, 1.05]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.22} metalness={0.2} />
        </mesh>
        <mesh position={[-0.58, 1.2, 0]}>
          <boxGeometry args={[0.3, 0.72, 0.34]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        <mesh position={[-0.36, 1.04, 0]} rotation={[0, 0, -0.22]}>
          <cylinderGeometry args={[0.028, 0.042, 0.42, 8]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.78} />
        </mesh>
      </group>

      {/* Pilgrimage Market Vendors, Garlands, Prasad Stalls, Queue & Walking Devotees */}
      <NeelkanthMarketAndCrowd paused={paused} castShadow={shadowsEnabled} />

      {/* Subtle floating sparkle motes (hidden during Darshan focus so Shivling sightline stays crisp) */}
      <HotspotBeaconSparkle
        position={[0, 0, -1.75]}
        visible={!rangBell && !activeDarshanPan}
        color="#f59e0b"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[-2.55, 0, -1.6]}
        visible={!litDiya && !activeDarshanPan}
        color="#fb923c"
        height={0.92}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0, 0, -3.1]}
        visible={!hadDarshan && !activeDarshanPan}
        color="#fde047"
        height={1.0}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[2.85, 0.9, 16.5]}
        visible={!capturedFood}
        color="#f97316"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0.25, 0, 21.65]}
        visible={hadDarshan || rangBell || litDiya}
        color="#fbbf24"
        height={0.88}
        paused={paused}
        reducedMotion={reducedMotion}
      />

      {/* Surrounding Manikoot Forest Pines */}
      <instancedMesh ref={trunkInstRef} args={[undefined, undefined, MAX_FOREST_PINES]}>
        <cylinderGeometry args={[0.15, 0.22, 1.8, 6]} />
        <meshStandardMaterial color="#5b3e28" roughness={0.94} />
      </instancedMesh>
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, MAX_FOREST_PINES]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.35, 3.7, 7]} />
        <meshStandardMaterial color="#2a5738" roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}
