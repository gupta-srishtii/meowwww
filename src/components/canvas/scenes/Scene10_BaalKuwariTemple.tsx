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
import { animateIshaanWalkRig } from '@/components/canvas/characters/animateCharacterRig';
import {
  BAAL_KUWARI_TEMPLE_HOTSPOTS,
  BAAL_KUWARI_TEMPLE_OBSTACLES,
  BAAL_KUWARI_TEMPLE_WALK_BOUNDS,
  BaalKuwariTempleEnvironment,
} from '@/components/canvas/environment/BaalKuwariTempleEnvironment';
import {
  applyCompanionRigFrame,
  createCompanionStates,
  stepGroupCompanions,
  type CompanionAgentConfig,
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

export interface Scene10BaalKuwariTempleProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  arrivalCinematicActive: boolean;
  onArrivalCinematicComplete: () => void;
  rangBell: boolean;
  bellImpulseNonce: number;
  capturedPolaroid: boolean;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const TEMPLE_COMPANION_INIT: Record<FriendCompanionId, { x: number; z: number; yaw: number }> = {
  srishti: { x: -1.05, z: 3.1, yaw: 0.1 },
  friend_black_tee: { x: 1.2, z: 3.3, yaw: -0.15 },
  friend_plaid: { x: -0.45, z: 3.9, yaw: 0.05 },
};

const TEMPLE_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'srishti',
    followAngleOffset: -0.58,
    followDistance: 1.45,
    idlePose: 'chat_nod',
    gesturePhase: 0.4,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.62,
    followDistance: 1.6,
    idlePose: 'look_around',
    gesturePhase: 1.8,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: -0.12,
    followDistance: 2.0,
    idlePose: 'look_around',
    gesturePhase: 3.1,
  },
];

const CAM_DISTANCE = 5.1;

/**
 * Scene 10 — Peaceful Summit Sanctuary at Baal Kuwari Temple.
 * Third-person exploration as Ishaan arriving with Srishti, Manish & Yash.
 */
export function Scene10_BaalKuwariTemple({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  arrivalCinematicActive,
  onArrivalCinematicComplete,
  rangBell,
  bellImpulseNonce,
  capturedPolaroid,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene10BaalKuwariTempleProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari Temple.');
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
      TEMPLE_COMPANION_CONFIGS.map((cfg) => {
        const init = TEMPLE_COMPANION_INIT[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: 0.1,
    posZ: 3.4,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.16,
    orbitPitch: 0.25,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
    arrivalTimer: 0,
    arrivalDone: false,
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
      onSceneReady(transitionToken, 10);
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
    if (arrivalCinematicActive) {
      simRef.current.arrivalTimer = 0;
      simRef.current.arrivalDone = false;
    }
  }, [arrivalCinematicActive]);

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

    if (arrivalCinematicActive) {
      const dur = reducedMotion ? 0.65 : 4.2;
      sim.arrivalTimer += delta;
      sim.velX = 0;
      sim.velZ = 0;
      sim.posZ = THREE.MathUtils.damp(sim.posZ, 1.4, 1.8, delta);
      if (Math.abs(sim.posZ - 1.4) > 0.1) {
        strideRatio = 0.55;
        sim.stridePhase += delta * 5.2;
      }
      if (!sim.arrivalDone && sim.arrivalTimer >= dur) {
        sim.arrivalDone = true;
        onArrivalCinematicComplete();
      }
    } else {
      const moveDist = stepWalkSimulation(
        sim,
        walkInputRef.current,
        delta,
        BAAL_KUWARI_TEMPLE_WALK_BOUNDS,
        BAAL_KUWARI_TEMPLE_OBSTACLES
      );
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) sim.stridePhase += moveDist * 3.8;
    }

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
      reducedMotion,
    });

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: TEMPLE_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: BAAL_KUWARI_TEMPLE_WALK_BOUNDS,
      obstacles: BAAL_KUWARI_TEMPLE_OBSTACLES,
      delta,
      mode: 'follow',
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;
        applyCompanionRigFrame({
          agent,
          config: TEMPLE_COMPANION_CONFIGS[i],
          refs: rig,
          lookTargetX: sim.posX,
          lookTargetZ: sim.posZ,
          elapsed: t,
          delta,
          reducedMotion,
        });
      });
    }

    if (arrivalCinematicActive) {
      const sweepU = Math.min(1, sim.arrivalTimer / 4.2);
      scratch.camPos.set(
        THREE.MathUtils.lerp(-4.2, 3.8, sweepU),
        THREE.MathUtils.lerp(4.6, 2.35, sweepU),
        THREE.MathUtils.lerp(5.8, 3.6, sweepU)
      );
      scratch.lookAt.set(0, THREE.MathUtils.lerp(2.2, 1.35, sweepU), -2.4);
    } else {
      const hDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
      const vOff = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
      scratch.camPos.set(
        sim.posX + Math.sin(sim.orbitYaw) * hDist,
        vOff,
        sim.posZ + Math.cos(sim.orbitYaw) * hDist
      );
      scratch.lookAt.set(sim.posX, 1.18, sim.posZ);
    }

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

    const nearest = arrivalCinematicActive
      ? null
      : findNearestWalkHotspot(sim.posX, sim.posZ, BAAL_KUWARI_TEMPLE_HOTSPOTS);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  return (
    <>
      <BaalKuwariTempleEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        rangBell={rangBell}
        bellImpulseNonce={bellImpulseNonce}
        capturedPolaroid={capturedPolaroid}
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
        position={[0.1, 0, 3.4]}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup initialPositions={TEMPLE_COMPANION_INIT} onRigsReady={handleRigsReady} />
    </>
  );
}
