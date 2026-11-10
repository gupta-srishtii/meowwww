'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { ConnectedHillTerrain } from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export const HOTEL_WALK_BOUNDS: WalkBounds = {
  minX: -6.5,
  maxX: 6.5,
  minZ: -3.9,
  maxZ: 4.8,
};

export const HOTEL_OBSTACLES: readonly WalkObstacle[] = [
  // Two-story Rishikesh hotel facade & porch pillar line
  { kind: 'box', minX: -7.5, maxX: 7.5, minZ: -6.5, maxZ: -4.1 },
  // Original group & luggage cluster waiting by hotel stairs (`x ~ 2.75, z ~ -1.8`)
  { kind: 'box', minX: 1.95, maxX: 4.35, minZ: -2.65, maxZ: -1.15 },
  // Parked scooters by hotel entrance driveway
  { kind: 'box', minX: 0.4, maxX: 2.3, minZ: 3.1, maxZ: 4.0 },
  { kind: 'box', minX: -2.15, maxX: -0.25, minZ: 3.1, maxZ: 4.0 },
];

export const HOTEL_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'rejoin_farewell',
    label: 'Drop Srishti to Her Friends & Wave Goodbye',
    x: 2.15,
    z: -0.85,
    radius: 2.25,
    actionType: 'interact',
  },
  {
    id: 'hotel_polaroid',
    label: 'Take Evening Courtyard Polaroid',
    x: -0.35,
    z: 0.45,
    radius: 1.8,
    actionType: 'photo',
  },
];

const HOTEL_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-58, -8, -56], scale: [46, 26, 36], rotationY: 0.2, color: '#4d5d73' },
  { position: [8, -6, -74], scale: [58, 32, 42], rotationY: -0.1, color: '#58677f' },
  { position: [62, -8, -54], scale: [46, 25, 36], rotationY: -0.25, color: '#48596e' },
];

function sampleHotelTerrainY(x: number, z: number): number {
  const sideDist = Math.max(0, Math.abs(x) - 8.6);
  const backDist = z < -7.5 ? -7.5 - z : 0;
  const frontDist = z > 7.6 ? z - 7.6 : 0;
  const wave = Math.sin(x * 0.1 + z * 0.09) * 0.6;
  if (Math.abs(x) <= 8.5 && z >= -7.5 && z <= 7.5) return -0.26;
  const edge = Math.max(sideDist, backDist, frontDist);
  return -0.26 + Math.max(0, sideDist + backDist) * 0.24 - frontDist * 0.12 + wave * Math.min(1, edge / 8);
}

export interface HotelReturnEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  farewellDone: boolean;
  capturedPolaroid: boolean;
}

/**
 * Shared Rishikesh hotel courtyard in golden-evening light:
 * ground-floor veranda (Ishaan & friends) & first-floor balcony stairs (Srishti),
 * parked scooters, and Srishti's original group waiting warmly at the courtyard.
 */
export function HotelReturnEnvironment({
  qualityProfile,
  paused,
  farewellDone,
  capturedPolaroid,
}: HotelReturnEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const origTorso0 = useRef<THREE.Group | null>(null);
  const origTorso1 = useRef<THREE.Group | null>(null);
  const origTorso2 = useRef<THREE.Group | null>(null);
  const origArm0 = useRef<THREE.Group | null>(null);
  const origArm1 = useRef<THREE.Group | null>(null);
  const origArm2 = useRef<THREE.Group | null>(null);
  const origTorsoRefs = useMemo(() => [origTorso0, origTorso1, origTorso2], []);
  const origRightArmRefs = useMemo(() => [origArm0, origArm1, origArm2], []);
  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);
  const animPhaseRef = useRef(0);

  const MAX_PINES = 36;
  const pinePositions = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINES; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (9.5 + (i % 6) * 4.4);
      const z = -16 + ((i * 5.2) % 32);
      const s = 0.85 + ((i * 9) % 6) * 0.07;
      items.push([x, sampleHotelTerrainY(x, z) - 0.55 * s, z, s]);
    }
    return items;
  }, []);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = MAX_PINES;
    crownInstRef.current.count = MAX_PINES;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < MAX_PINES; i += 1) {
      const [x, y, z, s] = pinePositions[i];
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
  }, [pinePositions]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    animPhaseRef.current += Math.min(rawDelta, 0.05);
    const t = animPhaseRef.current;

    for (let i = 0; i < 3; i += 1) {
      const torso = origTorsoRefs[i].current;
      if (torso) {
        torso.position.y = 0.8 + Math.sin(t * 2.0 + i * 1.4) * 0.008;
      }
      const arm = origRightArmRefs[i].current;
      if (arm) {
        arm.rotation.x = farewellDone ? 0.55 + Math.sin(t * 4.2 + i) * 0.14 : 0.18 + Math.sin(t * 1.4 + i) * 0.06;
        arm.rotation.z = farewellDone ? 0.45 : 0.1;
      }
    }
  });

  return (
    <group>
      {/* Early-evening dusk gradient lighting */}
      <color attach="background" args={['#b88874']} />
      <fog attach="fog" args={['#b58672', 36, 130]} />

      <hemisphereLight args={['#ffd6ad', '#3b4252', 0.88]} />
      <directionalLight
        position={[-22, 16, 14]}
        intensity={1.45}
        color="#ffbc7d"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Courtyard Sandstone Forecourt & Deep Foundation Plinth */}
      <mesh position={[0, -2.5, 0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[17.0, 4.8, 15.2]} />
        <meshStandardMaterial color="#5e5449" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[16.8, 0.12, 15.0]} />
        <meshStandardMaterial color="#968978" roughness={0.9} />
      </mesh>

      {/* Evening street passing outer edge of courtyard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 6.2]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[160, 4.8]} />
        <meshStandardMaterial color="#333b49" roughness={0.92} />
      </mesh>

      {/* Surrounding hills & silhouettes */}
      <ConnectedHillTerrain
        width={145}
        depth={125}
        centerX={0}
        centerZ={-12}
        segX={60}
        segZ={54}
        heightFn={sampleHotelTerrainY}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={HOTEL_RIDGES} />

      {/* Shared Two-Story Rishikesh Hotel Facade (`z = -5.6`: Ground Floor & First Floor Balcony) */}
      <group position={[0, 0, -5.6]}>
        {/* Main Building Block */}
        <mesh position={[0, 2.75, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[13.6, 5.5, 3.2]} />
          <meshStandardMaterial color="#e8decb" roughness={0.86} />
        </mesh>
        {/* Warm Terracotta Roof Eaves */}
        <mesh position={[0, 5.65, 0.2]} castShadow={shadowsEnabled}>
          <boxGeometry args={[14.2, 0.34, 3.8]} />
          <meshStandardMaterial color="#9a3412" roughness={0.82} />
        </mesh>
        {/* Ground Floor Lobby Veranda Arch & Warm Lit Interior Glow */}
        <mesh position={[-1.4, 1.35, 1.62]}>
          <boxGeometry args={[3.4, 2.45, 0.08]} />
          <meshStandardMaterial color="#78350f" roughness={0.85} />
        </mesh>
        <mesh position={[-1.4, 1.35, 1.67]}>
          <planeGeometry args={[2.6, 2.15]} />
          <meshBasicMaterial color="#fde68a" />
        </mesh>
        {/* Ground floor veranda beam & pillars */}
        <mesh position={[0, 2.65, 2.15]} castShadow={shadowsEnabled}>
          <boxGeometry args={[13.4, 0.24, 1.3]} />
          <meshStandardMaterial color="#8c5e42" roughness={0.86} />
        </mesh>
        {[-5.6, -2.8, 0.4, 3.6, 5.8].map((px) => (
          <mesh key={px} position={[px, 1.32, 2.6]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.32, 2.64, 0.32]} />
            <meshStandardMaterial color="#d4c4ab" roughness={0.86} />
          </mesh>
        ))}

        {/* Exterior Stairs Rising Along Right Wing Toward 1st Floor Balcony (Srishti's Floor) */}
        {Array.from({ length: 8 }, (_, idx) => (
          <mesh
            key={idx}
            position={[4.6 + idx * 0.34, 0.2 + idx * 0.34, 2.25]}
            castShadow={shadowsEnabled}
          >
            <boxGeometry args={[0.42, 0.22, 0.95]} />
            <meshStandardMaterial color="#9e8f7b" roughness={0.9} />
          </mesh>
        ))}
        {/* First-floor balcony windows & railing */}
        <mesh position={[0, 3.35, 2.72]}>
          <boxGeometry args={[13.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#785233" roughness={0.86} />
        </mesh>
        {[-4.2, -1.4, 1.6, 4.2].map((wx) => (
          <mesh key={wx} position={[wx, 4.15, 1.62]}>
            <planeGeometry args={[1.45, 1.1]} />
            <meshBasicMaterial color={wx > 0 ? '#fef08a' : '#94a3b8'} />
          </mesh>
        ))}

        {/* Warm Hotel Lanterns Lighting Evening Courtyard (1 key fill light + emissive globes) */}
        <pointLight position={[0.4, 2.35, 2.95]} intensity={2.1} color="#fbbf24" distance={14} />
        {[-3.2, 0.4, 3.8].map((lx) => (
          <group key={lx} position={[lx, 2.42, 2.7]}>
            <mesh>
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Srishti's Original Friends Waiting Together Near First-Floor Stairs w/ Day Luggage (`x = 2.75, z = -1.9`) */}
      <group position={[2.85, 0, -1.9]}>
        {[
          { x: -0.25, z: -0.15, yaw: -0.4, shirt: '#1d4ed8', pants: '#1e293b', idx: 0 },
          { x: 0.42, z: 0.25, yaw: -0.75, shirt: '#b45309', pants: '#334155', idx: 1 },
          { x: 0.85, z: -0.3, yaw: -0.5, shirt: '#0f766e', pants: '#1f2937', idx: 2 },
        ].map((f) => (
          <StylizedPlaceholderCharacter
            key={f.idx}
            characterVariant="traveler"
            torsoRef={origTorsoRefs[f.idx]}
            rightArmRef={origRightArmRefs[f.idx]}
            position={[f.x, 0, f.z]}
            rotationY={f.yaw}
            jacketColor={f.shirt}
            pantsColor={f.pants}
            scale={0.97}
            castShadow={shadowsEnabled}
          />
        ))}
        {/* Small travel day-bags neatly beside waiting group */}
        <mesh position={[0.15, 0.22, 0.58]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.38, 0.44, 0.26]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
        <mesh position={[0.62, 0.2, 0.48]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.34, 0.4, 0.24]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.85} />
        </mesh>
      </group>

      {/* Parked Scooters in Hotel Forecourt (`z = 3.5`) */}
      <group position={[1.35, 0, 3.55]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.2, 0, 3.55]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Perimeter Trees */}
      <instancedMesh
        ref={trunkInstRef}
        args={[undefined, undefined, MAX_PINES]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5c4033" roughness={0.94} />
      </instancedMesh>
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, MAX_PINES]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.35, 3.5, 7]} />
        <meshStandardMaterial color="#275036" roughness={0.88} />
      </instancedMesh>

      <HotspotBeaconSparkle
        position={[2.15, 0, -0.85]}
        visible={!farewellDone}
        color="#f59e0b"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[-0.35, 0, 0.45]}
        visible={!capturedPolaroid}
        color="#38bdf8"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

