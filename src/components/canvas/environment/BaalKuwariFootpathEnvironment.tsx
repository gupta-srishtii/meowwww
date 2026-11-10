'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ConnectedHillTerrain } from '@/components/canvas/environment/ConnectedHillTerrain';
import {
  DistantHimalayanRidges,
  type HimalayanRidgeSpec,
} from '@/components/canvas/environment/DistantHimalayanRidges';
import { HotspotBeaconSparkle } from '@/components/canvas/environment/HotspotBeaconSparkle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export const FOOTPATH_MAX_Z = 2.0;
export const FOOTPATH_MIN_Z = -58.8;
export const FOOTPATH_END_SPOT = {
  x: sampleFootpathCenterX(-57.6),
  z: -57.6,
};

/**
 * Curving centerline X of the forested mountain footpath connecting Maggi clearing -> Baal Kuwari stairs.
 */
export function sampleFootpathCenterX(z: number): number {
  const s = Math.max(0, -z);
  return Math.sin(s * 0.085) * 2.8 + Math.sin(s * 0.032) * 1.15;
}

/**
 * Smooth rolling uphill elevation along the woodland trail (0m at trail start -> ~6.6m near stairhead).
 */
export function sampleFootpathY(z: number): number {
  if (z >= 0) return 0;
  const s = Math.min(62, -z);
  const baseClimb = Math.pow(s / 60, 1.12) * 6.5;
  const ripple = Math.sin(s * 0.16) * 0.16 * THREE.MathUtils.clamp(s / 8, 0, 1);
  return baseClimb + ripple;
}

export function getFootpathWalkHalfWidth(z: number): number {
  return z <= -54.5 ? 2.65 : 1.55;
}

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sampleFootpathTerrainY(wx: number, wz: number): number {
  const cx = sampleFootpathCenterX(wz);
  const cy = sampleFootpathY(wz);
  const dx = wx - cx;
  const absDx = Math.abs(dx);
  const clearHalf = getFootpathWalkHalfWidth(wz) + 0.45;
  if (absDx <= clearHalf) {
    return cy;
  }
  const distOut = absDx - clearHalf;
  const wave =
    Math.sin(wz * 0.13 + wx * 0.11) * 0.55 + Math.cos(wz * 0.08 - wx * 0.12) * 0.4;
  if (dx < 0) {
    return cy + Math.pow(distOut, 0.9) * 0.5 + wave * smoothStep01(distOut / 3.5);
  }
  return cy - Math.pow(distOut, 0.88) * 0.42 + wave * smoothStep01(distOut / 3.5);
}

const _trailSoil = new THREE.Color('#6f5e48');
const _mossTurf = new THREE.Color('#3b5d36');
const _forestShade = new THREE.Color('#2c482c');
const _granite = new THREE.Color('#5f6766');

function sampleFootpathColor(wx: number, wz: number, h: number, outColor: THREE.Color): void {
  const cx = sampleFootpathCenterX(wz);
  const dist = Math.abs(wx - cx);
  const onTrail = 1 - smoothStep01((dist - 1.15) / 1.4);
  const mottle = Math.sin(wx * 0.42 + wz * 0.36) * 0.5 + 0.5;

  outColor.copy(_mossTurf).lerp(_forestShade, mottle * 0.65);
  if (h > 4.5) {
    outColor.lerp(_granite, THREE.MathUtils.clamp((dist - 2.5) / 14, 0, 0.32));
  }
  outColor.lerp(_trailSoil, onTrail * 0.94);
}

const FOOTPATH_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-62, 6, -54], scale: [44, 28, 36], rotationY: 0.24, color: '#395b45' },
  { position: [74, -6, -42], scale: [48, 28, 38], rotationY: -0.28, color: '#53738c' },
  { position: [-8, 12, -96], scale: [64, 38, 42], rotationY: 0.05, color: '#446753' },
];

const MAX_PINE_COUNT = 88;

export interface BaalKuwariFootpathEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
}

/**
 * Playable forested hillside footpath connecting the roadside Maggi clearing cleanly
 * to the separate Baal Kuwari staircase trailhead arch.
 */
export function BaalKuwariFootpathEnvironment({
  qualityProfile,
  paused,
}: BaalKuwariFootpathEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_PINE_COUNT, Math.round(MAX_PINE_COUNT * densityRatio));

  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);

  const pinePlacements = useMemo(() => {
    const items: Array<[number, number, number, number]> = [];
    for (let i = 0; i < MAX_PINE_COUNT; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 4 - ((i * 0.78) % 68);
      const cx = sampleFootpathCenterX(z);
      const offset = 2.8 + (i % 6) * 2.9 + ((i * 5) % 3) * 0.45;
      const x = cx + side * offset;
      const scale = 0.85 + ((i * 11) % 7) * 0.075;
      const y = sampleFootpathTerrainY(x, z) - 0.56 * scale;
      items.push([x, y, z, scale]);
    }
    return items;
  }, []);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    trunkInstRef.current.count = pineCount;
    crownInstRef.current.count = pineCount;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pineCount; i += 1) {
      const [x, y, z, s] = pinePlacements[i];
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
  }, [pineCount, pinePlacements]);

  const pathBouldersAndLogs = useMemo(() => {
    const rocks: Array<{ pos: [number, number, number]; scale: [number, number, number]; yaw: number }> = [];
    for (let i = 0; i < 24; i += 1) {
      const z = -3.5 - i * 2.3;
      const cx = sampleFootpathCenterX(z);
      const side = i % 2 === 0 ? -1 : 1;
      const x = cx + side * (2.05 + ((i * 7) % 4) * 0.42);
      const sy = 0.45 + (i % 3) * 0.25;
      const sx = 0.65 + (i % 4) * 0.22;
      const y = sampleFootpathTerrainY(x, z) + sy * 0.15;
      rocks.push({ pos: [x, y, z], scale: [sx, sy, sx * 0.85], yaw: i * 0.8 });
    }
    return rocks;
  }, []);

  const steppingStones = useMemo(() => {
    const stones: Array<{ pos: [number, number, number]; yaw: number }> = [];
    for (let z = -2.5; z >= -55; z -= 2.2) {
      const cx = sampleFootpathCenterX(z) + Math.sin(z * 0.9) * 0.35;
      const y = sampleFootpathY(z) + 0.015;
      stones.push({ pos: [cx, y, z], yaw: z * 0.7 });
    }
    return stones;
  }, []);

  const gateCenterX = sampleFootpathCenterX(-60.4);
  const gateY = sampleFootpathY(-60.4);

  return (
    <group>
      <color attach="background" args={['#b8d8ec']} />
      <fog attach="fog" args={['#cce2f2', 36, 130]} />

      <hemisphereLight args={['#eef7ff', '#42563d', 0.96]} />
      <directionalLight
        position={[22, 36, 10]}
        intensity={1.72}
        color="#ffefd1"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />

      <ConnectedHillTerrain
        width={88}
        depth={86}
        centerX={0}
        centerZ={-28}
        segX={64}
        segZ={72}
        heightFn={sampleFootpathTerrainY}
        colorFn={sampleFootpathColor}
        receiveShadow={shadowsEnabled}
      />
      <DistantHimalayanRidges ridges={FOOTPATH_RIDGES} />

      {/* Natural Pathside Boulders & Trailside Shrubs */}
      {pathBouldersAndLogs.map((rock, idx) => (
        <mesh
          key={`trail-rock-${idx}`}
          position={rock.pos}
          scale={rock.scale}
          rotation={[0.1, rock.yaw, 0.08]}
          castShadow={shadowsEnabled}
          receiveShadow={shadowsEnabled}
        >
          <dodecahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial color={idx % 2 === 0 ? '#68717a' : '#5b636b'} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Flat Embedded Trail Stones Guiding Walk Up the Forest Path */}
      {steppingStones.map((stone, idx) => (
        <mesh
          key={`stone-${idx}`}
          position={stone.pos}
          rotation={[0, stone.yaw, 0]}
          receiveShadow={shadowsEnabled}
        >
          <cylinderGeometry args={[0.38, 0.42, 0.06, 8]} />
          <meshStandardMaterial color="#837867" roughness={0.94} />
        </mesh>
      ))}

      {/* Arrival Sightline: First View of the Baal Kuwari Staircase Entrance Arch (`z = -60.4`) */}
      <group position={[gateCenterX, gateY, -60.4]}>
        <mesh position={[-1.85, 1.45, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.95, 3.0, 0.65]} />
          <meshStandardMaterial color="#7e7262" roughness={0.92} />
        </mesh>
        <mesh position={[1.85, 1.45, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.95, 3.0, 0.65]} />
          <meshStandardMaterial color="#7e7262" roughness={0.92} />
        </mesh>
        <mesh position={[0, 3.0, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[4.9, 0.56, 0.78]} />
          <meshStandardMaterial color="#b45309" roughness={0.78} />
        </mesh>
        {/* First visible steps curving away up the hillside */}
        {Array.from({ length: 10 }, (_, stepIdx) => (
          <mesh
            key={stepIdx}
            position={[-stepIdx * 0.14, 0.14 + stepIdx * 0.22, -0.6 - stepIdx * 0.5]}
            rotation={[0, 0.26, 0]}
            receiveShadow={shadowsEnabled}
          >
            <boxGeometry args={[2.55, 0.26, 0.54]} />
            <meshStandardMaterial color={stepIdx % 2 === 0 ? '#8c816f' : '#807665'} roughness={0.94} />
          </mesh>
        ))}
      </group>

      {/* Dense Flanking Forest Pines Grounded into Slope */}
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

      <HotspotBeaconSparkle
        position={[FOOTPATH_END_SPOT.x, sampleFootpathY(FOOTPATH_END_SPOT.z), FOOTPATH_END_SPOT.z]}
        visible
        color="#38bdf8"
        height={1.15}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

