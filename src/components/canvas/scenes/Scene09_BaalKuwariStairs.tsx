'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CompanionGroup,
  type CompanionRigMap,
  type FriendCompanionId,
} from '@/components/canvas/characters/CompanionGroup';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import {
  animateCharacterRig,
  animateIshaanWalkRig,
  type CharacterIdlePose,
  type ConnectedHandTarget,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  BAAL_KUWARI_TOTAL_STEPS,
  BaalKuwariStairsEnvironment,
  STAIR_MAX_S,
  STAIR_MIN_S,
  STAIR_SEGMENTS,
  computeStepCountFromS,
  isOnStairFlightAtS,
  sampleStairTransformAtS,
} from '@/components/canvas/environment/BaalKuwariStairsEnvironment';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface StairTelemetryRefs {
  stepCountEl: RefObject<HTMLSpanElement | null>;
  barFillEl: RefObject<HTMLDivElement | null>;
  phaseLabelEl: RefObject<HTMLParagraphElement | null>;
  flightEl: RefObject<HTMLSpanElement | null>;
}

export interface Scene09BaalKuwariStairsProps {
  direction: 'ascent' | 'descent';
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  stairTelemetryRefs?: StairTelemetryRefs;
  onReachHalfwayMilestone: () => void;
  onAscentComplete: () => void;
  onDescentComplete: () => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const ASCENT_DURATION_SEC = 21.5;
const ASCENT_REDUCED_SEC = 3.2;
const DESCENT_DURATION_SEC = 11.4;
const DESCENT_REDUCED_SEC = 2.2;

// Derive exact stair landmarks from STAIR_SEGMENTS
const SEG_FLIGHT_1 = STAIR_SEGMENTS[1];
const SEG_LANDING_2 = STAIR_SEGMENTS[4];
const SEG_FLIGHT_3 = STAIR_SEGMENTS[5];
const SEG_SUMMIT = STAIR_SEGMENTS[8];

const HAND_HELP_1_START_S = THREE.MathUtils.lerp(SEG_FLIGHT_1.sStart, SEG_FLIGHT_1.sEnd, 0.34);
const HAND_HELP_1_END_S = THREE.MathUtils.lerp(SEG_FLIGHT_1.sStart, SEG_FLIGHT_1.sEnd, 0.68);
const HALFWAY_S = (SEG_LANDING_2.sStart + SEG_LANDING_2.sEnd) * 0.5;
const HAND_HELP_2_START_S = THREE.MathUtils.lerp(SEG_FLIGHT_3.sStart, SEG_FLIGHT_3.sEnd, 0.32);
const HAND_HELP_2_END_S = THREE.MathUtils.lerp(SEG_FLIGHT_3.sStart, SEG_FLIGHT_3.sEnd, 0.72);
const SUMMIT_S = SEG_SUMMIT.sStart + 2.2;

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function wrapAngleDiff(target: number, current: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Evaluates piecewise-linear progress along `s` over `(t, s)` keyframes for smooth climbing & landing pauses.
 */
function sampleStairSFromKeyframes(
  timeSec: number,
  frames: readonly { t: number; s: number }[]
): { s: number; speedMps: number } {
  if (timeSec <= frames[0].t) {
    return { s: frames[0].s, speedMps: 0 };
  }
  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i];
    const b = frames[i + 1];
    if (timeSec <= b.t) {
      const dt = Math.max(0.001, b.t - a.t);
      const u = (timeSec - a.t) / dt;
      return {
        s: THREE.MathUtils.lerp(a.s, b.s, u),
        speedMps: (b.s - a.s) / dt,
      };
    }
  }
  return { s: frames[frames.length - 1].s, speedMps: 0 };
}

const ASCENT_SRISHTI_KEYFRAMES: readonly { t: number; s: number }[] = [
  { t: 0.0, s: -0.9 },
  { t: 2.0, s: HAND_HELP_1_START_S }, // Approach steep Flight 1
  { t: 2.6, s: HAND_HELP_1_START_S + 0.15 }, // Pause slightly as Ishaan reaches hand down
  { t: 5.2, s: HAND_HELP_1_END_S }, // Climb steadily hand-in-hand (Help #1)
  { t: 7.4, s: SEG_FLIGHT_1.sEnd + 2.2 }, // Reach Landing 100
  { t: 9.8, s: HALFWAY_S }, // Reach Landing 200 (Valley Overlook)
  { t: 10.6, s: HALFWAY_S + 0.25 }, // Brief breath-catcher overlooking pines
  { t: 11.7, s: HAND_HELP_2_START_S }, // Start steep Flight 3 rocky pitch
  { t: 12.2, s: HAND_HELP_2_START_S + 0.15 }, // Pause as Ishaan extends hand (Help #2)
  { t: 15.0, s: HAND_HELP_2_END_S }, // Climb Flight 3 connected hand-in-hand
  { t: 17.5, s: SEG_FLIGHT_3.sEnd + 2.8 }, // Crest Landing 300
  { t: 20.6, s: SUMMIT_S }, // Reach Baal Kuwari Summit Gate (Step 400)
  { t: ASCENT_DURATION_SEC, s: SUMMIT_S },
];

const DESCENT_BASE_KEYFRAMES: readonly { t: number; s: number }[] = [
  { t: 0.0, s: SUMMIT_S - 0.6 },
  { t: 1.8, s: STAIR_SEGMENTS[7].sStart + 1.5 }, // Light downhill jog Flight 4
  { t: 2.4, s: STAIR_SEGMENTS[6].sStart + 0.8 }, // Slow smoothly around Landing 300
  { t: 4.6, s: STAIR_SEGMENTS[5].sStart + 1.2 }, // Playful trot down Flight 3
  { t: 5.3, s: STAIR_SEGMENTS[4].sStart + 0.8 }, // Brief curve + laugh at Landing 200
  { t: 7.6, s: STAIR_SEGMENTS[3].sStart + 1.2 }, // Jog smoothly down Flight 2
  { t: 8.3, s: STAIR_SEGMENTS[2].sStart + 0.8 }, // Turn at Landing 100
  { t: 10.6, s: 0.2 }, // Jog cheerfully down Flight 1
  { t: DESCENT_DURATION_SEC, s: -1.1 }, // Bottom stone landing
];

/**
 * Computes exact 3D hand-clasp point `M` sitting equidistant from Ishaan's left shoulder
 * (`reach ≈ 0.38m`) and Srishti's right shoulder (`reach ≈ 0.365m`), preventing any gap or clipping.
 */
function computeExactHandClaspPoint(
  ishaanShoulder: THREE.Vector3,
  srishtiShoulder: THREE.Vector3,
  outClasp: THREE.Vector3
): void {
  const dx = ishaanShoulder.x - srishtiShoulder.x;
  const dy = ishaanShoulder.y - srishtiShoulder.y;
  const dz = ishaanShoulder.z - srishtiShoulder.z;
  const dist = Math.hypot(dx, dy, dz);
  const cx = (ishaanShoulder.x + srishtiShoulder.x) * 0.5;
  const cy = (ishaanShoulder.y + srishtiShoulder.y) * 0.5;
  const cz = (ishaanShoulder.z + srishtiShoulder.z) * 0.5;

  if (dist < 0.02) {
    outClasp.set(cx, cy - 0.28, cz);
    return;
  }

  const ex = dx / dist;
  const ey = dy / dist;
  const ez = dz / dist;

  // Orthogonalize world down (0, -1, 0) against shoulder axis `e` so hands hang naturally
  const dotDownE = -ey;
  let px = -dotDownE * ex;
  let py = -1 - dotDownE * ey;
  let pz = -dotDownE * ez;
  const pLen = Math.hypot(px, py, pz);
  if (pLen > 1e-4) {
    px /= pLen;
    py /= pLen;
    pz /= pLen;
  } else {
    px = 0;
    py = -1;
    pz = 0;
  }

  const reachRadius = 0.375;
  const halfSep = Math.min(reachRadius - 0.04, dist * 0.5);
  const drop = Math.sqrt(Math.max(0.02, reachRadius * reachRadius - halfSep * halfSep));

  outClasp.set(cx + px * drop, cy + py * drop, cz + pz * drop);
}

/**
 * Scene 9 — Automatic Baal Kuwari Staircase Climb & Descent Cinematics.
 * Replaces manual controls with deterministic third-person choreography around Ishaan,
 * Srishti, Manish, and Yash — featuring exactly two hand-connected assists during Ascent
 * and joyful downhill jogging after temple darshan.
 */
export function Scene09_BaalKuwariStairs({
  direction,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  stairTelemetryRefs,
  onReachHalfwayMilestone,
  onAscentComplete,
  onDescentComplete,
  onSceneReady,
}: Scene09BaalKuwariStairsProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari stairs scene.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const initialCompPositions = useMemo<Record<FriendCompanionId, { x: number; y: number; z: number; yaw: number }>>(
    () => {
      const startS = direction === 'ascent' ? -1.4 : SUMMIT_S - 1.2;
      const pt = sampleStairTransformAtS(startS);
      const faceYaw = direction === 'ascent' ? pt.yaw : pt.yaw + Math.PI;
      return {
        srishti: { x: pt.x - pt.rx * 0.24, y: pt.y, z: pt.z - pt.rz * 0.24, yaw: faceYaw },
        friend_black_tee: { x: pt.x + pt.rx * 0.56, y: pt.y, z: pt.z + pt.rz * 0.56, yaw: faceYaw },
        friend_plaid: { x: pt.x - pt.rx * 0.52, y: pt.y, z: pt.z - pt.rz * 0.52, yaw: faceYaw },
      };
    },
    [direction]
  );

  // Playable avatar refs — ALWAYS third-person Ishaan
  const playerGroupRef = useRef<THREE.Group>(null);
  const playerTorsoRef = useRef<THREE.Group>(null);
  const playerHeadRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);

  const companionRigsRef = useRef<CompanionRigMap | null>(null);

  const simRef = useRef({
    elapsedSec: 0,
    ishaanYaw: 0,
    ishaanPhase: 0,
    srishtiYaw: 0,
    srishtiPhase: 0,
    manishYaw: 0,
    manishPhase: 0,
    yashYaw: 0,
    yashPhase: 0,
    halfwayNotified: false,
    completedNotified: false,
    lastDomStep: -999,
    lastDomPhase: '',
    cameraInitialized: false,
  });

  const scratch = useMemo(
    () => ({
      ishaanShoulder: new THREE.Vector3(),
      srishtiShoulder: new THREE.Vector3(),
      claspWorld: new THREE.Vector3(),
      ishaanHandTarget: {
        arm: 'left' as const,
        worldPoint: new THREE.Vector3(),
        weight: 0,
        shoulderOffsetX: 0.205,
        shoulderHeightY: 1.26,
      } satisfies ConnectedHandTarget,
      srishtiHandTarget: {
        arm: 'right' as const,
        worldPoint: new THREE.Vector3(),
        weight: 0,
        shoulderOffsetX: 0.152,
        shoulderHeightY: 1.135,
      } satisfies ConnectedHandTarget,
      desiredCamPos: new THREE.Vector3(),
      desiredLookAt: new THREE.Vector3(),
      smoothedLookAt: new THREE.Vector3(),
    }),
    []
  );

  const handleRigsReady = useCallback((rigs: CompanionRigMap) => {
    companionRigsRef.current = rigs;
  }, []);

  useEffect(() => {
    simRef.current.elapsedSec = 0;
    simRef.current.halfwayNotified = direction === 'descent';
    simRef.current.completedNotified = false;
    simRef.current.lastDomStep = -999;
    simRef.current.lastDomPhase = '';
    simRef.current.cameraInitialized = false;
  }, [direction, transitionToken]);

  useEffect(() => {
    onSceneReady(transitionToken, 9);
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) clock.getDelta();
  }, [paused, clock]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 58 : 50;
      if (Math.abs(camera.fov - nextFov) > 0.1) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, size.width, size.height]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const globalClock = state.clock.elapsedTime;
    sim.elapsedSec += delta;

    const totalDuration =
      direction === 'ascent'
        ? reducedMotion
          ? ASCENT_REDUCED_SEC
          : ASCENT_DURATION_SEC
        : reducedMotion
          ? DESCENT_REDUCED_SEC
          : DESCENT_DURATION_SEC;

    const fullTimelineDur = direction === 'ascent' ? ASCENT_DURATION_SEC : DESCENT_DURATION_SEC;
    const mappedTime = THREE.MathUtils.clamp(
      (sim.elapsedSec / totalDuration) * fullTimelineDur,
      0,
      fullTimelineDur
    );

    let ishaanPos = { x: 0, y: 0, z: 0 };
    let ishaanTargetYaw = 0;
    let ishaanSpeed = 0;
    let ishaanDownhillJog = false;
    let ishaanClimbing = false;
    let ishaanPose: CharacterIdlePose = 'default';

    let srishtiPos = { x: -0.24, y: 0, z: 0.4 };
    let srishtiTargetYaw = 0;
    let srishtiSpeed = 0;
    let srishtiDownhillJog = false;
    let srishtiClimbing = false;
    let srishtiPose: CharacterIdlePose = 'default';

    let manishS = 0;
    let yashS = 0;
    let manishLat = 0.56;
    let yashLat = -0.56;
    let activeHandWeight = 0;
    let phaseLabel = '';
    let ishaanCurrentS = 0;
    let camYawShift = 0.34;
    let camDist = 5.4;
    let camHeightOffset = 2.05;

    if (direction === 'ascent') {
      const srSample = sampleStairSFromKeyframes(mappedTime, ASCENT_SRISHTI_KEYFRAMES);
      const srishtiS = THREE.MathUtils.clamp(srSample.s, STAIR_MIN_S, STAIR_MAX_S);
      srishtiSpeed = Math.abs(srSample.speedMps);

      // Compute exact Hand-Help #1 (Flight 1) and Hand-Help #2 (Flight 3) blend weights
      const help1Weight =
        smoothStep01((mappedTime - 1.9) / 0.55) * (1 - smoothStep01((mappedTime - 5.15) / 0.65));
      const help2Weight =
        smoothStep01((mappedTime - 11.6) / 0.55) * (1 - smoothStep01((mappedTime - 14.95) / 0.65));
      activeHandWeight = Math.max(help1Weight, help2Weight);

      // Keep Ishaan ahead of Srishti (`+0.36m` along flight during clasp so shoulders align, `+0.72m` normally)
      const ishaanLead = THREE.MathUtils.lerp(0.68, 0.36, activeHandWeight);
      ishaanCurrentS = THREE.MathUtils.clamp(srishtiS + ishaanLead, STAIR_MIN_S, STAIR_MAX_S);
      ishaanSpeed =
        activeHandWeight > 0.05 && mappedTime < 2.6
          ? 0.25
          : activeHandWeight > 0.05 && mappedTime > 11.6 && mappedTime < 12.2
            ? 0.25
            : srishtiSpeed;

      const ptS = sampleStairTransformAtS(srishtiS);
      const ptI = sampleStairTransformAtS(ishaanCurrentS);

      const srishtiLat = THREE.MathUtils.lerp(-0.42, -0.22, activeHandWeight);
      const ishaanLat = THREE.MathUtils.lerp(0.32, 0.21, activeHandWeight);

      srishtiPos = {
        x: ptS.x + ptS.rx * srishtiLat,
        y: ptS.y,
        z: ptS.z + ptS.rz * srishtiLat,
      };
      ishaanPos = {
        x: ptI.x + ptI.rx * ishaanLat,
        y: ptI.y,
        z: ptI.z + ptI.rz * ishaanLat,
      };

      // Turn Ishaan subtly back-left toward Srishti during each hand assist; turn Srishti subtly toward Ishaan
      ishaanTargetYaw =
        activeHandWeight > 0.02
          ? ptI.yaw + 0.96 * activeHandWeight
          : ptI.yaw + Math.sin(mappedTime * 0.9) * 0.14;
      srishtiTargetYaw = ptS.yaw - 0.34 * activeHandWeight;

      ishaanClimbing = isOnStairFlightAtS(ishaanCurrentS) && ishaanSpeed > 0.3;
      srishtiClimbing = isOnStairFlightAtS(srishtiS) && srishtiSpeed > 0.3;

      if (mappedTime >= 9.8 && mappedTime <= 10.65) {
        ishaanPose = 'chat_nod';
        srishtiPose = 'chat_nod';
      } else if (mappedTime >= 20.6) {
        ishaanPose = 'chat_nod';
        srishtiPose = 'chat_nod';
      }

      // Manish & Yash climb happily trailing behind the pair
      manishS = THREE.MathUtils.clamp(srishtiS - 1.35 + Math.sin(mappedTime * 0.7) * 0.15, STAIR_MIN_S, STAIR_MAX_S);
      yashS = THREE.MathUtils.clamp(srishtiS - 2.05 + Math.cos(mappedTime * 0.65) * 0.15, STAIR_MIN_S, STAIR_MAX_S);
      manishLat = 0.56;
      yashLat = -0.52;

      if (help1Weight > 0.25) {
        phaseLabel = 'Steep pitch #1 · Ishaan helps Srishti up the steps';
        camYawShift = 0.78;
        camDist = 4.15;
        camHeightOffset = 1.65;
      } else if (help2Weight > 0.25) {
        phaseLabel = 'Steep pitch #2 · Holding hands across Flight 3';
        camYawShift = 0.82;
        camDist = 4.05;
        camHeightOffset = 1.68;
      } else if (mappedTime >= 9.6 && mappedTime <= 10.8) {
        phaseLabel = 'Halfway (~200 steps) · Quick breather above the pines';
        camYawShift = -0.45;
        camDist = 5.6;
        camHeightOffset = 2.1;
      } else if (mappedTime >= 20.2) {
        phaseLabel = 'All 400 steps climbed · Baal Kuwari Temple gate ahead!';
        camYawShift = 0.24;
        camDist = 5.8;
        camHeightOffset = 2.2;
      } else {
        phaseLabel = 'Climbing the ~400 winding Baal Kuwari stone steps together';
      }

      if (!sim.halfwayNotified && computeStepCountFromS(ishaanCurrentS) >= 200) {
        sim.halfwayNotified = true;
        onReachHalfwayMilestone();
      }
    } else {
      // DESCENT CINEMATIC: joyful downhill trot & slow landings
      const descSample = sampleStairSFromKeyframes(mappedTime, DESCENT_BASE_KEYFRAMES);
      ishaanCurrentS = THREE.MathUtils.clamp(descSample.s, STAIR_MIN_S, STAIR_MAX_S);
      ishaanSpeed = Math.abs(descSample.speedMps);
      const srishtiS = THREE.MathUtils.clamp(ishaanCurrentS + 0.72, STAIR_MIN_S, STAIR_MAX_S);
      srishtiSpeed = ishaanSpeed;

      const onFlightDown = isOnStairFlightAtS(ishaanCurrentS) && ishaanSpeed > 5.2;
      ishaanDownhillJog = onFlightDown && !reducedMotion;
      srishtiDownhillJog = isOnStairFlightAtS(srishtiS) && srishtiSpeed > 5.2 && !reducedMotion;

      const ptI = sampleStairTransformAtS(ishaanCurrentS);
      const ptS = sampleStairTransformAtS(srishtiS);

      ishaanPos = {
        x: ptI.x - ptI.rx * 0.3,
        y: ptI.y,
        z: ptI.z - ptI.rz * 0.3,
      };
      srishtiPos = {
        x: ptS.x + ptS.rx * 0.32,
        y: ptS.y,
        z: ptS.z + ptS.rz * 0.32,
      };
      ishaanTargetYaw = ptI.yaw + Math.PI;
      srishtiTargetYaw = ptS.yaw + Math.PI;

      manishS = THREE.MathUtils.clamp(ishaanCurrentS + 1.55, STAIR_MIN_S, STAIR_MAX_S);
      yashS = THREE.MathUtils.clamp(ishaanCurrentS - 0.95, STAIR_MIN_S, STAIR_MAX_S);
      manishLat = -0.58;
      yashLat = 0.56;

      phaseLabel = onFlightDown
        ? 'Heading down fast and laughing all the way down!'
        : 'Taking the stair turn together after temple darshan';
      camYawShift = 0.42 + Math.sin(mappedTime * 0.45) * 0.18;
      camDist = 5.65;
      camHeightOffset = 2.25;
    }

    // Smooth yaw updates
    sim.ishaanYaw += wrapAngleDiff(ishaanTargetYaw, sim.ishaanYaw) * (1 - Math.exp(-10 * delta));
    sim.srishtiYaw += wrapAngleDiff(srishtiTargetYaw, sim.srishtiYaw) * (1 - Math.exp(-10 * delta));

    const strideMul = ishaanDownhillJog ? 1.12 : 1.0;
    const ishaanRatio = THREE.MathUtils.clamp(
      (ishaanDownhillJog ? ishaanSpeed * 0.36 : ishaanSpeed) / 3.4,
      0,
      1
    );
    const srishtiRatio = THREE.MathUtils.clamp(
      (srishtiDownhillJog ? srishtiSpeed * 0.36 : srishtiSpeed) / 3.4,
      0,
      1
    );
    if (ishaanRatio > 0.04) sim.ishaanPhase += delta * (ishaanDownhillJog ? 13.5 : 8.2) * strideMul;
    if (srishtiRatio > 0.04) sim.srishtiPhase += delta * (srishtiDownhillJog ? 13.2 : 8.2) * strideMul;

    // Solve exact world hand clasp point M when connected hand-help is active
    let ishaanHandTarget: ConnectedHandTarget | null = null;
    let srishtiHandTarget: ConnectedHandTarget | null = null;
    if (activeHandWeight > 0.02) {
      const cosI = Math.cos(sim.ishaanYaw);
      const sinI = Math.sin(sim.ishaanYaw);
      scratch.ishaanShoulder.set(
        ishaanPos.x + -0.205 * cosI,
        ishaanPos.y + 1.26,
        ishaanPos.z - -0.205 * sinI
      );

      const cosS = Math.cos(sim.srishtiYaw);
      const sinS = Math.sin(sim.srishtiYaw);
      scratch.srishtiShoulder.set(
        srishtiPos.x + 0.152 * cosS,
        srishtiPos.y + 1.135,
        srishtiPos.z - 0.152 * sinS
      );

      computeExactHandClaspPoint(
        scratch.ishaanShoulder,
        scratch.srishtiShoulder,
        scratch.claspWorld
      );

      scratch.ishaanHandTarget.worldPoint.copy(scratch.claspWorld);
      scratch.ishaanHandTarget.weight = activeHandWeight;
      ishaanHandTarget = scratch.ishaanHandTarget;

      scratch.srishtiHandTarget.worldPoint.copy(scratch.claspWorld);
      scratch.srishtiHandTarget.weight = activeHandWeight;
      srishtiHandTarget = scratch.srishtiHandTarget;
    }

    // 1. Animate playable third-person Ishaan avatar
    animateIshaanWalkRig({
      refs: {
        group: playerGroupRef.current,
        torso: playerTorsoRef.current,
        head: playerHeadRef.current,
        leftLeg: leftLegRef.current,
        leftKnee: leftKneeRef.current,
        rightLeg: rightLegRef.current,
        rightKnee: rightKneeRef.current,
        leftArm: leftArmRef.current,
        rightArm: rightArmRef.current,
        rightForearm: rightForearmRef.current,
      },
      posX: ishaanPos.x,
      posZ: ishaanPos.z,
      facingYaw: sim.ishaanYaw,
      strideRatio: ishaanRatio,
      stridePhase: sim.ishaanPhase,
      elapsed: globalClock,
      delta,
      groundY: ishaanPos.y,
      climbingStairs: ishaanClimbing,
      downhillJogging: ishaanDownhillJog,
      idlePose: ishaanPose,
      headTargetYawOffset: activeHandWeight > 0.2 ? -0.18 : 0,
      connectedHandTarget: ishaanHandTarget,
      reducedMotion,
    });

    // 2. Animate companions directly (Srishti with connected hand assist + Manish & Yash)
    const rigs = companionRigsRef.current;
    if (rigs) {
      if (rigs.srishti) {
        animateCharacterRig({
          refs: rigs.srishti,
          posX: srishtiPos.x,
          posZ: srishtiPos.z,
          facingYaw: sim.srishtiYaw,
          strideRatio: srishtiRatio,
          stridePhase: sim.srishtiPhase,
          elapsed: globalClock,
          delta,
          groundY: srishtiPos.y,
          torsoBaseY: 0.78,
          climbingStairs: srishtiClimbing,
          downhillJogging: srishtiDownhillJog,
          idlePose: srishtiPose,
          headTargetYawOffset: activeHandWeight > 0.2 ? 0.22 : 0,
          armGesturePhase: 0.4,
          connectedHandTarget: srishtiHandTarget,
          reducedMotion,
        });
      }

      const ptM = sampleStairTransformAtS(manishS);
      const ptY = sampleStairTransformAtS(yashS);
      const compSpeedM = direction === 'descent' && isOnStairFlightAtS(manishS) && !reducedMotion;
      const compSpeedY = direction === 'descent' && isOnStairFlightAtS(yashS) && !reducedMotion;

      sim.manishPhase += delta * (compSpeedM ? 12.6 : 7.8);
      sim.yashPhase += delta * (compSpeedY ? 12.8 : 7.8);

      const mTargetYaw = direction === 'ascent' ? ptM.yaw : ptM.yaw + Math.PI;
      const yTargetYaw = direction === 'ascent' ? ptY.yaw : ptY.yaw + Math.PI;
      sim.manishYaw += wrapAngleDiff(mTargetYaw, sim.manishYaw) * (1 - Math.exp(-9 * delta));
      sim.yashYaw += wrapAngleDiff(yTargetYaw, sim.yashYaw) * (1 - Math.exp(-9 * delta));

      if (rigs.friend_black_tee) {
        animateCharacterRig({
          refs: rigs.friend_black_tee,
          posX: ptM.x + ptM.rx * manishLat,
          posZ: ptM.z + ptM.rz * manishLat,
          facingYaw: sim.manishYaw,
          strideRatio: direction === 'ascent' ? Math.min(1, srishtiRatio + 0.15) : 0.9,
          stridePhase: sim.manishPhase,
          elapsed: globalClock,
          delta,
          groundY: ptM.y,
          torsoBaseY: 0.82,
          climbingStairs: direction === 'ascent' && isOnStairFlightAtS(manishS),
          downhillJogging: compSpeedM,
          idlePose: direction === 'ascent' && mappedTime >= 20.6 ? 'chat_nod' : 'default',
          armGesturePhase: 1.5,
          reducedMotion,
        });
      }

      if (rigs.friend_plaid) {
        animateCharacterRig({
          refs: rigs.friend_plaid,
          posX: ptY.x + ptY.rx * yashLat,
          posZ: ptY.z + ptY.rz * yashLat,
          facingYaw: sim.yashYaw,
          strideRatio: direction === 'ascent' ? Math.min(1, srishtiRatio + 0.12) : 0.9,
          stridePhase: sim.yashPhase,
          elapsed: globalClock,
          delta,
          groundY: ptY.y,
          torsoBaseY: 0.82,
          climbingStairs: direction === 'ascent' && isOnStairFlightAtS(yashS),
          downhillJogging: compSpeedY,
          idlePose: direction === 'ascent' && mappedTime >= 20.6 ? 'chat_nod' : 'default',
          armGesturePhase: 2.9,
          reducedMotion,
        });
      }
    }

    // 3. Third-person cinematic camera framing Ishaan & Srishti cleanly on the stairs
    const camAnchor = sampleStairTransformAtS(
      THREE.MathUtils.clamp((ishaanCurrentS + computeMidS(srishtiPos, ishaanCurrentS)) * 0.5, STAIR_MIN_S, STAIR_MAX_S)
    );
    const camBaseYaw = direction === 'ascent' ? camAnchor.yaw + camYawShift : camAnchor.yaw + Math.PI + camYawShift;
    const horizDist = Math.cos(0.32) * camDist;
    scratch.desiredCamPos.set(
      camAnchor.x + Math.sin(camBaseYaw) * horizDist,
      camAnchor.y + camHeightOffset,
      camAnchor.z + Math.cos(camBaseYaw) * horizDist
    );
    scratch.desiredLookAt.set(
      (ishaanPos.x + srishtiPos.x) * 0.5,
      (ishaanPos.y + srishtiPos.y) * 0.5 + 1.08,
      (ishaanPos.z + srishtiPos.z) * 0.5
    );

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.desiredCamPos);
      scratch.smoothedLookAt.copy(scratch.desiredLookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.desiredCamPos.x, 4.8, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.desiredCamPos.y, 4.8, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.desiredCamPos.z, 4.8, delta);
      scratch.smoothedLookAt.x = THREE.MathUtils.damp(
        scratch.smoothedLookAt.x,
        scratch.desiredLookAt.x,
        6.5,
        delta
      );
      scratch.smoothedLookAt.y = THREE.MathUtils.damp(
        scratch.smoothedLookAt.y,
        scratch.desiredLookAt.y,
        6.5,
        delta
      );
      scratch.smoothedLookAt.z = THREE.MathUtils.damp(
        scratch.smoothedLookAt.z,
        scratch.desiredLookAt.z,
        6.5,
        delta
      );
    }
    camera.lookAt(scratch.smoothedLookAt);

    // 4. Zero-re-render DOM telemetry updates for live HUD readout & progress bar
    const stepNow = computeStepCountFromS(ishaanCurrentS);
    if (stairTelemetryRefs) {
      if (stepNow !== sim.lastDomStep) {
        sim.lastDomStep = stepNow;
        if (stairTelemetryRefs.stepCountEl.current) {
          stairTelemetryRefs.stepCountEl.current.textContent =
            direction === 'ascent'
              ? `Steps: ~${stepNow} / ${BAAL_KUWARI_TOTAL_STEPS}`
              : `Descending · ~${stepNow} steps to base`;
        }
        if (stairTelemetryRefs.barFillEl.current) {
          const pct =
            direction === 'ascent'
              ? Math.min(100, Math.round((stepNow / BAAL_KUWARI_TOTAL_STEPS) * 100))
              : Math.min(100, Math.round(((BAAL_KUWARI_TOTAL_STEPS - stepNow) / BAAL_KUWARI_TOTAL_STEPS) * 100));
          stairTelemetryRefs.barFillEl.current.style.width = `${pct}%`;
        }
        if (stairTelemetryRefs.flightEl.current) {
          const flightNo = stepNow >= 300 ? 4 : stepNow >= 200 ? 3 : stepNow >= 100 ? 2 : 1;
          stairTelemetryRefs.flightEl.current.textContent =
            direction === 'ascent'
              ? `Flight ${flightNo} of 4 · Together on the hillside stairs`
              : `Flight ${flightNo} of 4 · Returning after darshan`;
        }
      }
      if (phaseLabel !== sim.lastDomPhase) {
        sim.lastDomPhase = phaseLabel;
        if (stairTelemetryRefs.phaseLabelEl.current) {
          stairTelemetryRefs.phaseLabelEl.current.textContent = phaseLabel;
        }
      }
    }

    // 5. Seamless automatic completion transition
    if (!sim.completedNotified && sim.elapsedSec >= totalDuration) {
      sim.completedNotified = true;
      if (direction === 'ascent') {
        onAscentComplete();
      } else {
        onDescentComplete();
      }
    }
  });

  const startPos = useMemo(() => {
    const startS = direction === 'ascent' ? -0.3 : SUMMIT_S - 0.6;
    return sampleStairTransformAtS(startS);
  }, [direction]);

  return (
    <>
      <BaalKuwariStairsEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        canEnterSummit={false}
        canCaptureLandingPhoto={false}
        assistBeaconPos={null}
      />

      {/* Playable Third-Person Ishaan */}
      <StylizedPlaceholderCharacter
        characterVariant="ishaan"
        groupRef={playerGroupRef}
        torsoRef={playerTorsoRef}
        headRef={playerHeadRef}
        leftLegRef={leftLegRef}
        leftKneeRef={leftKneeRef}
        rightLegRef={rightLegRef}
        rightKneeRef={rightKneeRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        rightForearmRef={rightForearmRef}
        position={[startPos.x + 0.25, startPos.y, startPos.z]}
        castShadow={shadowsEnabled}
      />

      {/* Srishti, Manish & Yash climbing or heading down playfully together */}
      <CompanionGroup initialPositions={initialCompPositions} onRigsReady={handleRigsReady} />
    </>
  );
}

function computeMidS(_srishtiPos: { x: number; y: number; z: number }, ishaanS: number): number {
  return ishaanS;
}
