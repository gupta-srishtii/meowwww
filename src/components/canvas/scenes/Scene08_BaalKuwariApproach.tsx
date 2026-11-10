'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ScooterPrototypeScene,
  type TelemetryRefs,
} from '@/components/canvas/ScooterPrototypeScene';
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
  BAAL_KUWARI_MAGGI_HOTSPOTS,
  BAAL_KUWARI_MAGGI_OBSTACLES,
  BAAL_KUWARI_MAGGI_SEAT_SLOTS,
  BAAL_KUWARI_MAGGI_TABLE_CENTER,
  BAAL_KUWARI_MAGGI_WALK_BOUNDS,
  BaalKuwariMaggiStopEnvironment,
} from '@/components/canvas/environment/BaalKuwariMaggiStopEnvironment';
import {
  applyCompanionRigFrame,
  createCompanionStates,
  stepGroupCompanions,
  type CompanionAgentConfig,
  type CompanionTargetSlot,
} from '@/hooks/useCompanionFollower';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import {
  WALK_SPEED_MPS,
  findNearestWalkHotspot,
  stepWalkSimulation,
  type WalkHotspot,
  type WalkInputState,
} from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { BaalKuwariSubStage } from '@/lib/mountainSpline';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene08BaalKuwariApproachProps {
  subStage: BaalKuwariSubStage;
  drivingInputRef: RefObject<DrivingInputState>;
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  resetNonce: number;
  startDistance: number;
  transitionToken: number;
  simulateMountFailure?: boolean;
  ateMaggi: boolean;
  eatingActive: boolean;
  onEatMaggiComplete: () => void;
  onArrivedChange: (arrived: boolean) => void;
  onAutoDowngradeQuality: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onEnterStaircase: () => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  telemetryRefs: TelemetryRefs;
}

const MAGGI_COMPANION_INIT: Record<FriendCompanionId, { x: number; z: number; yaw: number }> = {
  srishti: { x: -0.65, z: -0.58, yaw: -0.42 },
  friend_black_tee: { x: 1.85, z: -0.32, yaw: 0.55 },
  friend_plaid: { x: -1.65, z: 0.55, yaw: -0.82 },
};

const MAGGI_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'srishti',
    followAngleOffset: -1.32,
    followDistance: 1.08,
    idlePose: 'chat_nod',
    gesturePhase: 0.3,
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
    gesturePhase: 3.1,
  },
];

const SCOOTER_DEPART_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: { x: -0.95, z: 2.15, facingYaw: Math.PI },
  friend_black_tee: { x: 1.45, z: 2.05, facingYaw: Math.PI },
  friend_plaid: { x: 1.85, z: 2.38, facingYaw: Math.PI },
};

const ISHAAN_STAND_SAFE_POS = { x: 0.45, z: 0.24, facingYaw: 0 } as const;
const EATING_DURATION_SEC = 8.4;
const EATING_REDUCED_SEC = 2.0;
const CAM_DISTANCE = 5.0;

function MaggiStopWalkView({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  ateMaggi,
  eatingActive,
  onEatMaggiComplete,
  onNearbyHotspotChange,
  onSceneReady,
}: Omit<
  Scene08BaalKuwariApproachProps,
  | 'subStage'
  | 'drivingInputRef'
  | 'resetNonce'
  | 'startDistance'
  | 'simulateMountFailure'
  | 'onArrivedChange'
  | 'onAutoDowngradeQuality'
  | 'onEnterStaircase'
  | 'telemetryRefs'
>) {
  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

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
      MAGGI_COMPANION_CONFIGS.map((c) => {
        const init = MAGGI_COMPANION_INIT[c.id as FriendCompanionId];
        return { id: c.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: 0.35,
    posZ: 1.85,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.14,
    orbitPitch: 0.28,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
    eatTimer: 0,
    eatCompleted: false,
    wasEatingActive: false,
  });

  const scratch = useMemo(
    () => ({
      camPos: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      smoothLook: new THREE.Vector3(),
    }),
    []
  );

  const handleRigsReady = useCallback((rigs: CompanionRigMap) => {
    companionRigsRef.current = rigs;
  }, []);

  useEffect(() => {
    if (transitionToken > 0) {
      onSceneReady(transitionToken, 8);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) clock.getDelta();
  }, [paused, clock]);

  useEffect(() => {
    if (eatingActive) {
      simRef.current.eatTimer = 0;
      simRef.current.eatCompleted = false;
      simRef.current.wasEatingActive = true;
    } else if (simRef.current.wasEatingActive) {
      simRef.current.wasEatingActive = false;
      // Ensure Ishaan stands cleanly off his stool even if eating was skipped
      simRef.current.posX = ISHAAN_STAND_SAFE_POS.x;
      simRef.current.posZ = ISHAAN_STAND_SAFE_POS.z;
      simRef.current.velX = 0;
      simRef.current.velZ = 0;
      simRef.current.facingYaw = ISHAAN_STAND_SAFE_POS.facingYaw;
    }
  }, [eatingActive]);

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
    return () => onNearbyHotspotChange(null);
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

    if (eatingActive) {
      const dur = reducedMotion ? EATING_REDUCED_SEC : EATING_DURATION_SEC;
      sim.eatTimer += delta;
      const mapped = reducedMotion ? (sim.eatTimer / EATING_REDUCED_SEC) * EATING_DURATION_SEC : sim.eatTimer;
      const slot = BAAL_KUWARI_MAGGI_SEAT_SLOTS.ishaan;

      if (mapped < 1.35) {
        const distSeat = Math.hypot(slot.x - sim.posX, slot.z - sim.posZ);
        if (distSeat > 0.24) {
          sim.posX = THREE.MathUtils.damp(sim.posX, slot.x, 6.0, delta);
          sim.posZ = THREE.MathUtils.damp(sim.posZ, slot.z, 6.0, delta);
          sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, slot.facingYaw, 9, delta);
          sim.stridePhase += distSeat * delta * 12;
          strideRatio = 0.65;
        } else {
          // Sit immediately once close to stool center rather than standing upright on it
          sim.posX = THREE.MathUtils.damp(sim.posX, slot.x, 12, delta);
          sim.posZ = THREE.MathUtils.damp(sim.posZ, slot.z, 12, delta);
          sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, slot.facingYaw, 10, delta);
          playerIdlePose = 'sit_ready';
        }
      } else if (mapped < 6.9) {
        sim.posX = THREE.MathUtils.damp(sim.posX, slot.x, 14, delta);
        sim.posZ = THREE.MathUtils.damp(sim.posZ, slot.z, 14, delta);
        sim.facingYaw = slot.facingYaw;
        playerIdlePose =
          mapped < 2.2
            ? 'sit_ready'
            : mapped < 4.8
              ? 'sit_eat'
              : mapped < 5.9
                ? 'sit_sip'
                : 'sit_laugh';
      } else {
        // Stand up cleanly and step off the South stool onto open clearing ground before control resumes
        sim.posX = THREE.MathUtils.damp(sim.posX, ISHAAN_STAND_SAFE_POS.x, 6.5, delta);
        sim.posZ = THREE.MathUtils.damp(sim.posZ, ISHAAN_STAND_SAFE_POS.z, 6.5, delta);
        sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, ISHAAN_STAND_SAFE_POS.facingYaw, 8, delta);
        playerIdlePose = 'chat_nod';
      }

      if (!sim.eatCompleted && sim.eatTimer >= dur) {
        sim.eatCompleted = true;
        sim.posX = ISHAAN_STAND_SAFE_POS.x;
        sim.posZ = ISHAAN_STAND_SAFE_POS.z;
        onEatMaggiComplete();
      }
    } else {
      const moveDist = stepWalkSimulation(
        sim,
        walkInputRef.current,
        delta,
        BAAL_KUWARI_MAGGI_WALK_BOUNDS,
        BAAL_KUWARI_MAGGI_OBSTACLES
      );
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) sim.stridePhase += moveDist * 3.8;
    }

    const mappedEat = reducedMotion
      ? (sim.eatTimer / EATING_REDUCED_SEC) * EATING_DURATION_SEC
      : sim.eatTimer;
    const isSeatedPhase = eatingActive && mappedEat >= 1.0 && mappedEat < 6.9;

    const headLook = isSeatedPhase
      ? computeRelativeHeadLookYaw(
          sim.posX,
          sim.posZ,
          sim.facingYaw,
          BAAL_KUWARI_MAGGI_TABLE_CENTER.x,
          BAAL_KUWARI_MAGGI_TABLE_CENTER.z
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
      headTargetYawOffset: headLook,
      reducedMotion,
    });

    const distToTable = Math.hypot(
      sim.posX - BAAL_KUWARI_MAGGI_TABLE_CENTER.x,
      sim.posZ - BAAL_KUWARI_MAGGI_TABLE_CENTER.z
    );
    const compMode = eatingActive
      ? mappedEat < 1.35 || mappedEat >= 6.9
        ? 'gather'
        : 'sit_dine'
      : ateMaggi && sim.posZ > 0.8
        ? 'scooter_return'
        : distToTable < 2.65 && !ateMaggi
          ? 'gather'
          : 'follow';

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: MAGGI_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: BAAL_KUWARI_MAGGI_WALK_BOUNDS,
      obstacles: BAAL_KUWARI_MAGGI_OBSTACLES,
      delta,
      mode: compMode,
      explicitTargets:
        compMode === 'gather' || compMode === 'sit_dine'
          ? {
              srishti: BAAL_KUWARI_MAGGI_SEAT_SLOTS.srishti,
              friend_black_tee: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_black_tee,
              friend_plaid: BAAL_KUWARI_MAGGI_SEAT_SLOTS.friend_plaid,
            }
          : compMode === 'scooter_return'
            ? SCOOTER_DEPART_TARGETS
            : undefined,
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const cfg = MAGGI_COMPANION_CONFIGS[i];
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;
        let seatedPose: CharacterIdlePose | undefined;
        if (compMode === 'sit_dine') {
          if (mappedEat < 2.2) seatedPose = 'sit_ready';
          else if (mappedEat < 4.8) seatedPose = i === 0 ? 'sit_eat' : 'sit_laugh';
          else if (mappedEat < 5.9) seatedPose = 'sit_sip';
          else seatedPose = 'sit_laugh';
        }
        applyCompanionRigFrame({
          agent,
          config: cfg,
          refs: rig,
          lookTargetX:
            eatingActive || compMode === 'gather' ? BAAL_KUWARI_MAGGI_TABLE_CENTER.x : sim.posX,
          lookTargetZ:
            eatingActive || compMode === 'gather' ? BAAL_KUWARI_MAGGI_TABLE_CENTER.z : sim.posZ,
          elapsed: t,
          delta,
          idlePoseOverride: seatedPose,
          reducedMotion,
        });
      });
    }

    if (eatingActive) {
      scratch.camPos.set(
        BAAL_KUWARI_MAGGI_TABLE_CENTER.x + Math.sin(mappedEat * 0.25) * 2.55,
        2.15,
        BAAL_KUWARI_MAGGI_TABLE_CENTER.z + 2.95
      );
      scratch.lookAt.set(
        BAAL_KUWARI_MAGGI_TABLE_CENTER.x,
        0.95,
        BAAL_KUWARI_MAGGI_TABLE_CENTER.z
      );
    } else {
      const hDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
      const vOff = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
      scratch.camPos.set(
        sim.posX + Math.sin(sim.orbitYaw) * hDist,
        vOff,
        sim.posZ + Math.cos(sim.orbitYaw) * hDist
      );
      scratch.lookAt.set(sim.posX, 1.15, sim.posZ);
    }

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.camPos);
      scratch.smoothLook.copy(scratch.lookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.camPos.x, 8, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.camPos.y, 8, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.camPos.z, 8, delta);
      scratch.smoothLook.x = THREE.MathUtils.damp(scratch.smoothLook.x, scratch.lookAt.x, 10, delta);
      scratch.smoothLook.y = THREE.MathUtils.damp(scratch.smoothLook.y, scratch.lookAt.y, 10, delta);
      scratch.smoothLook.z = THREE.MathUtils.damp(scratch.smoothLook.z, scratch.lookAt.z, 10, delta);
    }
    camera.lookAt(scratch.smoothLook);

    const activeHotspots = BAAL_KUWARI_MAGGI_HOTSPOTS.filter((h) =>
      ateMaggi ? h.id !== 'back_to_road' : h.id !== 'ride_to_stairs'
    );
    const nearest = eatingActive
      ? null
      : findNearestWalkHotspot(sim.posX, sim.posZ, activeHotspots);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  return (
    <>
      <BaalKuwariMaggiStopEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        ateMaggi={ateMaggi}
        eatingActive={eatingActive}
      />

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
        position={[0.35, 0, 1.85]}
        holdingFork={eatingActive}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup
        initialPositions={MAGGI_COMPANION_INIT}
        holdingFork={eatingActive}
        onRigsReady={handleRigsReady}
      />
    </>
  );
}

/**
 * Scene 8 — Off-Road Route (`driving`), Roadside Maggi Clearing (`maggi_stop`),
 * and Post-Maggi Scooter Ride (`driving_to_stairs`) directly to Baal Kuwari Staircase Gate.
 */
export function Scene08_BaalKuwariApproach(props: Scene08BaalKuwariApproachProps) {
  if (props.simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari approach.');
  }

  if (props.subStage === 'maggi_stop') {
    return (
      <MaggiStopWalkView
        walkInputRef={props.walkInputRef}
        qualityProfile={props.qualityProfile}
        paused={props.paused}
        transitionToken={props.transitionToken}
        ateMaggi={props.ateMaggi}
        eatingActive={props.eatingActive}
        onEatMaggiComplete={props.onEatMaggiComplete}
        onNearbyHotspotChange={props.onNearbyHotspotChange}
        onSceneReady={props.onSceneReady}
      />
    );
  }

  const activeSegment =
    props.subStage === 'driving_to_stairs' ? 'to_baalkuwari_stairs' : 'to_baalkuwari';

  return (
    <ScooterPrototypeScene
      inputRef={props.drivingInputRef}
      qualityProfile={props.qualityProfile}
      paused={props.paused}
      resetNonce={props.resetNonce}
      roadSegment={activeSegment}
      startDistance={props.startDistance}
      transitionToken={props.transitionToken}
      onSceneReady={(_token, _sceneId) => props.onSceneReady(props.transitionToken, 8)}
      onArrivedChange={props.onArrivedChange}
      onAutoDowngradeQuality={props.onAutoDowngradeQuality}
      telemetryRefs={props.telemetryRefs}
    />
  );
}
