'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StallCookCharacter } from '@/components/canvas/characters/StallCookCharacter';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import type { WalkBounds, WalkHotspot, WalkObstacle } from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
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

export const DHABA_WALK_BOUNDS: WalkBounds = {
  minX: -6.8,
  maxX: 6.8,
  minZ: -5.2,
  maxZ: 5.0,
};

export const DHABA_TABLE_CENTER = { x: 0.55, z: -1.75 } as const;

export const DHABA_SEAT_SLOTS = {
  ishaan: { x: 0.55, z: -0.86, facingYaw: 0 },
  srishti: { x: 0.55, z: -2.64, facingYaw: Math.PI },
  friend_plaid: { x: -0.82, z: -1.75, facingYaw: -Math.PI / 2 },
  friend_black_tee: { x: 1.92, z: -1.75, facingYaw: Math.PI / 2 },
} as const;

export const DHABA_OBSTACLES: readonly WalkObstacle[] = [
  // Open angled Dhaba Maggi & Chai Tapri Stall footprint
  { kind: 'box', minX: -4.9, maxX: -1.85, minZ: -4.15, maxZ: -1.35 },
  // Side local customer bench & tea table
  { kind: 'box', minX: -6.35, maxX: -4.65, minZ: -0.35, maxZ: 1.55 },
  // Neighboring extra parked visitor scooters along outer road pull-off
  { kind: 'box', minX: -5.45, maxX: -3.25, minZ: 3.15, maxZ: 4.15 },
  { kind: 'box', minX: 3.1, maxX: 5.3, minZ: 3.15, maxZ: 4.15 },
  // 4-person rustic Maggi & Chai table (`[-0.48..1.58, -2.35..-1.15]`)
  { kind: 'box', minX: -0.48, maxX: 1.58, minZ: -2.35, maxZ: -1.15 },
  // Circular stool colliders preventing characters from walking onto stools during free walk
  { kind: 'circle', x: 0.55, z: -0.88, radius: 0.27 },
  { kind: 'circle', x: 0.55, z: -2.62, radius: 0.27 },
  { kind: 'circle', x: -0.8, z: -1.75, radius: 0.27 },
  { kind: 'circle', x: 1.9, z: -1.75, radius: 0.27 },
  // Parked Scooter 1 & Scooter 2 facing onward (+X)
  { kind: 'box', minX: 0.35, maxX: 2.25, minZ: 3.15, maxZ: 4.05 },
  { kind: 'box', minX: -2.15, maxX: -0.25, minZ: 3.15, maxZ: 4.05 },
];

export const DHABA_HOTSPOTS: readonly WalkHotspot[] = [
  {
    id: 'chai',
    label: 'Sip Mountain Chai',
    x: -1.45,
    z: -1.35,
    radius: 1.55,
    actionType: 'interact',
  },
  {
    id: 'maggi',
    label: 'Join Everyone & Eat Hot Maggi',
    x: 0.55,
    z: -0.15,
    radius: 1.75,
    actionType: 'interact',
  },
  {
    id: 'polaroid',
    label: 'Capture Dhaba Valley Polaroid',
    x: 4.2,
    z: -3.4,
    radius: 1.75,
    actionType: 'photo',
  },
  {
    id: 'scooters',
    label: 'Ride Scooters · Toward Neelkanth',
    x: 0.2,
    z: 2.35,
    radius: 1.55,
    actionType: 'interact',
  },
];

export interface DhabaEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  ateMaggi: boolean;
  sippedChai: boolean;
  capturedPolaroid: boolean;
  /** Elapsed time ref (seconds) during food cutscene for smooth 60fps helper serving walk. */
  foodCinematicTimeRef?: RefObject<number | null>;
  /** True when individual steaming Maggi plates & chai cups are served onto table. */
  tableServed?: boolean;
  /** True while helper carries the tray during the serving beat. */
  helperCarryingTray?: boolean;
}

const MAX_PINE_COUNT = 56;

const DHABA_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-42, -8, -54], scale: [34, 20, 28], rotationY: 0.2, color: '#6b8ba4' },
  { position: [14, -7, -66], scale: [42, 24, 34], rotationY: -0.1, color: '#5b7a94' },
  { position: [56, -8, -52], scale: [36, 21, 30], rotationY: -0.25, color: '#64839c' },
  { position: [-68, -10, -28], scale: [32, 18, 28], rotationY: 0.38, color: '#58768f' },
];

export function DhabaEnvironment({
  qualityProfile,
  paused,
  ateMaggi,
  sippedChai,
  capturedPolaroid,
  foodCinematicTimeRef,
  tableServed: tableServedProp = false,
  helperCarryingTray = false,
}: DhabaEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const pineCount = Math.min(MAX_PINE_COUNT, Math.round(MAX_PINE_COUNT * densityRatio));

  const maggiSteamRef = useRef<THREE.Group>(null);
  const kadhaiSteamRef = useRef<THREE.Group>(null);
  const chaiSteamRef = useRef<THREE.Group>(null);
  const shrubRefs = useRef<(THREE.Group | null)[]>([]);
  const animTimeRef = useRef(0);

  // Fictional roadside stall owner & helper animation refs
  const ownerTorsoRef = useRef<THREE.Group>(null);
  const ownerHeadRef = useRef<THREE.Group>(null);
  const ownerRightArmRef = useRef<THREE.Group>(null);
  const ownerRightForearmRef = useRef<THREE.Group>(null);
  const helperGroupRef = useRef<THREE.Group>(null);
  const helperTorsoRef = useRef<THREE.Group>(null);
  const helperHeadRef = useRef<THREE.Group>(null);
  const helperRightArmRef = useRef<THREE.Group>(null);
  const helperRightForearmRef = useRef<THREE.Group>(null);

  const tableServed = ateMaggi || tableServedProp;

  const dashInstRef = useRef<THREE.InstancedMesh>(null);
  const trunkInstRef = useRef<THREE.InstancedMesh>(null);
  const crownInstRef = useRef<THREE.InstancedMesh>(null);

  // Continuing mountain highway curving away behind (-X) and onward (+X/-Z toward Neelkanth)
  const onwardRoadCurve = useMemo(() => {
    const pts = [
      new THREE.Vector3(-82, -0.4, 16),
      new THREE.Vector3(-42, -0.1, 7.5),
      new THREE.Vector3(-12, 0.0, 5.8),
      new THREE.Vector3(14, 0.0, 5.8),
      new THREE.Vector3(44, 0.8, 1.5),
      new THREE.Vector3(78, 2.0, -14),
      new THREE.Vector3(112, 3.5, -38),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    curve.arcLengthDivisions = 400;
    curve.updateArcLengths();
    return curve;
  }, []);

  const roadSamples = useMemo(() => {
    const samples: Array<{ x: number; y: number; z: number }> = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= 84; i += 1) {
      onwardRoadCurve.getPointAt(i / 84, p);
      samples.push({ x: p.x, y: p.y, z: p.z });
    }
    return samples;
  }, [onwardRoadCurve]);

  const sampleDhabaTerrainY = useMemo(() => {
    const smooth01 = (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return c * c * (3 - 2 * c);
    };
    return (x: number, z: number): number => {
      // Closest sample on continuing mountain highway
      let bestDistSq = Infinity;
      let roadY = 0;
      let roadZ = 5.8;
      for (let i = 0; i < roadSamples.length; i += 1) {
        const s = roadSamples[i];
        const dx = x - s.x;
        const dz = z - s.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          roadY = s.y;
          roadZ = s.z;
        }
      }
      const distToRoad = Math.sqrt(bestDistSq);
      const onUphillSide = z >= roadZ;
      const roadClearDist = Math.max(0, distToRoad - 3.6);
      const noise =
        Math.sin(x * 0.09 + z * 0.08) * 0.72 +
        Math.cos(x * 0.055 - z * 0.11) * 0.55 +
        Math.sin(x * 0.21 + z * 0.19) * 0.2;

      let y = roadY - 0.22;
      if (onUphillSide) {
        const upDist = Math.max(0, z - (roadZ + 3.4));
        const climb = smooth01(roadClearDist / 4.2) * (0.35 + upDist * 0.34);
        y = roadY - 0.18 + climb + noise * smooth01(roadClearDist / 5.0) * 0.75;
      } else {
        const valleyDropT = smooth01(roadClearDist / 16.5);
        const midRoll = Math.sin(x * 0.075) * 0.8 + Math.cos(z * 0.12) * 0.5;
        y = roadY - 0.24 - valleyDropT * 11.1 + midRoll * valleyDropT + noise * smooth01(roadClearDist / 4.0) * 0.65;
      }

      // Keep Dhaba terrace & roadside pull-off level without clipping terrace tiles
      if (x >= -9.35 && x <= 9.35 && z >= -7.1 && z <= 6.2) {
        y = Math.min(y, -0.24);
      } else if (distToRoad < 3.7) {
        y = Math.min(y, roadY - 0.2);
      }
      return y;
    };
  }, [roadSamples]);

  const roadStripGeometry = useMemo(() => {
    const segs = 120;
    const totalLen = onwardRoadCurve.getLength();
    const positions = new Float32Array((segs + 1) * 2 * 3);
    const indices: number[] = [];
    const worldUp = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();

    for (let i = 0; i <= segs; i += 1) {
      const u = i / segs;
      onwardRoadCurve.getPointAt(u, p);
      onwardRoadCurve.getTangentAt(u, tan).normalize();
      right.crossVectors(tan, worldUp).normalize();

      const idx = i * 2;
      positions[idx * 3] = p.x - right.x * 3.4;
      positions[idx * 3 + 1] = p.y + 0.01;
      positions[idx * 3 + 2] = p.z - right.z * 3.4;

      positions[(idx + 1) * 3] = p.x + right.x * 3.4;
      positions[(idx + 1) * 3 + 1] = p.y + 0.01;
      positions[(idx + 1) * 3 + 2] = p.z + right.z * 3.4;

      if (i < segs) {
        indices.push(idx, idx + 1, idx + 2, idx + 1, idx + 3, idx + 2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    void totalLen;
    return geom;
  }, [onwardRoadCurve]);

  useEffect(() => {
    return () => {
      roadStripGeometry.dispose();
    };
  }, [roadStripGeometry]);

  useEffect(() => {
    if (!dashInstRef.current) return;
    const count = 30;
    dashInstRef.current.count = count;
    const dummy = new THREE.Object3D();
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const basis = new THREE.Matrix4();

    for (let i = 0; i < count; i += 1) {
      const u = (i + 0.5) / count;
      onwardRoadCurve.getPointAt(u, p);
      onwardRoadCurve.getTangentAt(u, tan).normalize();
      right.crossVectors(tan, up).normalize();
      const orthoUp = new THREE.Vector3().crossVectors(right, tan).normalize();
      basis.makeBasis(right, orthoUp, tan.clone().negate());

      dummy.position.copy(p).addScaledVector(orthoUp, 0.025);
      dummy.quaternion.setFromRotationMatrix(basis);
      dummy.updateMatrix();
      dashInstRef.current.setMatrixAt(i, dummy.matrix);
    }
    dashInstRef.current.instanceMatrix.needsUpdate = true;
  }, [onwardRoadCurve]);

  const terrainGeometry = useMemo(
    () =>
      buildConnectedHillGeometry({
        width: 178,
        depth: 130,
        centerX: 10,
        centerZ: -8,
        segX: 82,
        segZ: 62,
        heightFn: sampleDhabaTerrainY,
      }),
    [sampleDhabaTerrainY]
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

  const pinePlacements = useMemo(() => {
    const coords: Array<[number, number, number]> = [
      // Gorge hillside & rocky spur pines flanking terrace
      [-12.2, -9.8, 1.15],
      [-7.8, -12.6, 1.05],
      [-2.8, -14.2, 1.25],
      [3.5, -13.6, 1.1],
      [9.4, -10.8, 1.28],
      [12.4, -7.8, 1.08],
      [-11.8, -4.4, 1.02],
      [-12.4, 0.4, 1.18],
      [12.2, -1.6, 1.12],
      [-16.8, -15.5, 1.32],
      [16.2, -14.8, 1.28],
      [-22.5, -7.2, 1.25],
      [23.2, -6.5, 1.3],
      [-27.5, -16.5, 1.35],
      [28.5, -15.5, 1.38],
      [36.5, -7.2, 1.3],
      [44.5, -20.5, 1.42],
      [53.0, -14.5, 1.4],
      [66.0, -26.5, 1.35],
      [-36.5, -4.5, 1.22],
      [-43.0, -13.5, 1.3],
      // Rising green mountain ridge behind the highway (+Z uphill side)
      [-28.0, 14.5, 1.28],
      [-16.5, 12.2, 1.25],
      [-6.5, 12.8, 1.15],
      [5.8, 12.6, 1.2],
      [18.5, 11.8, 1.25],
      [29.5, 9.8, 1.34],
      [40.0, 8.2, 1.26],
      [-35.0, 18.5, 1.32],
      [-21.0, 17.5, 1.2],
      [-9.0, 18.2, 1.28],
      [4.0, 17.8, 1.22],
      [15.0, 16.5, 1.35],
      [26.0, 14.5, 1.3],
      [38.0, 13.0, 1.36],
      [-48.0, 15.0, 1.35],
      [52.0, 5.0, 1.34],
      [64.0, -4.5, 1.32],
    ];
    return coords.map(([x, z, s]): [number, number, number, number] => {
      const surfaceY = terrainSampler.trySampleY(x, z) ?? sampleDhabaTerrainY(x, z);
      return [x, surfaceY - 0.12 * s, z, s];
    });
  }, [terrainSampler, sampleDhabaTerrainY]);

  useEffect(() => {
    if (!trunkInstRef.current || !crownInstRef.current) return;
    const active = Math.min(pineCount, pinePlacements.length);
    trunkInstRef.current.count = active;
    crownInstRef.current.count = active;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < active; i += 1) {
      const [x, y, z, s] = pinePlacements[i];
      dummy.position.set(x, y + 0.92 * s, z);
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

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      animTimeRef.current += delta;
    }
    const t = animTimeRef.current;

    const animateSteam = (group: THREE.Group | null, speed: number, swayScale: number) => {
      if (!group || reducedMotion) return;
      group.children.forEach((child, idx) => {
        const phase = (t * speed + idx * 0.35) % 1;
        child.position.y = phase * 0.54;
        child.position.x = Math.sin(t * 1.9 + idx) * swayScale;
        child.scale.setScalar(0.62 + phase * 0.52);
      });
    };

    animateSteam(maggiSteamRef.current, 0.72, 0.04);
    animateSteam(kadhaiSteamRef.current, 0.78, 0.035);
    animateSteam(chaiSteamRef.current, 0.88, 0.03);

    // Owner smoothly stirring hot Maggi in iron kadhai
    if (ownerRightArmRef.current && ownerRightForearmRef.current) {
      const stirSweep = reducedMotion ? 0 : Math.sin(t * 3.1) * 0.14;
      const stirLift = reducedMotion ? 0 : Math.cos(t * 3.1) * 0.08;
      ownerRightArmRef.current.rotation.x = 0.68 + stirLift;
      ownerRightArmRef.current.rotation.y = stirSweep;
      ownerRightForearmRef.current.rotation.x = 0.48 + stirLift * 0.5;
    }
    if (ownerTorsoRef.current && !reducedMotion) {
      ownerTorsoRef.current.position.y = 0.82 + Math.sin(t * 2.2) * 0.008;
      ownerTorsoRef.current.rotation.y = Math.sin(t * 1.4) * 0.04;
    }
    if (ownerHeadRef.current && !reducedMotion) {
      ownerHeadRef.current.rotation.x = -0.1 + Math.sin(t * 1.2) * 0.04;
      ownerHeadRef.current.rotation.y = Math.sin(t * 0.75) * 0.08;
    }

    // Helper tending tea kettle, or stepping around south counter edge to serve the 4 friends
    const cTime = foodCinematicTimeRef?.current ?? null;
    const servingNow = cTime !== null && cTime >= 6.8 && cTime < 12.2;
    if (helperGroupRef.current) {
      let hx = -0.26;
      let hz = 0.46;
      let hyaw = -Math.PI / 2;
      if (servingNow && cTime !== null) {
        const sTime = cTime - 6.8;
        if (sTime < 1.2) {
          const u = sTime / 1.2;
          hx = -0.26;
          hz = THREE.MathUtils.lerp(0.46, 1.38, u);
          hyaw = Math.PI;
        } else if (sTime < 2.6) {
          const u = (sTime - 1.2) / 1.4;
          hx = THREE.MathUtils.lerp(-0.26, 1.35, u);
          hz = 1.38;
          hyaw = -Math.PI / 2;
        } else if (sTime < 3.4) {
          hx = 1.35;
          hz = 1.38;
          hyaw = -Math.PI / 2;
        } else if (sTime < 4.5) {
          const u = (sTime - 3.4) / 1.1;
          hx = THREE.MathUtils.lerp(1.35, -0.26, u);
          hz = 1.38;
          hyaw = Math.PI / 2;
        } else {
          const u = THREE.MathUtils.clamp((sTime - 4.5) / 0.9, 0, 1);
          hx = -0.26;
          hz = THREE.MathUtils.lerp(1.38, 0.46, u);
          hyaw = 0;
        }
      }
      helperGroupRef.current.position.x = hx;
      helperGroupRef.current.position.z = hz;
      helperGroupRef.current.position.y =
        servingNow && !reducedMotion ? Math.abs(Math.sin(t * 7.5)) * 0.025 : 0;
      helperGroupRef.current.rotation.y = hyaw;
    }

    if (helperRightArmRef.current && helperRightForearmRef.current) {
      if (helperCarryingTray) {
        helperRightArmRef.current.rotation.x = 0.72;
        helperRightForearmRef.current.rotation.x = 0.55;
      } else {
        const pourBob = reducedMotion ? 0 : Math.sin(t * 1.85 + 1.1) * 0.16;
        helperRightArmRef.current.rotation.x = 0.56 + pourBob;
        helperRightForearmRef.current.rotation.x = 0.44 - pourBob * 0.4;
      }
    }
    if (helperTorsoRef.current && !reducedMotion) {
      helperTorsoRef.current.position.y = 0.82 + Math.sin(t * 2.0 + 1.5) * 0.007;
    }
    if (helperHeadRef.current && !reducedMotion) {
      helperHeadRef.current.rotation.y = Math.sin(t * 0.9 + 2.0) * 0.1;
    }

    // Subtle hillside breeze through terrace bushes
    if (!reducedMotion) {
      shrubRefs.current.forEach((shrub, idx) => {
        if (!shrub) return;
        shrub.rotation.z = Math.sin(t * 1.7 + idx * 1.2) * 0.04;
      });
    }
  });

  return (
    <group>
      {/* Midday Himalayan sky & haze blending continuing highway cleanly */}
      <color attach="background" args={['#cfe6f7']} />
      <fog attach="fog" args={['#cfe6f7', 30, 105]} />

      <hemisphereLight args={['#eff6ff', '#786f5c', 0.95]} />
      <directionalLight
        position={[14, 24, 12]}
        intensity={1.75}
        color="#fff6e0"
        castShadow={shadowsEnabled}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Main roadside terrace pad overlooking the Himalayan gorge anchored by deep stone retaining walls */}
      <mesh position={[0, -3.05, -0.8]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[18.0, 5.8, 12.4]} />
        <meshStandardMaterial color="#675b4c" roughness={0.96} />
      </mesh>
      <mesh position={[0, -3.1, -6.95]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[18.4, 5.9, 0.72]} />
        <meshStandardMaterial color="#594f42" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.15, -0.8]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[17.8, 0.3, 12.2]} />
        <meshStandardMaterial color="#8c7b67" roughness={0.95} />
      </mesh>

      {/* Continuing mountain highway ribbon & dashed centerline */}
      <mesh geometry={roadStripGeometry} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#384152" roughness={0.92} metalness={0.05} />
      </mesh>
      <instancedMesh ref={dashInstRef} args={[undefined, undefined, 30]}>
        <boxGeometry args={[0.14, 0.02, 2.2]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </instancedMesh>

      {/* Side-by-side pull-off parking bay pads alongside the road */}
      <mesh position={[1.3, 0.02, 3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[1.1, 0.02, 2.3]} />
        <meshBasicMaterial color="#e06d44" transparent opacity={0.32} />
      </mesh>
      <mesh position={[-1.2, 0.02, 3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[1.1, 0.02, 2.3]} />
        <meshBasicMaterial color="#2a9d8f" transparent opacity={0.32} />
      </mesh>

      {/* Continuous sculpted hillside & deep Rishikesh valley terrain + grounded cliff boulders */}
      <ConnectedHillTerrain
        width={178}
        depth={130}
        centerX={10}
        centerZ={-8}
        segX={82}
        segZ={62}
        heightFn={sampleDhabaTerrainY}
        geometry={terrainGeometry}
        receiveShadow={shadowsEnabled}
      />
      {(
        [
          [-10.4, -6.2, 0.85],
          [-10.8, 1.2, 0.78],
          [10.2, -5.8, 0.9],
          [10.6, 0.8, 0.82],
          [-14.5, 10.2, 0.96],
          [12.5, 10.6, 0.88],
        ] as const
      ).map(([bx, bz, bs], idx) => {
        const by = (terrainSampler.trySampleY(bx, bz) ?? sampleDhabaTerrainY(bx, bz)) - bs * 0.16;
        return (
          <mesh
            key={`dhaba-rock-${idx}`}
            position={[bx, by, bz]}
            rotation={[idx * 0.5, idx * 1.1, idx * 0.3]}
            scale={[bs * 1.25, bs * 0.72, bs]}
            castShadow={shadowsEnabled}
            receiveShadow={shadowsEnabled}
          >
            <dodecahedronGeometry args={[0.82, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#656e67' : '#57605a'} roughness={0.95} />
          </mesh>
        );
      })}
      <DistantHimalayanRidges ridges={DHABA_RIDGES} />

      {/* Valley wooden lookout rail along northern terrace edge */}
      <group position={[0, 0, -6.2]}>
        {[-6.6, -3.3, 0, 3.3, 6.6].map((x) => (
          <mesh key={x} position={[x, 0.45, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.14, 0.95, 0.14]} />
            <meshStandardMaterial color="#6d4c3d" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.82, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[13.6, 0.1, 0.1]} />
          <meshStandardMaterial color="#8d624c" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[13.6, 0.08, 0.08]} />
          <meshStandardMaterial color="#7d5642" roughness={0.85} />
        </mesh>
      </group>

      {/* Angled Open-Front Pahadi Maggi & Chai Tapri Stall (Owner & Helper plainly visible from camera) */}
      <group position={[-3.35, 0, -2.75]} rotation={[0, -0.58, 0]}>
        {/* Timber corner posts raised cleanly above sightlines */}
        {[
          [-1.25, -1.05],
          [1.05, -1.05],
          [-1.25, 1.05],
          [1.05, 1.05],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.48, pz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.065, 0.075, 2.96, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}

        {/* Vertical strings of yellow Maggi packets hanging along front-right stall post */}
        {[-0.25, 0.05, 0.35, 0.65].map((my, idx) => (
          <mesh key={idx} position={[1.08, 1.65 + my, -0.96]} rotation={[0.05, 0.25, 0]}>
            <boxGeometry args={[0.06, 0.22, 0.15]} />
            <meshStandardMaterial color="#facc15" roughness={0.62} />
          </mesh>
        ))}

        {/* Slatted plank rear backing wall with warm storage shelf & jars */}
        <mesh position={[-1.18, 1.32, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.08, 2.55, 2.15]} />
          <meshStandardMaterial color="#654635" roughness={0.92} />
        </mesh>
        <mesh position={[-1.06, 1.62, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.2, 0.05, 1.98]} />
          <meshStandardMaterial color="#7c533c" roughness={0.86} />
        </mesh>
        {/* Tea/spice canisters resting along rear wall shelf */}
        {[-0.65, -0.25, 0.2, 0.62].map((jz, idx) => (
          <mesh key={idx} position={[-1.05, 1.76, jz]}>
            <cylinderGeometry args={[0.07, 0.075, 0.22, 10]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#d97706' : '#cbd5e1'}
              roughness={0.45}
              metalness={idx % 2 === 1 ? 0.6 : 0.1}
            />
          </mesh>
        ))}

        {/* Tall pitched corrugated overhang tilted up in front (`+X`) so cooks remain fully unoccluded */}
        <mesh position={[-0.1, 2.94, 0]} rotation={[0.04, 0, 0.16]} castShadow={shadowsEnabled}>
          <boxGeometry args={[3.15, 0.1, 2.75]} />
          <meshStandardMaterial color="#b45309" roughness={0.78} />
        </mesh>
        <mesh position={[1.08, 2.72, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.07, 0.24, 1.65]} />
          <meshStandardMaterial color="#fef08a" roughness={0.75} />
        </mesh>

        {/* Warm hanging stall string bulbs & tungsten stall fill light */}
        <pointLight position={[0.45, 2.35, 0]} intensity={1.7} color="#fbbf24" distance={7.5} />
        {[-0.8, -0.25, 0.3, 0.85].map((bz, idx) => (
          <mesh key={idx} position={[1.04, 2.52 - (idx % 2) * 0.04, bz]}>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        ))}

        {/* Modest timber plank serving counter with front foot ledge */}
        <mesh position={[0.48, 0.44, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.84, 0.88, 2.25]} />
          <meshStandardMaterial color="#78513c" roughness={0.86} />
        </mesh>
        <mesh position={[0.48, 0.9, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.96, 0.06, 2.36]} />
          <meshStandardMaterial color="#9a684a" roughness={0.8} />
        </mesh>

        {/* Two-burner gas stove & glowing flame rings */}
        <group position={[0.5, 0.955, 0]}>
          <mesh castShadow={shadowsEnabled}>
            <boxGeometry args={[0.46, 0.045, 1.18]} />
            <meshStandardMaterial color="#334155" metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.028, -0.44]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.09, 0.14, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0, 0.028, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.13, 16]} />
            <meshBasicMaterial color="#fb923c" />
          </mesh>
        </group>

        {/* Chai Patila / Kettle, Steel Strainer & Kulhads + Rising Steam */}
        <group position={[0.5, 1.1, 0.42]}>
          <mesh castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.16, 0.19, 0.24, 12]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.68} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.145, 0.145, 0.03, 12]} />
            <meshStandardMaterial color="#b97b45" roughness={0.55} />
          </mesh>
          <mesh position={[0.16, -0.05, 0.34]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.72} roughness={0.3} />
          </mesh>
          {[-0.12, 0.01].map((kx, idx) => (
            <mesh key={idx} position={[kx, -0.07, 0.34 + idx * 0.1]}>
              <cylinderGeometry args={[0.055, 0.04, 0.1, 10]} />
              <meshStandardMaterial color="#b45309" roughness={0.82} />
            </mesh>
          ))}
          <group ref={chaiSteamRef} position={[0, 0.18, 0]}>
            {[0, 1, 2].map((idx) => (
              <mesh key={idx} position={[0, idx * 0.15, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.38} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Hot Maggi Iron Kadhai / Wok + Golden Noodles */}
        <group position={[0.5, 1.06, -0.44]}>
          <mesh castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.27, 0.15, 0.15, 14]} />
            <meshStandardMaterial color="#1f2937" roughness={0.62} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.21, 0.18, 0.05, 12]} />
            <meshStandardMaterial color="#eab308" roughness={0.78} />
          </mesh>
          <group ref={kadhaiSteamRef} position={[0, 0.16, 0]}>
            {[0, 1, 2].map((idx) => (
              <mesh key={idx} position={[0, idx * 0.14, 0]}>
                <sphereGeometry args={[0.062, 8, 8]} />
                <meshBasicMaterial color="#fef9c3" transparent opacity={0.38} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Chopped veggies bowl + stack of iconic yellow Maggi packets */}
        <group position={[0.34, 0.96, -0.84]}>
          <mesh position={[0.16, 0.02, 0.02]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.095, 0.07, 0.06, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.35} />
          </mesh>
          <mesh position={[0.16, 0.045, 0.02]}>
            <sphereGeometry args={[0.065, 8, 6]} />
            <meshStandardMaterial color="#dc2626" roughness={0.8} />
          </mesh>
          {[0, 1, 2].map((idx) => (
            <mesh
              key={idx}
              position={[-0.08 + idx * 0.02, 0.02 + idx * 0.042, -0.06]}
              rotation={[0, idx * 0.12, 0]}
              castShadow={shadowsEnabled}
            >
              <boxGeometry args={[0.16, 0.038, 0.13]} />
              <meshStandardMaterial color="#facc15" roughness={0.62} />
            </mesh>
          ))}
        </group>

        {/* Fictional Background Stall Owner & Helper standing right behind open kitchen counter */}
        <StallCookCharacter
          variant="owner"
          position={[-0.22, 0, -0.44]}
          rotationY={-Math.PI / 2}
          torsoRef={ownerTorsoRef}
          headRef={ownerHeadRef}
          rightArmRef={ownerRightArmRef}
          rightForearmRef={ownerRightForearmRef}
          castShadow={shadowsEnabled}
        />
        <StallCookCharacter
          variant="helper"
          groupRef={helperGroupRef}
          position={[-0.26, 0, 0.46]}
          rotationY={-Math.PI / 2}
          torsoRef={helperTorsoRef}
          headRef={helperHeadRef}
          rightArmRef={helperRightArmRef}
          rightForearmRef={helperRightForearmRef}
          carryingServingTray={helperCarryingTray}
          castShadow={shadowsEnabled}
        />
      </group>

      {/* Side Tea Bench & 2 Fellow Travellers Resting at Dhaba */}
      <group position={[-5.45, 0, 0.6]}>
        <mesh position={[0.35, 0.36, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.58, 0.06, 0.72]} />
          <meshStandardMaterial color="#7c533c" roughness={0.88} />
        </mesh>
        <mesh position={[0.35, 0.18, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.42, 0.36, 0.48]} />
          <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
        </mesh>
        <mesh position={[0.35, 0.44, -0.14]}>
          <cylinderGeometry args={[0.045, 0.034, 0.09, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.85} />
        </mesh>
        <mesh position={[0.35, 0.44, 0.14]}>
          <cylinderGeometry args={[0.045, 0.034, 0.09, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.85} />
        </mesh>
        <StylizedPlaceholderCharacter
          characterVariant="traveler"
          position={[-0.3, 0, -0.22]}
          rotationY={-Math.PI / 2 + 0.2}
          scale={0.98}
          jacketColor="#475569"
          pantsColor="#1e293b"
          holdingChaiCup
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="traveler"
          position={[-0.28, 0, 0.42]}
          rotationY={-Math.PI / 2 - 0.25}
          scale={0.96}
          jacketColor="#7c2d12"
          pantsColor="#334155"
          castShadow={shadowsEnabled}
        />
      </group>

      {/* Extra Nearby Parked Scooters along roadside margin */}
      <group position={[-4.35, 0, 3.65]} rotation={[0, -Math.PI / 2 + 0.18, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[4.2, 0, 3.65]} rotation={[0, -Math.PI / 2 - 0.15, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Four Sculpted Rustic Wooden Stools Surrounding the Gathering Table */}
      {[
        [DHABA_SEAT_SLOTS.srishti.x, DHABA_SEAT_SLOTS.srishti.z],
        [DHABA_SEAT_SLOTS.ishaan.x, DHABA_SEAT_SLOTS.ishaan.z],
        [DHABA_SEAT_SLOTS.friend_plaid.x, DHABA_SEAT_SLOTS.friend_plaid.z],
        [DHABA_SEAT_SLOTS.friend_black_tee.x, DHABA_SEAT_SLOTS.friend_black_tee.z],
      ].map(([sx, sz], idx) => (
        <group key={idx} position={[sx, 0, sz]}>
          <mesh position={[0, 0.425, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.23, 0.21, 0.055, 14]} />
            <meshStandardMaterial color="#854d27" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.145, 0.014, 6, 14]} />
            <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
          </mesh>
          {[
            [-0.11, -0.11],
            [0.11, -0.11],
            [-0.11, 0.11],
            [0.11, 0.11],
          ].map(([lx, lz], lIdx) => (
            <mesh key={lIdx} position={[lx, 0.21, lz]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.025, 0.02, 0.42, 7]} />
              <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Subtle swaying roadside hillside bushes around terrace borders */}
      {[
        [-6.1, -4.4],
        [5.85, -3.95],
        [6.1, 1.5],
      ].map(([bx, bz], idx) => (
        <group
          key={idx}
          ref={(el) => {
            shrubRefs.current[idx] = el;
          }}
          position={[bx, 0, bz]}
        >
          <mesh position={[0, 0.25, 0]} castShadow={shadowsEnabled}>
            <dodecahedronGeometry args={[0.38, 0]} />
            <meshStandardMaterial color="#3b6e3f" roughness={0.92} />
          </mesh>
          <mesh position={[0.25, 0.18, 0.12]} castShadow={shadowsEnabled}>
            <dodecahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color="#4b834e" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Refined 4-Person Teakwood Dhaba Table + Festival Overhead Warm String Bulbs */}
      <group position={[DHABA_TABLE_CENTER.x, 0, DHABA_TABLE_CENTER.z]}>
        {/* Recessed four corner legs leaving wide clear knee space under all 4 seats */}
        {[
          [-0.68, -0.34],
          [0.68, -0.34],
          [-0.68, 0.34],
          [0.68, 0.34],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.36, lz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.045, 0.036, 0.72, 10]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
        ))}
        {/* Under-table structural apron & warm timber planked top (`y = 0.75m`) */}
        <mesh position={[0, 0.68, 0]}>
          <boxGeometry args={[1.48, 0.06, 0.78]} />
          <meshStandardMaterial color="#654332" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[2.05, 0.06, 1.16]} />
          <meshStandardMaterial color="#8c5e42" roughness={0.82} />
        </mesh>
        {/* Warm woven runner mat down table center */}
        <mesh position={[0, 0.754, 0]}>
          <boxGeometry args={[1.5, 0.01, 0.34]} />
          <meshStandardMaterial color="#b45309" roughness={0.9} />
        </mesh>
        {/* Center chili/chaat-masala jar & napkin block */}
        <mesh position={[0, 0.81, 0]}>
          <cylinderGeometry args={[0.042, 0.045, 0.11, 10]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.35} />
        </mesh>
        <pointLight position={[0, 1.85, 0]} intensity={0.85} color="#fde68a" distance={5.2} />

        {/* Individual Maggi Bowls & Kulhad Cups at ALL 4 Seats once served */}
        {tableServed && (
          <>
            {[
              { plate: [0.0, 0.34] as const, cup: [-0.24, 0.28] as const }, // South (Srishti)
              { plate: [0.0, -0.34] as const, cup: [0.24, -0.28] as const }, // North (Ishaan)
              { plate: [-0.66, 0.0] as const, cup: [-0.6, 0.23] as const }, // West
              { plate: [0.66, 0.0] as const, cup: [0.6, -0.23] as const }, // East
            ].map((seat, idx) => (
              <group key={idx}>
                <group position={[seat.plate[0], 0.775, seat.plate[1]]}>
                  <mesh castShadow={shadowsEnabled}>
                    <cylinderGeometry args={[0.17, 0.13, 0.04, 14]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.28} metalness={0.72} />
                  </mesh>
                  <mesh position={[0, 0.026, 0]}>
                    <sphereGeometry args={[0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                    <meshStandardMaterial color="#eab308" roughness={0.78} />
                  </mesh>
                </group>
                <mesh position={[seat.cup[0], 0.8, seat.cup[1]]} castShadow={shadowsEnabled}>
                  <cylinderGeometry args={[0.046, 0.032, 0.09, 10]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} />
                </mesh>
              </group>
            ))}

            {/* Visible rising steam plumes above all served plates */}
            <group ref={maggiSteamRef} position={[0, 0.86, 0]}>
              {[
                [0, 0, 0.34],
                [0, 0.14, -0.34],
                [-0.66, 0.08, 0],
                [0.66, 0.2, 0],
              ].map(([sx, sy, sz], idx) => (
                <mesh key={idx} position={[sx, sy, sz]}>
                  <sphereGeometry args={[0.068, 8, 8]} />
                  <meshBasicMaterial color="#fef9c3" transparent opacity={0.42} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </>
        )}
      </group>

      {/* Subtle floating sparkle motes replacing large floor rings */}
      <HotspotBeaconSparkle
        position={[-1.45, 0, -1.35]}
        visible={!sippedChai}
        color="#f59e0b"
        height={0.9}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0.55, 0, -0.68]}
        visible={!ateMaggi}
        color="#f59e0b"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[4.2, 0, -3.4]}
        visible={!capturedPolaroid}
        color="#38bdf8"
        height={0.95}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <HotspotBeaconSparkle
        position={[0.2, 0, 2.35]}
        visible={ateMaggi || sippedChai || capturedPolaroid}
        color="#fbbf24"
        height={0.85}
        paused={paused}
        reducedMotion={reducedMotion}
      />

      {/* Stylized Instanced Pines framing terrace & continuing highway */}
      <instancedMesh ref={trunkInstRef} args={[undefined, undefined, MAX_PINE_COUNT]}>
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownInstRef} args={[undefined, undefined, MAX_PINE_COUNT]}>
        <coneGeometry args={[1.25, 2.8, 7]} />
        <meshStandardMaterial color="#3f6236" roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}
