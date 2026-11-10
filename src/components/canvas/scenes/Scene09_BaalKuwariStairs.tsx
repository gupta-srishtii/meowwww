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
import {
  animateSrishtiWalkRig,
  type CharacterIdlePose,
} from '@/components/canvas/characters/animateCharacterRig';
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

export interface Scene09BaalKuwariStairsProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  initialStepCount: number;
  capturedLandingPolaroid: boolean;
  assistPulseNonce: number;
  onStepCountChange: (steps: number) => void;
  onReachHalfwayMilestone: () => void;
  onAssistActiveChange: (active: boolean) => void;
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

const LANDING_PHOTO_HOTSPOT: WalkHotspot = {
  id: 'stairs_polaroid',
  label: 'Capture Mid-Climb Forest Polaroid',
  x: -1.6,
  z: -49.5,
  radius: 2.1,
  actionType: 'photo',
};

const ASSIST_ZONES = [
  { id: 'assist_1', triggerZ: -17.5, endZ: -23.0, zMin: -21.5, zMax: -15.0 },
  { id: 'assist_2', triggerZ: -43.5, endZ: -49.2, zMin: -47.5, zMax: -41.0 },
  { id: 'assist_3', triggerZ: -69.5, endZ: -75.2, zMin: -73.5, zMax: -67.0 },
] as const;

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
 * Scene 9 — Baal Kuwari: ~400-Step Segmented Forest Climb with Interactive Ishaan Hand-Assist.
 */
export function Scene09_BaalKuwariStairs({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  simulateMountFailure = false,
  initialStepCount,
  capturedLandingPolaroid,
  assistPulseNonce,
  onStepCountChange,
  onReachHalfwayMilestone,
  onAssistActiveChange,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene09BaalKuwariStairsProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari stairs.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const startZ = getZForMilestoneStep(
    initialStepCount >= 200 && initialStepCount < 390 ? initialStepCount : 0
  );
  const startY = sampleStaircaseHeight(startZ);
  const [canEnterSummit, setCanEnterSummit] = useState(
    computeStepCountFromZ(startZ) >= 390
  );
  const [assistBeaconPos, setAssistBeaconPos] = useState<readonly [number, number, number] | null>(
    null
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
    usedAssists: new Set<string>(),
    assistActive: false,
    assistTimer: 0,
    assistTargetZ: startZ,
    assistZoneId: null as string | null,
    lastHandledPulse: 0,
    hadBeaconZoneId: null as string | null,
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
    if (assistPulseNonce > 0 && assistPulseNonce !== simRef.current.lastHandledPulse) {
      simRef.current.lastHandledPulse = assistPulseNonce;
      const sim = simRef.current;
      const zone = ASSIST_ZONES.find(
        (z) => !sim.usedAssists.has(z.id) && sim.posZ <= z.zMax && sim.posZ >= z.zMin
      );
      if (zone) {
        sim.usedAssists.add(zone.id);
        sim.assistActive = true;
        sim.assistTimer = 0;
        sim.assistZoneId = zone.id;
        sim.assistTargetZ = zone.endZ;
        setAssistBeaconPos(null);
        onAssistActiveChange(true);
      }
    }
  }, [assistPulseNonce, onAssistActiveChange]);

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
    return () => {
      onNearbyHotspotChange(null);
      onAssistActiveChange(false);
    };
  }, [onAssistActiveChange, onNearbyHotspotChange]);

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

    let strideRatio = 0;
    let walkSpeed = 0;
    let playerIdlePose: CharacterIdlePose = 'default';

    const assistZone = ASSIST_ZONES.find(
      (z) => !sim.usedAssists.has(z.id) && sim.posZ <= z.zMax && sim.posZ >= z.zMin
    );

    if (sim.assistActive) {
      const dur = reducedMotion ? 0.55 : 2.25;
      sim.assistTimer += delta;
      sim.posX = THREE.MathUtils.damp(sim.posX, -0.15, 6, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, sim.assistTargetZ, 3.2, delta);
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, 0, 8, delta);
      const stepDelta = Math.abs(sim.assistTargetZ - sim.posZ);
      if (stepDelta > 0.12) {
        strideRatio = 0.78;
        sim.stridePhase += delta * 9.5;
        walkSpeed = 2.6;
      } else {
        playerIdlePose = 'chat_nod';
      }
      if (sim.assistTimer >= dur) {
        sim.assistActive = false;
        sim.assistZoneId = null;
        onAssistActiveChange(false);
      }
    } else {
      const moveDist = stepWalkSimulation(sim, walkInputRef.current, delta, stairBounds, []);
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) {
        const climbingBoost = isOnStairFlight(sim.posZ) ? 1.2 : 1.0;
        sim.stridePhase += moveDist * 3.8 * climbingBoost;
      }
    }

    const groundY = sampleStaircaseHeight(sim.posZ);
    const srishtiClimbing = strideRatio > 0.08 && isOnStairFlight(sim.posZ);
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
      climbingStairs: srishtiClimbing,
      idlePose: playerIdlePose,
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

    // Companion behavior: during assist window Ishaan leads 0.85m ahead offering hand, while Manish/Yash cheer from landing
    let explicitTargets: Record<string, CompanionTargetSlot> | undefined;
    if (sim.assistActive) {
      explicitTargets = {
        ishaan: { x: -0.62, z: sim.posZ - 0.12, facingYaw: -0.1 },
        friend_black_tee: { x: 1.05, z: sim.assistTargetZ - 1.2, facingYaw: Math.PI },
        friend_plaid: { x: -1.15, z: sim.assistTargetZ - 1.5, facingYaw: Math.PI },
      };
    } else if (assistZone) {
      const waitZ = Math.max(STAIR_MIN_Z, Math.min(assistZone.triggerZ, sim.posZ - 1.05));
      explicitTargets = {
        ishaan: { x: -0.58, z: waitZ, facingYaw: Math.PI - 0.15 },
        friend_black_tee: { x: 1.05, z: assistZone.endZ - 0.9, facingYaw: Math.PI },
        friend_plaid: { x: -1.1, z: assistZone.endZ - 1.2, facingYaw: Math.PI },
      };
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
      mode: explicitTargets ? 'gather' : 'follow',
      explicitTargets,
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const w = getStairWalkHalfWidth(agent.posZ);
        agent.posX = THREE.MathUtils.clamp(agent.posX, -w, w);
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;

        let poseOverride: CharacterIdlePose | undefined;
        if ((assistZone || sim.assistActive) && agent.id === 'ishaan') {
          poseOverride = 'hand_assist_reach';
        } else if (assistZone && agent.id !== 'ishaan') {
          poseOverride = 'cheer_wave';
        }

        applyCompanionRigFrame({
          agent,
          config: STAIR_COMPANION_CONFIGS[i],
          refs: rig,
          lookTargetX: sim.posX,
          lookTargetZ: sim.posZ,
          elapsed: t,
          delta,
          groundY: sampleStaircaseHeight(agent.posZ),
          climbingStairs: isOnStairFlight(agent.posZ),
          idlePoseOverride: poseOverride,
          reducedMotion,
        });
      });
    }

    if (assistZone && !sim.assistActive) {
      if (sim.hadBeaconZoneId !== assistZone.id) {
        sim.hadBeaconZoneId = assistZone.id;
        setAssistBeaconPos([-0.55, sampleStaircaseHeight(assistZone.triggerZ), assistZone.triggerZ]);
      }
    } else if (sim.hadBeaconZoneId !== null) {
      sim.hadBeaconZoneId = null;
      setAssistBeaconPos(null);
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

    const activeHotspots: WalkHotspot[] = [SUMMIT_HOTSPOT];
    if (!capturedLandingPolaroid) {
      activeHotspots.push(LANDING_PHOTO_HOTSPOT);
    }
    if (assistZone && !sim.assistActive) {
      const ishaanState = companionStatesRef.current[0];
      activeHotspots.push({
        id: 'ishaan_assist',
        label: "Take Ishaan's Hand · Climb Together",
        x: ishaanState.posX,
        z: ishaanState.posZ,
        radius: 2.6,
        actionType: 'interact',
      });
    }

    const hotspot = sim.assistActive
      ? null
      : findNearestWalkHotspot(sim.posX, sim.posZ, activeHotspots);
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
        canCaptureLandingPhoto={!capturedLandingPolaroid}
        assistBeaconPos={assistBeaconPos}
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
