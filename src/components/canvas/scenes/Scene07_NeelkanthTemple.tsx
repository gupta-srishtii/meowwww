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
  animateIshaanWalkRig,
  type CharacterIdlePose,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  NEELKANTH_CAFE_SEATS,
  NEELKANTH_CAFE_TABLE_CENTER,
  NEELKANTH_HOTSPOTS,
  NEELKANTH_OBSTACLES,
  NEELKANTH_WALK_BOUNDS,
  NeelkanthEnvironment,
} from '@/components/canvas/environment/NeelkanthEnvironment';
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
import { useProgressStore } from '@/store/progressStore';

export interface Scene07NeelkanthTempleProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  rangBell: boolean;
  bellSwingImpulseNonce: number;
  litDiya: boolean;
  hadDarshan: boolean;
  capturedFood?: boolean;
  eatingCafeActive?: boolean;
  activeDarshanPan: boolean;
  autoPlayMode?: boolean;
  onAutoTriggerHotspot?: (hotspotId: string) => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const CAM_DISTANCE = 5.2;
const CAM_LOOK_HEIGHT = 1.18;

function yawTowardTarget(fromX: number, fromZ: number, targetX: number, targetZ: number): number {
  return Math.atan2(-(targetX - fromX), -(targetZ - fromZ));
}

// Start together beside Ishaan in the outer bazaar entrance
const NEELKANTH_COMPANION_INIT: Record<FriendCompanionId, { x: number; z: number; yaw: number }> =
  {
    srishti: { x: -0.95, z: 11.45, yaw: 0.12 },
    friend_black_tee: { x: 1.35, z: 11.55, yaw: -0.18 },
    friend_plaid: { x: -0.55, z: 12.25, yaw: 0.08 },
  };

const NEELKANTH_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'srishti',
    followAngleOffset: -1.32,
    followDistance: 1.08,
    idlePose: 'chat_nod',
    gesturePhase: 0.2,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.68,
    followDistance: 1.82,
    idlePose: 'look_around',
    gesturePhase: 1.9,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: -0.4,
    followDistance: 2.15,
    idlePose: 'chat_nod',
    gesturePhase: 3.3,
  },
];

const PRAYER_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: {
    x: 0.44,
    z: -2.68,
    facingYaw: yawTowardTarget(0.44, -2.68, 0, -6.2),
  },
  friend_black_tee: {
    x: -1.16,
    z: -2.42,
    facingYaw: yawTowardTarget(-1.16, -2.42, 0, -6.2),
  },
  friend_plaid: {
    x: 1.18,
    z: -2.42,
    facingYaw: yawTowardTarget(1.18, -2.42, 0, -6.2),
  },
};

const CAFE_COMPANION_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: NEELKANTH_CAFE_SEATS.srishti,
  friend_black_tee: NEELKANTH_CAFE_SEATS.friend_black_tee,
  friend_plaid: NEELKANTH_CAFE_SEATS.friend_plaid,
};

const SCOOTER_RETURN_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: { x: 1.45, z: 25.1, facingYaw: Math.PI },
  friend_black_tee: { x: -0.95, z: 25.1, facingYaw: Math.PI },
  friend_plaid: { x: -1.85, z: 25.25, facingYaw: Math.PI },
};

/**
 * Scene 7 — Neelkanth Mahadev Temple.
 * Walkable temple bazaar -> carved Samudra Manthan Gopuram entrance -> flagstone courtyard,
 * brass bell, oil diya, Nandi & Garbhagriha prayer, and physical return walk to Scooters 1 & 2.
 */
export function Scene07_NeelkanthTemple({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  rangBell,
  bellSwingImpulseNonce,
  litDiya,
  hadDarshan,
  capturedFood = false,
  eatingCafeActive = false,
  activeDarshanPan,
  autoPlayMode = false,
  onAutoTriggerHotspot,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene07NeelkanthTempleProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Neelkanth Mahadev Temple.');
  }

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

  const companionRigsRef = useRef<CompanionRigMap | null>(null);
  const companionStatesRef = useRef(
    createCompanionStates(
      NEELKANTH_COMPANION_CONFIGS.map((cfg) => {
        const init = NEELKANTH_COMPANION_INIT[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: 0.15,
    posZ: 10.65,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.18,
    orbitPitch: 0.25,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
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
    if (transitionToken > 0) {
      onSceneReady(transitionToken, 7);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) {
      clock.getDelta();
    }
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

  const darshanElapsedRef = useRef(0);
  const cafeElapsedRef = useRef(0);
  const autoFiredSetRef = useRef(new Set<string>());

  useEffect(() => {
    useProgressStore.getState().setNeelkanthDarshanActive(activeDarshanPan);
    if (!activeDarshanPan) {
      darshanElapsedRef.current = 0;
    }
    return () => {
      useProgressStore.getState().setNeelkanthDarshanActive(false);
    };
  }, [activeDarshanPan]);

  useEffect(() => {
    if (!eatingCafeActive) {
      cafeElapsedRef.current = 0;
    }
  }, [eatingCafeActive]);

  useEffect(() => {
    autoFiredSetRef.current.clear();
  }, [transitionToken]);

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
    let idlePose: CharacterIdlePose = 'default';

    if (activeDarshanPan) {
      darshanElapsedRef.current += delta;
      // Align Ishaan cleanly in left-center of devotional lower-third arc facing Garbhagriha (-Z)
      sim.posX = THREE.MathUtils.damp(sim.posX, -0.38, 8, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, -2.65, 8, delta);
      sim.velX = 0;
      sim.velZ = 0;
      sim.facingYaw = THREE.MathUtils.damp(
        sim.facingYaw,
        yawTowardTarget(-0.38, -2.65, 0, -6.2),
        8,
        delta
      );
      idlePose = 'pray_bow';
    } else if (eatingCafeActive) {
      cafeElapsedRef.current += delta;
      sim.posX = NEELKANTH_CAFE_SEATS.ishaan.x;
      sim.posZ = NEELKANTH_CAFE_SEATS.ishaan.z;
      sim.velX = 0;
      sim.velZ = 0;
      sim.facingYaw = NEELKANTH_CAFE_SEATS.ishaan.facingYaw;
      idlePose = 'sit_eat';
    } else if (autoPlayMode && onAutoTriggerHotspot) {
      const targetId = !rangBell
        ? 'bell'
        : !litDiya
          ? 'diya'
          : !hadDarshan
            ? 'darshan'
            : !capturedFood
              ? 'neelkanth_food'
              : 'scooters';
      const targetSpot = NEELKANTH_HOTSPOTS.find((h) => h.id === targetId);
      if (targetSpot) {
        const dx = targetSpot.x - sim.posX;
        const dz = targetSpot.z - sim.posZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.72) {
          const step = Math.min(dist, WALK_SPEED_MPS * 0.92 * delta);
          sim.velX = (dx / dist) * WALK_SPEED_MPS * 0.92;
          sim.velZ = (dz / dist) * WALK_SPEED_MPS * 0.92;
          sim.posX += (dx / dist) * step;
          sim.posZ += (dz / dist) * step;
          sim.facingYaw = Math.atan2(-dx, -dz);
          walkSpeed = WALK_SPEED_MPS * 0.92;
          strideRatio = 0.88;
          sim.stridePhase += step * 3.8;
        } else if (!autoFiredSetRef.current.has(targetId)) {
          autoFiredSetRef.current.add(targetId);
          onAutoTriggerHotspot(targetId);
        }
      }
    } else {
      const moveDist = stepWalkSimulation(
        sim,
        walkInputRef.current,
        delta,
        NEELKANTH_WALK_BOUNDS,
        NEELKANTH_OBSTACLES
      );
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) {
        sim.stridePhase += moveDist * 3.8;
      }
    }

    // 1. Ishaan walk + genuine forward bow / café dining pose
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
      },
      posX: sim.posX,
      posZ: sim.posZ,
      facingYaw: sim.facingYaw,
      strideRatio,
      stridePhase: sim.stridePhase,
      elapsed: t,
      delta,
      idlePose,
      reducedMotion,
    });

    // 2. Friends follow through temple, pray together, sit together at Market Café, or walk to scooters
    const companionMode = activeDarshanPan
      ? 'prayer'
      : eatingCafeActive
        ? 'sit_dine'
        : sim.posZ > 19.2
          ? 'scooter_return'
          : 'follow';

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: NEELKANTH_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: NEELKANTH_WALK_BOUNDS,
      obstacles: NEELKANTH_OBSTACLES,
      delta,
      mode: companionMode,
      explicitTargets:
        companionMode === 'prayer'
          ? PRAYER_TARGETS
          : eatingCafeActive
            ? CAFE_COMPANION_TARGETS
            : companionMode === 'scooter_return'
              ? SCOOTER_RETURN_TARGETS
              : undefined,
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      const agents = companionStatesRef.current;
      for (let i = 0; i < agents.length; i += 1) {
        const agent = agents[i];
        const cfg = NEELKANTH_COMPANION_CONFIGS[i];
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) continue;
        const lookPeer = agents[(i + 1) % agents.length];
        applyCompanionRigFrame({
          agent,
          config: cfg,
          refs: rig,
          lookTargetX: eatingCafeActive
            ? NEELKANTH_CAFE_TABLE_CENTER.x
            : i % 2 === 0
              ? sim.posX
              : lookPeer.posX,
          lookTargetZ: eatingCafeActive
            ? NEELKANTH_CAFE_TABLE_CENTER.z
            : i % 2 === 0
              ? sim.posZ
              : lookPeer.posZ,
          elapsed: t,
          delta,
          forcePrayBow: activeDarshanPan,
          idlePoseOverride: eatingCafeActive
            ? i === 0
              ? 'sit_laugh'
              : 'sit_eat'
            : undefined,
          reducedMotion,
        });
      }
    }

    // 3. Clear wide-angle darshan camera (unobstructed behind all 4 friends facing Shivalinga) or café orbit
    if (activeDarshanPan) {
      const dPan = Math.min(1, darshanElapsedRef.current / 4.0);
      scratch.desiredCamPos.set(
        Math.sin(dPan * Math.PI) * 0.34,
        1.82 - dPan * 0.06,
        0.35 - dPan * 0.65
      );
      scratch.desiredLookAt.set(0, 1.32, -5.95);
    } else if (eatingCafeActive) {
      const cPan = Math.min(1, cafeElapsedRef.current / 4.2);
      scratch.desiredCamPos.set(
        0.55 + cPan * 0.65,
        1.92,
        18.65 - cPan * 0.55
      );
      scratch.desiredLookAt.set(
        NEELKANTH_CAFE_TABLE_CENTER.x,
        0.95,
        NEELKANTH_CAFE_TABLE_CENTER.z
      );
    } else {
      const horizDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
      const vertOffset = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
      scratch.desiredCamPos.set(
        sim.posX + Math.sin(sim.orbitYaw) * horizDist,
        vertOffset,
        sim.posZ + Math.cos(sim.orbitYaw) * horizDist
      );
      scratch.desiredLookAt.set(sim.posX, CAM_LOOK_HEIGHT, sim.posZ);
    }

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.desiredCamPos);
      scratch.smoothedLookAt.copy(scratch.desiredLookAt);
      sim.cameraInitialized = true;
    } else {
      const camSpeed = activeDarshanPan ? 4.5 : 9;
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        scratch.desiredCamPos.x,
        camSpeed,
        delta
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        scratch.desiredCamPos.y,
        camSpeed,
        delta
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        scratch.desiredCamPos.z,
        camSpeed,
        delta
      );

      scratch.smoothedLookAt.x = THREE.MathUtils.damp(
        scratch.smoothedLookAt.x,
        scratch.desiredLookAt.x,
        camSpeed + 2,
        delta
      );
      scratch.smoothedLookAt.y = THREE.MathUtils.damp(
        scratch.smoothedLookAt.y,
        scratch.desiredLookAt.y,
        camSpeed + 2,
        delta
      );
      scratch.smoothedLookAt.z = THREE.MathUtils.damp(
        scratch.smoothedLookAt.z,
        scratch.desiredLookAt.z,
        camSpeed + 2,
        delta
      );
    }
    camera.lookAt(scratch.smoothedLookAt);

    // 4. Hotspot proximity detection
    const nearest = activeDarshanPan
      ? null
      : findNearestWalkHotspot(sim.posX, sim.posZ, NEELKANTH_HOTSPOTS);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  return (
    <>
      <NeelkanthEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        rangBell={rangBell}
        bellSwingImpulseNonce={bellSwingImpulseNonce}
        litDiya={litDiya}
        hadDarshan={hadDarshan}
        capturedFood={capturedFood}
        activeDarshanPan={activeDarshanPan}
      />

      {/* Playable Ishaan avatar entering vibrant market passage toward colorful temple gate */}
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
        holdingFork={eatingCafeActive}
        position={[0.15, 0, 10.65]}
        castShadow={shadowsEnabled}
      />

      {/* Friends walking alongside Ishaan, joining prayer, sitting at Market Cafe, or walking to scooters */}
      <CompanionGroup
        initialPositions={NEELKANTH_COMPANION_INIT}
        holdingFork={eatingCafeActive}
        onRigsReady={handleRigsReady}
      />
    </>
  );
}
