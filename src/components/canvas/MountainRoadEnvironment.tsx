'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  COMPANION_PARK_LATERAL,
  LEAD_PARK_LATERAL,
  ROAD_HALF_WIDTH,
  ROUTE_STOP_OFFSET,
  sampleRoadFrame,
} from '@/lib/mountainSpline';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export interface MountainRoadEnvironmentProps {
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  qualityProfile: QualityProfile;
}

interface RibbonStripSpec {
  leftOffset: number;
  leftY: number;
  rightOffset: number;
  rightY: number;
  leftColor?: THREE.Color;
  rightColor?: THREE.Color;
}

const ROAD_SEGMENTS = 240;

/**
 * Deterministic PRNG so hillside foliage stays consistent across reloads.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds an indexed triangle-strip BufferGeometry along the road spline.
 */
function buildSplineRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  totalLength: number,
  segments: number,
  strip: RibbonStripSpec,
  startDistance = 0,
  endDistance = totalLength
): THREE.BufferGeometry {
  const vertexCount = (segments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = strip.leftColor && strip.rightColor ? new Float32Array(vertexCount * 3) : null;
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const posLeft = new THREE.Vector3();
  const posRight = new THREE.Vector3();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const distance = THREE.MathUtils.lerp(startDistance, endDistance, t);
    sampleRoadFrame(curve, distance, totalLength, point, tangent, right, up);

    posLeft
      .copy(point)
      .addScaledVector(right, strip.leftOffset)
      .addScaledVector(up, strip.leftY);
    posRight
      .copy(point)
      .addScaledVector(right, strip.rightOffset)
      .addScaledVector(up, strip.rightY);

    const baseIdx = i * 2;
    positions[baseIdx * 3] = posLeft.x;
    positions[baseIdx * 3 + 1] = posLeft.y;
    positions[baseIdx * 3 + 2] = posLeft.z;

    positions[(baseIdx + 1) * 3] = posRight.x;
    positions[(baseIdx + 1) * 3 + 1] = posRight.y;
    positions[(baseIdx + 1) * 3 + 2] = posRight.z;

    if (colors && strip.leftColor && strip.rightColor) {
      colors[baseIdx * 3] = strip.leftColor.r;
      colors[baseIdx * 3 + 1] = strip.leftColor.g;
      colors[baseIdx * 3 + 2] = strip.leftColor.b;

      colors[(baseIdx + 1) * 3] = strip.rightColor.r;
      colors[(baseIdx + 1) * 3 + 1] = strip.rightColor.g;
      colors[(baseIdx + 1) * 3 + 2] = strip.rightColor.b;
    }

    if (i < segments) {
      const a = baseIdx;
      const b = baseIdx + 1;
      const c = baseIdx + 2;
      const d = baseIdx + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (colors) {
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const DISTANT_PEAKS = [
  { position: [-110, 18, -95] as const, radius: 52, height: 68, color: '#6b8ba4' },
  { position: [120, 14, -120] as const, radius: 60, height: 62, color: '#64839c' },
  { position: [-95, 22, -210] as const, radius: 58, height: 82, color: '#58768f' },
  { position: [108, 20, -240] as const, radius: 64, height: 78, color: '#5e7d96' },
  { position: [8, 26, -345] as const, radius: 95, height: 108, color: '#7898b0' },
  { position: [-140, 24, -330] as const, radius: 82, height: 95, color: '#6786a0' },
  { position: [148, 22, -320] as const, radius: 85, height: 90, color: '#62819b' },
  { position: [-65, 10, 55] as const, radius: 55, height: 48, color: '#6c8aa3' },
];

export function MountainRoadEnvironment({
  curve,
  totalLength,
  qualityProfile,
}: MountainRoadEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const treeCount = Math.min(140, Math.round(QUALITY_PRESETS[qualityProfile].treeDensity));

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const dashMeshRef = useRef<THREE.InstancedMesh>(null);
  const postMeshRef = useRef<THREE.InstancedMesh>(null);
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageLowerMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageUpperMeshRef = useRef<THREE.InstancedMesh>(null);

  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, 6, -135);
    return target;
  }, []);

  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.target = lightTarget;
      lightTarget.updateMatrixWorld();
    }
  }, [lightTarget]);

  // Procedural spline-aligned road, shoulder, cliff, valley, and guardrail geometries
  const geometries = useMemo(() => {
    const asphalt = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: -ROAD_HALF_WIDTH,
      leftY: 0.01,
      rightOffset: ROAD_HALF_WIDTH,
      rightY: 0.01,
    });

    const leftShoulder = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: -(ROAD_HALF_WIDTH + 1.25),
      leftY: -0.04,
      rightOffset: -ROAD_HALF_WIDTH,
      rightY: 0.005,
    });

    const rightShoulder = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: ROAD_HALF_WIDTH,
      leftY: 0.005,
      rightOffset: ROAD_HALF_WIDTH + 1.25,
      rightY: -0.04,
    });

    const hillsideSlope = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: -22.5,
      leftY: 11.5,
      rightOffset: -(ROAD_HALF_WIDTH + 1.2),
      rightY: -0.04,
      leftColor: new THREE.Color('#4a6b38'),
      rightColor: new THREE.Color('#786b59'),
    });

    const valleySlope = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: ROAD_HALF_WIDTH + 1.2,
      leftY: -0.04,
      rightOffset: 28.0,
      rightY: -16.0,
      leftColor: new THREE.Color('#6b705c'),
      rightColor: new THREE.Color('#3f5e36'),
    });

    const guardrailBeam = buildSplineRibbonGeometry(curve, totalLength, 160, {
      leftOffset: ROAD_HALF_WIDTH + 0.52,
      leftY: 0.56,
      rightOffset: ROAD_HALF_WIDTH + 0.52,
      rightY: 0.76,
    });

    const apronStart = Math.max(0, totalLength - 20);
    const stopApron = buildSplineRibbonGeometry(
      curve,
      totalLength,
      20,
      {
        leftOffset: -(ROAD_HALF_WIDTH + 1.4),
        leftY: -0.005,
        rightOffset: ROAD_HALF_WIDTH + 1.4,
        rightY: -0.005,
      },
      apronStart,
      totalLength
    );

    return {
      asphalt,
      leftShoulder,
      rightShoulder,
      hillsideSlope,
      valleySlope,
      guardrailBeam,
      stopApron,
    };
  }, [curve, totalLength]);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  // Precompute centerline dashes & guardrail post transforms
  const dashCount = useMemo(() => Math.floor((totalLength - 18) / 6.0), [totalLength]);
  const postCount = useMemo(() => Math.floor((totalLength - 4) / 4.5), [totalLength]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const basis = new THREE.Matrix4();
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const negTangent = new THREE.Vector3();

    if (dashMeshRef.current) {
      for (let i = 0; i < dashCount; i += 1) {
        const d = 4 + i * 6.0;
        sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
        negTangent.copy(tangent).negate();
        basis.makeBasis(right, up, negTangent);
        dummy.position.copy(point).addScaledVector(up, 0.025);
        dummy.quaternion.setFromRotationMatrix(basis);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      dashMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (postMeshRef.current) {
      for (let i = 0; i < postCount; i += 1) {
        const d = 2 + i * 4.5;
        sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
        dummy.position
          .copy(point)
          .addScaledVector(right, ROAD_HALF_WIDTH + 0.56)
          .addScaledVector(up, 0.36);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      postMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [curve, totalLength, dashCount, postCount]);

  // Populate instanced pine trees safely outside the road surface
  useEffect(() => {
    if (!trunkMeshRef.current || !foliageLowerMeshRef.current || !foliageUpperMeshRef.current) {
      return;
    }

    const rand = createSeededRandom(202611);
    const dummy = new THREE.Object3D();
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const foliageColor = new THREE.Color();
    const foliageUpperColor = new THREE.Color();

    trunkMeshRef.current.count = treeCount;
    foliageLowerMeshRef.current.count = treeCount;
    foliageUpperMeshRef.current.count = treeCount;

    for (let i = 0; i < treeCount; i += 1) {
      const d = 4 + rand() * (totalLength - 8);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);

      const isHillside = rand() < 0.62;
      let lateral: number;
      let yOffset: number;
      if (isHillside) {
        const u = rand(); // 0..1 across left hillside
        lateral = -(ROAD_HALF_WIDTH + 2.6 + u * 13.5);
        yOffset = THREE.MathUtils.lerp(0.8, 9.5, u);
      } else {
        const u = rand(); // 0..1 down right valley slope
        lateral = ROAD_HALF_WIDTH + 2.8 + u * 16.5;
        yOffset = THREE.MathUtils.lerp(-0.9, -11.0, u);
      }

      const scale = 0.78 + rand() * 0.72;
      const yaw = rand() * Math.PI * 2;
      const basePos = point
        .clone()
        .addScaledVector(right, lateral)
        .addScaledVector(up, yOffset);

      // Trunk
      dummy.position.set(basePos.x, basePos.y + 0.85 * scale, basePos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(i, dummy.matrix);

      // Lower cone
      dummy.position.set(basePos.x, basePos.y + 2.15 * scale, basePos.z);
      dummy.updateMatrix();
      foliageLowerMeshRef.current.setMatrixAt(i, dummy.matrix);

      // Upper cone
      dummy.position.set(basePos.x, basePos.y + 3.25 * scale, basePos.z);
      dummy.updateMatrix();
      foliageUpperMeshRef.current.setMatrixAt(i, dummy.matrix);

      foliageColor.setHSL(0.32 + (rand() - 0.5) * 0.04, 0.36, 0.25 + rand() * 0.08);
      foliageUpperColor.copy(foliageColor).offsetHSL(0, 0, 0.04);
      foliageLowerMeshRef.current.setColorAt(i, foliageColor);
      foliageUpperMeshRef.current.setColorAt(i, foliageUpperColor);
    }

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageLowerMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageUpperMeshRef.current.instanceMatrix.needsUpdate = true;
    if (foliageLowerMeshRef.current.instanceColor) {
      foliageLowerMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (foliageUpperMeshRef.current.instanceColor) {
      foliageUpperMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [curve, totalLength, treeCount]);

  // Route-stop apron markers (clean non-story bay lines & roadside bollard)
  const stopBayTransforms = useMemo(() => {
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const stopD = Math.max(0, totalLength - ROUTE_STOP_OFFSET);

    sampleRoadFrame(curve, stopD, totalLength, point, tangent, right, up);
    basis.makeBasis(right, up, tangent.clone().negate());
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);

    const leadSlot = point
      .clone()
      .addScaledVector(right, LEAD_PARK_LATERAL)
      .addScaledVector(up, 0.025);
    const companionSlot = point
      .clone()
      .addScaledVector(right, COMPANION_PARK_LATERAL)
      .addScaledVector(up, 0.025);
    const markerPost = point
      .clone()
      .addScaledVector(right, ROAD_HALF_WIDTH + 1.05)
      .addScaledVector(up, 0.75);

    return { leadSlot, companionSlot, markerPost, quaternion };
  }, [curve, totalLength]);

  return (
    <group>
      {/* Crisp morning mountain sky & gentle distance haze */}
      <color attach="background" args={['#b8d8f0']} />
      <fog attach="fog" args={['#b8d8f0', 60, 250]} />

      {/* Warm daylight sky/ground ambient + directional sun */}
      <hemisphereLight args={['#e0f2fe', '#6b705c', 0.95]} />
      <primitive object={lightTarget} />
      <directionalLight
        ref={dirLightRef}
        position={[52, 88, -60]}
        intensity={1.65}
        color="#fff4db"
        castShadow={shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={340}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-bias={-0.0005}
      />

      {/* Asphalt road deck */}
      <mesh geometry={geometries.asphalt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#384152" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Road shoulders */}
      <mesh geometry={geometries.leftShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#8d8374" roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.rightShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#8d8374" roughness={0.95} />
      </mesh>

      {/* Clean non-story stop apron near spline end */}
      <mesh geometry={geometries.stopApron} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#4b5563" roughness={0.9} />
      </mesh>

      {/* Subtle side-by-side stop bay pads */}
      <mesh
        position={stopBayTransforms.leadSlot}
        quaternion={stopBayTransforms.quaternion}
      >
        <boxGeometry args={[1.15, 0.02, 2.5]} />
        <meshBasicMaterial color="#e06d44" transparent opacity={0.35} />
      </mesh>
      <mesh
        position={stopBayTransforms.companionSlot}
        quaternion={stopBayTransforms.quaternion}
      >
        <boxGeometry args={[1.15, 0.02, 2.5]} />
        <meshBasicMaterial color="#2a9d8f" transparent opacity={0.35} />
      </mesh>

      {/* Simple roadside terminus marker post (no story props) */}
      <group position={stopBayTransforms.markerPost} quaternion={stopBayTransforms.quaternion}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.07, 1.5, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[0.26, 0.24, 0.12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} />
        </mesh>
      </group>

      {/* Forested left hillside & outer right valley slope */}
      <mesh geometry={geometries.hillsideSlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={geometries.valleySlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>

      {/* Distant lower valley ground plane */}
      <mesh position={[12, -16.5, -135]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[480, 520]} />
        <meshStandardMaterial color="#3c5a45" roughness={1} />
      </mesh>

      {/* Valley-side steel guardrail */}
      <mesh geometry={geometries.guardrailBeam}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Instanced dashed centerline markings */}
      <instancedMesh ref={dashMeshRef} args={[undefined, undefined, dashCount]}>
        <boxGeometry args={[0.14, 0.02, 2.3]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </instancedMesh>

      {/* Instanced guardrail posts */}
      <instancedMesh ref={postMeshRef} args={[undefined, undefined, postCount]}>
        <boxGeometry args={[0.1, 0.74, 0.1]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </instancedMesh>

      {/* Instanced stylized pine trees (fixed max capacity 140; active count scaled by QualityProfile) */}
      <instancedMesh ref={trunkMeshRef} args={[undefined, undefined, 140]} castShadow={shadowsEnabled}>
        <cylinderGeometry args={[0.12, 0.18, 1.7, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={foliageLowerMeshRef}
        args={[undefined, undefined, 140]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.15, 2.1, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={foliageUpperMeshRef}
        args={[undefined, undefined, 140]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[0.85, 1.85, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>

      {/* Distant low-poly Himalayan peaks */}
      {DISTANT_PEAKS.map((peak, index) => (
        <mesh key={index} position={peak.position}>
          <coneGeometry args={[peak.radius, peak.height, 6]} />
          <meshStandardMaterial color={peak.color} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}
