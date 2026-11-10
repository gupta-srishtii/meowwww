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
import { animateSrishtiWalkRig } from '@/components/canvas/characters/animateCharacterRig';
import {
  HOTEL_HOTSPOTS,
  HOTEL_OBSTACLES,
  HOTEL_WALK_BOUNDS,
  HotelReturnEnvironment,
} from '@/components/canvas/environment/HotelReturnEnvironment';
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

export interface Scene12HotelReturnProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  farewellDone: boolean;
  capturedPolaroid: boolean;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const HOTEL_COMPANION_INIT: Record<FriendCompanionId, { x: number; z: number; yaw: number }> = {
  ishaan: { x: -0.95, z: 2.35, yaw: 0.1 },
  friend_black_tee: { x: 1.05, z: 2.45, yaw: -0.15 },
  friend_plaid: { x: -0.35, z: 2.85, yaw: 0.05 },
};

const HOTEL_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'ishaan',
    followAngleOffset: -0.42,
    followDistance: 1.45,
    idlePose: 'chat_nod',
    gesturePhase: 0.3,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.42,
    followDistance: 1.55,
    idlePose: 'look_around',
    gesturePhase: 1.7,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: 0.06,
    followDistance: 1.95,
    idlePose: 'chat_nod',
    gesturePhase: 3.1,
  },
];

// When Srishti rejoins her original group near the hotel stairs, Ishaan, Manish & Yash wave warmly from courtyard steps
const FAREWELL_TARGETS: Record<FriendCompanionId, CompanionTargetSlot> = {
  ishaan: { x: -1.15, z: -0.55, facingYaw: -0.75 },
  friend_black_tee: { x: -2.0, z: -0.9, facingYaw: -0.8 },
  friend_plaid: { x: -1.75, z: 0.15, facingYaw: -0.65 },
};

const CAM_DISTANCE = 5.1;

/**
 * Scene 12 — Rishikesh Hotel Return, Srishti Rejoining Original Friends & Gentle Farewell.
 * Depicts the shared hotel courtyard (Srishti's 1st floor / Ishaan & friends' ground floor)
 * without depicting a bus-stand dropoff.
 */
export function Scene12_HotelReturn({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  farewellDone,
  capturedPolaroid,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene12HotelReturnProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Rishikesh Hotel Return.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const playerGroupRef = useRef<THREE.Group>(null);
  const playerTorsoRef = useRef<THREE.Group>(null);
  const playerHeadRef = useRef<THREE.Group>(null);
  const playerHairRef = useRef<THREE.Group>(null);
  const playerBagRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const companionRigsRef = useRef<CompanionRigMap | null>(null);
  const companionStatesRef = useRef(
    createCompanionStates(
      HOTEL_COMPANION_CONFIGS.map((cfg) => {
        const init = HOTEL_COMPANION_INIT[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: 0.1,
    posZ: 1.95,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.16,
    orbitPitch: 0.25,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
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
      onSceneReady(transitionToken, 12);
    }
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

  useEffect(() => {
    return () => onNearbyHotspotChange(null);
  }, [onNearbyHotspotChange]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    const moveDist = stepWalkSimulation(
      sim,
      walkInputRef.current,
      delta,
      HOTEL_WALK_BOUNDS,
      HOTEL_OBSTACLES
    );
    const walkSpeed = Math.hypot(sim.velX, sim.velZ);
    const strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
    if (strideRatio > 0.03) sim.stridePhase += moveDist * 3.8;

    animateSrishtiWalkRig({
      refs: {
        group: playerGroupRef.current,
        torso: playerTorsoRef.current,
        head: playerHeadRef.current,
        hairTail: playerHairRef.current,
        bag: playerBagRef.current,
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
      idlePose: farewellDone && walkSpeed < 0.1 ? 'group_wave' : 'default',
      reducedMotion,
    });

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: HOTEL_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: HOTEL_WALK_BOUNDS,
      obstacles: HOTEL_OBSTACLES,
      delta,
      mode: farewellDone ? 'gather' : 'follow',
      explicitTargets: farewellDone ? FAREWELL_TARGETS : undefined,
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;
        applyCompanionRigFrame({
          agent,
          config: HOTEL_COMPANION_CONFIGS[i],
          refs: rig,
          lookTargetX: sim.posX,
          lookTargetZ: sim.posZ,
          elapsed: t,
          delta,
          idlePoseOverride: farewellDone ? 'group_wave' : undefined,
          reducedMotion,
        });
      });
    }

    const hDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
    const vOff = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
    scratch.camPos.set(
      sim.posX + Math.sin(sim.orbitYaw) * hDist,
      vOff,
      sim.posZ + Math.cos(sim.orbitYaw) * hDist
    );
    scratch.lookAt.set(sim.posX, 1.18, sim.posZ);

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.camPos);
      scratch.smoothLook.copy(scratch.lookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.camPos.x, 8.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.camPos.y, 8.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.camPos.z, 8.5, delta);
      scratch.smoothLook.x = THREE.MathUtils.damp(scratch.smoothLook.x, scratch.lookAt.x, 10, delta);
      scratch.smoothLook.y = THREE.MathUtils.damp(scratch.smoothLook.y, scratch.lookAt.y, 10, delta);
      scratch.smoothLook.z = THREE.MathUtils.damp(scratch.smoothLook.z, scratch.lookAt.z, 10, delta);
    }
    camera.lookAt(scratch.smoothLook);

    const activeSpots = HOTEL_HOTSPOTS.filter((h) => !(farewellDone && h.id === 'rejoin_farewell'));
    const nearest = findNearestWalkHotspot(sim.posX, sim.posZ, activeSpots);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  return (
    <>
      <HotelReturnEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        farewellDone={farewellDone}
        capturedPolaroid={capturedPolaroid}
      />

      <StylizedPlaceholderCharacter
        characterVariant="srishti"
        groupRef={playerGroupRef}
        torsoRef={playerTorsoRef}
        headRef={playerHeadRef}
        hairTailRef={playerHairRef}
        bagRef={playerBagRef}
        leftLegRef={leftLegRef}
        leftKneeRef={leftKneeRef}
        rightLegRef={rightLegRef}
        rightKneeRef={rightKneeRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        position={[0.1, 0, 1.95]}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup initialPositions={HOTEL_COMPANION_INIT} onRigsReady={handleRigsReady} />
    </>
  );
}

