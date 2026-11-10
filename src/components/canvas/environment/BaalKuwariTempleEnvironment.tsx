'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildConnectedHillGeometry,
  ConnectedHillTerrain,
} from '@/components/canvas/environment/ConnectedHillTerrain';
import { createTerrainMeshSampler } from '@/lib/terrainMeshSampler';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getStoneCourtyardTexture } from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export const BAAL_KUWARI_TEMPLE_WALK_BOUNDS: WalkBounds = {
  minX: -6.4,
  maxX: 6.4,
  minZ: -4.8,
  maxZ: 5.4,
};

export const BAAL_KUWARI_TEMPLE_OBSTACLES: readonly WalkObstacle[] = [
  // Hilltop stone sanctuary pavilion
  { kind: 'box', minX: -2.45, maxX: 2.45, minZ: -5.4, maxZ: -2.95 },
  // Summit diya pillar
  { kind: 'circle', x: -2.15, z: -1.8, radius: 0.45 },
  // Summit overlook parapet benches
  { kind: 'box', minX: 3.1, maxX: 4.85, minZ: -1.8, maxZ: -0.95 },
];

export const BAAL_KUWARI_TEMPLE_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'summit_bell',
    label: 'Ring Summit Brass Bell',
    x: 0.0,
    z: -2.1,
    radius: 1.45,
    actionType: 'interact',
  },
  {
    id: 'summit_polaroid',
    label: 'Take Summit Mountain Polaroid',
    x: 3.1,
    z: -2.6,
    radius: 1.75,
    actionType: 'photo',
  },
  {
    id: 'descent',
    label: 'Head Back Down Safely',
    x: 0.0,
    z: 4.65,
    radius: 1.8,
    actionType: 'interact',
  },
];

const SUMMIT_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-62, -14, -64], scale: [48, 28, 38], rotationY: 0.25, color: '#61829c' },
  { position: [8, -10, -82], scale: [64, 34, 44], rotationY: -0.1, color: '#6d8ea8' },
  { position: [66, -14, -58], scale: [50, 26, 38], rotationY: -0.25, color: '#587892' },
  { position: [-78, -16, 4], scale: [42, 24, 34], rotationY: 0.35, color: '#456752' },
  { position: [78, -16, 12], scale: [42, 24, 34], rotationY: -0.35, color: '#456752' },
];

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sampleSummitTerrainY(x: number, z: number): number {
  const sideDist = Math.max(0, Math.abs(x) - 8.4);
  const rearDist = z < -6.2 ? -6.2 - z : 0;
  const frontDist = z > 6.6 ? z - 6.6 : 0;
  const edgeDrop = Math.max(sideDist, rearDist, frontDist);
  const wave = Math.sin(x * 0.1 + z * 0.11) * 0.55 + Math.cos(x * 0.08 - z * 0.1) * 0.4;
  return -0.24 - smoothStep01(edgeDrop / 7.5) * Math.min(15.0, edgeDrop * 0.55) + wave * smoothStep01(edgeDrop / 4.0);
}

const _summitRock = new THREE.Color('#6f675b');
const _summitMoss = new THREE.Color('#3b5e38');
const _summitPine = new THREE.Color('#2a482d');

function sampleSummitTerrainColor(wx: number, wz: number, h: number, out: THREE.Color): void {
  const edge = Math.max(Math.abs(wx) - 7.5, Math.abs(wz) - 6.5, 0);
  const rockMask = 1 - smoothStep01(edge / 3.5);
  const mottle = Math.sin(wx * 0.35 + wz * 0.3) * 0.5 + 0.5;
  out.copy(_summitMoss).lerp(_summitPine, mottle * 0.55);
  if (h < -3.0) out.lerp(_summitPine, 0.35);
  out.lerp(_summitRock, rockMask * 0.85);
}

export interface BaalKuwariTempleEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  rangBell: boolean;
  bellImpulseNonce: number;
  capturedPolaroid: boolean;
}

/**
 * Peaceful hilltop Baal Kuwari Temple courtyard perched at the top of the ~400 stairs.
 */
export function BaalKuwariTempleEnvironment({
  qualityProfile,
  paused,
  rangBell,
  bellImpulseNonce,
  capturedPolaroid,
}: BaalKuwariTempleEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const courtyardTex = useMemo(() => getStoneCourtyardTexture(), []);

  const bellPivotRef = useRef<THREE.Group>(null);
  const flagRefs = useRef<(THREE.Mesh | null)[]>([]);
  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);
  const bellSwingRef = useRef({ amp: 0, vel: 0, phase: 0 });
  const phaseRef = useRef(0);

  useEffect(() => {
    if (bellImpulseNonce > 0) {
      bellSwingRef.current.amp = 0.45;
      bellSwingRef.current.phase = 0;
    }
  }, [bellImpulseNonce]);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 150,
        depth: 140,
        centerX: 0,
        centerZ: -8,
        segX: 72,
        segZ: 72,
        heightFn: sampleSummitTerrainY,
        colorFn: sampleSummitTerrainColor,
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

  const MAX_PINES = 46;
  const pinePositions = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINES; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (9.2 + (i % 6) * 4.5);
      const z = -18 + ((i * 5.2) % 36);
      const scale = 0.82 + ((i * 7) % 6) * 0.08;
      const surfaceY = terrainSampler.trySampleY(x, z) ?? sampleSummitTerrainY(x, z);
      items.push([x, surfaceY - 0.12 * scale, z, scale]);
    }
    return items;
  }, [terrainSampler]);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = MAX_PINES;
    crownInstRef.current.count = MAX_PINES;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < MAX_PINES; i += 1) {
      const [x, y, z, s] = pinePositions[i];
      dummy.position.set(x, y + 0.92 * s, z);
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
  }, [pinePositions]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    phaseRef.current += delta;
    const t = phaseRef.current;

    if (!reducedMotion) {
      flagRefs.current.forEach((flag, idx) => {
        if (!flag) return;
        flag.rotation.y = Math.sin(t * 3.8 + idx * 0.7) * 0.22;
      });
    }

    if (bellPivotRef.current && bellSwingRef.current.amp > 0.002) {
      bellSwingRef.current.phase += delta * 11;
      bellSwingRef.current.amp *= Math.exp(-delta * 1.45);
      bellPivotRef.current.rotation.z =
        Math.sin(bellSwingRef.current.phase) * bellSwingRef.current.amp;
    } else if (bellPivotRef.current) {
      bellPivotRef.current.rotation.z = 0;
    }
  });

  return (
    <group>
      <color attach="background" args={['#b8d8f0']} />
      <fog attach="fog" args={['#c9e1f2', 42, 165]} />

      <hemisphereLight args={['#f0f7ff', '#4b5f4a', 0.96]} />
      <directionalLight
        position={[24, 34, 16]}
        intensity={1.76}
        color="#ffedd2"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Hilltop Sanctuary Stone Terrace, Flagstone Pavement & Steep Mountain Plinth */}
      <mesh position={[0, -3.5, 0.2]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[16.8, 6.8, 13.6]} />
        <meshStandardMaterial color="#6e6353" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[16.6, 0.14, 13.4]} />
        <meshStandardMaterial
          color="#cbc0ae"
          map={courtyardTex ?? undefined}
          roughness={0.88}
        />
      </mesh>

      {/* Low Carved Sandstone Courtyard Parapet Rim Along West & East Cliffs */}
      {[-8.05, 8.05].map((wx) => (
        <mesh key={wx} position={[wx, 0.26, -0.4]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.42, 0.56, 11.4]} />
          <meshStandardMaterial color="#7e7262" roughness={0.92} />
        </mesh>
      ))}

      {/* Panoramic Summit Hillside Skirt & Distant Blue Himalayan Horizon */}
      <ConnectedHillTerrain
        width={150}
        depth={140}
        centerX={0}
        centerZ={-8}
        segX={72}
        segZ={72}
        heightFn={sampleSummitTerrainY}
        colorFn={sampleSummitTerrainColor}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={SUMMIT_RIDGES} />

      {/* Natural Granite Outcrops Nestling Sanctuary Courtyard into Summit Ridge */}
      {[
        { pos: [-7.2, -0.35, -5.6] as const, s: [1.5, 1.0, 1.3] as const, rot: 0.4 },
        { pos: [7.4, -0.35, -5.2] as const, s: [1.6, 1.1, 1.4] as const, rot: -0.5 },
        { pos: [-7.9, -0.45, 2.2] as const, s: [1.3, 0.9, 1.2] as const, rot: 0.9 },
        { pos: [7.8, -0.45, 2.8] as const, s: [1.4, 0.95, 1.3] as const, rot: -0.8 },
      ].map((rock, idx) => {
        const groundY =
          terrainSampler.trySampleY(rock.pos[0], rock.pos[2]) ??
          sampleSummitTerrainY(rock.pos[0], rock.pos[2]);
        const rockY = Math.min(rock.pos[1], groundY - 0.12);
        return (
          <mesh
            key={`summit-rock-${idx}`}
            position={[rock.pos[0], rockY, rock.pos[2]]}
            scale={rock.s}
            rotation={[0.12, rock.rot, 0.08]}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial color="#676f78" roughness={0.95} flatShading />
          </mesh>
        );
      })}

      {/* Peaceful Pahadi / Katyuri Hilltop Sanctuary Pavilion (`z = -4.0`) */}
      <group position={[0, 0, -4.0]}>
        {/* Carved Sandstone Jagati Plinth + Front Entrance Steps */}
        <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[4.95, 0.44, 3.2]} />
          <meshStandardMaterial color="#8c7d6b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.11, 1.48]} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[2.35, 0.22, 0.48]} />
          <meshStandardMaterial color="#9c8d7a" roughness={0.9} />
        </mesh>
        {/* Sanctum Stone Masonry & Cream Stucco Walls */}
        <mesh position={[0, 1.55, -0.25]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[3.7, 2.28, 2.15]} />
          <meshStandardMaterial color="#efe5d1" roughness={0.84} />
        </mesh>
        {/* Carved Deodar Corner Pilasters & Dark Timber Chhajja Cornice */}
        {[-1.82, 1.82].map((cx) => (
          <mesh key={cx} position={[cx, 1.55, 0.8]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.24, 2.28, 0.22]} />
            <meshStandardMaterial color="#5c3a21" roughness={0.88} />
          </mesh>
        ))}
        {/* Carved Sanctum Doorway, Garbhagriha Glow & Marigold Toran Accent */}
        <mesh position={[0, 1.28, 0.83]}>
          <boxGeometry args={[1.18, 1.78, 0.1]} />
          <meshStandardMaterial color="#522710" roughness={0.86} />
        </mesh>
        <mesh position={[0, 1.24, 0.89]}>
          <planeGeometry args={[0.82, 1.48]} />
          <meshBasicMaterial color="#9a3412" />
        </mesh>
        <mesh position={[0, 2.08, 0.9]}>
          <boxGeometry args={[1.28, 0.14, 0.08]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.68} />
        </mesh>

        {/* Pahadi Slate Overhanging Roof Tiers, Sandstone Amalaka & Brass Kalash Spire */}
        <mesh position={[0, 2.74, -0.1]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.6, 0.18, 3.1]} />
          <meshStandardMaterial color="#4b2e1e" roughness={0.88} />
        </mesh>
        <mesh position={[0, 3.06, -0.15]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.3, 0.42, 2.8]} />
          <meshStandardMaterial color="#3f4a59" roughness={0.82} />
        </mesh>
        <mesh position={[0, 3.82, -0.15]} rotation={[0, Math.PI / 4, 0]} castShadow={shadowsEnabled}>
          <coneGeometry args={[2.15, 1.25, 4]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.42, -0.15]}>
          <cylinderGeometry args={[0.38, 0.44, 0.16, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.72} />
        </mesh>
        <mesh position={[0, 4.82, -0.15]}>
          <coneGeometry args={[0.18, 0.68, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.68} roughness={0.25} />
        </mesh>

        {/* Carved Portico Timber Columns & Multi-Bell Crossbeam Rack */}
        {[-1.55, 1.55].map((px) => (
          <mesh key={px} position={[px, 1.5, 1.15]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.12, 0.14, 2.2, 8]} />
            <meshStandardMaterial color="#5c3a21" roughness={0.88} />
          </mesh>
        ))}
        <mesh position={[0, 2.66, 1.15]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.3, 0.12, 0.14]} />
          <meshStandardMaterial color="#654321" roughness={0.86} />
        </mesh>
        {[-0.64, 0.64].map((bx) => (
          <group key={bx} position={[bx, 2.62, 1.15]}>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.44, 6]} />
              <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.48, 0]}>
              <cylinderGeometry args={[0.055, 0.12, 0.2, 10]} />
              <meshStandardMaterial color="#eab308" metalness={0.76} roughness={0.26} />
            </mesh>
          </group>
        ))}

        {/* Interactive Central Hanging Brass Bell (`world z = -2.85`) */}
        <group position={[0, 2.65, 1.15]}>
          <group ref={bellPivotRef}>
            <mesh position={[0, -0.32, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.64, 6]} />
              <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.72, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.09, 0.22, 0.34, 14]} />
              <meshStandardMaterial color="#eab308" metalness={0.78} roughness={0.24} />
            </mesh>
          </group>
        </group>

        {/* Sacred Brass Trishul Pedestal Beside Sanctum Plinth */}
        <group position={[2.08, 0.44, 0.85]}>
          <mesh position={[0, 0.16, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.24, 0.3, 0.32, 8]} />
            <meshStandardMaterial color="#8c7d6b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.18, 0]}>
            <cylinderGeometry args={[0.032, 0.04, 1.85, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.76} roughness={0.24} />
          </mesh>
          <mesh position={[0, 1.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.026, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.76} roughness={0.24} />
          </mesh>
          {[-0.22, 0, 0.22].map((tx, tidx) => (
            <mesh key={tidx} position={[tx, 2.15 + (tx === 0 ? 0.14 : 0), 0]}>
              <coneGeometry args={[0.04, tx === 0 ? 0.42 : 0.28, 6]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.22} />
            </mesh>
          ))}
        </group>

        {/* Consolidated Warm Sanctuary Key Light (replaces duplicate point lights) */}
        <pointLight position={[-0.65, 2.2, 1.75]} intensity={1.75} color="#fed7aa" distance={9.5} />
      </group>

      {/* Stone Deepstambh Diya Lamp Stand (`x = -2.15, z = -1.8`) */}
      <group position={[-2.15, 0, -1.8]}>
        <mesh position={[0, 0.5, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.14, 0.22, 1.0, 10]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.28, 0.18, 0.12, 12]} />
          <meshStandardMaterial color="#d97706" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#fdba74" />
        </mesh>
      </group>

      {/* Panoramic Scenic Summit Lookout Rail & Prayer Flags */}
      <group position={[0, 0, -5.85]}>
        {[-5.6, -2.8, 2.8, 5.6].map((rx, idx) => (
          <mesh key={idx} position={[rx, 0.52, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.05, 0.06, 1.04, 8]} />
            <meshStandardMaterial color="#6d4c3d" roughness={0.9} />
          </mesh>
        ))}
        {[-5.6, 5.6].map((rx, idx) => (
          <mesh key={idx} position={[rx, 0.85, 0]}>
            <boxGeometry args={[2.9, 0.08, 0.08]} />
            <meshStandardMaterial color="#8d624c" roughness={0.85} />
          </mesh>
        ))}
      </group>

      {['#ef4444', '#f59e0b', '#f8fafc', '#22c55e', '#3b82f6'].map((color, idx) => (
        <mesh
          key={color}
          ref={(el) => {
            flagRefs.current[idx] = el;
          }}
          position={[2.4 + idx * 0.72, 2.35, -3.9]}
        >
          <planeGeometry args={[0.42, 0.28]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.82} />
        </mesh>
      ))}

      {/* Wooden Scenic Bench */}
      <group position={[3.95, 0, -1.35]} rotation={[0, -0.45, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[1.6, 0.08, 0.5]} />
          <meshStandardMaterial color="#8c5e42" roughness={0.85} />
        </mesh>
        {[-0.6, 0.6].map((lx) => (
          <mesh key={lx} position={[lx, 0.2, 0]}>
            <boxGeometry args={[0.14, 0.4, 0.44]} />
            <meshStandardMaterial color="#57534e" roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* Top of Climbing Staircase Gate (`z = +5.6`) */}
      <group position={[0, 0, 5.6]}>
        <mesh position={[-1.65, 1.35, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.48, 2.7, 0.48]} />
          <meshStandardMaterial color="#8c7e6a" roughness={0.9} />
        </mesh>
        <mesh position={[1.65, 1.35, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.48, 2.7, 0.48]} />
          <meshStandardMaterial color="#8c7e6a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[3.9, 0.45, 0.56]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
      </group>

      {/* Summit Slope Trees */}
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
        <coneGeometry args={[1.38, 3.6, 7]} />
        <meshStandardMaterial color="#275036" roughness={0.88} />
      </instancedMesh>

      {/* Hotspot Sparkles */}
      <HotspotBeaconSparkle
        position={[0, 0, -2.1]}
        visible={!rangBell}
        color="#f59e0b"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[3.1, 0, -2.6]}
        visible={!capturedPolaroid}
        color="#38bdf8"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0, 0, 4.65]}
        visible={rangBell || capturedPolaroid}
        color="#fbbf24"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

