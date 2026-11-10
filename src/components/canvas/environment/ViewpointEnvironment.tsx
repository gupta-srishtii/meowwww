'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildConnectedHillGeometry,
  ConnectedHillTerrain,
} from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  createTerrainMeshSampler,
  sampleTerrainFootprint,
} from '@/lib/terrainMeshSampler';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';

export const VIEWPOINT_WALK_BOUNDS: WalkBounds = {
  minX: -6.4,
  maxX: 6.4,
  minZ: -4.95,
  maxZ: 4.5,
};

export const VIEWPOINT_OBSTACLES: readonly WalkObstacle[] = [
  // Parked Scooter 1 & Scooter 2 facing onward (+X)
  { kind: 'box', minX: 0.35, maxX: 2.25, minZ: 2.75, maxZ: 3.65 },
  { kind: 'box', minX: -2.15, maxX: -0.25, minZ: 2.75, maxZ: 3.65 },
  // Wooden overlook marker post & boulder cluster on left edge
  { kind: 'box', minX: -5.85, maxX: -4.55, minZ: -4.75, maxZ: -3.75 },
  // Friends standing along the scenic valley overlook fence
  { kind: 'circle', x: 0.65, z: -4.15, radius: 0.34 },
  { kind: 'circle', x: 1.45, z: -4.22, radius: 0.34 },
  { kind: 'circle', x: 2.25, z: -4.1, radius: 0.34 },
];

export const VIEWPOINT_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'viewpoint_solo',
    label: 'Take Shree & Ishaan Photo',
    x: -2.55,
    z: -3.6,
    radius: 1.65,
    actionType: 'photo',
  },
  {
    id: 'viewpoint_group',
    label: 'Take 4-Friend Group Photo',
    x: 0.15,
    z: -3.3,
    radius: 1.8,
    actionType: 'photo',
  },
  {
    id: 'scooters',
    label: 'Ride Scooters · Toward Maggi & Chai',
    x: 0.2,
    z: 1.95,
    radius: 1.55,
    actionType: 'interact',
  },
];

export interface ViewpointEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  capturedSolo: boolean;
  capturedGroup: boolean;
}

const MAX_PINE_COUNT = 52;

const VIEWPOINT_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-68, -16, -96], scale: [46, 30, 38], rotationY: 0.25, color: '#6b8ba4' },
  { position: [8, -15, -112], scale: [56, 34, 42], rotationY: -0.15, color: '#587892' },
  { position: [74, -16, -94], scale: [48, 30, 38], rotationY: -0.3, color: '#63829b' },
  { position: [-96, -18, -58], scale: [42, 26, 34], rotationY: 0.4, color: '#56748d' },
  { position: [-42, -5, 34], scale: [32, 16, 28], rotationY: 0.12, color: '#3b6944' },
  { position: [44, -4, 36], scale: [34, 17, 30], rotationY: -0.18, color: '#345f3d' },
];

const PRAYER_FLAG_COLORS = ['#ef4444', '#f59e0b', '#f8fafc', '#22c55e', '#3b82f6'];

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Contoured Rishikesh overlook cliffside terrain: rises behind the road (z > 8),
 * stays tucked beneath the highway & viewpoint retaining terrace, plunges into a
 * sandy-shingle river canyon (`z ~ -46`), and climbs opposite forested foothills.
 */
function sampleViewpointTerrainY(x: number, z: number): number {
  const inTerraceFootprint = Math.abs(x) <= 14.3 && z >= -8.8 && z <= 7.8;
  const onHighwayCorridor = z >= 1.9 && z <= 7.9;

  const noise =
    Math.sin(x * 0.095 + z * 0.075) * 0.85 +
    Math.cos(x * 0.058 - z * 0.11) * 0.62 +
    (1 - Math.abs(Math.sin(x * 0.032 - z * 0.025)) - 0.5) * 2.4;

  // Valley drop forward of cliff (`z < -5.8`) vs mountain slope rising uphill behind road (`z > 7.8`)
  const valleyDropT = smoothStep01((-5.8 - z) / 26.0);
  const rearClimbT = smoothStep01((z - 8.2) / 14.0);
  const flankSpurRise =
    smoothStep01((Math.abs(x) - 15.5) / 11.0) * smoothStep01((z + 10) / 16.0) * 2.1;

  let rawY =
    -0.32 -
    Math.pow(valleyDropT, 0.82) * 11.8 +
    rearClimbT * (2.2 + Math.max(0, z - 8.2) * 0.25) +
    flankSpurRise +
    noise * smoothStep01(Math.abs(z - 4.5) / 7.5) * 0.72;

  // Gently sloped canyon riverbed along z ~ -44 so straight water plane rests cleanly inside sandy banks
  const riverZ = -44;
  const distToRiver = z - riverZ;
  const riverBandT = 1 - smoothStep01(Math.abs(distToRiver) / 11.5);
  rawY = THREE.MathUtils.lerp(rawY, -13.4, riverBandT * 0.92);

  // Opposite Shivalik foothills rising beyond river (`z < riverZ - 9`)
  if (distToRiver < -9) {
    const oppClimb = -distToRiver - 9;
    const oppY = -12.6 + Math.pow(oppClimb, 0.86) * 0.48 + noise * 0.9;
    rawY = THREE.MathUtils.lerp(rawY, oppY, smoothStep01(oppClimb / 9.0));
  }

  if (inTerraceFootprint || onHighwayCorridor) {
    return Math.min(rawY, -0.26);
  }
  return rawY;
}

const _vpSand = new THREE.Color('#978c78');
const _vpRock = new THREE.Color('#646d63');
const _vpGrass = new THREE.Color('#476b3b');
const _vpDeep = new THREE.Color('#345632');

function sampleViewpointTerrainColor(
  worldX: number,
  worldZ: number,
  height: number,
  targetColor: THREE.Color
): void {
  const riverDist = Math.abs(worldZ - -44);
  if (riverDist < 12.5) {
    targetColor.copy(_vpSand).lerp(_vpRock, Math.min(1, riverDist / 12.5) * 0.85);
    return;
  }
  if (height < -7.5) {
    const t = Math.min(1, (-height - 7.5) / 5.5);
    targetColor.copy(_vpGrass).lerp(_vpRock, t * 0.45);
  } else if (height > 1.2) {
    targetColor.copy(_vpGrass).lerp(_vpDeep, Math.min(1, (height - 1.2) / 6.0));
  } else {
    targetColor.copy(_vpRock).lerp(_vpGrass, smoothStep01((Math.abs(worldX) - 12) / 10));
  }
  targetColor.offsetHSL(0, 0, Math.sin(worldX * 0.14 + worldZ * 0.12) * 0.025);
}

const VIEWPOINT_SLOPE_BOULDERS: readonly [number, number, number][] = [
  [-15.2, -5.8, 0.92],
  [-16.4, 0.4, 0.84],
  [15.4, -4.6, 0.88],
  [16.8, 1.1, 0.96],
  [-10.2, 9.4, 0.78],
  [9.6, 9.8, 0.85],
  [-21.0, -9.8, 1.05],
  [21.8, -9.4, 1.0],
];

export function ViewpointEnvironment({
  qualityProfile,
  paused,
  capturedSolo,
  capturedGroup,
}: ViewpointEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_PINE_COUNT, Math.round(MAX_PINE_COUNT * densityRatio));

  const flagRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shrubRefs = useRef<(THREE.Group | null)[]>([]);
  const animPhaseRef = useRef(0);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 240,
        depth: 185,
        centerX: 0,
        centerZ: -34,
        segX: 92,
        segZ: 74,
        heightFn: sampleViewpointTerrainY,
        colorFn: sampleViewpointTerrainColor,
      }),
    []
  );

  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  const terrainSampler = useMemo(
    () => createTerrainMeshSampler([terrainGeometry], 4.0),
    [terrainGeometry]
  );

  const pineTransforms = useMemo(() => {
    const list: Array<{ x: number; y: number; z: number; scale: number; rotY: number }> = [];
    for (let i = 0; i < MAX_PINE_COUNT; i++) {
      const band = i % 3;
      const sideSign = i % 2 === 0 ? -1 : 1;
      let x: number;
      let z: number;
      if (band === 0) {
        // Upper hillside woodland behind highway
        x = sideSign * (5 + ((i * 6.4) % 48));
        z = 10.4 + ((i * 4.7) % 28);
      } else if (band === 1) {
        // Flanking cliffside spurs outside the overlook terrace
        x = sideSign * (15.8 + (i % 7) * 5.2);
        z = -14 + ((i * 5.2) % 28);
      } else {
        // Gorge flanks & opposite bank foothills (strictly outside river channel z ~ -44)
        x = sideSign * (8 + ((i * 7.1) % 48));
        z = i % 3 === 0 ? -64 - (i % 7) * 2.2 : -11.5 - (i % 6) * 2.1;
      }
      const scale = 0.78 + ((i * 19) % 10) * 0.055;
      const footprint = sampleTerrainFootprint(terrainSampler, x, z, 0.42 * scale);
      const minSurfaceY = footprint ? footprint.minY : sampleViewpointTerrainY(x, z);
      const y = minSurfaceY - 0.14 * scale;
      list.push({
        x,
        y,
        z,
        scale,
        rotY: (i * 1.13) % (Math.PI * 2),
      });
    }
    return list;
  }, [terrainSampler]);

  useEffect(() => {
    const trunks = trunkRef.current;
    const crowns = crownRef.current;
    if (!trunks || !crowns) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i++) {
      const t = pineTransforms[i];
      dummy.position.set(t.x, t.y + 0.92 * t.scale, t.z);
      dummy.rotation.set(0, t.rotY, 0);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, t.y + 2.55 * t.scale, t.z);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
  }, [pineCount, pineTransforms]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!paused && !reducedMotion) {
      animPhaseRef.current += delta;
    }
    const t = animPhaseRef.current;

    // Gentle breeze flutter across prayer flags & roadside bushes
    if (!paused && !reducedMotion) {
      for (let i = 0; i < flagRefs.current.length; i++) {
        const flag = flagRefs.current[i];
        if (!flag) continue;
        flag.rotation.x = Math.sin(t * 4.4 + i * 0.55) * 0.22;
        flag.rotation.z = Math.cos(t * 3.1 + i * 0.4) * 0.08;
      }
      for (let i = 0; i < shrubRefs.current.length; i++) {
        const shrub = shrubRefs.current[i];
        if (!shrub) continue;
        shrub.rotation.z = Math.sin(t * 1.9 + i * 1.3) * 0.045;
      }
    }
  });

  const { scene } = useThree();
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#b8d8ee');
    scene.fog = new THREE.Fog('#cfe4f5', 48, 245);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#b8d8ee']} />
      <fog attach="fog" args={['#cfe4f5', 48, 245]} />
      <group>

      <ambientLight intensity={0.72} color="#fff7ed" />
      <hemisphereLight args={['#e0f2fe', '#3a5743', 0.92]} />
      <directionalLight
        position={[24, 34, 20]}
        intensity={1.72}
        color="#fff1d6"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={5}
        shadow-camera-far={90}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />

      {/* Dusty gravel & turf roadside overlook terrace backed by solid cliffstone retaining wall */}
      <mesh position={[0, -2.14, -0.5]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[28, 4.2, 16]} />
        <meshStandardMaterial color="#675c4d" roughness={0.96} />
      </mesh>
      <mesh position={[0, -2.12, -5.65]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[17.2, 4.22, 0.75]} />
        <meshStandardMaterial color="#5c5346" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.5]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[28, 16]} />
        <meshStandardMaterial color="#7d725b" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -2.5]} receiveShadow={shadowsEnabled}>
        <circleGeometry args={[5.8, 32]} />
        <meshStandardMaterial color="#877b62" roughness={0.94} />
      </mesh>
      {/* Natural grassy patches inspired by Rishikesh roadside overlook */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.2, -0.004, -3.5]} receiveShadow={shadowsEnabled}>
        <circleGeometry args={[2.3, 18]} />
        <meshStandardMaterial color="#4a7043" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.9, -0.004, -3.1]} receiveShadow={shadowsEnabled}>
        <circleGeometry args={[2.5, 18]} />
        <meshStandardMaterial color="#4a7043" roughness={0.94} />
      </mesh>

      {/* Continuous mountain highway passing behind scooters (ride continues +X toward Dhaba) */}
      <mesh position={[0, -1.92, 4.9]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[170, 3.84, 5.6]} />
        <meshStandardMaterial color="#5d5446" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 4.9]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[170, 5.2]} />
        <meshStandardMaterial color="#343b46" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 4.9]}>
        <planeGeometry args={[170, 0.14]} />
        <meshStandardMaterial color="#e7d378" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 2.55]}>
        <planeGeometry args={[170, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} />
      </mesh>

      {/* Contoured surrounding hillside slopes plunging into the Rishikesh valley gorge */}
      <ConnectedHillTerrain
        width={240}
        depth={185}
        centerX={0}
        centerZ={-34}
        segX={92}
        segZ={74}
        heightFn={sampleViewpointTerrainY}
        colorFn={sampleViewpointTerrainColor}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      {VIEWPOINT_SLOPE_BOULDERS.map(([bx, bz, bs], idx) => {
        const footprint = sampleTerrainFootprint(terrainSampler, bx, bz, bs * 0.7);
        const minSurfaceY = footprint ? footprint.minY : sampleViewpointTerrainY(bx, bz);
        const by = minSurfaceY - bs * 0.06;
        return (
          <mesh
            key={`vp-rock-${idx}`}
            position={[bx, by, bz]}
            rotation={[idx * 0.5, idx * 1.3, idx * 0.25]}
            scale={[bs * 1.2, bs * 0.72, bs]}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#64706a' : '#57625c'} roughness={0.95} />
          </mesh>
        );
      })}

      {/* Valley river winding deep in the rocky gorge below the overlook */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, -12.35, -44]}>
        <planeGeometry args={[230, 12.5]} />
        <meshStandardMaterial color="#4e85a1" roughness={0.28} metalness={0.14} />
      </mesh>

      {/* Smooth layered Himalayan mountain ridges */}
      <DistantHimalayanRidges ridges={VIEWPOINT_RIDGES} centerZ={-70} baseY={-22} />

      {/* Rocky retaining kerb along cliff edge */}
      {Array.from({ length: 13 }, (_, idx) => {
        const bx = -5.7 + idx * 0.96;
        return (
          <mesh key={idx} position={[bx, 0.16, -5.22]} castShadow={shadowsEnabled}>
            <dodecahedronGeometry args={[0.28 + (idx % 3) * 0.05, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#64748b' : '#576475'} roughness={0.95} />
          </mesh>
        );
      })}

      {/* Roadside wire/chain-link inspired safety railing wing along scenic terrace */}
      <group position={[0, 0, -5.12]}>
        {[-4.2, -2.4, -0.6, 1.2, 3.0, 4.8].map((px, idx) => (
          <mesh key={idx} position={[px, 0.56, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.045, 0.055, 1.12, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.65} />
          </mesh>
        ))}
        {/* Top & mid guard rails */}
        <mesh position={[0.3, 1.04, 0]}>
          <boxGeometry args={[9.4, 0.06, 0.06]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.55} />
        </mesh>
        <mesh position={[0.3, 0.62, 0]}>
          <boxGeometry args={[9.4, 0.045, 0.045]} />
          <meshStandardMaterial color="#7e8e9f" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0.3, 0.34, 0]}>
          <boxGeometry args={[9.4, 0.03, 0.03]} />
          <meshStandardMaterial color="#7e8e9f" metalness={0.35} roughness={0.65} />
        </mesh>
      </group>

      {/* Wooden mountain overlook marker sign on the left corner */}
      <group position={[-5.2, 0, -4.25]} rotation={[0, 0.32, 0]}>
        <mesh position={[0, 0.65, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.065, 0.075, 1.35, 8]} />
          <meshStandardMaterial color="#6b4423" roughness={0.92} />
        </mesh>
        <mesh position={[0, 1.24, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[1.15, 0.42, 0.08]} />
          <meshStandardMaterial color="#92400e" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.24, 0.048]}>
          <boxGeometry args={[1.02, 0.3, 0.02]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.75} />
        </mesh>
      </group>

      {/* Colorful Prayer Flags strung on left cliffside corner */}
      <group position={[-3.9, 0, -4.75]}>
        <mesh position={[-1.4, 1.2, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.045, 0.055, 2.4, 8]} />
          <meshStandardMaterial color="#5c3d22" roughness={0.92} />
        </mesh>
        <mesh position={[1.4, 1.1, -0.3]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.045, 0.055, 2.2, 8]} />
          <meshStandardMaterial color="#5c3d22" roughness={0.92} />
        </mesh>
        <mesh position={[0, 2.15, -0.15]} rotation={[0, 0.1, -0.03]}>
          <boxGeometry args={[2.85, 0.02, 0.02]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {PRAYER_FLAG_COLORS.map((color, idx) => {
          const fx = -1.05 + idx * 0.52;
          const sag = Math.sin(((idx + 1) / (PRAYER_FLAG_COLORS.length + 1)) * Math.PI) * 0.12;
          return (
            <mesh
              key={color}
              ref={(el) => {
                flagRefs.current[idx] = el;
              }}
              position={[fx, 2.02 - sag, -0.15]}
            >
              <planeGeometry args={[0.38, 0.28]} />
              <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.82} />
            </mesh>
          );
        })}
      </group>

      {/* Subtle swaying hillside shrubs along turnout borders */}
      {[
        [-5.7, -1.8],
        [-5.2, 0.9],
        [4.9, -2.1],
        [5.4, 0.6],
      ].map(([sx, sz], idx) => (
        <group
          key={idx}
          ref={(el) => {
            shrubRefs.current[idx] = el;
          }}
          position={[sx, -0.02, sz]}
        >
          <mesh position={[0, 0.24, 0]} castShadow={shadowsEnabled}>
            <dodecahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial color="#366b3c" roughness={0.92} />
          </mesh>
          <mesh position={[0.24, 0.17, 0.14]} castShadow={shadowsEnabled}>
            <dodecahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color="#46804b" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Warm hillside pine instancing */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, MAX_PINE_COUNT]}>
        <cylinderGeometry args={[0.15, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5b3e28" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, undefined, MAX_PINE_COUNT]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.35, 3.8, 7]} />
        <meshStandardMaterial color="#275036" roughness={0.88} />
      </instancedMesh>

      {/* Subtle floating sparkle motes replacing large floor circles */}
      <HotspotBeaconSparkle
        position={[-2.55, 0, -3.6]}
        visible={!capturedSolo}
        color="#f59e0b"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0.15, 0, -3.3]}
        visible={!capturedGroup}
        color="#f59e0b"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0.2, 0, 1.95]}
        visible={capturedSolo || capturedGroup}
        color="#38bdf8"
        height={0.85}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      </group>
    </>
  );
}

