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
  STAIR_MAX_S,
  STAIR_MIN_S,
  computeStepCountFromS,
  getTransformForMilestoneStep,
  isOnStairFlightAtS,
  projectPointOntoStairPath,
  sampleStairTransformAtS,
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
  type WalkBounds,
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

const ASSIST_ZONES = [
  { id: 'assist_1', sMin: 14.5, sMax: 21.8, triggerS: 17.5, endS: 23.4 },
  { id: 'assist_2', sMin: 39.5, sMax: 47.8, triggerS: 42.5, endS: 49.4 },
  { id: 'assist_3', sMin: 61.5, sMax: 72.2, triggerS: 65.0, endS: 75.0 },
] as const;

const UNBOUNDED_WALK_BOUNDS: WalkBounds = {
  minX: -60,
  maxX: 60,
  minZ: -120,
  maxZ: 20,
};

const STAIR_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'ishaan',
    followAngleOffset: -0.45,
    followDistance: 1.35,
    idlePose: 'chat_nod',
    gesturePhase: 0.25,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 0.52,
    followDistance: 1.7,
    idlePose: 'look_around',
    gesturePhase: 1.7,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: -0.05,
    followDistance: 2.15,
    idlePose: 'chat_nod',
    gesturePhase: 3.2,
  },
];

function clampPointToStairCorridor(wx: number, wz: number): {
  x: number;
  z: number;
  s: number;
  heightY: number;
  ux: number;
  uz: number;
  rx: number;
  rz: number;
} {
  const proj = projectPointOntoStairPath(wx, wz);
  const clampedLat = THREE.MathUtils.clamp(proj.lateralSigned, -proj.halfWidth, proj.halfWidth);
  const clampedS = THREE.MathUtils.clamp(proj.s, STAIR_MIN_S, STAIR_MAX_S);
  const baseAtS = sampleStairTransformAtS(clampedS);
  return {
    x: baseAtS.x + baseAtS.rx * clampedLat,
    z: baseAtS.z + baseAtS.rz * clampedLat,
    s: clampedS,
    heightY: baseAtS.y,
    ux: baseAtS.ux,
    uz: baseAtS.uz,
    rx: baseAtS.rx,
    rz: baseAtS.rz,
  };
}

/**
 * Scene 9 — Baal Kuwari: Winding ~400-Step Forest Hillside Staircase with Turns,
 * Rest Landings, and Interactive Ishaan Hand-Assist.
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

  const startSpot = useMemo(
    () => getTransformForMilestoneStep(initialStepCount >= 200 && initialStepCount < 390 ? 200 : 0),
    [initialStepCount]
  );

  const summitSpot = useMemo(() => getTransformForMilestoneStep(400), []);
  const landingPhotoSpot = useMemo(() => getTransformForMilestoneStep(200), []);

  const SUMMIT_HOTSPOT: WalkHotspot = useMemo(
    () => ({
      id: 'enter_temple',
      label: 'Step Into Baal Kuwari Temple',
      x: summitSpot.x,
      z: summitSpot.z,
      radius: 3.4,
      actionType: 'interact',
    }),
    [summitSpot]
  );

  const LANDING_PHOTO_HOTSPOT: WalkHotspot = useMemo(
    () => ({
      id: 'stairs_polaroid',
      label: 'Capture Mid-Climb Forest Polaroid',
      x: landingPhotoSpot.x - 1.5,
      z: landingPhotoSpot.z,
      radius: 2.25,
      actionType: 'photo',
    }),
    [landingPhotoSpot]
  );

  const [canEnterSummit, setCanEnterSummit] = useState(
    computeStepCountFromS(startSpot.s) >= 390
  );
  const [assistBeaconPos, setAssistBeaconPos] = useState<readonly [number, number, number] | null>(
    null
  );

  const initialCompanionPositions: Record<
    FriendCompanionId,
    { x: number; y: number; z: number; yaw: number }
  > = useMemo(() => {
    const a = sampleStairTransformAtS(startSpot.s - 0.6);
    const b = sampleStairTransformAtS(startSpot.s - 0.9);
    const c = sampleStairTransformAtS(startSpot.s - 1.3);
    return {
      ishaan: { x: a.x - a.rx * 0.72, y: a.y, z: a.z - a.rz * 0.72, yaw: startSpot.yaw },
      friend_black_tee: {
        x: b.x + b.rx * 0.78,
        y: b.y,
        z: b.z + b.rz * 0.78,
        yaw: startSpot.yaw,
      },
      friend_plaid: {
        x: c.x + c.rx * 0.08,
        y: c.y,
        z: c.z + c.rz * 0.08,
        yaw: startSpot.yaw,
      },
    };
  }, [startSpot]);

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
    posX: startSpot.x,
    posZ: startSpot.z,
    velX: 0,
    velZ: 0,
    facingYaw: startSpot.yaw,
    orbitYaw: startSpot.yaw + 0.12,
    orbitPitch: 0.25,
    stridePhase: 0,
    cameraInitialized: false,
    lastReportedStep: Math.min(BAAL_KUWARI_TOTAL_STEPS, computeStepCountFromS(startSpot.s)),
    halfwayCommitted: initialStepCount >= 200,
    summitNear: computeStepCountFromS(startSpot.s) >= 390,
    lastHotspotId: null as string | null,
    usedAssists: new Set<string>(),
    assistActive: false,
    assistTimer: 0,
    assistTargetS: startSpot.s,
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
      const curProj = projectPointOntoStairPath(sim.posX, sim.posZ);
      const zone = ASSIST_ZONES.find(
        (z) => !sim.usedAssists.has(z.id) && curProj.s >= z.sMin && curProj.s <= z.sMax
      );
      if (zone) {
        sim.usedAssists.add(zone.id);
        sim.assistActive = true;
        sim.assistTimer = 0;
        sim.assistZoneId = zone.id;
        sim.assistTargetS = zone.endS;
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
    const currentProj = projectPointOntoStairPath(sim.posX, sim.posZ);

    let strideRatio = 0;
    let walkSpeed = 0;
    let playerIdlePose: CharacterIdlePose = 'default';

    const assistZone = ASSIST_ZONES.find(
      (z) => !sim.usedAssists.has(z.id) && currentProj.s >= z.sMin && currentProj.s <= z.sMax
    );

    if (sim.assistActive) {
      const dur = reducedMotion ? 0.6 : 2.3;
      sim.assistTimer += delta;
      const targetPt = sampleStairTransformAtS(sim.assistTargetS);
      const goalX = targetPt.x - targetPt.rx * 0.18;
      const goalZ = targetPt.z - targetPt.rz * 0.18;
      const prevX = sim.posX;
      const prevZ = sim.posZ;
      sim.posX = THREE.MathUtils.damp(sim.posX, goalX, 3.0, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, goalZ, 3.0, delta);
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, targetPt.yaw, 8, delta);
      const stepDelta = Math.hypot(sim.posX - prevX, sim.posZ - prevZ);
      const distGoal = Math.hypot(goalX - sim.posX, goalZ - sim.posZ);
      if (distGoal > 0.16) {
        strideRatio = 0.78;
        sim.stridePhase += stepDelta * 4.5;
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
      const moveDist = stepWalkSimulation(sim, walkInputRef.current, delta, UNBOUNDED_WALK_BOUNDS, []);
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) {
        const climbingBoost = isOnStairFlightAtS(currentProj.s) ? 1.2 : 1.0;
        sim.stridePhase += moveDist * 3.8 * climbingBoost;
      }
    }

    const clamped = clampPointToStairCorridor(sim.posX, sim.posZ);
    sim.posX = clamped.x;
    sim.posZ = clamped.z;

    const srishtiClimbing = strideRatio > 0.08 && isOnStairFlightAtS(clamped.s);
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
      groundY: clamped.heightY,
      climbingStairs: srishtiClimbing,
      idlePose: playerIdlePose,
      reducedMotion,
    });

    const stepCount = computeStepCountFromS(clamped.s);
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

    let explicitTargets: Record<string, CompanionTargetSlot> | undefined;
    if (sim.assistActive) {
      const leadPt = sampleStairTransformAtS(Math.min(STAIR_MAX_S, clamped.s + 0.55));
      const cheerPt = sampleStairTransformAtS(sim.assistTargetS);
      explicitTargets = {
        ishaan: {
          x: leadPt.x - leadPt.rx * 0.58,
          z: leadPt.z - leadPt.rz * 0.58,
          facingYaw: leadPt.yaw,
        },
        friend_black_tee: {
          x: cheerPt.x + cheerPt.rx * 1.05,
          z: cheerPt.z + cheerPt.rz * 1.05,
          facingYaw: cheerPt.yaw + Math.PI,
        },
        friend_plaid: {
          x: cheerPt.x - cheerPt.rx * 1.15,
          z: cheerPt.z - cheerPt.rz * 1.15,
          facingYaw: cheerPt.yaw + Math.PI,
        },
      };
    } else if (assistZone) {
      const waitS = Math.min(STAIR_MAX_S, Math.max(assistZone.triggerS, clamped.s + 1.1));
      const waitPt = sampleStairTransformAtS(waitS);
      const cheerPt = sampleStairTransformAtS(assistZone.endS);
      explicitTargets = {
        ishaan: {
          x: waitPt.x - waitPt.rx * 0.55,
          z: waitPt.z - waitPt.rz * 0.55,
          facingYaw: waitPt.yaw + Math.PI - 0.15,
        },
        friend_black_tee: {
          x: cheerPt.x + cheerPt.rx * 1.05,
          z: cheerPt.z + cheerPt.rz * 1.05,
          facingYaw: cheerPt.yaw + Math.PI,
        },
        friend_plaid: {
          x: cheerPt.x - cheerPt.rx * 1.1,
          z: cheerPt.z - cheerPt.rz * 1.1,
          facingYaw: cheerPt.yaw + Math.PI,
        },
      };
    }

    stepGroupCompanions({
      agents: companionStatesRef.current,
      configs: STAIR_COMPANION_CONFIGS,
      playerX: sim.posX,
      playerZ: sim.posZ,
      playerFacingYaw: sim.facingYaw,
      playerSpeed: walkSpeed,
      bounds: UNBOUNDED_WALK_BOUNDS,
      obstacles: [],
      delta,
      mode: explicitTargets ? 'gather' : 'follow',
      explicitTargets,
    });

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const compClamped = clampPointToStairCorridor(agent.posX, agent.posZ);
        agent.posX = compClamped.x;
        agent.posZ = compClamped.z;

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
          groundY: compClamped.heightY,
          climbingStairs: isOnStairFlightAtS(compClamped.s),
          idlePoseOverride: poseOverride,
          reducedMotion,
        });
      });
    }

    if (assistZone && !sim.assistActive) {
      if (sim.hadBeaconZoneId !== assistZone.id) {
        sim.hadBeaconZoneId = assistZone.id;
        const bp = sampleStairTransformAtS(assistZone.triggerS);
        setAssistBeaconPos([bp.x - bp.rx * 0.55, bp.y, bp.z - bp.rz * 0.55]);
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
      clamped.heightY + vOff,
      sim.posZ + Math.cos(sim.orbitYaw) * hDist
    );
    scratch.lookAt.set(
      sim.posX + clamped.ux * 1.45,
      clamped.heightY + 1.35,
      sim.posZ + clamped.uz * 1.45
    );

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
        position={[startSpot.x, startSpot.y, startSpot.z]}
        rotationY={startSpot.yaw}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup
        initialPositions={initialCompanionPositions}
        onRigsReady={handleRigsReady}
      />
    </>
  );
}
