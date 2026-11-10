'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StallCookCharacter } from '@/components/canvas/characters/StallCookCharacter';
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

export const BAAL_KUWARI_MAGGI_WALK_BOUNDS: WalkBounds = {
  minX: -6.4,
  maxX: 6.4,
  minZ: -4.4,
  maxZ: 4.5,
};

export const BAAL_KUWARI_MAGGI_TABLE_CENTER = { x: 0.45, z: -1.35 } as const;

export const BAAL_KUWARI_MAGGI_SEAT_SLOTS = {
  srishti: { x: 0.45, z: -0.48, facingYaw: 0 },
  ishaan: { x: 0.45, z: -2.22, facingYaw: Math.PI },
  friend_plaid: { x: -0.88, z: -1.35, facingYaw: -Math.PI / 2 },
  friend_black_tee: { x: 1.78, z: -1.35, facingYaw: Math.PI / 2 },
} as const;

export const BAAL_KUWARI_MAGGI_OBSTACLES: readonly WalkObstacle[] = [
  // Trailhead Maggi tapri shelter
  { kind: 'box', minX: -5.2, maxX: -2.1, minZ: -3.85, maxZ: -1.1 },
  // Wooden bench & Maggi dining table
  { kind: 'box', minX: -0.58, maxX: 1.48, minZ: -1.95, maxZ: -0.75 },
  // Staircase entrance sandstone archway pillars flanking opening at x in [-1.25, +1.25]
  { kind: 'box', minX: -3.2, maxX: -1.3, minZ: -4.75, maxZ: -3.75 },
  { kind: 'box', minX: 1.3, maxX: 3.2, minZ: -4.75, maxZ: -3.75 },
  // Parked scooters along forest trailhead bay
  { kind: 'box', minX: 0.4, maxX: 2.3, minZ: 2.8, maxZ: 3.7 },
  { kind: 'box', minX: -2.1, maxX: -0.2, minZ: 2.8, maxZ: 3.7 },
];

export const BAAL_KUWARI_MAGGI_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'trail_maggi',
    label: 'Eat Pre-Climb Maggi',
    x: 0.45,
    z: -0.28,
    radius: 1.75,
    actionType: 'interact',
  },
  {
    id: 'start_climb',
    label: 'Begin Baal Kuwari Climb (~400 Stairs)',
    x: 0.0,
    z: -3.75,
    radius: 1.9,
    actionType: 'interact',
  },
  {
    id: 'back_to_road',
    label: 'Replay Mountain Route',
    x: 0.25,
    z: 2.15,
    radius: 1.4,
    actionType: 'interact',
  },
];

export interface BaalKuwariMaggiStopEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  ateMaggi: boolean;
  eatingActive: boolean;
}

const MAX_PINE_COUNT = 54;

const TRAILHEAD_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-54, -4, -56], scale: [40, 26, 34], rotationY: 0.2, color: '#3b5d47' },
  { position: [4, 2, -74], scale: [56, 36, 40], rotationY: -0.08, color: '#476878' },
  { position: [56, -3, -52], scale: [44, 26, 34], rotationY: -0.25, color: '#3f624c' },
];

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sampleTrailheadTerrainY(x: number, z: number): number {
  const sideDist = Math.max(0, Math.abs(x) - 8.6);
  const rearDist = z < -5.2 ? -5.2 - z : 0;
  const frontRoadDist = z > 7.6 ? z - 7.6 : 0;
  const noise =
    Math.sin(x * 0.13 + z * 0.09) * 0.72 + Math.cos(x * 0.07 - z * 0.14) * 0.55;

  // Rises steeply into wooded mountain slope behind staircase (`z < -5.2`) & sides (`|x| > 8.6`)
  const rearClimb = smoothStep01(rearDist / 4.2) * (0.4 + rearDist * 0.34);
  const sideRise = smoothStep01(sideDist / 5.0) * (0.35 + sideDist * 0.28);
  const roadDrop = smoothStep01(frontRoadDist / 9.0) * Math.min(6.0, frontRoadDist * 0.25);

  if (Math.abs(x) <= 8.5 && z >= -5.2 && z <= 7.5) {
    return -0.24;
  }
  return -0.24 + rearClimb + sideRise - roadDrop + noise * smoothStep01((sideDist + rearDist) / 5.0) * 0.65;
}

/**
 * Distinct Trailhead Base & Pre-Climb Maggi Stop sitting below the Baal Kuwari stone staircase arch.
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

  const steamRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const animTimeRef = useRef(0);

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);

  const pineTransforms = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINE_COUNT; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const inBackHill = i % 3 === 0;
      const x = inBackHill
        ? -26 + ((i * 7.4) % 52)
        : side * (9.8 + (i % 6) * 4.4 + ((i * 3) % 5) * 0.5);
      const z = inBackHill ? -8.5 - (i % 5) * 4.2 : -18 + ((i * 4.8) % 26);
      const scale = 0.85 + ((i * 11) % 7) * 0.08;
      items.push([x, sampleTrailheadTerrainY(x, z) - 0.2, z, scale]);
    }
    return items;
  }, []);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = pineCount;
    crownInstRef.current.count = pineCount;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i += 1) {
      const [x, y, z, s] = pineTransforms[i];
      dummy.position.set(x, y + 0.85 * s, z);
      dummy.rotation.set(0, (i * 0.9) % (Math.PI * 2), 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInstRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.4 * s, z);
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
      <color attach="background" args={['#b8d8ec']} />
      <fog attach="fog" args={['#cfe4f4', 32, 120]} />

      <hemisphereLight args={['#eef7ff', '#4b5b44', 0.96]} />
      <directionalLight
        position={[18, 28, 14]}
        intensity={1.72}
        color="#fff1d1"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Forest clearing gravel pad & retaining earth stone base */}
      <mesh position={[0, -2.5, -0.2]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[17.2, 4.8, 12.6]} />
        <meshStandardMaterial color="#685d4d" roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[17.0, 0.12, 10.6]} />
        <meshStandardMaterial color="#7d725d" roughness={0.95} />
      </mesh>

      {/* Mountain road behind parked scooters */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 5.5]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[160, 4.4]} />
        <meshStandardMaterial color="#384152" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 5.5]}>
        <planeGeometry args={[160, 0.14]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </mesh>

      {/* Contoured surrounding mountain terrain + distant Himalayan ridges */}
      <ConnectedHillTerrain
        width={140}
        depth={120}
        centerX={0}
        centerZ={-18}
        segX={64}
        segZ={56}
        heightFn={sampleTrailheadTerrainY}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={TRAILHEAD_RIDGES} />

      {/* Distinct Forest Trailhead Pre-Climb Maggi Stall (`x = -3.65, z = -2.45`) */}
      <group position={[-3.65, 0, -2.45]} rotation={[0, -0.45, 0]}>
        {[
          [-1.25, -1.0],
          [1.05, -1.0],
          [-1.25, 1.0],
          [1.05, 1.0],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.38, pz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.06, 0.072, 2.76, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}

        {/* Forest-green corrugated shelter roof & cream trailhead fascia */}
        <mesh position={[-0.1, 2.78, 0]} rotation={[0, 0, -0.09]} castShadow={shadowsEnabled}>
          <boxGeometry args={[2.95, 0.1, 2.5]} />
          <meshStandardMaterial color="#15803d" roughness={0.82} />
        </mesh>
        <mesh position={[1.15, 2.38, 0]}>
          <boxGeometry args={[0.1, 0.26, 2.1]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.7} />
        </mesh>
        {/* Side firewood rack & yellow Maggi wall strings */}
        {[-0.2, 0.08, 0.36].map((my, idx) => (
          <mesh key={idx} position={[1.05, 1.85 - my * 0.9, 0.92]}>
            <boxGeometry args={[0.08, 0.22, 0.16]} />
            <meshStandardMaterial color="#facc15" roughness={0.62} />
          </mesh>
        ))}

        {/* Cooking stove & aluminum pot with hot Maggi */}
        <mesh position={[0.25, 0.45, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.85, 0.9, 1.95]} />
          <meshStandardMaterial color="#654321" roughness={0.88} />
        </mesh>
        <mesh position={[0.25, 0.92, 0]}>
          <boxGeometry args={[0.92, 0.06, 2.02]} />
          <meshStandardMaterial color="#785233" roughness={0.8} />
        </mesh>
        <mesh position={[0.28, 1.04, -0.35]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.2, 0.17, 0.14, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.68} roughness={0.32} />
        </mesh>
        <mesh position={[0.28, 1.1, -0.35]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 14]} />
          <meshStandardMaterial color="#facc15" roughness={0.75} />
        </mesh>
        <group ref={steamRef} position={[0.28, 1.16, -0.35]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.14, 0]}>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.44} depthWrite={false} />
            </mesh>
          ))}
        </group>

        {/* Visible Stall Cook behind the counter */}
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

      {/* Pre-Climb Trailhead Dining Table & Stools (`x = 0.45, z = -1.35`) */}
      <group position={[BAAL_KUWARI_MAGGI_TABLE_CENTER.x, 0, BAAL_KUWARI_MAGGI_TABLE_CENTER.z]}>
        {[
          [0, 0.87],
          [0, -0.87],
          [-1.35, 0],
          [1.35, 0],
        ].map(([sx, sz], idx) => (
          <group key={idx} position={[sx, 0, sz]}>
            <mesh position={[0, 0.43, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.24, 0.26, 0.05, 12]} />
              <meshStandardMaterial color="#8c5e42" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.21, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.06, 0.09, 0.42, 8]} />
              <meshStandardMaterial color="#5c4033" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Wooden dining table top */}
        {[
          [-0.78, -0.4],
          [0.78, -0.4],
          [-0.78, 0.4],
          [0.78, 0.4],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.36, lz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.04, 0.035, 0.72, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.72, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
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
              <group key={idx} position={[bx, 0.77, bz]}>
                <mesh castShadow={shadowsEnabled}>
                  <cylinderGeometry args={[0.16, 0.12, 0.04, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.025, 0]}>
                  <sphereGeometry args={[0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                  <meshStandardMaterial color="#eab308" roughness={0.78} />
                </mesh>
              </group>
            ))}
          </>
        )}
      </group>

      {/* Baal Kuwari Staircase Base Archway & Opening Rising Steps (`x = 0, z = -4.25`) */}
      <group position={[0, 0, -4.25]}>
        <mesh position={[-1.95, 1.45, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.35, 2.9, 0.65]} />
          <meshStandardMaterial color="#7e7262" roughness={0.92} />
        </mesh>
        <mesh position={[1.95, 1.45, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[1.35, 2.9, 0.65]} />
          <meshStandardMaterial color="#7e7262" roughness={0.92} />
        </mesh>
        <mesh position={[0, 3.05, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[5.5, 0.56, 0.8]} />
          <meshStandardMaterial color="#b45309" roughness={0.78} />
        </mesh>
        <mesh position={[0, 3.55, 0]}>
          <boxGeometry args={[2.6, 0.34, 0.4]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.65} />
        </mesh>

        {/* Visible beginning mountain stone steps rising away into forest (-Z) */}
        {Array.from({ length: 12 }, (_, stepIdx) => (
          <mesh
            key={stepIdx}
            position={[0, 0.12 + stepIdx * 0.18, -0.5 - stepIdx * 0.42]}
            receiveShadow={shadowsEnabled}
          >
            <boxGeometry args={[2.55, 0.22, 0.48]} />
            <meshStandardMaterial color={stepIdx % 2 === 0 ? '#8c816f' : '#807665'} roughness={0.94} />
          </mesh>
        ))}
      </group>

      {/* Parked Scooters beside Forest Road Pull-Off */}
      <group position={[1.35, 0, 3.25]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.15, 0, 3.25]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Forested Himalayan Pines around Base Clearing */}
      <instancedMesh
        ref={trunkInstRef}
        args={[undefined, undefined, MAX_PINE_COUNT]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.14, 0.22, 1.75, 7]} />
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
        position={[0.45, 0, -0.28]}
        visible={!ateMaggi && !eatingActive}
        color="#f59e0b"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0, 0.15, -3.75]}
        visible={ateMaggi}
        color="#38bdf8"
        height={1.1}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
