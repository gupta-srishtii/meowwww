'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
import {
  getAsphaltRoadTexture,
  getGopuramDetailTexture,
  getOffroadDirtTrackTexture,
} from '@/lib/proceduralTextures';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import { DistantHimalayanRidges } from '@/components/canvas/environment/DistantHimalayanRidges';
import { RoadsideRoadLife } from '@/components/canvas/environment/RoadsideRoadLife';
import { RoadsideTapriAssembly } from '@/components/canvas/environment/RoadsideTapriAssembly';
import {
  createTerrainMeshSampler,
  sampleTerrainFootprint,
} from '@/lib/terrainMeshSampler';

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
  to_baalkuwari_stairs: [86, 184],
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

interface RoadStationSample {
  d: number;
  px: number;
  py: number;
  pz: number;
  rx: number;
  rz: number;
  tx: number;
  tz: number;
  apronOuter: number;
  stallAlcove: number;
}

interface ClosestRoadSample {
  projX: number;
  projY: number;
  projZ: number;
  rx: number;
  rz: number;
  d: number;
  apronOuter: number;
  stallAlcove: number;
  signedLateral: number;
  distSq: number;
}

function ridgedNoise2D(x: number, z: number): number {
  const n1 = 1 - Math.abs(Math.sin(x * 0.023 + z * 0.015));
  const n2 = 1 - Math.abs(Math.sin(x * 0.049 - z * 0.037 + 1.1));
  const n3 = Math.sin(x * 0.095 + z * 0.072) * Math.cos(z * 0.061 - x * 0.031);
  return (n1 - 0.52) * 5.8 + (n2 - 0.5) * 2.9 + n3 * 1.15;
}

function buildRoadStationTable(
  curve: THREE.CatmullRomCurve3,
  totalLength: number,
  segment: MountainRoadSegmentId,
  turnoutA: TurnoutRange,
  turnoutB: TurnoutRange,
  stopDist: number,
  count = 300
): RoadStationSample[] {
  const stations: RoadStationSample[] = [];
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  for (let i = 0; i <= count; i += 1) {
    const d = (i / count) * totalLength;
    sampleRoadFrame(curve, d, totalLength, pt, tan, right, up);
    const rLen = Math.hypot(right.x, right.z) || 1;
    const tLen = Math.hypot(tan.x, tan.z) || 1;
    stations.push({
      d,
      px: pt.x,
      py: pt.y,
      pz: pt.z,
      rx: right.x / rLen,
      rz: right.z / rLen,
      tx: tan.x / tLen,
      tz: tan.z / tLen,
      apronOuter: getApronOuterOffset(d, segment, turnoutA, turnoutB, stopDist),
      stallAlcove: getStallAlcoveBlend(d, segment),
    });
  }
  return stations;
}

function findClosestRoadSample(
  wx: number,
  wz: number,
  stations: readonly RoadStationSample[]
): ClosestRoadSample {
  let coarseBest = 0;
  let coarseMinDistSq = Infinity;
  const step = 4;
  for (let i = 0; i < stations.length; i += step) {
    const s = stations[i];
    const dx = wx - s.px;
    const dz = wz - s.pz;
    const dSq = dx * dx + dz * dz;
    if (dSq < coarseMinDistSq) {
      coarseMinDistSq = dSq;
      coarseBest = i;
    }
  }

  const startIdx = Math.max(0, coarseBest - 6);
  const endIdx = Math.min(stations.length - 2, coarseBest + 6);
  let bestDistSq = Infinity;
  let bestProjX = stations[coarseBest].px;
  let bestProjY = stations[coarseBest].py;
  let bestProjZ = stations[coarseBest].pz;
  let bestRx = stations[coarseBest].rx;
  let bestRz = stations[coarseBest].rz;
  let bestD = stations[coarseBest].d;
  let bestApron = stations[coarseBest].apronOuter;
  let bestAlcove = stations[coarseBest].stallAlcove;

  for (let i = startIdx; i <= endIdx; i += 1) {
    const a = stations[i];
    const b = stations[i + 1];
    const abx = b.px - a.px;
    const abz = b.pz - a.pz;
    const abLenSq = abx * abx + abz * abz || 1;
    const u = Math.max(0, Math.min(1, ((wx - a.px) * abx + (wz - a.pz) * abz) / abLenSq));
    const px = a.px + abx * u;
    const pz = a.pz + abz * u;
    const dx = wx - px;
    const dz = wz - pz;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestProjX = px;
      bestProjZ = pz;
      bestProjY = THREE.MathUtils.lerp(a.py, b.py, u);
      const rx = THREE.MathUtils.lerp(a.rx, b.rx, u);
      const rz = THREE.MathUtils.lerp(a.rz, b.rz, u);
      const rLen = Math.hypot(rx, rz) || 1;
      bestRx = rx / rLen;
      bestRz = rz / rLen;
      bestD = THREE.MathUtils.lerp(a.d, b.d, u);
      bestApron = THREE.MathUtils.lerp(a.apronOuter, b.apronOuter, u);
      bestAlcove = THREE.MathUtils.lerp(a.stallAlcove, b.stallAlcove, u);
    }
  }

  const signedLateral = (wx - bestProjX) * bestRx + (wz - bestProjZ) * bestRz;
  return {
    projX: bestProjX,
    projY: bestProjY,
    projZ: bestProjZ,
    rx: bestRx,
    rz: bestRz,
    d: bestD,
    apronOuter: bestApron,
    stallAlcove: bestAlcove,
    signedLateral,
    distSq: bestDistSq,
  };
}

function sampleHillsideHeightOffset(
  distOut: number,
  alcove: number,
  wx: number,
  wz: number,
  segment: MountainRoadSegmentId
): number {
  const stallShelfWidth = alcove * 2.2;
  const climbRaw = Math.max(0, distOut - stallShelfWidth);
  const climbRamp = smoothStep01(climbRaw / 1.7) * climbRaw;
  const toeY = alcove * smoothStep01(distOut / 1.8) * 0.24;

  const hillSlopeGain =
    segment === 'to_baalkuwari' || segment === 'to_baalkuwari_stairs' ? 0.66 : 0.56;
  const nearClimb = Math.pow(Math.min(climbRamp, 32) + 0.001, 0.87) * hillSlopeGain;
  const highRidgeGain = climbRaw > 32 ? Math.pow(climbRaw - 32, 0.72) * 0.34 : 0;
  const rockyNoise = ridgedNoise2D(wx, wz) * smoothStep01(climbRaw / 5.5) * 0.75;
  const cliffTerrace =
    Math.sin(climbRaw * 0.24 + (wx - wz) * 0.025) * 0.36 * smoothStep01(climbRaw / 3.8);
  return -0.04 + toeY + nearClimb + highRidgeGain + rockyNoise + cliffTerrace;
}

function getRiverChannelCenter(wz: number, curveBoundsMaxX: number): { centerX: number; waterY: number } {
  // Runs continuously along the deep east canyon cleanly separated from all road loops
  const centerX = curveBoundsMaxX + 70 + Math.sin(wz * 0.02) * 7.0 + Math.cos(wz * 0.008) * 4.0;
  const progressNorth = Math.max(0, -wz / 460);
  const waterY = -21.5 + progressNorth * 8.5;
  return { centerX, waterY };
}

function sampleWorldMountainElevation(
  wx: number,
  wz: number,
  nearest: ClosestRoadSample,
  segment: MountainRoadSegmentId,
  curveBoundsMaxX: number
): { y: number; color: THREE.Color; isValleyRiverBank: boolean } {
  const hillShoulder = -(ROAD_HALF_WIDTH + 1.3);
  const { centerX: riverX, waterY: riverY } = getRiverChannelCenter(wz, curveBoundsMaxX);

  const shoulderDirt = new THREE.Color('#7a6c59');
  const rockScree = new THREE.Color('#656b62');
  const graniteFace = new THREE.Color('#5a6066');
  const midTurf = new THREE.Color('#4c6b3a');
  const pineForest = new THREE.Color('#37552f');
  const sandyShingle = new THREE.Color('#978c78');
  const color = new THREE.Color();

  // Directly beneath asphalt, shoulders, and turnout aprons: stay recessed -0.24m
  if (nearest.signedLateral >= hillShoulder && nearest.signedLateral <= nearest.apronOuter) {
    color.copy(shoulderDirt);
    return { y: nearest.projY - 0.24, color, isValleyRiverBank: false };
  }

  // Hillside (+uphill mountain massif on -right side)
  if (nearest.signedLateral < hillShoulder) {
    const distOut = -(nearest.signedLateral - hillShoulder);
    const surfaceRelY = sampleHillsideHeightOffset(
      distOut,
      nearest.stallAlcove,
      wx,
      wz,
      segment
    );
    // Tuck smoothly beneath narrow spline batter for outer 0..3.8m so zero Z-fighting
    const tuckBlend = smoothStep01((distOut - 2.4) / 2.2);
    const y = nearest.projY + THREE.MathUtils.lerp(-0.26, surfaceRelY, tuckBlend);

    if (distOut < 4.5) {
      color.copy(shoulderDirt).lerp(rockScree, distOut / 4.5);
    } else if (distOut < 13.5) {
      const rockMix = 0.35 + Math.max(0, Math.sin(wx * 0.08 + wz * 0.06)) * 0.45;
      color.copy(rockScree).lerp(graniteFace, rockMix * 0.5).lerp(midTurf, (distOut - 4.5) / 9.0);
    } else {
      const highFrac = Math.min(1, (distOut - 13.5) / 28.0);
      color.copy(midTurf).lerp(pineForest, highFrac);
    }
    const shade = (Math.sin(wx * 0.11 + wz * 0.09) * 0.025 + Math.cos(wx * 0.04 - wz * 0.05) * 0.02);
    color.offsetHSL(0, 0, shade);
    return { y, color, isValleyRiverBank: false };
  }

  // Valley & river canyon (+right side, then rising into opposite Shivalik range)
  const dropDist = nearest.signedLateral - nearest.apronOuter;
  const bankBatter = smoothStep01(dropDist / 2.6) * 1.45;
  const valleyDrop = Math.pow(Math.min(dropDist, 66) / 66, 0.78) * 23.5;
  const rawWestSlopeY =
    nearest.projY -
    0.09 -
    bankBatter -
    valleyDrop +
    ridgedNoise2D(wx * 0.9, wz * 0.9) * smoothStep01(dropDist / 8.0) * 0.48;
  // Never plunge below riverbed floodbank height west of the canyon channel
  const baseValleyY = Math.max(riverY + 1.55, rawWestSlopeY);

  // Carved U-trough riverbed + sandy shingle floodbank + opposite Shivalik foothills
  const distFromRiver = wx - riverX;
  const absRiverDist = Math.abs(distFromRiver);
  let finalY = baseValleyY;
  let isValleyRiverBank = false;

  if (absRiverDist <= 16) {
    // Riverbed trench -1.65m inside water width (<= 7.2m), rising gently into +1.6m shingle bank
    const bankSlopeT = THREE.MathUtils.clamp((absRiverDist - 6.8) / 8.2, 0, 1);
    const channelTroughY = riverY - 1.65 + smoothStep01(bankSlopeT) * 3.25;
    const channelBlend = 1 - smoothStep01((absRiverDist - 9.5) / 6.5);
    if (distFromRiver <= 0) {
      finalY = THREE.MathUtils.lerp(baseValleyY, channelTroughY, channelBlend);
    } else {
      const eastClimbDist = Math.max(0, distFromRiver - 9.0);
      const eastHeight =
        riverY +
        1.6 +
        Math.pow(eastClimbDist, 0.88) * 0.45 +
        ridgedNoise2D(wx * 0.85, wz * 0.85) * smoothStep01(eastClimbDist / 12.0) * 1.1;
      const bankBlend = smoothStep01(eastClimbDist / 8.0);
      finalY = THREE.MathUtils.lerp(channelTroughY, eastHeight, bankBlend);
    }
    isValleyRiverBank = absRiverDist < 13.5;
  } else if (distFromRiver > 16) {
    const eastClimbDist = distFromRiver - 9.0;
    finalY =
      riverY +
      1.6 +
      Math.pow(eastClimbDist, 0.88) * 0.45 +
      ridgedNoise2D(wx * 0.85, wz * 0.85) * smoothStep01(eastClimbDist / 12.0) * 1.1;
  }

  // Tuck smoothly underneath narrow valley batter skirt for 0..3.6m outside apron
  const valleyTuck = smoothStep01((dropDist - 1.8) / 2.2);
  const y = THREE.MathUtils.lerp(nearest.projY - 0.28, finalY, valleyTuck);

  if (isValleyRiverBank) {
    const bankT = Math.min(1, Math.abs(distFromRiver) / 14);
    color.copy(sandyShingle).lerp(rockScree, bankT * 0.72);
  } else if (distFromRiver > 10) {
    const oppT = Math.min(1, (distFromRiver - 10) / 48);
    color.copy(rockScree).lerp(midTurf, Math.min(1, oppT * 1.6)).lerp(pineForest, oppT);
  } else if (dropDist < 7.5) {
    color.copy(shoulderDirt).lerp(rockScree, Math.min(1, dropDist / 4.2)).lerp(midTurf, dropDist / 7.5);
  } else {
    const deepT = Math.min(1, (dropDist - 7.5) / 36);
    color.copy(midTurf).lerp(pineForest, deepT);
  }
  const vShade = Math.sin(wx * 0.09 - wz * 0.07) * 0.025;
  color.offsetHSL(0, 0, vShade);
  return { y, color, isValleyRiverBank };
}

const ROAD_SEGMENTS = 320;
const HILLSIDE_BATTER_SAMPLES = 7;
const VALLEY_BATTER_SAMPLES = 7;
const MAX_PINE_TREES = 240;
const MAX_ROADSIDE_SHRUBS = 140;
const MAX_CLIFF_ROCKS = 96;

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

/**
 * Narrow spline-aligned cut/fill batters bridging the exact road shoulder edge into the
 * continuous fold-free world heightfield without ever reaching curve-folding radii.
 */
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

  const shoulderDirt = new THREE.Color('#7a6c59');
  const rockScree = new THREE.Color('#656b62');
  const midTurf = new THREE.Color('#4c6b3a');
  const tmpColor = new THREE.Color();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const distance = t * totalLength;
    sampleRoadFrame(curve, distance, totalLength, point, tangent, right, up);
    const apronEdge = getApronOuterOffset(distance, segment, turnoutA, turnoutB, stopDist);
    const alcove = getStallAlcoveBlend(distance, segment);

    for (let j = 0; j < cols; j += 1) {
      const s = j / (cols - 1);
      let lateral: number;
      let yOff: number;

      if (side === 'hill') {
        const reach = 7.4 + alcove * 1.4;
        const distOut = Math.pow(s, 1.1) * reach;
        lateral = -(ROAD_HALF_WIDTH + 1.3 + distOut);
        const worldSampleX = point.x + right.x * lateral;
        const worldSampleZ = point.z + right.z * lateral;
        const baseY = sampleHillsideHeightOffset(
          distOut,
          alcove,
          worldSampleX,
          worldSampleZ,
          segment
        );
        // Dip outer rim smoothly beneath worldMountainTerrain so seam never cracks or Z-fights
        const skirtSink = smoothStep01((distOut - 4.0) / 3.2) * 0.85;
        yOff = baseY - skirtSink;
        if (s < 0.45) {
          tmpColor.copy(shoulderDirt).lerp(rockScree, s / 0.45);
        } else {
          tmpColor.copy(rockScree).lerp(midTurf, (s - 0.45) / 0.55);
        }
      } else {
        const dropDist = Math.pow(s, 1.1) * 6.5;
        lateral = apronEdge + dropDist;
        const bankBatter = smoothStep01(dropDist / 2.6) * 1.45;
        const valleyDrop = Math.pow(Math.min(dropDist, 62) / 62, 0.78) * 20.5;
        const skirtSink = smoothStep01((dropDist - 3.6) / 2.8) * 0.9;
        yOff = -0.09 - bankBatter - valleyDrop - skirtSink;
        tmpColor.copy(shoulderDirt).lerp(rockScree, Math.min(1, s * 1.5)).lerp(midTurf, s);
      }

      const shadeJitter = Math.sin(distance * 0.22 + lateral * 0.31) * 0.022;
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

function buildWorldMountainTerrainGeometry(
  stations: readonly RoadStationSample[],
  segment: MountainRoadSegmentId
): {
  geometry: THREE.BufferGeometry;
  riverGeometry: THREE.BufferGeometry;
  curveBoundsMaxX: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < stations.length; i += 1) {
    const s = stations[i];
    if (s.px < minX) minX = s.px;
    if (s.px > maxX) maxX = s.px;
    if (s.pz < minZ) minZ = s.pz;
    if (s.pz > maxZ) maxZ = s.pz;
  }

  const worldMinX = minX - 130;
  const worldMaxX = maxX + 185;
  const worldMinZ = minZ - 140;
  const worldMaxZ = maxZ + 80;

  const cols = 148;
  const rows = 188;
  const vertexCount = (cols + 1) * (rows + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  for (let r = 0; r <= rows; r += 1) {
    const v = r / rows;
    const wz = THREE.MathUtils.lerp(worldMaxZ, worldMinZ, v);
    for (let c = 0; c <= cols; c += 1) {
      const u = c / cols;
      const wx = THREE.MathUtils.lerp(worldMinX, worldMaxX, u);
      const nearest = findClosestRoadSample(wx, wz, stations);
      const sample = sampleWorldMountainElevation(wx, wz, nearest, segment, maxX);

      const vIdx = r * (cols + 1) + c;
      positions[vIdx * 3] = wx;
      positions[vIdx * 3 + 1] = sample.y;
      positions[vIdx * 3 + 2] = wz;

      colors[vIdx * 3] = sample.color.r;
      colors[vIdx * 3 + 1] = sample.color.g;
      colors[vIdx * 3 + 2] = sample.color.b;

      uvs[vIdx * 2] = u;
      uvs[vIdx * 2 + 1] = v;

      if (r < rows && c < cols) {
        const a = vIdx;
        const b = vIdx + 1;
        const cIdx = (r + 1) * (cols + 1) + c;
        const d = (r + 1) * (cols + 1) + c + 1;
        // +Z -> -Z row progression: CCW upward normal (+Y) uses (a, cIdx, b) Wait: (a->cIdx = -Z), (a->b = +X). (-Z) x (+X) = -Y! So use (a, b, cIdx) -> (+X) x (-Z) = +Y!
        indices.push(a, b, cIdx, b, d, cIdx);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Continuous valley river ribbon nestled safely inside the carved canyon channel
  const riverSteps = 140;
  const rPositions = new Float32Array((riverSteps + 1) * 2 * 3);
  const rIndices: number[] = [];
  const halfWaterW = 7.2;
  for (let i = 0; i <= riverSteps; i += 1) {
    const t = i / riverSteps;
    const wz = THREE.MathUtils.lerp(worldMaxZ, worldMinZ, t);
    const { centerX, waterY } = getRiverChannelCenter(wz, maxX);
    const vBase = i * 2;
    rPositions[vBase * 3] = centerX - halfWaterW;
    rPositions[vBase * 3 + 1] = waterY;
    rPositions[vBase * 3 + 2] = wz;
    rPositions[(vBase + 1) * 3] = centerX + halfWaterW;
    rPositions[(vBase + 1) * 3 + 1] = waterY;
    rPositions[(vBase + 1) * 3 + 2] = wz;
    if (i < riverSteps) {
      rIndices.push(vBase, vBase + 1, vBase + 2, vBase + 1, vBase + 3, vBase + 2);
    }
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute('position', new THREE.BufferAttribute(rPositions, 3));
  riverGeometry.setIndex(rIndices);
  riverGeometry.computeVertexNormals();

  return { geometry, riverGeometry, curveBoundsMaxX: maxX };
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

  const isOffroad =
    roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs';
  const asphaltTex = useMemo(() => getAsphaltRoadTexture(), []);
  const offroadDirtTex = useMemo(() => getOffroadDirtTrackTexture(), []);
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

  const { scene } = useThree();
  const skyColorHex =
    roadSegment === 'to_dhaba'
      ? '#b8d8f0'
      : roadSegment === 'to_hotel_return'
        ? '#dca67a'
        : roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs'
          ? '#c9dfef'
          : '#c6def0';
  const fogColorHex =
    roadSegment === 'to_dhaba'
      ? '#b8d8f0'
      : roadSegment === 'to_hotel_return'
        ? '#cf9b7d'
        : roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs'
          ? '#d4e5f2'
          : '#cddff0';

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color(skyColorHex);
    scene.fog = new THREE.Fog(fogColorHex, 105, 365);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene, skyColorHex, fogColorHex]);

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

  const { roadStations, curveBoundsMaxX } = useMemo(() => {
    const stations = buildRoadStationTable(
      curve,
      totalLength,
      roadSegment,
      turnoutA,
      turnoutB,
      stopDist,
      300
    );
    let maxX = -Infinity;
    for (let i = 0; i < stations.length; i += 1) {
      if (stations[i].px > maxX) maxX = stations[i].px;
    }
    return { roadStations: stations, curveBoundsMaxX: maxX };
  }, [curve, totalLength, roadSegment, turnoutA, turnoutB, stopDist]);

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
      HILLSIDE_BATTER_SAMPLES,
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
      VALLEY_BATTER_SAMPLES,
      'valley',
      roadSegment,
      turnoutA,
      turnoutB,
      stopDist
    );

    const { geometry: worldTerrain, riverGeometry: valleyRiver } =
      buildWorldMountainTerrainGeometry(roadStations, roadSegment);

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
      worldTerrain,
      valleyRiver,
      guardrail1,
      guardrail2,
      guardrail3,
      viewpointApron,
      viewpointRetainingSkirt,
      mainTurnoutApron,
      mainTurnoutRetainingSkirt,
    };
  }, [curve, totalLength, roadSegment, stopDist, turnoutA, turnoutB, roadStations]);

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
          .addScaledVector(up, 0.28);
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
          .addScaledVector(up, 0.28);
        dummy.quaternion.setFromRotationMatrix(basis);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        milestoneMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      milestoneMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [curve, totalLength, dashCount, postPositions, milestoneDistances]);

  const terrainMeshSampler = useMemo(
    () =>
      createTerrainMeshSampler(
        [geometries.worldTerrain, geometries.hillsideSlope, geometries.valleySlope],
        4.0
      ),
    [geometries]
  );

  // Populate hillside & gorge pine trees, bushes, and rocks using cross-curve road clearance
  // and perimeter-footprint minimum elevation (`sampleTerrainFootprint`) so bases never hover on slopes.
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
    const foliageColor = new THREE.Color();
    const foliageUpperColor = new THREE.Color();
    const shrubColor = new THREE.Color();

    const isSafeWorldPlacement = (
      wx: number,
      wz: number,
      minHillClearance: number,
      minValleyClearance: number
    ): boolean => {
      const nearest = findClosestRoadSample(wx, wz, roadStations);
      const hillMin = ROAD_HALF_WIDTH + 1.3 + nearest.stallAlcove * 2.2 + minHillClearance;
      const valleyMin = nearest.apronOuter + minValleyClearance;
      if (nearest.signedLateral >= -hillMin && nearest.signedLateral <= valleyMin) {
        return false;
      }
      const { centerX: riverX } = getRiverChannelCenter(wz, curveBoundsMaxX);
      if (Math.abs(wx - riverX) < 10.5) {
        return false;
      }
      return true;
    };

    let placedTrees = 0;
    for (let attempt = 0; attempt < treeCount * 3 && placedTrees < treeCount; attempt += 1) {
      const d = 4 + rand() * (totalLength - 8);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);

      const inTurnoutB = d >= turnoutB.start - 4 && d <= turnoutB.end + 4;
      const inTurnoutA = d >= turnoutA.start - 3 && d <= turnoutA.end + 3;
      const isHillside = inTurnoutA || inTurnoutB ? rand() < 0.72 : rand() < 0.56;
      const alcove = getStallAlcoveBlend(d, roadSegment);

      let lateral: number;
      const scale = 0.8 + rand() * 0.78;
      if (isHillside) {
        const u = rand();
        const stallShelfClear = alcove * 2.8;
        lateral = -(ROAD_HALF_WIDTH + 2.4 + stallShelfClear + Math.pow(u, 0.82) * 38.0);
        lateral = Math.max(-62.0, lateral);
      } else {
        const u = rand();
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        const nearArrivalTemple =
          roadSegment === 'to_neelkanth' && Math.abs(d - stopDist) < 11.0;
        const valleyClear = nearArrivalTemple
          ? Math.max(apronEdge + 2.6, ROAD_HALF_WIDTH + 16.0)
          : apronEdge + 1.9;
        lateral = Math.min(54.0, valleyClear + Math.pow(u, 0.85) * 34.0);
      }

      const wx = point.x + right.x * lateral;
      const wz = point.z + right.z * lateral;
      if (!isSafeWorldPlacement(wx, wz, 1.35, 1.35)) continue;

      const footprint = sampleTerrainFootprint(terrainMeshSampler, wx, wz, 0.38 * scale);
      if (!footprint) continue;

      const yaw = rand() * Math.PI * 2;
      // Anchor trunk relative to minimum perimeter ground height so uphill/downhill trunk bases bury naturally
      const rootY = footprint.minY - 0.14 * scale;

      dummy.position.set(wx, rootY + 0.85 * scale, wz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(placedTrees, dummy.matrix);

      dummy.position.set(wx, rootY + 2.15 * scale, wz);
      dummy.updateMatrix();
      foliageLowerMeshRef.current.setMatrixAt(placedTrees, dummy.matrix);

      dummy.position.set(wx, rootY + 3.25 * scale, wz);
      dummy.updateMatrix();
      foliageUpperMeshRef.current.setMatrixAt(placedTrees, dummy.matrix);

      foliageColor.setHSL(0.32 + (rand() - 0.5) * 0.05, 0.4, 0.23 + rand() * 0.09);
      foliageUpperColor.copy(foliageColor).offsetHSL(0, 0, 0.05);
      foliageLowerMeshRef.current.setColorAt(placedTrees, foliageColor);
      foliageUpperMeshRef.current.setColorAt(placedTrees, foliageUpperColor);
      placedTrees += 1;
    }
    trunkMeshRef.current.count = placedTrees;
    foliageLowerMeshRef.current.count = placedTrees;
    foliageUpperMeshRef.current.count = placedTrees;

    let placedShrubs = 0;
    for (let attempt = 0; attempt < shrubCount * 3 && placedShrubs < shrubCount; attempt += 1) {
      const d = 6 + rand() * (totalLength - 12);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
      const alcove = getStallAlcoveBlend(d, roadSegment);
      const placeOnHillside = rand() < 0.7;
      const scale = 0.55 + rand() * 0.65;
      let lateral: number;

      if (placeOnHillside) {
        lateral = -(ROAD_HALF_WIDTH + 1.85 + alcove * 2.4 + rand() * 14.0);
      } else {
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        lateral = Math.min(48.0, apronEdge + 1.15 + rand() * 12.0);
      }

      const wx = point.x + right.x * lateral;
      const wz = point.z + right.z * lateral;
      if (!isSafeWorldPlacement(wx, wz, 0.85, 0.85)) continue;

      const footprint = sampleTerrainFootprint(terrainMeshSampler, wx, wz, 0.58 * scale);
      if (!footprint) continue;

      // Dodecahedron radius 0.65 * 0.85 = 0.55 * scale; placing center at minY + 0.14 * scale
      // guarantees 0.41 * scale embeds below the LOWEST edge of the slope footprint.
      dummy.position.set(wx, footprint.minY + 0.14 * scale, wz);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(scale * 1.25, scale * 0.85, scale * 1.15);
      dummy.updateMatrix();
      shrubMeshRef.current.setMatrixAt(placedShrubs, dummy.matrix);

      shrubColor.setHSL(0.28 + (rand() - 0.5) * 0.06, 0.44, 0.26 + rand() * 0.1);
      shrubMeshRef.current.setColorAt(placedShrubs, shrubColor);
      placedShrubs += 1;
    }
    shrubMeshRef.current.count = placedShrubs;

    let placedRocks = 0;
    for (let attempt = 0; attempt < rockCount * 3 && placedRocks < rockCount; attempt += 1) {
      const d = 10 + rand() * (totalLength - 22);
      sampleRoadFrame(curve, d, totalLength, point, tangent, right, up);
      const alcove = getStallAlcoveBlend(d, roadSegment);
      const inTurnoutB = d >= turnoutB.start - 4 && d <= turnoutB.end + 4;
      const onOffroadEdge = isOffroad && !inTurnoutB && attempt % 2 === 0;
      const placeOnHillside = rand() < 0.72;
      const scaleX = onOffroadEdge ? 0.45 + rand() * 0.55 : 0.78 + rand() * 1.18;
      const scaleY = onOffroadEdge ? 0.3 + rand() * 0.35 : 0.56 + rand() * 0.92;
      let lateral: number;

      if (onOffroadEdge) {
        if (placeOnHillside) {
          lateral = -(ROAD_HALF_WIDTH + 0.4 + alcove * 2.1 + rand() * 1.6);
        } else {
          const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
          lateral = Math.min(apronEdge + 1.4, ROAD_HALF_WIDTH + 0.45 + rand() * 1.3);
        }
      } else if (placeOnHillside) {
        lateral = -(ROAD_HALF_WIDTH + 1.7 + alcove * 2.6 + rand() * 9.0);
      } else {
        const apronEdge = getApronOuterOffset(d, roadSegment, turnoutA, turnoutB, stopDist);
        lateral = Math.min(46.0, apronEdge + 1.0 + rand() * 8.5);
      }

      const wx = point.x + right.x * lateral;
      const wz = point.z + right.z * lateral;
      if (!onOffroadEdge && !isSafeWorldPlacement(wx, wz, 0.7, 0.7)) continue;

      const footprint = sampleTerrainFootprint(terrainMeshSampler, wx, wz, 0.65 * scaleX);
      if (!footprint) continue;

      dummy.position.set(wx, footprint.minY + scaleY * 0.1, wz);
      dummy.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5);
      dummy.scale.set(scaleX, scaleY, scaleX * 0.9);
      dummy.updateMatrix();
      rockMeshRef.current.setMatrixAt(placedRocks, dummy.matrix);
      placedRocks += 1;
    }
    rockMeshRef.current.count = placedRocks;

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
  }, [
    curve,
    totalLength,
    terrainMeshSampler,
    roadStations,
    curveBoundsMaxX,
    treeCount,
    shrubCount,
    rockCount,
    roadSegment,
    isOffroad,
    stopDist,
    turnoutA,
    turnoutB,
  ]);

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
    <>
      <color attach="background" args={[skyColorHex]} />
      <fog attach="fog" args={[fogColorHex, 105, 365]} />
      <group>

      <hemisphereLight
        args={[
          roadSegment === 'to_dhaba'
            ? '#e0f2fe'
            : roadSegment === 'to_hotel_return'
              ? '#ffd6aa'
              : '#fff3e0',
          roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs'
            ? '#4d6048'
            : '#686b57',
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
              : roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs'
                ? '#ffe6bf'
                : '#ffeacc'
        }
        castShadow={shadowsEnabled}
        shadow-mapSize-width={qualityProfile === 'high' ? 1024 : 512}
        shadow-mapSize-height={qualityProfile === 'high' ? 1024 : 512}
        shadow-camera-near={15}
        shadow-camera-far={340}
        shadow-camera-left={-135}
        shadow-camera-right={135}
        shadow-camera-top={135}
        shadow-camera-bottom={-135}
        shadow-bias={-0.0005}
      />

      {/* Main continuous track: rocky mountain dirt track on `to_baalkuwari`, weathered mountain asphalt elsewhere */}
      <mesh geometry={geometries.asphalt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial
          color={isOffroad ? '#9f8365' : '#6c7785'}
          map={(isOffroad ? offroadDirtTex : asphaltTex) ?? undefined}
          roughness={isOffroad ? 0.98 : 0.88}
          metalness={isOffroad ? 0.01 : 0.04}
        />
      </mesh>
      {!isOffroad && (
        <>
          <mesh geometry={geometries.leftEdgeStripe}>
            <meshStandardMaterial color="#e2e8f0" roughness={0.78} />
          </mesh>
          <mesh geometry={geometries.rightEdgeStripe}>
            <meshStandardMaterial color="#e2e8f0" roughness={0.78} />
          </mesh>
        </>
      )}

      {/* Road shoulders */}
      <mesh geometry={geometries.leftShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color={isOffroad ? '#6d5c48' : '#8d8374'} roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.rightShoulder} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color={isOffroad ? '#6d5c48' : '#8d8374'} roughness={0.95} />
      </mesh>

      {/* Widened roadside pull-off aprons & stone embankment retaining walls */}
      <mesh geometry={geometries.viewpointApron} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color={isOffroad ? '#6c5a46' : '#7b7163'} roughness={0.94} />
      </mesh>
      <mesh geometry={geometries.viewpointRetainingSkirt} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color="#5d5447" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometries.mainTurnoutApron} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial color={isOffroad ? '#766149' : '#585f6b'} roughness={0.94} />
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
          {/* Separate Roadside Forest Maggi Clearing Pull-Off (No Temple Staircase Attached Here) */}
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
          {/* Natural mountain clearing stone embankment & rustic trail signpost */}
          <group position={[3.2, 0, -4.4]}>
            <mesh position={[0, -1.6, 0]} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[5.8, 3.2, 4.8]} />
              <meshStandardMaterial color="#584f3f" roughness={0.96} />
            </mesh>
            <mesh position={[-1.1, 0.25, 0.4]} rotation={[0.2, 0.5, 0]} castShadow={shadowsEnabled}>
              <dodecahedronGeometry args={[0.75, 0]} />
              <meshStandardMaterial color="#68707c" roughness={0.95} flatShading />
            </mesh>
            <mesh position={[0.4, 0.95, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.07, 0.08, 1.9, 6]} />
              <meshStandardMaterial color="#5c4033" roughness={0.92} />
            </mesh>
            <mesh position={[0.4, 1.65, 0]} rotation={[0, 0.25, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.35, 0.28, 0.08]} />
              <meshStandardMaterial color="#8c5e42" roughness={0.86} />
            </mesh>
          </group>
        </group>
      ) : roadSegment === 'to_baalkuwari_stairs' ? (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          {/* Baal Kuwari Staircase Entrance Plaza, Torana Archway & Ascending Hillside Steps */}
          <mesh position={[2.8, -4.5, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[10.4, 9.0, 12.6]} />
            <meshStandardMaterial color="#675d4f" roughness={0.96} />
          </mesh>
          <mesh position={[1.3, -0.04, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[6.4, 0.14, 11.4]} />
            <meshStandardMaterial color="#9c8d77" roughness={0.94} />
          </mesh>
          {/* Stone staircase entrance archway pillars & lintel */}
          <group position={[3.2, 0, 0]}>
            {[-1.55, 1.55].map((pz, idx) => (
              <mesh key={idx} position={[0, 1.5, pz]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
                <boxGeometry args={[0.46, 3.0, 0.46]} />
                <meshStandardMaterial color="#b09f84" roughness={0.88} />
              </mesh>
            ))}
            <mesh position={[0, 3.12, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[0.58, 0.44, 3.9]} />
              <meshStandardMaterial color="#9a3412" roughness={0.82} />
            </mesh>
            <mesh position={[-0.31, 3.12, 0]}>
              <boxGeometry args={[0.06, 0.28, 2.25]} />
              <meshStandardMaterial color="#fef3c7" roughness={0.75} />
            </mesh>
            {/* Hanging temple bell under arch */}
            <mesh position={[0, 2.66, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.34, 6]} />
              <meshStandardMaterial color="#78350f" roughness={0.7} />
            </mesh>
            <mesh position={[0, 2.42, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.08, 0.16, 0.22, 12]} />
              <meshStandardMaterial color="#d97706" metalness={0.72} roughness={0.28} />
            </mesh>
            {/* Ascending stone stairs disappearing upward into the mountain pine slope */}
            {[0, 1, 2, 3, 4, 5, 6].map((stepIdx) => (
              <mesh
                key={stepIdx}
                position={[0.75 + stepIdx * 0.62, 0.18 + stepIdx * 0.28, 0]}
                castShadow={shadowsEnabled}
                receiveShadow={shadowsEnabled}
              >
                <boxGeometry args={[0.68, 0.28, 2.75]} />
                <meshStandardMaterial color={stepIdx % 2 === 0 ? '#a89b86' : '#968976'} roughness={0.94} />
              </mesh>
            ))}
          </group>
        </group>
      ) : roadSegment === 'to_hotel_return' ? (
        <group position={landmarks.stallCenter} quaternion={landmarks.stopQuat}>
          {/* Rishikesh Main-Road Corner Shops Turning Into Narrow Residential Guesthouse Lane */}
          <mesh position={[2.8, -4.5, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[10.4, 9.0, 13.8]} />
            <meshStandardMaterial color="#74695a" roughness={0.95} />
          </mesh>
          <mesh position={[1.4, -0.04, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[7.2, 0.14, 13.0]} />
            <meshStandardMaterial color="#949aa3" roughness={0.9} />
          </mesh>
          {/* Main-road shuttered local shop on south side of lane turn */}
          <group position={[3.4, 0, 3.7]}>
            <mesh position={[0, 1.85, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[3.8, 3.7, 4.4]} />
              <meshStandardMaterial color="#e5dccb" roughness={0.88} />
            </mesh>
            <mesh position={[-1.92, 1.35, 0]}>
              <boxGeometry args={[0.08, 2.2, 2.6]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.65} metalness={0.3} />
            </mesh>
            <mesh position={[-2.15, 2.75, 0]} rotation={[0, 0, 0.22]}>
              <boxGeometry args={[0.85, 0.08, 3.2]} />
              <meshStandardMaterial color="#9a3412" roughness={0.8} />
            </mesh>
          </group>
          {/* Modest painted brick residential building flanking north side of narrow interior lane */}
          <group position={[3.6, 0, -3.9]}>
            <mesh position={[0, 2.4, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
              <boxGeometry args={[4.2, 4.8, 4.8]} />
              <meshStandardMaterial color="#eedfc8" roughness={0.86} />
            </mesh>
            <mesh position={[0, 4.92, 0]}>
              <boxGeometry args={[4.5, 0.28, 5.1]} />
              <meshStandardMaterial color="#b45309" roughness={0.82} />
            </mesh>
          </group>
          {/* Lane opening stone strip & warm warm dusk bulb */}
          <mesh position={[3.2, 0.03, -0.2]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[5.4, 0.06, 2.9]} />
            <meshStandardMaterial color="#8c8f96" roughness={0.92} />
          </mesh>
          <pointLight position={[-1.2, 2.6, -0.2]} intensity={1.7} color="#fbbf24" distance={11} />
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

      {/* Continuous fold-free Shivalik world mountain terrain + narrow road-edge batters */}
      <mesh geometry={geometries.worldTerrain} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.hillsideSlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <mesh geometry={geometries.valleySlope} receiveShadow={shadowsEnabled}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>

      {/* Continuous winding gorge river channel nestled cleanly along sandy valley floor */}
      <mesh geometry={geometries.valleyRiver}>
        <meshStandardMaterial color="#4e85a1" roughness={0.28} metalness={0.14} />
      </mesh>

      {/* Valley-side steel guardrails & painted dashes segmented cleanly around pull-offs (paved roads only) */}
      {!isOffroad && (
        <>
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

          {/* Instanced yellow kilometer stones along hillside edge */}
          <instancedMesh ref={milestoneMeshRef} args={[undefined, undefined, 24]}>
            <boxGeometry args={[0.26, 0.58, 0.18]} />
            <meshStandardMaterial color="#eab308" roughness={0.6} />
          </instancedMesh>
        </>
      )}

      {/* Instanced shoulder marker posts (anchored deeply into bevel shoulder) */}
      <instancedMesh ref={postMeshRef} args={[undefined, undefined, 120]}>
        <boxGeometry args={isOffroad ? [0.14, 0.78, 0.14] : [0.11, 0.88, 0.11]} />
        <meshStandardMaterial color={isOffroad ? '#6b4e38' : '#64748b'} roughness={isOffroad ? 0.92 : 0.65} />
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
      >
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#646d7a" roughness={0.95} flatShading />
      </instancedMesh>

      {/* Instanced stylized pine trees (deeper trunk anchor prevents slope gaps) */}
      <instancedMesh
        ref={trunkMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
      >
        <cylinderGeometry args={[0.12, 0.19, 2.2, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={foliageLowerMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled && qualityProfile === 'high'}
      >
        <coneGeometry args={[1.15, 2.1, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={foliageUpperMeshRef}
        args={[undefined, undefined, MAX_PINE_TREES]}
        castShadow={shadowsEnabled && qualityProfile === 'high'}
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
    </>
  );
}
