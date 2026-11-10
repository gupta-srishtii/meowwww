import * as THREE from 'three';
import {
  animateCharacterRig,
  computeRelativeHeadLookYaw,
  type CharacterIdlePose,
  type HumanRigRefs,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  resolveWalkCollisions,
  type WalkBounds,
  type WalkObstacle,
} from '@/hooks/useWalkController';

export interface CompanionTargetSlot {
  x: number;
  z: number;
  facingYaw: number;
}

export type CompanionGroupMode = 'follow' | 'gather' | 'sit_dine' | 'prayer' | 'scooter_return';

export interface CompanionAgentConfig {
  id: string;
  /** Preferred angle behind Srishti's movement heading (radians) during free exploration. */
  followAngleOffset: number;
  /** Preferred loose trailing radius around Srishti (meters). */
  followDistance: number;
  /** Idle personality when gathered near Srishti or peers. */
  idlePose: CharacterIdlePose;
  /** Phase offset so buddies do not breathe or gesture in lockstep. */
  gesturePhase: number;
}

export interface CompanionRuntimeState {
  id: string;
  posX: number;
  posZ: number;
  velX: number;
  velZ: number;
  facingYaw: number;
  stridePhase: number;
  isMovingToTarget: boolean;
}

export interface StepCompanionsParams {
  agents: CompanionRuntimeState[];
  configs: readonly CompanionAgentConfig[];
  playerX: number;
  playerZ: number;
  playerFacingYaw: number;
  playerSpeed: number;
  bounds: WalkBounds;
  obstacles: readonly WalkObstacle[];
  delta: number;
  mode: CompanionGroupMode;
  /** Explicit per-agent slots used for 'gather', 'sit_dine', 'prayer', or 'scooter_return'. */
  explicitTargets?: Record<string, CompanionTargetSlot>;
}

const COMPANION_RADIUS = 0.36;
const MIN_PLAYER_CLEARANCE = 0.92;
const MIN_PEER_CLEARANCE = 0.82;

export function createCompanionStates(
  initialPositions: ReadonlyArray<{ id: string; x: number; z: number; facingYaw: number }>
): CompanionRuntimeState[] {
  return initialPositions.map((p) => ({
    id: p.id,
    posX: p.x,
    posZ: p.z,
    velX: 0,
    velZ: 0,
    facingYaw: p.facingYaw,
    stridePhase: 0,
    isMovingToTarget: false,
  }));
}

function normalizeAngleDelta(target: number, current: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Steps companion NPCs cleanly through distinct behavioral modes (`FOLLOW`, `GATHER`,
 * `SIT_AND_EAT`, `PRAYER`, `RETURN`), preventing unnatural trailing queues during social stops.
 */
export function stepGroupCompanions({
  agents,
  configs,
  playerX,
  playerZ,
  playerFacingYaw,
  playerSpeed,
  bounds,
  obstacles,
  delta,
  mode,
  explicitTargets,
}: StepCompanionsParams): void {
  const safeDelta = Math.min(delta, 0.05);
  if (safeDelta <= 0) return;

  const behindX = Math.sin(playerFacingYaw);
  const behindZ = Math.cos(playerFacingYaw);
  const behindAngle = Math.atan2(behindZ, behindX);

  const rawTargets: Array<{ x: number; z: number; yaw?: number }> = [];

  for (let i = 0; i < agents.length; i += 1) {
    const agent = agents[i];
    const cfg = configs[i];
    const override = explicitTargets?.[agent.id];

    if (mode !== 'follow' && override) {
      rawTargets.push({ x: override.x, z: override.z, yaw: override.facingYaw });
      continue;
    }

    const angle = behindAngle + cfg.followAngleOffset;
    const goal = {
      posX: playerX + Math.cos(angle) * cfg.followDistance,
      posZ: playerZ + Math.sin(angle) * cfg.followDistance,
    };
    resolveWalkCollisions(goal, COMPANION_RADIUS, bounds, obstacles);
    rawTargets.push({ x: goal.posX, z: goal.posZ });
  }

  for (let i = 0; i < agents.length; i += 1) {
    const agent = agents[i];
    const goal = rawTargets[i];
    const dx = goal.x - agent.posX;
    const dz = goal.z - agent.posZ;
    const dist = Math.hypot(dx, dz);

    const startThreshold = mode === 'follow' ? 0.56 : 0.14;
    const stopThreshold = mode === 'follow' ? 0.2 : 0.05;

    if (agent.isMovingToTarget) {
      if (dist <= stopThreshold) agent.isMovingToTarget = false;
    } else if (dist >= startThreshold) {
      agent.isMovingToTarget = true;
    }

    const pdx = agent.posX - playerX;
    const pdz = agent.posZ - playerZ;
    const pDist = Math.hypot(pdx, pdz);
    let evadeVx = 0;
    let evadeVz = 0;
    if (mode === 'follow' && pDist < MIN_PLAYER_CLEARANCE && pDist > 1e-4) {
      const push = (MIN_PLAYER_CLEARANCE - pDist) * 2.8;
      evadeVx = (pdx / pDist) * push;
      evadeVz = (pdz / pDist) * push;
    }

    let targetVx = evadeVx;
    let targetVz = evadeVz;
    if (agent.isMovingToTarget && dist > 1e-4) {
      const catchupSpeed =
        dist > 4.2
          ? 3.75
          : dist > 1.8
            ? 3.25
            : THREE.MathUtils.clamp(dist * 2.35, 1.15, 2.85);
      targetVx += (dx / dist) * catchupSpeed;
      targetVz += (dz / dist) * catchupSpeed;
    }

    agent.velX = THREE.MathUtils.damp(agent.velX, targetVx, 10.5, safeDelta);
    agent.velZ = THREE.MathUtils.damp(agent.velZ, targetVz, 10.5, safeDelta);

    if (!agent.isMovingToTarget && (mode !== 'follow' || pDist >= MIN_PLAYER_CLEARANCE)) {
      if (Math.hypot(agent.velX, agent.velZ) < 0.06) {
        agent.velX = 0;
        agent.velZ = 0;
      }
      if (mode === 'sit_dine' && dist < 0.09) {
        agent.posX = THREE.MathUtils.damp(agent.posX, goal.x, 12, safeDelta);
        agent.posZ = THREE.MathUtils.damp(agent.posZ, goal.z, 12, safeDelta);
      }
    }

    const prevX = agent.posX;
    const prevZ = agent.posZ;
    agent.posX += agent.velX * safeDelta;
    agent.posZ += agent.velZ * safeDelta;

    if (mode !== 'sit_dine') {
      resolveWalkCollisions(agent, COMPANION_RADIUS, bounds, obstacles);
    }

    if (mode === 'follow') {
      const afterPdx = agent.posX - playerX;
      const afterPdz = agent.posZ - playerZ;
      const afterPDist = Math.hypot(afterPdx, afterPdz);
      if (afterPDist < MIN_PLAYER_CLEARANCE - 0.14 && afterPDist > 1e-4) {
        const minD = MIN_PLAYER_CLEARANCE - 0.14;
        agent.posX = playerX + (afterPdx / afterPDist) * minD;
        agent.posZ = playerZ + (afterPdz / afterPDist) * minD;
        resolveWalkCollisions(agent, COMPANION_RADIUS, bounds, obstacles);
      }
    }

    const actualStep = Math.hypot(agent.posX - prevX, agent.posZ - prevZ);
    agent.stridePhase += actualStep * 3.15;

    const currentSpeed = Math.hypot(agent.velX, agent.velZ);
    let desiredYaw = agent.facingYaw;
    if (currentSpeed > 0.24) {
      desiredYaw = Math.atan2(-(agent.velX / currentSpeed), -(agent.velZ / currentSpeed));
    } else if (goal.yaw !== undefined) {
      desiredYaw = goal.yaw;
    } else if (playerSpeed < 0.25 && pDist > 0.25) {
      desiredYaw = Math.atan2(-(playerX - agent.posX), -(playerZ - agent.posZ));
    }

    agent.facingYaw +=
      normalizeAngleDelta(desiredYaw, agent.facingYaw) * (1 - Math.exp(-9 * safeDelta));
  }

  if (mode !== 'sit_dine') {
    for (let i = 0; i < agents.length; i += 1) {
      for (let j = i + 1; j < agents.length; j += 1) {
        const a = agents[i];
        const b = agents[j];
        const dx = b.posX - a.posX;
        const dz = b.posZ - a.posZ;
        const dist = Math.hypot(dx, dz);
        if (dist < MIN_PEER_CLEARANCE && dist > 1e-4) {
          const push = (MIN_PEER_CLEARANCE - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.posX -= nx * push;
          a.posZ -= nz * push;
          b.posX += nx * push;
          b.posZ += nz * push;
          resolveWalkCollisions(a, COMPANION_RADIUS, bounds, obstacles);
          resolveWalkCollisions(b, COMPANION_RADIUS, bounds, obstacles);
        }
      }
    }
  }
}

/**
 * Applies articulated walk, dining, conversational glances, and Namaste prayer bowing
 * to a companion rig ref set.
 */
export function applyCompanionRigFrame({
  agent,
  config,
  refs,
  lookTargetX,
  lookTargetZ,
  elapsed,
  delta,
  groundY = 0,
  climbingStairs = false,
  downhillJogging = false,
  idlePoseOverride,
  forcePrayBow = false,
  reducedMotion = false,
}: {
  agent: CompanionRuntimeState;
  config: CompanionAgentConfig;
  refs: HumanRigRefs;
  lookTargetX: number;
  lookTargetZ: number;
  elapsed: number;
  delta: number;
  groundY?: number;
  climbingStairs?: boolean;
  downhillJogging?: boolean;
  idlePoseOverride?: CharacterIdlePose;
  forcePrayBow?: boolean;
  reducedMotion?: boolean;
}): void {
  const speed = Math.hypot(agent.velX, agent.velZ);
  const strideRatio = THREE.MathUtils.clamp(speed / 2.55, 0, downhillJogging ? 1.25 : 1);

  const resolvedIdle: CharacterIdlePose = forcePrayBow
    ? 'pray_bow'
    : idlePoseOverride ?? config.idlePose;

  const headTargetYawOffset = forcePrayBow
    ? 0
    : computeRelativeHeadLookYaw(
        agent.posX,
        agent.posZ,
        agent.facingYaw,
        lookTargetX,
        lookTargetZ
      );

  animateCharacterRig({
    refs,
    posX: agent.posX,
    posZ: agent.posZ,
    facingYaw: agent.facingYaw,
    strideRatio,
    stridePhase: agent.stridePhase,
    elapsed,
    delta,
    groundY,
    climbingStairs,
    downhillJogging,
    idlePose: resolvedIdle,
    torsoBaseY: agent.id === 'srishti' ? 0.78 : 0.82,
    headTargetYawOffset,
    armGesturePhase: config.gesturePhase,
    reducedMotion,
  });
}
