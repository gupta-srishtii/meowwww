'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  COMPANION_PARK_LATERAL,
  DHABA_TURNOUT_END,
  DHABA_TURNOUT_START,
  LEAD_PARK_LATERAL,
  ROAD_HALF_WIDTH,
  VIEWPOINT_PARK_COMP_LATERAL,
  VIEWPOINT_PARK_LEAD_LATERAL,
  VIEWPOINT_STOP_DISTANCE,
  VIEWPOINT_TURNOUT_END,
  VIEWPOINT_TURNOUT_START,
  sampleRoadFrame,
  type MountainRoadSegmentId,
} from '@/lib/mountainSpline';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getAsphaltRoadTexture, getGopuramDetailTexture } from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { DistantHimalayanRidges } from '@/components/canvas/environment/DistantHimalayanRidges';
import { RoadsideRoadLife } from '@/components/canvas/environment/RoadsideRoadLife';
import { RoadsideTapriAssembly } from '@/components/canvas/environment/RoadsideTapriAssembly';

export interface MountainRoadEnvironmentProps {
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  stopDist: number;
  roadSegment: MountainRoadSegmentId;
  qualityProfile: QualityProfile;
  leadDistRef?: RefObject<number>;
  paused?: boolean;
}

const STALL_DISTS_BY_SEGMENT: Record<MountainRoadSegmentId, readonly number[]> = {
  to_dhaba: [48, 96, 214],
  to_neelkanth: [96, 242],
  to_baalkuwari: [76, 178],
  to_hotel_return: [88, 196],
};

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function getStallAlcoveBlend(distance: number, segment: MountainRoadSegmentId): number {
  const stallDists = STALL_DISTS_BY_SEGMENT[segment];
  let best = 0;
  for (let i = 0; i < stallDists.length; i += 1) {
    const dist = Math.abs(distance - stallDists[i]);
    const blend = 1 - smoothStep01((dist - 5.2) / 6.8);
    if (blend > best) best = blend;
  }
  return best;
}

interface TurnoutRange {
  start: number;
  end: number;
}

function getApronOuterOffset(
  distance: number,
  segment: MountainRoadSegmentId,
  turnoutA: TurnoutRange,
  turnoutB: TurnoutRange,
  stopDist: number
): number {
  const shoulderOuter = ROAD_HALF_WIDTH + 1.3;
  const weightRange = (start: number, end: number, ramp = 4.5) => {
    if (distance < start - ramp || distance > end + ramp) return 0;
    const inW = smoothStep01((distance - (start - ramp)) / ramp);
    const outW = 1 - smoothStep01((distance - end) / ramp);
    return Math.min(inW, outW);
  };

  const wA = weightRange(turnoutA.start, turnoutA.end);
  const wB = weightRange(turnoutB.start, turnoutB.end);
  const targetA = segment === 'to_neelkanth' ? ROAD_HALF_WIDTH + 7.2 : ROAD_HALF_WIDTH + 4.3;
  const targetB = ROAD_HALF_WIDTH + 7.2;

  let outer = Math.max(
    shoulderOuter,
    THREE.MathUtils.lerp(shoulderOuter, targetA, wA),
    THREE.MathUtils.lerp(shoulderOuter, targetB, wB)
  );

  // Widened temple hillside plateau under arrival complex in to_neelkanth
  if (segment === 'to_neelkanth') {
    const wTemple = weightRange(stopDist - 8.5, stopDist + 8.5, 5.5);
    outer = Math.max(outer, THREE.MathUtils.lerp(shoulderOuter, ROAD_HALF_WIDTH + 14.5, wTemple));
  }

  return outer;
}

function sampleHillsideY(distance: number, lateral: number, segment: MountainRoadSegmentId): number {
  const distOut = Math.max(0, -lateral - (ROAD_HALF_WIDTH + 1.3));
  const alcove = getStallAlcoveBlend(distance, segment);
  // Leave a subtle level berm pocket (`~0.18m`) around roadside stalls before climbing up slope
  const stallShelfWidth = alcove * 2.2;
  const climb = Math.max(0, distOut - stallShelfWidth);

  const wave =
    Math.sin(distance * 0.085) * 0.68 +
    Math.cos(distance * 0.041 + 0.8) * 0.88 +
    Math.sin(distance * 0.19) * 0.18;
  const stallBermsBase = THREE.MathUtils.lerp(
    -0.04,
    0.34,
    Math.min(1, distOut / Math.max(0.5, stallShelfWidth))
  );
  const toeY = alcove * smoothStep01(distOut / 1.5) * 0.26 + (alcove > 0 ? stallBermsBase - (-0.04) : 0);

  return (
    -0.04 +
    toeY * 0.45 +
    Math.pow(climb, 0.92) * 0.6 +
    Math.sin(climb * 0.24) * 0.28 +
    wave * smoothStep01(climb / 4.2)
  );
}

function sampleValleyY(
  distance: number,
  lateral: number,
  segment: MountainRoadSegmentId,
  turnoutA: TurnoutRange,
  turnoutB: TurnoutRange,
  stopDist: number
): number {
  const apronEdge = getApronOuterOffset(distance, segment, turnoutA, turnoutB, stopDist);
  if (lateral <= apronEdge) {
    const tApron = Math.max(0, lateral - (ROAD_HALF_WIDTH + 1.3)) / Math.max(0.2, apronEdge - (ROAD_HALF_WIDTH + 1.3));
    return THREE.MathUtils.lerp(-0.04, -0.09, tApron);
  }
  const dropDist = lateral - apronEdge;
  const maxSpan = Math.max(8, 34.0 - apronEdge);
  const u = Math.min(1, dropDist / maxSpan);
  const bankBatter = smoothStep01(dropDist / 2.2) * 1.4;
  const gorgeUndulation =
    (Math.sin(distance * 0.068 + lateral * 0.12) * 0.72 +
      Math.cos(distance * 0.037 - 0.5) * 0.58) *
    smoothStep01(dropDist / 4.5);
  return -0.07 - bankBatter - Math.pow(u, 0.85) * 16.4 + gorgeUndulation;
}

const ROAD_SEGMENTS = 320;
const HILLSIDE_LATERAL_SAMPLES = 9;
const VALLEY_LATERAL_SAMPLES = 10;
const MAX_PINE_TREES = 180;
const MAX_ROADSIDE_SHRUBS = 90;
const MAX_CLIFF_ROCKS = 72;

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RibbonStripSpec {
  leftOffset: number;
  leftY: number;
  rightOffset: number;
  rightY: number;
  leftColor?: THREE.Color;
  rightColor?: THREE.Color;
}

function buildContouredRoadSideGeometry(
  curve: THREE.CatmullRomCurve3,
  totalLength: number,
  segments: number,
  lateralSteps: number,
  side: 'hill' | 'valley',
  segment: MountainRoadSegmentId,
  turnoutA: TurnoutRange,
  turnoutB: TurnoutRange,
  stopDist: number
): THREE.BufferGeometry {
  const cols = lateralSteps;
  const vertexCount = (segments + 1) * cols;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const pos = new THREE.Vector3();

  const shoulderDirt = new THREE.Color('#786b59');
  const rockScree = new THREE.Color('#63685e');
  const midTurf = new THREE.Color('#4c6b3a');
  const pineForest = new THREE.Color('#395832');
  const gorgeDeep = new THREE.Color('#324d33');
  const tmpColor = new THREE.Color();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const distance = t * totalLength;
    sampleRoadFrame(curve, distance, totalLength, point, tangent, right, up);
    const apronEdge =
      side === 'valley'
        ? getApronOuterOffset(distance, segment, turnoutA, turnoutB, stopDist)
        : ROAD_HALF_WIDTH + 1.3;

    for (let j = 0; j < cols; j += 1) {
      const s = j / (cols - 1);
      let lateral: number;
      let yOff: number;

      if (side === 'hill') {
        lateral = THREE.MathUtils.lerp(-(ROAD_HALF_WIDTH + 1.3), -29.0, Math.pow(s, 1.12));
        yOff = sampleHillsideY(distance, lateral, segment);
        if (s < 0.14) {
          tmpColor.copy(shoulderDirt).lerp(rockScree, s / 0.14);
        } else if (s < 0.36) {
          tmpColor.copy(rockScree).lerp(midTurf, (s - 0.14) / 0.22);
        } else {
          tmpColor.copy(midTurf).lerp(pineForest, (s - 0.36) / 0.64);
        }
      } else {
        const bankSamples = 3;
        if (j === 0) {
          lateral = ROAD_HALF_WIDTH + 1.3;
        } else if (j <= bankSamples) {
          const frac = j / bankSamples;
          lateral = THREE.MathUtils.lerp(ROAD_HALF_WIDTH + 1.3, apronEdge, frac);
        } else {
          const vFrac = (j - bankSamples) / (cols - 1 - bankSamples);
          lateral = THREE.MathUtils.lerp(apronEdge, 34.0, Math.pow(vFrac, 1.1));
        }
        yOff = sampleValleyY(distance, lateral, segment, turnoutA, turnoutB, stopDist);
        if (lateral <= apronEdge + 0.4) {
          tmpColor.copy(shoulderDirt).lerp(rockScree, 0.45);
        } else {
          const vT = Math.min(1, (lateral - apronEdge) / Math.max(1, 34.0 - apronEdge));
          if (vT < 0.28) {
            tmpColor.copy(rockScree).lerp(midTurf, vT / 0.28);
          } else {
            tmpColor.copy(midTurf).lerp(gorgeDeep, (vT - 0.28) / 0.72);
          }
        }
      }

      const shadeJitter = Math.sin(distance * 0.22 + lateral * 0.31) * 0.025;
      tmpColor.offsetHSL(0, 0, shadeJitter);

      pos.copy(point).addScaledVector(right, lateral).addScaledVector(up, yOff);
      const vIdx = i * cols + j;
      positions[vIdx * 3] = pos.x;
      positions[vIdx * 3 + 1] = pos.y;
      positions[vIdx * 3 + 2] = pos.z;

      colors[vIdx * 3] = tmpColor.r;
      colors[vIdx * 3 + 1] = tmpColor.g;
      colors[vIdx * 3 + 2] = tmpColor.b;

      uvs[vIdx * 2] = s;
      uvs[vIdx * 2 + 1] = t;

      if (i < segments && j < cols - 1) {
        const a = vIdx;
        const b = vIdx + 1;
        const c = (i + 1) * cols + j;
        const d = (i + 1) * cols + j + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

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
  const uvs = new Float32Array(vertexCount * 2);
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

    uvs[baseIdx * 2] = 0;
    uvs[baseIdx * 2 + 1] = t;
    uvs[(baseIdx + 1) * 2] = 1;
    uvs[(baseIdx + 1) * 2 + 1] = t;

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
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (colors) {
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function MountainRoadEnvironment({
  curve,
  totalLength,
  stopDist,
  roadSegment,
  qualityProfile,
  leadDistRef,
  paused = false,
}: MountainRoadEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const densityRatio = QUALITY_PRESETS[qualityProfile].treeDensity / 120;
  const treeCount = Math.min(MAX_PINE_TREES, Math.round(MAX_PINE_TREES * densityRatio));
  const shrubCount = Math.min(MAX_ROADSIDE_SHRUBS, Math.round(MAX_ROADSIDE_SHRUBS * densityRatio));
  const rockCount = Math.min(MAX_CLIFF_ROCKS, Math.round(MAX_CLIFF_ROCKS * densityRatio));

  const asphaltTex = useMemo(() => getAsphaltRoadTexture(), []);
  const gopuramTex = useMemo(() => getGopuramDetailTexture(), []);

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const roadFlagRefs = useRef<(THREE.Mesh | null)[]>([]);
  const animPhaseRef = useRef(0);
  const dashMeshRef = useRef<THREE.InstancedMesh>(null);
  const postMeshRef = useRef<THREE.InstancedMesh>(null);
  const milestoneMeshRef = useRef<THREE.InstancedMesh>(null);
  const shrubMeshRef = useRef<THREE.InstancedMesh>(null);
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageLowerMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageUpperMeshRef = useRef<THREE.InstancedMesh>(null);

  const turnoutA = useMemo(
    () =>
      roadSegment === 'to_dhaba'
        ? { start: VIEWPOINT_TURNOUT_START, end: VIEWPOINT_TURNOUT_END }
        : { start: 122, end: 146 },
    [roadSegment]
  );

  const turnoutB = useMemo(
    () =>
      roadSegment === 'to_dhaba'
        ? { start: DHABA_TURNOUT_START, end: DHABA_TURNOUT_END }
        : { start: Math.max(160, stopDist - 22), end: Math.min(totalLength - 24, stopDist + 22) },
    [roadSegment, stopDist, totalLength]
  );

  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(-12, 7, -210);
    return target;
  }, []);

  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.target = lightTarget;
      lightTarget.updateMatrixWorld();
    }
  }, [lightTarget]);

  const geometries = useMemo(() => {
    const asphalt = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: -ROAD_HALF_WIDTH,
      leftY: 0.01,
      rightOffset: ROAD_HALF_WIDTH,
      rightY: 0.01,
    });

    const leftShoulder = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: -(ROAD_HALF_WIDTH + 1.35),
      leftY: -0.04,
      rightOffset: -ROAD_HALF_WIDTH,
      rightY: 0.005,
    });

    const rightShoulder = buildSplineRibbonGeometry(curve, totalLength, ROAD_SEGMENTS, {
      leftOffset: ROAD_HALF_WIDTH,
      leftY: 0.005,
      rightOffset: ROAD_HALF_WIDTH + 1.35,
      rightY: -0.04,
    });

    const leftEdgeStripe = buildSplineRibbonGeometry(curve, totalLength, 160, {
      leftOffset: -(ROAD_HALF_WIDTH - 0.35),
      leftY: 0.02,
      rightOffset: -(ROAD_HALF_WIDTH - 0.2),
      rightY: 0.02,
    });

    const rightEdgeStripe = buildSplineRibbonGeometry(curve, totalLength, 160, {
      leftOffset: ROAD_HALF_WIDTH - 0.35,
      leftY: 0.02,
      rightOffset: ROAD_HALF_WIDTH - 0.2,
      rightY: 0.02,
    });

    const hillsideSlope = buildContouredRoadSideGeometry(
      curve,
      totalLength,
      ROAD_SEGMENTS,
      HILLSIDE_LATERAL_SAMPLES,
      'hill',
      roadSegment,
      turnoutA,
      turnoutB,
      stopDist
    );

    const valleySlope = buildContouredRoadSideGeometry(
      curve,
      totalLength,
      ROAD_SEGMENTS,
      VALLEY_LATERAL_SAMPLES,
      'valley',
      roadSegment,
      turnoutA,
      turnoutB,
      stopDist
    );

    // Guardrail spans split around Turnout A & Turnout B so riders pull smoothly onto shoulders
    const guardrail1 = buildSplineRibbonGeometry(
      curve,
      totalLength,
      64,
      {
        leftOffset: ROAD_HALF_WIDTH + 0.52,
        leftY: 0.56,
        rightOffset: ROAD_HALF_WIDTH + 0.52,
        rightY: 0.76,
      },
      0,
      turnoutA.start - 2
    );

    const guardrail2 = buildSplineRibbonGeometry(
      curve,
      totalLength,
      64,
      {
        leftOffset: ROAD_HALF_WIDTH + 0.52,
        leftY: 0.56,
        rightOffset: ROAD_HALF_WIDTH + 0.52,
        rightY: 0.76,
      },
      turnoutA.end + 2,
      turnoutB.start - 2
    );

    const guardrail3 = buildSplineRibbonGeometry(
      curve,
      totalLength,
      72,
      {
        leftOffset: ROAD_HALF_WIDTH + 0.52,
        leftY: 0.56,
        rightOffset: ROAD_HALF_WIDTH + 0.52,
        rightY: 0.76,
      },
      turnoutB.end + 2,
      totalLength
    );

    // Viewpoint / scenic approach lookout turnout pad (wider in to_neelkanth to house roadside tea tapri)
    const viewpointApronRight =
      roadSegment === 'to_neelkanth' ? ROAD_HALF_WIDTH + 7.2 : ROAD_HALF_WIDTH + 4.2;
    const viewpointApron = buildSplineRibbonGeometry(
      curve,
      totalLength,
      18,
      {
        leftOffset: ROAD_HALF_WIDTH - 0.1,
        leftY: 0.008,
        rightOffset: viewpointApronRight,
        rightY: -0.01,
      },
      turnoutA.start,
      turnoutA.end
    );
    const viewpointRetainingSkirt = buildSplineRibbonGeometry(
      curve,
      totalLength,
      18,
      {
        leftOffset: viewpointApronRight - 0.25,
        leftY: -0.01,
        rightOffset: viewpointApronRight + 0.35,
        rightY: -2.4,
      },
      turnoutA.start,
      turnoutA.end
    );

    // Main pull-off apron (dhaba bay in `to_dhaba`, or Neelkanth turnout in `to_neelkanth`)
    const mainTurnoutApron = buildSplineRibbonGeometry(
      curve,
      totalLength,
      26,
      {
        leftOffset: ROAD_HALF_WIDTH - 0.1,
        leftY: 0.008,
        rightOffset: ROAD_HALF_WIDTH + 7.2,
        rightY: -0.008,
      },
      turnoutB.start,
      turnoutB.end
    );
    const mainTurnoutRetainingSkirt = buildSplineRibbonGeometry(
      curve,
      totalLength,
      26,
      {
        leftOffset: ROAD_HALF_WIDTH + 6.95,
        leftY: -0.008,
        rightOffset: ROAD_HALF_WIDTH + 7.55,
        rightY: -2.4,
      },
      turnoutB.start,
      turnoutB.end
    );

    return {
      asphalt,
      leftShoulder,
      rightShoulder,
      leftEdgeStripe,
      rightEdgeStripe,
      hillsideSlope,
      valleySlope,
      guardrail1,
      guardrail2,
      guardrail3,
      viewpointApron,
      viewpointRetainingSkirt,
      mainTurnoutApron,
      mainTurnoutRetainingSkirt,
    };
  }, [curve, totalLength, roadSegment, stopDist, turnoutA, turnoutB]);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  const dashCount = useMemo(() => Math.floor((totalLength - 12) / 6.2), [totalLength]);
  const postPositions = useMemo(() => {
    const result: number[] = [];
    for (let d = 2; d < totalLength - 4; d += 4.6) {
      const inTurnoutA = d >= turnoutA.start - 2 && d <= turnoutA.end + 2;
      const inTurnoutB = d >= turnoutB.start - 2 && d <= turnoutB.end + 2;
      if (!inTurnoutA && !inTurnoutB) {
        result.push(d);
      }
    }
    return result;
  }, [totalLength, turnoutA, turnoutB]);

  const milestoneDistances = useMemo(() => {
    const result: number[] = [];
    for (let d = 45; d < totalLength - 30; d += 58) {
      const inTurnoutA = d >= turnoutA.start - 2 && d <= turnoutA.end + 2;
      const inTurnoutB = d >= turnoutB.start - 2 && d <= turnoutB.end + 2;
      if (!inTurnoutA && !inTurnoutB) {
        result.push(d);
      }
    }
    return result;
  }, [totalLength, turnoutA, turnoutB]);

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
        const d = 4 + i * 6.2;
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
      postMeshRef.current.count = postPositions.length;
      for (let i = 0; i < postPositions.length; i += 1) {
        const d = postPositions[i];
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

    if (milestoneMeshRef.current) {
      milestoneMeshRef.current.count = milestoneDistances.length;
      for (let i = 0; i < milestoneDistances.length; i += 1) {
        const d = milestoneDistances[i];
        sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
        negTangent.copy(tangent).negate();
        basis.makeBasis(right, up, negTangent);
        dummy.position
          .copy(point)
          .addScaledVector(right, -(ROAD_HALF_WIDTH + 0.85))
          .addScaledVector(up, 0.32);
        dummy.quaternion.setFromRotationMatrix(basis);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        milestoneMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      milestoneMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [curve, totalLength, dashCount, postPositions, milestoneDistances]);

  // Populate hillside & gorge pine trees + shrubs cleanly outside paved aprons
  useEffect(() => {
    if (
      !trunkMeshRef.current ||
      !foliageLowerMeshRef.current ||
      !foliageUpperMeshRef.current ||
      !shrubMeshRef.current ||
      !rockMeshRef.current
    ) {
      return;
    }

    const rand = createSeededRandom(roadSegment === 'to_dhaba' ? 202611 : 202612);
    const dummy = new THREE.Object3D();
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basePos = new THREE.Vector3();
    const foliageColor = new THREE.Color();
    const foliageUpperColor = new THREE.Color();
    const shrubColor = new THREE.Color();

    trunkMeshRef.current.count = treeCount;
    foliageLowerMeshRef.current.count = treeCount;
    foliageUpperMeshRef.current.count = treeCount;

    for (let i = 0; i < treeCount; i += 1) {
      const d = 4 + rand() * (totalLength - 8);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);

      const inTurnoutB = d >= turnoutB.start - 4 && d <= turnoutB.end + 4;
      const inTurnoutA = d >= turnoutA.start - 3 && d <= turnoutA.end + 3;
      const isHillside = inTurnoutA || inTurnoutB ? rand() < 0.72 : rand() < 0.58;
      const alcove = getStallAlcoveBlend(d, roadSegment);

      let lateral: number;
      let yOffset: number;
      const scale = 0.8 + rand() * 0.75;
      if (isHillside) {
        const u = rand();
        const stallShelfClear = alcove * 2.8;
        lateral = -(ROAD_HALF_WIDTH + 2.3 + stallShelfClear + u * 16.5);
        lateral = Math.max(-28.0, lateral);
        yOffset = sampleHillsideY(d, lateral, roadSegment) - 0.24 * scale;
      } else {
        const u = rand();
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        const nearArrivalTemple =
          roadSegment === 'to_neelkanth' && Math.abs(d - stopDist) < 11.0;
        const valleyClear = nearArrivalTemple ? Math.max(apronEdge + 2.5, ROAD_HALF_WIDTH + 16.0) : apronEdge + 1.8;
        lateral = Math.min(31.5, valleyClear + u * 14.0);
        yOffset =
          sampleValleyY(d, lateral, roadSegment, turnoutA, turnoutB, stopDist) - 0.24 * scale;
      }

      const yaw = rand() * Math.PI * 2;
      basePos.copy(point).addScaledVector(right, lateral).addScaledVector(up, yOffset);

      dummy.position.set(basePos.x, basePos.y + 0.85 * scale, basePos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(basePos.x, basePos.y + 2.15 * scale, basePos.z);
      dummy.updateMatrix();
      foliageLowerMeshRef.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(basePos.x, basePos.y + 3.25 * scale, basePos.z);
      dummy.updateMatrix();
      foliageUpperMeshRef.current.setMatrixAt(i, dummy.matrix);

      foliageColor.setHSL(0.32 + (rand() - 0.5) * 0.04, 0.38, 0.24 + rand() * 0.08);
      foliageUpperColor.copy(foliageColor).offsetHSL(0, 0, 0.04);
      foliageLowerMeshRef.current.setColorAt(i, foliageColor);
      foliageUpperMeshRef.current.setColorAt(i, foliageUpperColor);
    }

    shrubMeshRef.current.count = shrubCount;
    for (let i = 0; i < shrubCount; i += 1) {
      const d = 6 + rand() * (totalLength - 12);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
      const alcove = getStallAlcoveBlend(d, roadSegment);
      const placeOnHillside = rand() < 0.72;
      const scale = 0.55 + rand() * 0.6;
      let lateral: number;
      let slopeY: number;

      if (placeOnHillside) {
        lateral = -(ROAD_HALF_WIDTH + 1.8 + alcove * 2.5 + rand() * 5.2);
        slopeY = sampleHillsideY(d, lateral, roadSegment);
      } else {
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        lateral = Math.min(30.5, apronEdge + 1.1 + rand() * 5.2);
        slopeY = sampleValleyY(d, lateral, roadSegment, turnoutA, turnoutB, stopDist);
      }

      basePos
        .copy(point)
        .addScaledVector(right, lateral)
        .addScaledVector(up, slopeY + 0.18 * scale);

      dummy.position.copy(basePos);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(scale * 1.2, scale * 0.85, scale * 1.2);
      dummy.updateMatrix();
      shrubMeshRef.current.setMatrixAt(i, dummy.matrix);

      shrubColor.setHSL(0.28 + (rand() - 0.5) * 0.05, 0.42, 0.28 + rand() * 0.09);
      shrubMeshRef.current.setColorAt(i, shrubColor);
    }

    rockMeshRef.current.count = rockCount;
    for (let i = 0; i < rockCount; i += 1) {
      const d = 10 + rand() * (totalLength - 22);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
      const alcove = getStallAlcoveBlend(d, roadSegment);
      const placeOnHillside = rand() < 0.76;
      const scaleX = 0.75 + rand() * 1.15;
      const scaleY = 0.55 + rand() * 0.9;
      let lateral: number;
      let slopeY: number;

      if (placeOnHillside) {
        lateral = -(ROAD_HALF_WIDTH + 1.7 + alcove * 2.6 + rand() * 3.8);
        slopeY = sampleHillsideY(d, lateral, roadSegment);
      } else {
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        lateral = Math.min(30.0, apronEdge + 1.0 + rand() * 4.5);
        slopeY = sampleValleyY(d, lateral, roadSegment, turnoutA, turnoutB, stopDist);
      }

      basePos
        .copy(point)
        .addScaledVector(right, lateral)
        .addScaledVector(up, slopeY + scaleY * 0.12);

      dummy.position.copy(basePos);
      dummy.rotation.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6);
      dummy.scale.set(scaleX, scaleY, scaleX * 0.9);
      dummy.updateMatrix();
      rockMeshRef.current.setMatrixAt(i, dummy.matrix);
    }

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageLowerMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageUpperMeshRef.current.instanceMatrix.needsUpdate = true;
    shrubMeshRef.current.instanceMatrix.needsUpdate = true;
    rockMeshRef.current.instanceMatrix.needsUpdate = true;
    if (foliageLowerMeshRef.current.instanceColor) {
      foliageLowerMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (foliageUpperMeshRef.current.instanceColor) {
      foliageUpperMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (shrubMeshRef.current.instanceColor) {
      shrubMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [curve, totalLength, treeCount, shrubCount, rockCount, roadSegment, stopDist, turnoutA, turnoutB]);

  // Turnout structures: viewpoint rail + roadside dhaba placeholder / Neelkanth turnout post
  const landmarks = useMemo(() => {
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basis = new THREE.Matrix4();

    // 1. Scenic viewpoint landmark mid-route
    const viewD = (turnoutA.start + turnoutA.end) * 0.5;
    sampleRoadFrame(curve, viewD, totalLength, point, tangent, right, up);
    basis.makeBasis(right, up, tangent.clone().negate());
    const viewQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
    const viewPos = point
      .clone()
      .addScaledVector(right, ROAD_HALF_WIDTH + 3.6)
      .addScaledVector(up, 0.0);

    sampleRoadFrame(curve, VIEWPOINT_STOP_DISTANCE, totalLength, point, tangent, right, up);
    basis.makeBasis(right, up, tangent.clone().negate());
    const viewStopQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
    const viewLeadSlot = point
      .clone()
      .addScaledVector(right, VIEWPOINT_PARK_LEAD_LATERAL)
      .addScaledVector(up, 0.025);
    const viewCompSlot = point
      .clone()
      .addScaledVector(right, VIEWPOINT_PARK_COMP_LATERAL)
      .addScaledVector(up, 0.025);

    // 2. Pull-off bay parking slots + roadside stop structure at stopDist
    sampleRoadFrame(curve, stopDist, totalLength, point, tangent, right, up);
    basis.makeBasis(right, up, tangent.clone().negate());
    const stopQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    const leadSlot = point
      .clone()
      .addScaledVector(right, LEAD_PARK_LATERAL)
      .addScaledVector(up, 0.025);
    const companionSlot = point
      .clone()
      .addScaledVector(right, COMPANION_PARK_LATERAL)
      .addScaledVector(up, 0.025);
    const stallCenter = point
      .clone()
      .addScaledVector(right, ROAD_HALF_WIDTH + 5.2)
      .addScaledVector(up, 0.0);

    return {
      viewPos,
      viewQuat,
      viewLeadSlot,
      viewCompSlot,
      viewStopQuat,
      leadSlot,
      companionSlot,
      stallCenter,
      stopQuat,
    };
  }, [curve, totalLength, stopDist, turnoutA]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    animPhaseRef.current += Math.min(rawDelta, 0.05);
    const t = animPhaseRef.current;
    for (let i = 0; i < roadFlagRefs.current.length; i += 1) {
      const flag = roadFlagRefs.current[i];
      if (!flag) continue;
      flag.rotation.x = Math.sin(t * 4.2 + i * 0.6) * 0.22;
    }
  });

  return (
    <group>
      {/* Warm daylight sky on route to dhaba shifting gracefully toward afternoon warmth near Neelkanth */}
      <color
        attach="background"
        args={[
          roadSegment === 'to_dhaba'
            ? '#b8d8f0'
            : roadSegment === 'to_hotel_return'
              ? '#dca67a'
              : roadSegment === 'to_baalkuwari'
                ? '#c9dfef'
                : '#c6def0',
        ]}
      />
      <fog
        attach="fog"
        args={[
          roadSegment === 'to_dhaba'
            ? '#b8d8f0'
            : roadSegment === 'to_hotel_return'
              ? '#cf9b7d'
              : roadSegment === 'to_baalkuwari'
                ? '#d4e5f2'
                : '#cddff0',
          95,
          290,
        ]}
      />

      <hemisphereLight
        args={[
          roadSegment === 'to_dhaba'
            ? '#e0f2fe'
            : roadSegment === 'to_hotel_return'
              ? '#ffd6aa'
              : '#fff3e0',
          roadSegment === 'to_baalkuwari' ? '#4d6048' : '#686b57',
          roadSegment === 'to_hotel_return' ? 0.85 : 0.98,
        ]}
      />
      <primitive object={lightTarget} />
      <directionalLight
        ref={dirLightRef}
        position={[60, roadSegment === 'to_hotel_return' ? 42 : 96, -120]}
        intensity={roadSegment === 'to_hotel_return' ? 1.5 : 1.7}
        color={
          roadSegment === 'to_dhaba'
            ? '#fff4db'
            : roadSegment === 'to_hotel_return'
              ? '#ffb878'
              : roadSegment === 'to_baalkuwari'
                ? '#ffe6bf'
                : '#ffeacc'
        }
        castShadow={shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={480}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={240}
        shadow-camera-bottom={-240}
        shadow-bias={-0.0005}
      />

      {/* Main continuous asphalt highway w/ textured grain + clean edge lane stripes */}
      <mesh geometry={geometries.asphalt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial
          color="#3b4454"
          map={asphaltTex ?? undefined}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      <mesh geometry={geometries.leftEdgeStripe}>
        <meshStandardMaterial color="#e2e8f0" roughness={0.78} />
      </mesh>
      <mesh geometry={geometries.rightEdgeStripe}>
        <meshStandardMaterial color="#e2e8f0" roughness={0.78} />
      </mesh>

      {/* Road shoulders */}
      <mesh geometry={geometries.leftShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#8d8374" roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.rightShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#8d8374" roughness={0.95} />
      </mesh>

      {/* Widened roadside pull-off aprons & stone embankment retaining walls */}
      <mesh geometry={geometries.viewpointApron} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#7b7163" roughness={0.94} />
      </mesh>
      <mesh geometry={geometries.viewpointRetainingSkirt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#5d5447" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometries.mainTurnoutApron} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#585f6b" roughness={0.9} />
      </mesh>
      <mesh geometry={geometries.mainTurnoutRetainingSkirt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#5d5447" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Scenic Viewpoint Lookout Railing & Fluttering Prayer Flags */}
      <group position={landmarks.viewPos} quaternion={landmarks.viewQuat}>
        <mesh position={[0, 0.45, -4]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#6d4c3d" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#6d4c3d" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.45, 4]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#6d4c3d" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[0.1, 0.1, 8.6]} />
          <meshStandardMaterial color="#8d624c" roughness={0.85} />
        </mesh>
        {/* Prayer flag poles & bright fluttering flags signaling scenic overlook */}
        <mesh position={[-0.25, 1.25, -4.1]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.045, 0.055, 2.5, 8]} />
          <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        <mesh position={[-0.25, 1.25, -0.6]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.045, 0.055, 2.5, 8]} />
          <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        {['#ef4444', '#f59e0b', '#f8fafc', '#22c55e', '#3b82f6'].map((flagColor, idx) => (
          <mesh
            key={flagColor}
            ref={(el) => {
              roadFlagRefs.current[idx] = el;
            }}
            position={[-0.25, 2.25, -3.65 + idx * 0.68]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.38, 0.28]} />
            <meshStandardMaterial color={flagColor} side={THREE.DoubleSide} roughness={0.82} />
          </mesh>
        ))}
        {/* Amber/Gold viewpoint overlook signboard */}
        <mesh position={[-0.35, 1.15, 3.6]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.45, 0.35, 0.12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.45} />
        </mesh>
        {roadSegment === 'to_neelkanth' && (
          /* Authentic marigold flower garland & puja offerings stall approaching Neelkanth */
          <group position={[1.75, 0, -0.4]}>
            <RoadsideTapriAssembly
              sideOfRoad="right"
              stallVariant="flower_puja"
              keeperShirtColor="#f97316"
              customerAColor="#475569"
              customerBColor="#0f766e"
              showSecondCustomer
              showParkedScooter
              includeRetainingPlinth
              shadowsEnabled={shadowsEnabled}
              paused={paused}
              reducedMotion={reducedMotion}
              phaseOffset={1.2}
            />
          </group>
        )}
      </group>

      {roadSegment === 'to_dhaba' && (
        <>
          <mesh position={landmarks.viewLeadSlot} quaternion={landmarks.viewStopQuat}>
            <boxGeometry args={[1.05, 0.02, 2.2]} />
            <meshBasicMaterial color="#e06d44" transparent opacity={0.28} />
          </mesh>
          <mesh position={landmarks.viewCompSlot} quaternion={landmarks.viewStopQuat}>
            <boxGeometry args={[1.05, 0.02, 2.2]} />
            <meshBasicMaterial color="#2a9d8f" transparent opacity={0.28} />
          </mesh>
        </>
      )}

      {/* Pull-off bay parking markings */}
      <mesh position={landmarks.leadSlot} quaternion={landmarks.stopQuat}>
        <boxGeometry args={[1.15, 0.02, 2.5]} />
        <meshBasicMaterial color="#e06d44" transparent opacity={0.35} />
      </mesh>
      <mesh position={landmarks.companionSlot} quaternion={landmarks.stopQuat}>
        <boxGeometry args={[1.15, 0.02, 2.5]} />
        <meshBasicMaterial color="#2a9d8f" transparent opacity={0.35} />
      </mesh>

      {/* Living roadside stall at the pull-off bay (Dhaba in `to_dhaba`, Trailhead Maggi/Arch in `to_baalkuwari`, or Neelkanth temple gate in `to_neelkanth`) */}
      {roadSegment === 'to_dhaba' ? (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          <RoadsideTapriAssembly
            sideOfRoad="right"
            stallVariant="maggi_snacks"
            keeperShirtColor="#f59e0b"
            customerAColor="#64748b"
            customerBColor="#0f766e"
            showSecondCustomer
            showParkedScooter
            shadowsEnabled={shadowsEnabled}
            paused={paused}
            reducedMotion={reducedMotion}
            phaseOffset={2.7}
          />
        </group>
      ) : roadSegment === 'to_baalkuwari' ? (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          {/* Baal Kuwari Forest Trailhead Base Maggi Tapri & Rising Stone Steps Portal */}
          <RoadsideTapriAssembly
            sideOfRoad="right"
            stallVariant="maggi_snacks"
            keeperShirtColor="#0f766e"
            customerAColor="#334155"
            customerBColor="#9a3412"
            showSecondCustomer
            showParkedScooter={false}
            includeRetainingPlinth
            shadowsEnabled={shadowsEnabled}
            paused={paused}
            reducedMotion={reducedMotion}
            phaseOffset={1.5}
          />
          {/* Trailhead Stone Arch & Visible First Steps Up the Mountain */}
          <group position={[3.6, 0, -4.6]}>
            <mesh position={[0, -2.5, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[6.4, 5.0, 5.2]} />
              <meshStandardMaterial color="#675c4d" roughness={0.95} />
            </mesh>
            <mesh position={[-1.4, 1.45, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.42, 2.9, 0.42]} />
              <meshStandardMaterial color="#8c7b67" roughness={0.9} />
            </mesh>
            <mesh position={[1.4, 1.45, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.42, 2.9, 0.42]} />
              <meshStandardMaterial color="#8c7b67" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.95, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[3.5, 0.48, 0.56]} />
              <meshStandardMaterial color="#b45309" roughness={0.78} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((stepIdx) => (
              <mesh
                key={stepIdx}
                position={[0.6 + stepIdx * 0.48, 0.14 + stepIdx * 0.24, 0]}
                receiveShadow={shadowsEnabled}
              >
                <boxGeometry args={[0.56, 0.28, 2.2]} />
                <meshStandardMaterial color="#948977" roughness={0.92} />
              </mesh>
            ))}
          </group>
        </group>
      ) : roadSegment === 'to_hotel_return' ? (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          {/* Rishikesh Hotel Forecourt Gate & Lantern Veranda at Road Arrival Bay */}
          <mesh position={[2.8, -4.5, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[9.6, 9.0, 13.0]} />
            <meshStandardMaterial color="#736655" roughness={0.95} />
          </mesh>
          <mesh position={[1.4, -0.04, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[6.8, 0.16, 12.6]} />
            <meshStandardMaterial color="#a69a86" roughness={0.92} />
          </mesh>
          <group position={[3.8, 0, 0]}>
            <mesh position={[0, 2.5, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[4.4, 5.0, 9.2]} />
              <meshStandardMaterial color="#efe3cf" roughness={0.86} />
            </mesh>
            <mesh position={[0, 5.2, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[4.8, 0.36, 9.6]} />
              <meshStandardMaterial color="#b45309" roughness={0.8} />
            </mesh>
            <mesh position={[-2.25, 2.4, 0]}>
              <boxGeometry args={[0.3, 0.18, 9.2]} />
              <meshStandardMaterial color="#8c5e42" roughness={0.85} />
            </mesh>
            <pointLight position={[-2.6, 2.1, 0]} intensity={1.8} color="#fbbf24" distance={10} />
          </group>
        </group>
      ) : (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          {/* Neelkanth Mahadev Temple Entrance Plaza, Deep Mountain Retaining Foundation & Rising Shikhara */}
          <mesh position={[3.9, -6.2, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[13.2, 12.2, 15.6]} />
            <meshStandardMaterial color="#685d4d" roughness={0.96} />
          </mesh>
          <mesh position={[1.4, -0.05, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[6.4, 0.2, 14]} />
            <meshStandardMaterial color="#8f8371" roughness={0.94} />
          </mesh>
          <mesh position={[7.2, -0.1, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[5.8, 0.3, 6.2]} />
            <meshStandardMaterial color="#877867" roughness={0.93} />
          </mesh>
          {/* Tiered Dravidian-inspired Entrance Gateway Archway (right side off parking plaza) */}
          <group position={[1.6, 0, 0]}>
            <mesh position={[-0.2, 1.8, -2.0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.1, 3.6, 1.1]} />
              <meshStandardMaterial color="#e59228" map={gopuramTex ?? undefined} roughness={0.78} />
            </mesh>
            <mesh position={[-0.2, 1.8, 2.0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.1, 3.6, 1.1]} />
              <meshStandardMaterial color="#e59228" map={gopuramTex ?? undefined} roughness={0.78} />
            </mesh>
            {/* Gopuram tiered arch lintel & marigold garland beam */}
            <mesh position={[-0.2, 3.85, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.35, 1.15, 5.4]} />
              <meshStandardMaterial color="#d97706" map={gopuramTex ?? undefined} roughness={0.76} />
            </mesh>
            <mesh position={[-0.2, 4.9, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.0, 0.95, 4.0]} />
              <meshStandardMaterial color="#c2410c" map={gopuramTex ?? undefined} roughness={0.76} />
            </mesh>
            <mesh position={[-0.2, 5.75, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.7, 0.72, 2.5]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.68} />
            </mesh>
            {/* Saffron temple kalash pinnacles & marigold toran accent */}
            {[-0.8, 0, 0.8].map((kz, idx) => (
              <mesh key={idx} position={[-0.2, 6.45, kz]}>
                <coneGeometry args={[0.16, 0.72, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[-0.82, 3.2, 0]}>
              <boxGeometry args={[0.14, 0.2, 3.2]} />
              <meshStandardMaterial color="#fb923c" roughness={0.85} />
            </mesh>

            {/* Colorful Rising Main Temple Shikhara grounded cleanly onto stone jagati terrace */}
            <group position={[5.6, 0.02, 0]}>
              <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
                <boxGeometry args={[5.1, 0.44, 5.1]} />
                <meshStandardMaterial color="#877867" roughness={0.92} />
              </mesh>
              <mesh position={[0, 2.2, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[4.4, 4.4, 4.4]} />
                <meshStandardMaterial color="#fef3c7" map={gopuramTex ?? undefined} roughness={0.8} />
              </mesh>
              <mesh position={[0, 5.1, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[3.3, 1.5, 3.3]} />
                <meshStandardMaterial color="#d97706" map={gopuramTex ?? undefined} roughness={0.76} />
              </mesh>
              <mesh position={[0, 6.45, 0]} castShadow={shadowsEnabled}>
                <boxGeometry args={[2.2, 1.25, 2.2]} />
                <meshStandardMaterial color="#0284c7" map={gopuramTex ?? undefined} roughness={0.76} />
              </mesh>
              <mesh position={[0, 7.75, 0]}>
                <coneGeometry args={[1.1, 1.6, 8]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.45} roughness={0.35} />
              </mesh>
              <mesh position={[0, 8.85, 0]}>
                <cylinderGeometry args={[0.08, 0.16, 0.8, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
              </mesh>
            </group>

            <pointLight position={[-1.4, 2.8, 0]} intensity={1.4} color="#fbbf24" distance={11} />
          </group>
        </group>
      )}

      {/* Forested left hillside & outer right valley slope */}
      <mesh geometry={geometries.hillsideSlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.valleySlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>

      {/* Distant lower valley ground plane & faint river gorge shimmer */}
      <mesh position={[-20, -17.5, -220]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[720, 760]} />
        <meshStandardMaterial color="#3c5a45" roughness={1} />
      </mesh>
      <mesh position={[85, -17.2, -210]} rotation={[-Math.PI / 2, 0, -0.22]}>
        <planeGeometry args={[12, 460]} />
        <meshStandardMaterial color="#6793b0" roughness={0.4} metalness={0.12} />
      </mesh>

      {/* Valley-side steel guardrails segmented cleanly around pull-offs */}
      <mesh geometry={geometries.guardrail1}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometries.guardrail2}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometries.guardrail3}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Instanced dashed centerline markings */}
      <instancedMesh ref={dashMeshRef} args={[undefined, undefined, dashCount]}>
        <boxGeometry args={[0.14, 0.02, 2.3]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </instancedMesh>

      {/* Instanced guardrail posts */}
      <instancedMesh ref={postMeshRef} args={[undefined, undefined, 120]}>
        <boxGeometry args={[0.1, 0.74, 0.1]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </instancedMesh>

      {/* Instanced yellow kilometer stones along hillside edge */}
      <instancedMesh ref={milestoneMeshRef} args={[undefined, undefined, 24]}>
        <boxGeometry args={[0.26, 0.58, 0.18]} />
        <meshStandardMaterial color="#eab308" roughness={0.6} />
      </instancedMesh>

      {/* Instanced hillside shrubs */}
      <instancedMesh ref={shrubMeshRef} args={[undefined, undefined, MAX_ROADSIDE_SHRUBS]}>
        <dodecahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial roughness={0.92} flatShading />
      </instancedMesh>

      {/* Instanced rocky hillside cliff boulders */}
      <instancedMesh
        ref={rockMeshRef}
        args={[undefined, undefined, MAX_CLIFF_ROCKS]}
        castShadow={shadowsEnabled}
      >
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#646d7a" roughness={0.95} flatShading />
      </instancedMesh>

      {/* Instanced stylized pine trees */}
      <instancedMesh
        ref={trunkMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <cylinderGeometry args={[0.12, 0.18, 1.7, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={foliageLowerMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[1.15, 2.1, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={foliageUpperMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled}
      >
        <coneGeometry args={[0.85, 1.85, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>

      {/* 5 Visually distinct roadside vendor stalls, berm pedestrians & curve chevron posts */}
      <RoadsideRoadLife
        curve={curve}
        totalLength={totalLength}
        roadSegment={roadSegment}
        shadowsEnabled={shadowsEnabled}
        leadDistRef={leadDistRef}
        paused={paused}
        reducedMotion={reducedMotion}
      />

      {/* Smooth layered Himalayan mountain ridges framing distant horizons */}
      <DistantHimalayanRidges />
    </group>
  );
}
