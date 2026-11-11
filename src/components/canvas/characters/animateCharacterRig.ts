import * as THREE from 'three';

export type CharacterIdlePose =
  | 'default'
  | 'hands_behind_back'
  | 'group_wave'
  | 'pray_bow'
  | 'chat_nod'
  | 'look_around'
  | 'sit_ready'
  | 'sit_eat'
  | 'sit_sip'
  | 'sit_laugh'
  | 'hand_assist_reach'
  | 'cheer_wave';

export type SrishtiIdlePose = CharacterIdlePose;

export interface HumanRigRefs {
  group: THREE.Group | null;
  torso: THREE.Group | null;
  head: THREE.Group | null;
  hairTail?: THREE.Group | null;
  bag?: THREE.Group | null;
  leftLeg: THREE.Group | null;
  leftKnee: THREE.Group | null;
  rightLeg: THREE.Group | null;
  rightKnee: THREE.Group | null;
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
  rightForearm?: THREE.Group | null;
}

export type SrishtiRigRefs = HumanRigRefs;

export interface ConnectedHandTarget {
  arm: 'left' | 'right';
  worldPoint: THREE.Vector3;
  /** `0..1` blend from natural pose toward exact hand contact at `worldPoint`. */
  weight: number;
  /** Distance from character spine to shoulder pivot (`0.205` Ishaan, `0.152` Srishti). */
  shoulderOffsetX?: number;
  /** Height of shoulder pivot above group feet (`1.26` Ishaan, `1.135` Srishti). */
  shoulderHeightY?: number;
}

export interface CharacterRigFrameParams {
  refs: HumanRigRefs;
  posX: number;
  posZ: number;
  facingYaw: number;
  strideRatio: number;
  stridePhase: number;
  elapsed: number;
  delta: number;
  idlePose?: CharacterIdlePose;
  groundY?: number;
  climbingStairs?: boolean;
  downhillJogging?: boolean;
  torsoBaseY?: number;
  headTargetYawOffset?: number;
  armGesturePhase?: number;
  connectedHandTarget?: ConnectedHandTarget | null;
  reducedMotion?: boolean;
}

export type WalkRigFrameParams = CharacterRigFrameParams;

/**
 * Computes clamped local head-turn yaw offset so a character naturally glances
 * toward a nearby friend or point of interest without twisting unnaturally backward.
 */
export function computeRelativeHeadLookYaw(
  originX: number,
  originZ: number,
  originFacingYaw: number,
  targetX: number,
  targetZ: number
): number {
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  if (dx * dx + dz * dz < 0.04) return 0;

  const targetWorldYaw = Math.atan2(-dx, -dz);
  let diff = targetWorldYaw - originFacingYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > 1.35) return 0;
  return THREE.MathUtils.clamp(diff, -0.52, 0.52);
}

/**
 * Shared articulated walking, seated dining, conversational, and prayer posture helper
 * for Srishti and companion characters.
 * Coordinate check (`-Z` forward):
 * - Lifting thighs horizontally forward onto a seat is positive X rotation (`x > 0`, `+1.40`).
 * - Bending knees vertically downward from horizontal thigh is negative X (`x < 0`, `-1.32`).
 * - Raising arms/forearms forward/upward toward mouth or chest is positive X rotation (`x > 0`).
 * - Bowing torso/head downward is negative X (`x < 0`); leaning back laughing is positive X (`x > 0`).
 */
function applyConnectedArmTarget(
  posX: number,
  groundY: number,
  posZ: number,
  facingYaw: number,
  leftArm: THREE.Group | null,
  rightArm: THREE.Group | null,
  rightForearm: THREE.Group | null | undefined,
  target: ConnectedHandTarget
): void {
  const w = THREE.MathUtils.clamp(target.weight, 0, 1);
  if (w <= 0.01) return;

  const isLeft = target.arm === 'left';
  const armGroup = isLeft ? leftArm : rightArm;
  if (!armGroup) return;

  const shoulderX = (isLeft ? -1 : 1) * (target.shoulderOffsetX ?? 0.18);
  const shoulderY = groundY + (target.shoulderHeightY ?? 1.2);

  const cosY = Math.cos(facingYaw);
  const sinY = Math.sin(facingYaw);
  // Rotate local `(shoulderX, 0)` into world coordinates
  const swx = posX + shoulderX * cosY;
  const swz = posZ - shoulderX * sinY;

  const dx = target.worldPoint.x - swx;
  const dy = target.worldPoint.y - shoulderY;
  const dz = target.worldPoint.z - swz;

  // Inverse rotate `D` back into character local space (`rotateY(-facingYaw)`)
  const lx = dx * cosY - dz * sinY;
  const ly = dy;
  const lz = dx * sinY + dz * cosY;
  const len = Math.hypot(lx, ly, lz);
  if (len < 1e-4) return;

  const ux = lx / len;
  const uy = ly / len;
  const uz = lz / len;

  const desiredZ = Math.asin(THREE.MathUtils.clamp(ux, -0.94, 0.94));
  const desiredX = Math.atan2(-uz, -uy);

  armGroup.rotation.x = THREE.MathUtils.lerp(armGroup.rotation.x, desiredX, w);
  armGroup.rotation.z = THREE.MathUtils.lerp(armGroup.rotation.z, desiredZ, w);
  if (!isLeft && rightForearm) {
    rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, 0.14, w);
  }
}

export function animateCharacterRig({
  refs,
  posX,
  posZ,
  facingYaw,
  strideRatio,
  stridePhase,
  elapsed,
  delta,
  idlePose = 'default',
  groundY = 0,
  climbingStairs = false,
  downhillJogging = false,
  torsoBaseY = 0.78,
  headTargetYawOffset = 0,
  armGesturePhase = 0,
  connectedHandTarget = null,
  reducedMotion = false,
}: CharacterRigFrameParams): void {
  const {
    group,
    torso,
    head,
    hairTail,
    bag,
    leftLeg,
    leftKnee,
    rightLeg,
    rightKnee,
    leftArm,
    rightArm,
    rightForearm,
  } = refs;
  if (!group) return;

  // Let the tunic hem gather above the thighs rather than pass through a seat.
  const hem = torso?.children.find(child => child.name === 'garment-hem');
  if (hem) {
    const seated = idlePose.startsWith('sit_') && strideRatio <= 0.03;
    hem.position.y = THREE.MathUtils.damp(hem.position.y, seated ? 0.035 : hem.userData.standingY, 10, delta);
    hem.scale.y = THREE.MathUtils.damp(hem.scale.y, seated ? 0.64 : 1, 10, delta);
  }

  group.position.x = posX;
  group.position.z = posZ;
  group.rotation.y = facingYaw;

  if (strideRatio > 0.03) {
    const legGain = downhillJogging ? 1.15 : climbingStairs ? 1.24 : 1.0;
    const kneeGain = downhillJogging ? 0.88 : climbingStairs ? 0.78 : 0.55;
    const swing = Math.sin(stridePhase) * 0.44 * Math.min(1.18, strideRatio) * legGain;
    const leftKneeBend =
      -Math.max(0, Math.sin(stridePhase + 0.5)) * kneeGain * Math.min(1.15, strideRatio);
    const rightKneeBend =
      -Math.max(0, Math.sin(stridePhase + Math.PI + 0.5)) *
      kneeGain *
      Math.min(1.15, strideRatio);
    const armSwing = swing * (downhillJogging ? 0.85 : 0.68);
    const verticalBounceAmp = downhillJogging ? 0.048 : climbingStairs ? 0.042 : 0.028;

    group.position.y = THREE.MathUtils.damp(
      group.position.y,
      groundY + (reducedMotion ? 0 : Math.abs(Math.sin(stridePhase)) * verticalBounceAmp * Math.min(1, strideRatio)),
      14,
      delta
    );
    if (leftLeg) leftLeg.rotation.x = swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    if (leftKnee) leftKnee.rotation.x = leftKneeBend;
    if (rightKnee) rightKnee.rotation.x = rightKneeBend;
    if (leftArm) {
      leftArm.rotation.x = -armSwing;
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.1, 12, delta);
    }
    if (rightArm) {
      rightArm.rotation.x = armSwing;
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.08, 12, delta);
    }
    if (rightForearm) {
      rightForearm.rotation.x = THREE.MathUtils.damp(
        rightForearm.rotation.x,
        downhillJogging ? 0.52 : 0.14,
        12,
        delta
      );
    }
    if (torso) {
      torso.position.y = reducedMotion
        ? torsoBaseY
        : torsoBaseY + Math.abs(Math.cos(stridePhase)) * (downhillJogging ? 0.022 : 0.015);
      const torsoPitch = downhillJogging ? 0.05 : climbingStairs ? -0.11 : -0.03;
      torso.rotation.x = THREE.MathUtils.damp(
        torso.rotation.x,
        torsoPitch * Math.min(1, strideRatio),
        10,
        delta
      );
      torso.rotation.y = reducedMotion ? 0 : Math.cos(stridePhase) * 0.05 * Math.min(1, strideRatio);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, 0, 10, delta);
    }
    if (bag) {
      bag.rotation.z = reducedMotion
        ? 0.08
        : 0.09 + Math.sin(stridePhase) * 0.05 * Math.min(1, strideRatio);
      bag.rotation.x = reducedMotion ? 0 : Math.cos(stridePhase) * 0.06 * Math.min(1, strideRatio);
    }
    if (hairTail) {
      hairTail.rotation.x = (downhillJogging ? 0.22 : 0.14) + Math.min(1, strideRatio) * 0.09;
      hairTail.rotation.z = reducedMotion
        ? 0
        : Math.sin(stridePhase) * 0.06 * Math.min(1, strideRatio);
    }
    if (head) {
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headTargetYawOffset, 10, delta);
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0, 10, delta);
    }
    if (connectedHandTarget) {
      applyConnectedArmTarget(
        posX,
        groundY,
        posZ,
        facingYaw,
        leftArm,
        rightArm,
        rightForearm,
        connectedHandTarget
      );
    }
    return;
  }

  const isSeated =
    idlePose === 'sit_ready' ||
    idlePose === 'sit_eat' ||
    idlePose === 'sit_sip' ||
    idlePose === 'sit_laugh';

  const targetRootY = groundY + (isSeated ? -0.25 : 0);
  const targetThighX = isSeated ? 1.4 : 0;
  const targetKneeX = isSeated ? -1.32 : 0;

  group.position.y = THREE.MathUtils.damp(group.position.y, targetRootY, 10, delta);
  if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, targetThighX, 10, delta);
  if (rightLeg)
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, targetThighX, 10, delta);
  if (leftKnee) leftKnee.rotation.x = THREE.MathUtils.damp(leftKnee.rotation.x, targetKneeX, 10, delta);
  if (rightKnee)
    rightKnee.rotation.x = THREE.MathUtils.damp(rightKnee.rotation.x, targetKneeX, 10, delta);

  const isPray = idlePose === 'pray_bow';
  const isChat = idlePose === 'chat_nod';
  const chatWave = reducedMotion ? 0 : Math.max(0, Math.sin(elapsed * 1.45 + armGesturePhase));
  const eatWave = reducedMotion
    ? 0.4
    : 0.5 - 0.5 * Math.cos(elapsed * 2.15 + armGesturePhase);
  const sipWave = reducedMotion
    ? 0.45
    : 0.5 - 0.5 * Math.cos(elapsed * 1.5 + armGesturePhase);
  const laughRipple = reducedMotion ? 0 : Math.sin(elapsed * 7.2 + armGesturePhase);

  let targetLeftArmX = 0;
  let targetLeftArmZ = -0.09;
  let targetRightArmX = 0;
  let targetRightArmZ = 0.08;
  let targetForearmX = 0.08;
  let targetTorsoX = 0;
  let targetTorsoY = 0;
  let targetTorsoZ = 0;
  let targetHeadX = 0;

  if (isPray) {
    targetLeftArmX = 1.04;
    targetLeftArmZ = 0.27;
    targetRightArmX = 1.04;
    targetRightArmZ = -0.27;
    targetForearmX = 0.35;
    targetTorsoX = -0.33;
    targetHeadX = -0.24;
  } else if (idlePose === 'hands_behind_back') {
    targetLeftArmX = -0.28;
    targetLeftArmZ = 0.14;
    targetRightArmX = -0.28;
    targetRightArmZ = -0.14;
    targetHeadX = -0.05;
  } else if (idlePose === 'group_wave') {
    targetLeftArmX = 0.12;
    targetRightArmX = 0.55;
    targetRightArmZ = 0.42;
    targetTorsoZ = 0.06;
  } else if (idlePose === 'hand_assist_reach') {
    const reachPulse = reducedMotion ? 0 : Math.sin(elapsed * 2.6 + armGesturePhase) * 0.06;
    targetLeftArmX = -0.12;
    targetRightArmX = 0.88 + reachPulse;
    targetRightArmZ = 0.24;
    targetForearmX = 0.42;
    targetTorsoX = -0.14;
    targetTorsoY = -0.12;
    targetHeadX = -0.08;
  } else if (idlePose === 'cheer_wave') {
    const waveAngle = reducedMotion ? 0 : Math.sin(elapsed * 5.2 + armGesturePhase) * 0.18;
    targetLeftArmX = 0.15;
    targetRightArmX = 0.72;
    targetRightArmZ = 0.52 + waveAngle;
    targetForearmX = 0.58;
    targetTorsoZ = 0.05;
  } else if (idlePose === 'sit_ready') {
    targetLeftArmX = 0.45;
    targetLeftArmZ = -0.06;
    targetRightArmX = 0.45;
    targetRightArmZ = 0.06;
    targetForearmX = 0.52;
    targetTorsoX = -0.04;
  } else if (idlePose === 'sit_eat') {
    targetLeftArmX = 0.46;
    targetLeftArmZ = -0.06;
    targetRightArmX = 0.44 + eatWave * 0.4;
    targetRightArmZ = 0.04 - eatWave * 0.12;
    targetForearmX = 0.56 + eatWave * 0.72;
    targetTorsoX = -0.11 + eatWave * 0.04;
    targetHeadX = -0.16 + eatWave * 0.07;
  } else if (idlePose === 'sit_sip') {
    targetLeftArmX = 0.42;
    targetLeftArmZ = -0.08;
    targetRightArmX = 0.38 + sipWave * 0.42;
    targetRightArmZ = 0.05 - sipWave * 0.12;
    targetForearmX = 0.58 + sipWave * 0.76;
    targetTorsoX = -0.05 + sipWave * 0.04;
    targetHeadX = -0.05 + sipWave * 0.08;
  } else if (idlePose === 'sit_laugh') {
    targetLeftArmX = 0.42 + (reducedMotion ? 0 : Math.sin(elapsed * 2.1 + armGesturePhase) * 0.12);
    targetLeftArmZ = -0.16;
    targetRightArmX = 0.48 + laughRipple * 0.05;
    targetRightArmZ = 0.14;
    targetForearmX = 0.65 + laughRipple * 0.08;
    targetTorsoX = 0.07 + laughRipple * 0.025;
    targetTorsoY = reducedMotion ? 0 : Math.sin(elapsed * 1.1 + armGesturePhase) * 0.08;
    targetHeadX = 0.08 + laughRipple * 0.03;
  } else if (isChat) {
    targetLeftArmX = 0.08 + chatWave * 0.08;
    targetRightArmX = 0.22 + chatWave * 0.16;
    targetForearmX = 0.42 + chatWave * 0.22;
    targetTorsoX = -0.025 * chatWave;
    targetTorsoY = reducedMotion ? 0 : Math.sin(elapsed * 0.75 + armGesturePhase) * 0.06;
    targetHeadX = reducedMotion ? 0 : Math.sin(elapsed * 2.7 + armGesturePhase * 2) * 0.05;
  }

  if (leftArm) {
    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, targetLeftArmX, 8, delta);
    leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, targetLeftArmZ, 8, delta);
  }
  if (rightArm) {
    rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, targetRightArmX, 8, delta);
    rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, targetRightArmZ, 8, delta);
  }
  if (rightForearm) {
    rightForearm.rotation.x = THREE.MathUtils.damp(
      rightForearm.rotation.x,
      targetForearmX,
      8.5,
      delta
    );
  }
  if (torso) {
    torso.position.y = reducedMotion
      ? torsoBaseY
      : torsoBaseY + Math.sin(elapsed * 2.1 + armGesturePhase) * 0.008;
    torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, targetTorsoX, 6.5, delta);
    torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, targetTorsoY, 6, delta);
    torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, targetTorsoZ, 8, delta);
  }
  if (bag) {
    bag.rotation.z = THREE.MathUtils.damp(
      bag.rotation.z,
      isPray ? 0.12 : isSeated ? 0.14 : 0.08,
      8,
      delta
    );
    bag.rotation.x = THREE.MathUtils.damp(bag.rotation.x, isPray ? 0.18 : 0, 8, delta);
  }
  if (hairTail) {
    hairTail.rotation.x = THREE.MathUtils.damp(
      hairTail.rotation.x,
      isPray ? 0.28 : isSeated ? 0.08 : 0.14,
      7,
      delta
    );
    hairTail.rotation.z = reducedMotion
      ? THREE.MathUtils.damp(hairTail.rotation.z, 0, 8, delta)
      : THREE.MathUtils.damp(hairTail.rotation.z, Math.sin(elapsed * 1.4) * 0.015, 6, delta);
  }
  if (head) {
    const ambientScan = reducedMotion ? 0 : Math.sin(elapsed * 0.8 + armGesturePhase) * 0.06;
    const headLookY = isPray
      ? 0
      : idlePose === 'look_around'
        ? reducedMotion
          ? 0
          : Math.sin(elapsed * 0.55 + armGesturePhase) * 0.16
        : Math.abs(headTargetYawOffset) > 0.02
          ? headTargetYawOffset + ambientScan * 0.45
          : idlePose === 'hands_behind_back'
            ? ambientScan * 1.15
            : idlePose === 'group_wave'
              ? 0.05
              : ambientScan;
    head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headLookY, 7, delta);
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, targetHeadX, 6.5, delta);
  }
  if (connectedHandTarget) {
    applyConnectedArmTarget(
      posX,
      groundY,
      posZ,
      facingYaw,
      leftArm,
      rightArm,
      rightForearm,
      connectedHandTarget
    );
  }
}

/**
 * Ishaan third-person playable protagonist rig wrapper (`torsoBaseY = 0.82`).
 */
export function animateIshaanWalkRig(params: WalkRigFrameParams): void {
  animateCharacterRig({
    ...params,
    torsoBaseY: 0.82,
  });
}

/**
 * Srishti walk + idle/seated wrapper (`torsoBaseY = 0.78`).
 */
export function animateSrishtiWalkRig(params: WalkRigFrameParams): void {
  animateCharacterRig({
    ...params,
    torsoBaseY: 0.78,
  });
}
