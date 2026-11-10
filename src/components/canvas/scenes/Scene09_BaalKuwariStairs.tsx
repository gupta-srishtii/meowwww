'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
  BAAL_KUWARI_TOTAL_STEPS,
  BaalKuwariStairsEnvironment,
  STAIR_MAX_Z,
  STAIR_MIN_Z,
  computeStepCountFromZ,
  getStairWalkHalfWidth,
  getZForMilestoneStep,
  isOnStairFlight,
  sampleStaircaseHeight,
} from '@/components/canvas/environment/BaalKuwariStairsEnvironment';
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

export interface Scene09BaalKuwariStairsProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  initialStepCount: number;
  onStepCountChange: (steps: number) => void;
  onReachHalfwayMilestone: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const SUMMIT_HOTSPOT: WalkHotspot = {
  id: 'enter_temple',
  label: 'Step Into Baal Kuwari Temple',
  x: 0,
  z: -101.8,
  radius: 3.4,
  actionType: 'interact',
};

const STAIR_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'ishaan',
    followAngleOffset: -0.4,
    followDistance: 1.35,
    idlePose: 'chat_nod',
    gesturePhase: 0.25,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.42,
    followDistance: 1.7,
    idlePose: 'look_around',
    gesturePhase: 1.7,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: 0.06,
    followDistance: 2.15,
    idlePose: 'chat_nod',
    gesturePhase: 3.2,
  },
];

/**
 * Scene 9 — Baal Kuwari: ~400-Step Segmented Forest Climb.
 * Player climbs naturally across 4 flights (~100 steps each) separated by flat scenic landings,
 * saving a milestone checkpoint at step 200 and ascending continuously into Scene 10.
 */
export function Scene09_BaalKuwariStairs({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  initialStepCount,
  onStepCountChange,
  onReachHalfwayMilestone,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene09BaalKuwariStairsProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari stairs.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const startZ = getZForMilestoneStep(initialStepCount >= 200 && initialStepCount < 390 ? initialStepCount : 0);
  const startY = sampleStaircaseHeight(startZ);
  const [canEnterSummit, setCanEnterSummit] = useState(
    computeStepCountFromZ(startZ) >= 390
  );

  const initialCompanionPositions: Record<
    FriendCompanionId,
    { x: number; y: number; z: number; yaw: number }
  > = useMemo(
    () => ({
      ishaan: { x: -0.75, y: sampleStaircaseHeight(startZ + 0.65), z: startZ + 0.65, yaw: 0 },
      friend_black_tee: {
        x: 0.8,
        y: sampleStaircaseHeight(startZ + 0.9),
        z: startZ + 0.9,
        yaw: 0,
      },
      friend_plaid: {
        x: 0.05,
        y: sampleStaircaseHeight(startZ + 1.35),
        z: startZ + 1.35,
        yaw: 0,
      },
    }),
    [startZ]
  );

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
      STAIR_COMPANION_CONFIGS.map((cfg) => {
        const p = initialCompanionPositions[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: p.x, z: p.z, facingYaw: p.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: 0,
    posZ: startZ,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.14,
    orbitPitch: 0.24,
    stridePhase: 0,
    cameraInitialized: false,
    lastReportedStep: Math.min(BAAL_KUWARI_TOTAL_STEPS, computeStepCountFromZ(startZ)),
    halfwayCommitted: initialStepCount >= 200,
    summitNear: computeStepCountFromZ(startZ) >= 390,
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
      onSceneReady(transitionToken, 9);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) clock.getDelta();
  }, [paused, clock]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 58 : 52;
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

    const dynamicHalfW = getStairWalkHalfWidth(sim.posZ);
    const stairBounds = {
      minX: -dynamicHalfW,
      maxX: dynamicHalfW,
      minZ: STAIR_MIN_Z,
      maxZ: STAIR_MAX_Z,
    };

    const moveDist = stepWalkSimulation(sim, walkInputRef.current, delta, stairBounds, []);
    const walkSpeed = Math.hypot(sim.velX, sim.velZ);
    const strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
    if (strideRatio > 0.03) {
      const climbingBoost = isOnStairFlight(sim.posZ) ? 1.2 : 1.0;
      sim.stridePhase += moveDist * 3.8 * climbingBoost;
    }

    const groundY = sampleStaircaseHeight(sim.posZ);
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
      groundY,
      reducedMotion,
    });

    const stepCount = computeStepCountFromZ(sim.posZ);
    if (stepCount !== sim.lastReportedStep) {
      sim.lastReportedStep = stepCount;
      onStepCountChange(stepCount);
      const summitNear = stepCount >= 390;
      if (summitNear !== sim.summitNear) {
        sim.summitNear = summitNear;
        setCanEnterSummit(summitNear);
      }
    }
    if (!sim.halfwayCommitted && stepCount >= 200) {
      sim.halfwayCommitted = true;
      onReachHalfwayMilestone();
    }

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: STAIR_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: {
        minX: -dynamicHalfW,
        maxX: dynamicHalfW,
        minZ: STAIR_MIN_Z,
        maxZ: STAIR_MAX_Z,
      },
      obstacles: [],
      delta,
      mode: 'follow',
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const w = getStairWalkHalfWidth(agent.posZ);
        agent.posX = THREE.MathUtils.clamp(agent.posX, -w, w);
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;
        applyCompanionRigFrame({
          agent,
          config: STAIR_COMPANION_CONFIGS[i],
          refs: rig,
          lookTargetX: sim.posX,
          lookTargetZ: sim.posZ,
          elapsed: t,
          delta,
          groundY: sampleStaircaseHeight(agent.posZ),
          reducedMotion,
        });
      });
    }

    const camDist = 5.4;
    const hDist = Math.cos(sim.orbitPitch) * camDist;
    const vOff = 1.45 + Math.sin(sim.orbitPitch) * camDist;
    scratch.camPos.set(
      sim.posX + Math.sin(sim.orbitYaw) * hDist,
      groundY + vOff,
      sim.posZ + Math.cos(sim.orbitYaw) * hDist
    );
    scratch.lookAt.set(sim.posX, groundY + 1.35, sim.posZ - 1.4);

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

    const hotspot = findNearestWalkHotspot(sim.posX, sim.posZ, [SUMMIT_HOTSPOT]);
    const nextId = hotspot?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(hotspot);
    }
  });

  return (
    <>
      <BaalKuwariStairsEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        canEnterSummit={canEnterSummit}
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
        position={[0, startY, startZ]}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup
        initialPositions={initialCompanionPositions}
        onRigsReady={handleRigsReady}
      />
    </>
  );
}
