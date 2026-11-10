'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import {
  CompanionGroup,
  type CompanionRigMap,
  type FriendCompanionId,
} from '@/components/canvas/characters/CompanionGroup';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import {
  animateIshaanWalkRig,
  computeRelativeHeadLookYaw,
  type CharacterIdlePose,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  DHABA_HOTSPOTS,
  DHABA_OBSTACLES,
  DHABA_SEAT_SLOTS,
  DHABA_TABLE_CENTER,
  DHABA_WALK_BOUNDS,
  DhabaEnvironment,
} from '@/components/canvas/environment/DhabaEnvironment';
import {
  applyCompanionRigFrame,
  createCompanionStates,
  stepGroupCompanions,
  type CompanionAgentConfig,
  type CompanionTargetSlot,
} from '@/hooks/useCompanionFollower';
import {
  WALK_SPEED_MPS,
  findNearestWalkHotspot,
  stepWalkSimulation,
  type WalkHotspot,
  type WalkInputState,
} from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export type FoodCinematicBeat = 'gather' | 'sit' | 'serve' | 'eat_laugh' | 'pullback';

export interface Scene06MaggiChaiProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  ateMaggi: boolean;
  sippedChai: boolean;
  capturedPolaroid: boolean;
  foodCinematicActive: boolean;
  onFoodCinematicComplete: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const CAM_DISTANCE = 5.0;
const CAM_LOOK_HEIGHT = 1.1;
const CINEMATIC_DURATION_SEC = 20.0;
const CINEMATIC_REDUCED_DURATION_SEC = 2.6;

const DHABA_COMPANION_INIT: Record<FriendCompanionId, { x: number; z: number; yaw: number }> = {
  srishti: { x: DHABA_SEAT_SLOTS.srishti.x, z: DHABA_SEAT_SLOTS.srishti.z, yaw: DHABA_SEAT_SLOTS.srishti.facingYaw },
  friend_black_tee: {
    x: DHABA_SEAT_SLOTS.friend_black_tee.x,
    z: DHABA_SEAT_SLOTS.friend_black_tee.z,
    yaw: DHABA_SEAT_SLOTS.friend_black_tee.facingYaw,
  },
  friend_plaid: {
    x: DHABA_SEAT_SLOTS.friend_plaid.x,
    z: DHABA_SEAT_SLOTS.friend_plaid.z,
    yaw: DHABA_SEAT_SLOTS.friend_plaid.facingYaw,
  },
};

const DHABA_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'srishti',
    followAngleOffset: -1.32,
    followDistance: 1.08,
    idlePose: 'chat_nod',
    gesturePhase: 0.0,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.72,
    followDistance: 1.82,
    idlePose: 'look_around',
    gesturePhase: 1.8,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: -0.42,
    followDistance: 2.18,
    idlePose: 'chat_nod',
    gesturePhase: 3.4,
  },
];

const TABLE_COMPANION_SLOTS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: DHABA_SEAT_SLOTS.srishti,
  friend_black_tee: DHABA_SEAT_SLOTS.friend_black_tee,
  friend_plaid: DHABA_SEAT_SLOTS.friend_plaid,
};

const DHABA_SCOOTER_RETURN_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: { x: 1.35, z: 2.55, facingYaw: Math.PI },
  friend_black_tee: { x: -0.75, z: 2.55, facingYaw: Math.PI },
  friend_plaid: { x: -1.75, z: 2.6, facingYaw: Math.PI },
};

function smoothRange(t: number, start: number, end: number): number {
  const u = THREE.MathUtils.clamp((t - start) / Math.max(0.001, end - start), 0, 1);
  return u * u * (3 - 2 * u);
}

/**
 * Evaluates smooth 5-shot camera motion across the 20-second automatic food memory sequence.
 */
function sampleFoodCinematicCamera(
  elapsedSec: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3
): void {
  if (elapsedSec < 4.0) {
    // Shot 1: Wide establishing framing mountain valley backdrop, tapri, & 4 friends gathering
    const u = smoothRange(elapsedSec, 0.0, 4.0);
    outPos.set(
      THREE.MathUtils.lerp(4.75, 4.05, u),
      THREE.MathUtils.lerp(2.55, 2.1, u),
      THREE.MathUtils.lerp(2.05, 0.85, u)
    );
    outLook.set(
      THREE.MathUtils.lerp(-0.2, 0.35, u),
      THREE.MathUtils.lerp(1.08, 1.0, u),
      THREE.MathUtils.lerp(-2.05, -1.78, u)
    );
    return;
  }

  if (elapsedSec < 7.2) {
    // Shot 2: Smooth dolly-in as everyone sits onto stools around the table
    const u = smoothRange(elapsedSec, 4.0, 7.2);
    outPos.set(
      THREE.MathUtils.lerp(4.05, 2.75, u),
      THREE.MathUtils.lerp(2.1, 1.54, u),
      THREE.MathUtils.lerp(0.85, -0.1, u)
    );
    outLook.set(
      THREE.MathUtils.lerp(0.35, 0.55, u),
      THREE.MathUtils.lerp(1.0, 0.96, u),
      THREE.MathUtils.lerp(-1.78, -1.75, u)
    );
    return;
  }

  if (elapsedSec < 11.4) {
    // Shot 3: Pan smoothly to open stall serving steaming Maggi & kulhad chai, then follow tray to table
    if (elapsedSec < 9.3) {
      const u = smoothRange(elapsedSec, 7.2, 9.3);
      outPos.set(
        THREE.MathUtils.lerp(2.75, 0.15, u),
        THREE.MathUtils.lerp(1.54, 1.62, u),
        THREE.MathUtils.lerp(-0.1, -0.25, u)
      );
      outLook.set(
        THREE.MathUtils.lerp(0.55, -2.35, u),
        THREE.MathUtils.lerp(0.96, 1.24, u),
        THREE.MathUtils.lerp(-1.75, -2.45, u)
      );
    } else {
      const u = smoothRange(elapsedSec, 9.3, 11.4);
      outPos.set(
        THREE.MathUtils.lerp(0.15, -0.35, u),
        THREE.MathUtils.lerp(1.62, 1.48, u),
        THREE.MathUtils.lerp(-0.25, -0.32, u)
      );
      outLook.set(
        THREE.MathUtils.lerp(-2.35, 0.55, u),
        THREE.MathUtils.lerp(1.24, 0.96, u),
        THREE.MathUtils.lerp(-2.45, -1.75, u)
      );
    }
    return;
  }

  if (elapsedSec < 16.8) {
    // Shot 4: Warm medium orbit around the four friends eating, sipping & laughing
    const u = smoothRange(elapsedSec, 11.4, 16.8);
    const orbitAngle = THREE.MathUtils.lerp(-0.34, 1.15, u);
    const orbitRadius = THREE.MathUtils.lerp(2.72, 2.95, Math.sin(u * Math.PI));
    outPos.set(
      DHABA_TABLE_CENTER.x + Math.sin(orbitAngle) * orbitRadius,
      1.48 + Math.sin(u * Math.PI) * 0.12,
      DHABA_TABLE_CENTER.z + Math.cos(orbitAngle) * orbitRadius
    );
    outLook.set(DHABA_TABLE_CENTER.x, 0.96, DHABA_TABLE_CENTER.z);
    return;
  }

  // Shot 5: Gentle pullback panorama framing group & misty mountain scenery before return to play
  const u = smoothRange(elapsedSec, 16.8, CINEMATIC_DURATION_SEC);
  const startAngle = 1.15;
  const startX = DHABA_TABLE_CENTER.x + Math.sin(startAngle) * 2.72;
  const startZ = DHABA_TABLE_CENTER.z + Math.cos(startAngle) * 2.72;
  outPos.set(
    THREE.MathUtils.lerp(startX, 1.65, u),
    THREE.MathUtils.lerp(1.48, 2.25, u),
    THREE.MathUtils.lerp(startZ, 1.55, u)
  );
  outLook.set(
    THREE.MathUtils.lerp(DHABA_TABLE_CENTER.x, 0.3, u),
    THREE.MathUtils.lerp(0.96, 1.15, u),
    THREE.MathUtils.lerp(DHABA_TABLE_CENTER.z, -2.35, u)
  );
}

/**
 * Scene 6 — Maggi & Chai Stop.
 * Third-person exploration with distinct companion states (`FOLLOW`, `GATHER`, `SIT_AND_EAT`,
 * `CHAT`, `RETURN`) and automatic 20s cinematic dining sequence on joining friends.
 */
export function Scene06_MaggiChai({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  ateMaggi,
  sippedChai,
  capturedPolaroid,
  foodCinematicActive,
  onFoodCinematicComplete,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene06MaggiChaiProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Maggi & Chai Stop.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  // Ishaan player limb refs
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
  const companionStatesRef = useRef(
    createCompanionStates(
      DHABA_COMPANION_CONFIGS.map((cfg) => {
        const init = DHABA_COMPANION_INIT[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  // Discrete food cutscene prop states updated only at beat transitions (zero per-frame re-renders)
  const cinematicTimeRef = useRef<number | null>(null);
  const [cutsceneProps, setCutsceneProps] = useState<{
    tableServed: boolean;
    helperCarryingTray: boolean;
    holdingFork: boolean;
    holdingCup: boolean;
  }>({
    tableServed: false,
    helperCarryingTray: false,
    holdingFork: false,
    holdingCup: false,
  });

  const simRef = useRef({
    posX: 0.25,
    posZ: 1.75,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.24,
    orbitPitch: 0.26,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
    wasFoodCinematicActive: false,
    finishedNotified: false,
  });

  const scratch = useMemo(
    () => ({
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
    onSceneReady(transitionToken, 6);
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) {
      clock.getDelta();
    }
  }, [paused, clock]);

  useEffect(() => {
    if (foodCinematicActive) {
      cinematicTimeRef.current = 0;
      simRef.current.wasFoodCinematicActive = true;
      simRef.current.finishedNotified = false;
    } else {
      cinematicTimeRef.current = null;
      if (simRef.current.wasFoodCinematicActive) {
        simRef.current.wasFoodCinematicActive = false;
        // Return Ishaan cleanly beside his seat (south of South stool, clear of obstacle radius) after standing up
        simRef.current.posX = DHABA_SEAT_SLOTS.ishaan.x;
        simRef.current.posZ = -0.12;
        simRef.current.velX = 0;
        simRef.current.velZ = 0;
      }
      setCutsceneProps({
        tableServed: false,
        helperCarryingTray: false,
        holdingFork: false,
        holdingCup: false,
      });
    }
  }, [foodCinematicActive]);

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

  useEffect(() => {
    return () => {
      onNearbyHotspotChange(null);
    };
  }, [onNearbyHotspotChange]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;

    let strideRatio = 0;
    let walkSpeed = 0;
    let playerIdlePose: CharacterIdlePose = 'default';
    let diningCompanionPose: CharacterIdlePose | undefined;
    let diningHeadLookTarget: { x: number; z: number } | null = null;

    if (foodCinematicActive) {
      const currentCTime = (cinematicTimeRef.current ?? 0) + delta;
      cinematicTimeRef.current = currentCTime;

      const totalDur = reducedMotion ? CINEMATIC_REDUCED_DURATION_SEC : CINEMATIC_DURATION_SEC;
      if (currentCTime >= totalDur) {
        if (!sim.finishedNotified) {
          sim.finishedNotified = true;
          onFoodCinematicComplete();
        }
        return;
      }

      // Sync lightweight discrete props cleanly only on transitions
      const mappedTime = reducedMotion
        ? (currentCTime / CINEMATIC_REDUCED_DURATION_SEC) * CINEMATIC_DURATION_SEC
        : currentCTime;

      const nextServed = mappedTime >= 9.6;
      const nextTray = mappedTime >= 6.8 && mappedTime < 9.8;
      const nextFork = mappedTime >= 9.8 && mappedTime < 14.3;
      const nextCup = mappedTime >= 14.3 && mappedTime < 16.0;
      if (
        nextServed !== cutsceneProps.tableServed ||
        nextTray !== cutsceneProps.helperCarryingTray ||
        nextFork !== cutsceneProps.holdingFork ||
        nextCup !== cutsceneProps.holdingCup
      ) {
        setCutsceneProps({
          tableServed: nextServed,
          helperCarryingTray: nextTray,
          holdingFork: nextFork,
          holdingCup: nextCup,
        });
      }

      // Walk Ishaan smoothly onto the South stool, sit, eat/sip/laugh, then stand cleanly
      if (mappedTime < 3.6) {
        const dx = DHABA_SEAT_SLOTS.ishaan.x - sim.posX;
        const dz = DHABA_SEAT_SLOTS.ishaan.z - sim.posZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.06) {
          const step = Math.min(dist, 2.6 * delta);
          sim.posX += (dx / dist) * step;
          sim.posZ += (dz / dist) * step;
          sim.stridePhase += step * 3.8;
          strideRatio = 0.72;
          const moveYaw = Math.atan2(-(dx / dist), -(dz / dist));
          let diff = moveYaw - sim.facingYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sim.facingYaw += diff * (1 - Math.exp(-10 * delta));
        } else {
          sim.posX = THREE.MathUtils.damp(sim.posX, DHABA_SEAT_SLOTS.ishaan.x, 10, delta);
          sim.posZ = THREE.MathUtils.damp(sim.posZ, DHABA_SEAT_SLOTS.ishaan.z, 10, delta);
          let diff = DHABA_SEAT_SLOTS.ishaan.facingYaw - sim.facingYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sim.facingYaw += diff * (1 - Math.exp(-10 * delta));
        }
      } else if (mappedTime < 18.2) {
        sim.posX = THREE.MathUtils.damp(sim.posX, DHABA_SEAT_SLOTS.ishaan.x, 10, delta);
        sim.posZ = THREE.MathUtils.damp(sim.posZ, DHABA_SEAT_SLOTS.ishaan.z, 10, delta);
        let diff = DHABA_SEAT_SLOTS.ishaan.facingYaw - sim.facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        sim.facingYaw += diff * (1 - Math.exp(-10 * delta));

        if (mappedTime < 9.8) {
          playerIdlePose = 'sit_ready';
          diningCompanionPose = 'sit_ready';
        } else if (mappedTime < 14.3) {
          playerIdlePose = 'sit_eat';
          diningCompanionPose = 'sit_eat';
        } else if (mappedTime < 16.0) {
          playerIdlePose = 'sit_sip';
          diningCompanionPose = 'sit_sip';
        } else {
          playerIdlePose = 'sit_laugh';
          diningCompanionPose = 'sit_laugh';
        }
        diningHeadLookTarget =
          mappedTime >= 7.2 && mappedTime < 9.8
            ? { x: -2.2, z: -2.2 }
            : { x: DHABA_TABLE_CENTER.x, z: DHABA_TABLE_CENTER.z };
      } else {
        // Gentle stand up cleanly behind the South stool before handing back control
        sim.posZ = THREE.MathUtils.damp(sim.posZ, -0.12, 5, delta);
        playerIdlePose = 'chat_nod';
        diningCompanionPose = 'chat_nod';
      }

      // Companions enter GATHER -> SIT_DINE -> CHAT across cutscene beats
      stepGroupCompanions({
        agents: companionStatesRef.current,
        configs: DHABA_COMPANION_CONFIGS,
        playerX: sim.posX,
        playerZ: sim.posZ,
        playerFacingYaw: sim.facingYaw,
        playerSpeed: walkSpeed,
        bounds: DHABA_WALK_BOUNDS,
        obstacles: DHABA_OBSTACLES,
        delta,
        mode: mappedTime >= 3.6 && mappedTime < 18.2 ? 'sit_dine' : 'gather',
        explicitTargets: TABLE_COMPANION_SLOTS,
      });

      // Cinematic 5-shot smoothly interpolated camera
      if (reducedMotion) {
        scratch.desiredCamPos.set(2.9, 1.7, 0.25);
        scratch.desiredLookAt.set(DHABA_TABLE_CENTER.x, 1.0, DHABA_TABLE_CENTER.z);
      } else {
        sampleFoodCinematicCamera(mappedTime, scratch.desiredCamPos, scratch.desiredLookAt);
      }
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.desiredCamPos.x, 5.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.desiredCamPos.y, 5.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.desiredCamPos.z, 5.5, delta);
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
      camera.lookAt(scratch.smoothedLookAt);
    } else {
      // Standard third-person walk exploration
      const moveDist = stepWalkSimulation(
        sim,
        walkInputRef.current,
        delta,
        DHABA_WALK_BOUNDS,
        DHABA_OBSTACLES
      );
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) {
        sim.stridePhase += moveDist * 3.8;
      }

      const distToTable = Math.hypot(
        sim.posX - DHABA_TABLE_CENTER.x,
        sim.posZ - DHABA_TABLE_CENTER.z
      );
      const returningToScooters =
        sim.posZ > 2.0 && (ateMaggi || sippedChai || capturedPolaroid);
      const nearTableGather = !returningToScooters && distToTable < 2.25;

      const companionMode = returningToScooters
        ? 'scooter_return'
        : nearTableGather
          ? 'gather'
          : 'follow';

      stepGroupCompanions({
        agents: companionStatesRef.current,
        configs: DHABA_COMPANION_CONFIGS,
        playerX: sim.posX,
        playerZ: sim.posZ,
        playerFacingYaw: sim.facingYaw,
        playerSpeed: walkSpeed,
        bounds: DHABA_WALK_BOUNDS,
        obstacles: DHABA_OBSTACLES,
        delta,
        mode: companionMode,
        explicitTargets: returningToScooters
          ? DHABA_SCOOTER_RETURN_TARGETS
          : nearTableGather
            ? TABLE_COMPANION_SLOTS
            : undefined,
      });

      const horizDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
      const vertOffset = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
      scratch.desiredCamPos.set(
        sim.posX + Math.sin(sim.orbitYaw) * horizDist,
        vertOffset,
        sim.posZ + Math.cos(sim.orbitYaw) * horizDist
      );
      scratch.desiredLookAt.set(sim.posX, CAM_LOOK_HEIGHT, sim.posZ);

      if (!sim.cameraInitialized) {
        camera.position.copy(scratch.desiredCamPos);
        scratch.smoothedLookAt.copy(scratch.desiredLookAt);
        sim.cameraInitialized = true;
      } else {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          scratch.desiredCamPos.x,
          9,
          delta
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          scratch.desiredCamPos.y,
          9,
          delta
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          scratch.desiredCamPos.z,
          9,
          delta
        );

        scratch.smoothedLookAt.x = THREE.MathUtils.damp(
          scratch.smoothedLookAt.x,
          scratch.desiredLookAt.x,
          12,
          delta
        );
        scratch.smoothedLookAt.y = THREE.MathUtils.damp(
          scratch.smoothedLookAt.y,
          scratch.desiredLookAt.y,
          12,
          delta
        );
        scratch.smoothedLookAt.z = THREE.MathUtils.damp(
          scratch.smoothedLookAt.z,
          scratch.desiredLookAt.z,
          12,
          delta
        );
      }
      camera.lookAt(scratch.smoothedLookAt);
    }

    // Apply articulated Ishaan animation (walking / gathering / sitting / eating / sipping / laughing)
    const ishaanLookYaw = diningHeadLookTarget
      ? computeRelativeHeadLookYaw(
          sim.posX,
          sim.posZ,
          sim.facingYaw,
          diningHeadLookTarget.x,
          diningHeadLookTarget.z
        )
      : 0;

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
      posX: sim.posX,
      posZ: sim.posZ,
      facingYaw: sim.facingYaw,
      strideRatio,
      stridePhase: sim.stridePhase,
      elapsed: t,
      delta,
      idlePose: playerIdlePose,
      headTargetYawOffset: ishaanLookYaw,
      armGesturePhase: 0.7,
      reducedMotion,
    });

    // Apply articulated companion animations across FOLLOW, GATHER, SIT_AND_EAT, CHAT, RETURN
    const rigs = companionRigsRef.current;
    if (rigs) {
      const agents = companionStatesRef.current;
      for (let i = 0; i < agents.length; i += 1) {
        const agent = agents[i];
        const cfg = DHABA_COMPANION_CONFIGS[i];
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) continue;

        const lookPeer = agents[(i + 1) % agents.length];
        const lookX =
          diningHeadLookTarget !== null
            ? i === 0
              ? DHABA_SEAT_SLOTS.ishaan.x
              : lookPeer.posX
            : i % 2 === 0
              ? sim.posX
              : lookPeer.posX;
        const lookZ =
          diningHeadLookTarget !== null
            ? i === 0
              ? DHABA_SEAT_SLOTS.ishaan.z
              : lookPeer.posZ
            : i % 2 === 0
              ? sim.posZ
              : lookPeer.posZ;

        applyCompanionRigFrame({
          agent,
          config: cfg,
          refs: rig,
          lookTargetX: lookX,
          lookTargetZ: lookZ,
          elapsed: t,
          delta,
          idlePoseOverride: diningCompanionPose,
          reducedMotion,
        });
      }
    }

    // Hotspot proximity detection disabled cleanly during cutscene
    const nearest = foodCinematicActive
      ? null
      : findNearestWalkHotspot(sim.posX, sim.posZ, DHABA_HOTSPOTS);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  const holdingChaiDisplay = foodCinematicActive
    ? cutsceneProps.holdingCup
    : sippedChai;
  const holdingForkDisplay = foodCinematicActive && cutsceneProps.holdingFork;

  return (
    <>
      <DhabaEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        ateMaggi={ateMaggi}
        sippedChai={sippedChai}
        capturedPolaroid={capturedPolaroid}
        foodCinematicTimeRef={cinematicTimeRef}
        tableServed={cutsceneProps.tableServed}
        helperCarryingTray={cutsceneProps.helperCarryingTray}
      />

      {/* Parked Scooters along roadside facing onward (+X) */}
      <group position={[1.3, 0, 3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.2, 0, 3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Playable Ishaan avatar walking & dining with friends */}
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
        holdingFork={holdingForkDisplay}
        holdingChaiCup={foodCinematicActive && cutsceneProps.holdingCup}
        position={[0.25, 0, 1.75]}
        castShadow={shadowsEnabled}
      />

      {/* Friends around table / following / sitting & dining / returning to scooters */}
      <CompanionGroup
        initialPositions={DHABA_COMPANION_INIT}
        holdingChaiCup={holdingChaiDisplay}
        holdingFork={holdingForkDisplay}
        onRigsReady={handleRigsReady}
      />
    </>
  );
}
