'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { animateCharacterRig, animateIshaanWalkRig } from '@/components/canvas/characters/animateCharacterRig';
import {
  DAY2_MORNING_HOTSPOTS,
  DAY2_MORNING_OBSTACLES,
  DAY2_MORNING_WALK_BOUNDS,
  HotelReturnEnvironment,
} from '@/components/canvas/environment/HotelReturnEnvironment';
import {
  WALK_SPEED_MPS,
  findNearestWalkHotspot,
  stepAutoWalkTowardTarget,
  stepWalkSimulation,
  type WalkHotspot,
  type WalkInputState,
} from '@/hooks/useWalkController';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene03Day2MorningProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  knockPhase?: boolean;
  breakfastActive: boolean;
  breakfastDone: boolean;
  autoPlayMode?: boolean;
  onKnockComplete?: () => void;
  onAutoTriggerHotspot?: (hotspotId: string) => void;
  onBreakfastComplete: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

const KNOCK_DURATION_SEC = 2.6;
const BREAKFAST_DURATION_SEC = 5.4;

/**
 * Scene 3 — Day 2 Morning outside the Rishikesh Lane Stay:
 * Srishti knocks on Ishaan's ground-floor doorway ("Kumbhkaran!"), then walking out
 * onto the morning main road to share Bun Maska & Chai together before returning briefly (~5 min) to scooters.
 */
export function Scene03_Day2Morning({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  knockPhase = false,
  breakfastActive,
  breakfastDone,
  autoPlayMode = false,
  onKnockComplete,
  onAutoTriggerHotspot,
  onBreakfastComplete,
  onNearbyHotspotChange,
  onSceneReady,
  simulateMountFailure = false,
}: Scene03Day2MorningProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Day 2 Morning scene.');
  }

  const { camera, size } = useThree();
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

  const shreeGroupRef = useRef<THREE.Group>(null);
  const shreeTorsoRef = useRef<THREE.Group>(null);
  const shreeHeadRef = useRef<THREE.Group>(null);
  const shreeLLegRef = useRef<THREE.Group>(null);
  const shreeLKneeRef = useRef<THREE.Group>(null);
  const shreeRLegRef = useRef<THREE.Group>(null);
  const shreeRKneeRef = useRef<THREE.Group>(null);
  const shreeLArmRef = useRef<THREE.Group>(null);
  const shreeRArmRef = useRef<THREE.Group>(null);

  const manishGroupRef = useRef<THREE.Group>(null);
  const manishTorsoRef = useRef<THREE.Group>(null);
  const manishHeadRef = useRef<THREE.Group>(null);
  const manishLLegRef = useRef<THREE.Group>(null);
  const manishLKneeRef = useRef<THREE.Group>(null);
  const manishRLegRef = useRef<THREE.Group>(null);
  const manishRKneeRef = useRef<THREE.Group>(null);
  const manishLArmRef = useRef<THREE.Group>(null);
  const manishRArmRef = useRef<THREE.Group>(null);

  const yashGroupRef = useRef<THREE.Group>(null);
  const yashTorsoRef = useRef<THREE.Group>(null);
  const yashHeadRef = useRef<THREE.Group>(null);
  const yashLLegRef = useRef<THREE.Group>(null);
  const yashLKneeRef = useRef<THREE.Group>(null);
  const yashRLegRef = useRef<THREE.Group>(null);
  const yashRKneeRef = useRef<THREE.Group>(null);
  const yashLArmRef = useRef<THREE.Group>(null);
  const yashRArmRef = useRef<THREE.Group>(null);

  const simRef = useRef({
    posX: -0.25,
    posZ: 1.85,
    velX: 0,
    velZ: 0,
    facingYaw: Math.PI,
    stridePhase: 0,
    orbitYaw: 0,
    orbitPitch: 0.24,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
    knockTimer: 0,
    knockDoneSent: false,
    breakfastTimer: 0,
    breakfastDoneSent: false,
  });

  const scratch = useMemo(
    () => ({
      camPos: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      smoothLook: new THREE.Vector3(),
    }),
    []
  );

  useEffect(() => {
    if (knockPhase) {
      simRef.current.knockTimer = 0;
      simRef.current.knockDoneSent = false;
      simRef.current.posX = -0.45;
      simRef.current.posZ = 0.22;
      simRef.current.facingYaw = Math.PI;
    } else if (!breakfastActive && !breakfastDone) {
      simRef.current.posX = -0.25;
      simRef.current.posZ = 1.85;
      simRef.current.facingYaw = Math.PI;
    }
  }, [knockPhase, breakfastActive, breakfastDone]);

  useEffect(() => {
    if (breakfastActive) {
      simRef.current.breakfastTimer = 0;
      simRef.current.breakfastDoneSent = false;
    }
  }, [breakfastActive]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = size.width / Math.max(1, size.height) < 0.8 ? 58 : 52;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  const readyTokenRef = useRef(-1);
  const autoFiredSetRef = useRef(new Set<string>());
  useEffect(() => {
    autoFiredSetRef.current.clear();
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 3);
    }
  }, [transitionToken, onSceneReady]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    let strideRatio = 0;

    if (knockPhase) {
      sim.knockTimer += delta;
      sim.posX = THREE.MathUtils.damp(sim.posX, -0.45, 7, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, 0.22, 7, delta);
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, Math.PI, 7, delta);
      if (autoPlayMode && sim.knockTimer >= (reducedMotion ? 0.9 : KNOCK_DURATION_SEC) && !sim.knockDoneSent) {
        sim.knockDoneSent = true;
        onKnockComplete?.();
      }
    } else if (breakfastActive) {
      sim.breakfastTimer += delta;
      sim.posX = THREE.MathUtils.damp(sim.posX, 15.35, 7, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, 9.05, 7, delta);
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, -0.55, 7, delta);
      const dur = reducedMotion ? 1.0 : BREAKFAST_DURATION_SEC;
      if (sim.breakfastTimer >= dur && !sim.breakfastDoneSent) {
        sim.breakfastDoneSent = true;
        onBreakfastComplete();
      }
    } else if (autoPlayMode && onAutoTriggerHotspot) {
      const targetId = breakfastDone ? 'depart_neelkanth' : 'bun_maska_chai';
      const targetSpot = DAY2_MORNING_HOTSPOTS.find((h) => h.id === targetId);
      if (targetSpot) {
        // Exit hotel lane onto town road first, and return along road to hotel lane before turning in
        let navX = targetSpot.x;
        let navZ = targetSpot.z;
        if (!breakfastDone && sim.posZ < 8.6 && sim.posX < 2.2) {
          navX = 0.0;
          navZ = 9.25;
        } else if (breakfastDone && sim.posX > 2.2) {
          navX = 0.0;
          navZ = 9.25;
        }
        const res = stepAutoWalkTowardTarget(
          sim,
          navX,
          navZ,
          delta * 1.75,
          DAY2_MORNING_WALK_BOUNDS,
          DAY2_MORNING_OBSTACLES
        );
        strideRatio = res.strideRatio;
        const distFinal = Math.hypot(sim.posX - targetSpot.x, sim.posZ - targetSpot.z);
        if (distFinal <= 1.15 && !autoFiredSetRef.current.has(targetId)) {
          autoFiredSetRef.current.add(targetId);
          onAutoTriggerHotspot(targetId);
        }
      }
    } else {
      const simPos = {
        posX: sim.posX,
        posZ: sim.posZ,
        velX: sim.velX,
        velZ: sim.velZ,
        facingYaw: sim.facingYaw,
        stridePhase: sim.stridePhase,
        orbitYaw: sim.orbitYaw,
        orbitPitch: sim.orbitPitch,
      };
      const moveDist = stepWalkSimulation(
        simPos,
        walkInputRef.current,
        delta,
        DAY2_MORNING_WALK_BOUNDS,
        DAY2_MORNING_OBSTACLES
      );
      sim.posX = simPos.posX;
      sim.posZ = simPos.posZ;
      sim.velX = simPos.velX;
      sim.velZ = simPos.velZ;
      sim.facingYaw = simPos.facingYaw;
      sim.orbitYaw = simPos.orbitYaw;
      sim.orbitPitch = simPos.orbitPitch;
      const walkSpeed = Math.hypot(sim.velX, sim.velZ);
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
      idlePose: knockPhase ? 'look_around' : breakfastActive ? 'chat_nod' : 'default',
      reducedMotion,
    });

    // Srishti knocks at ground-floor door during knockPhase, waits down the town road by chai stall, or stands near scooters
    const shreeX = knockPhase ? -0.32 : breakfastDone && !breakfastActive ? -1.95 : 16.08;
    const shreeZ = knockPhase ? 1.05 : breakfastDone && !breakfastActive ? 2.45 : 8.95;
    animateCharacterRig({
      refs: {
        group: shreeGroupRef.current,
        torso: shreeTorsoRef.current,
        head: shreeHeadRef.current,
        leftLeg: shreeLLegRef.current,
        leftKnee: shreeLKneeRef.current,
        rightLeg: shreeRLegRef.current,
        rightKnee: shreeRKneeRef.current,
        leftArm: shreeLArmRef.current,
        rightArm: shreeRArmRef.current,
      },
      posX: shreeX,
      posZ: shreeZ,
      facingYaw: knockPhase ? 0 : breakfastActive ? 0.92 : 0.45,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: t,
      delta,
      idlePose: knockPhase ? 'group_wave' : 'chat_nod',
      reducedMotion,
    });

    const atTeaSpot = !knockPhase && !breakfastDone;
    animateCharacterRig({
      refs: {
        group: manishGroupRef.current,
        torso: manishTorsoRef.current,
        head: manishHeadRef.current,
        leftLeg: manishLLegRef.current,
        leftKnee: manishLKneeRef.current,
        rightLeg: manishRLegRef.current,
        rightKnee: manishRKneeRef.current,
        leftArm: manishLArmRef.current,
        rightArm: manishRArmRef.current,
      },
      posX: atTeaSpot ? 14.35 : -2.4,
      posZ: atTeaSpot ? 8.95 : 3.1,
      facingYaw: atTeaSpot ? -0.95 : -0.4,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: t,
      delta,
      idlePose: 'look_around',
      reducedMotion,
    });
    animateCharacterRig({
      refs: {
        group: yashGroupRef.current,
        torso: yashTorsoRef.current,
        head: yashHeadRef.current,
        leftLeg: yashLLegRef.current,
        leftKnee: yashLKneeRef.current,
        rightLeg: yashRLegRef.current,
        rightKnee: yashRKneeRef.current,
        leftArm: yashLArmRef.current,
        rightArm: yashRArmRef.current,
      },
      posX: atTeaSpot ? 16.75 : -1.35,
      posZ: atTeaSpot ? 9.35 : 3.35,
      facingYaw: atTeaSpot ? 0.9 : 0.7,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: t,
      delta,
      idlePose: 'chat_nod',
      reducedMotion,
    });

    if (knockPhase) {
      scratch.camPos.set(1.55, 1.72, 2.75);
      scratch.lookAt.set(-0.42, 1.18, 0.45);
    } else if (breakfastActive) {
      scratch.camPos.set(17.75, 1.92, 11.45);
      scratch.lookAt.set(15.45, 1.05, 8.35);
    } else {
      const hDist = Math.cos(sim.orbitPitch) * 5.2;
      const vOff = 1.25 + Math.sin(sim.orbitPitch) * 5.2;
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

    const visibleSpots = DAY2_MORNING_HOTSPOTS.filter(
      (h) => !(breakfastDone && h.id === 'bun_maska_chai')
    );
    const nearest =
      knockPhase || breakfastActive
        ? null
        : findNearestWalkHotspot(sim.posX, sim.posZ, visibleSpots);
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
        farewellDone={false}
        onTerrace={false}
        variant="day2_morning"
        hideOriginFriends
        morningBreakfastDone={breakfastDone}
      />
      <StylizedPlaceholderCharacter
        characterVariant="ishaan"
        holdingChaiCup={breakfastActive}
        groupRef={playerGroupRef}
        torsoRef={playerTorsoRef}
        headRef={playerHeadRef}
        leftLegRef={leftLegRef}
        leftKneeRef={leftKneeRef}
        rightLegRef={rightLegRef}
        rightKneeRef={rightKneeRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        position={[-0.25, 0, 1.85]}
        castShadow={shadowsEnabled}
      />
      <StylizedPlaceholderCharacter
        characterVariant="srishti"
        holdingChaiCup={breakfastActive}
        groupRef={shreeGroupRef}
        torsoRef={shreeTorsoRef}
        headRef={shreeHeadRef}
        leftLegRef={shreeLLegRef}
        leftKneeRef={shreeLKneeRef}
        rightLegRef={shreeRLegRef}
        rightKneeRef={shreeRKneeRef}
        leftArmRef={shreeLArmRef}
        rightArmRef={shreeRArmRef}
        position={[-0.18, 0, 7.55]}
        castShadow={shadowsEnabled}
      />
      <StylizedPlaceholderCharacter
        characterVariant="friend_black_tee"
        groupRef={manishGroupRef}
        torsoRef={manishTorsoRef}
        headRef={manishHeadRef}
        leftLegRef={manishLLegRef}
        leftKneeRef={manishLKneeRef}
        rightLegRef={manishRLegRef}
        rightKneeRef={manishRKneeRef}
        leftArmRef={manishLArmRef}
        rightArmRef={manishRArmRef}
        position={[-2.4, 0, 3.1]}
        castShadow={shadowsEnabled}
      />
      <StylizedPlaceholderCharacter
        characterVariant="friend_plaid"
        groupRef={yashGroupRef}
        torsoRef={yashTorsoRef}
        headRef={yashHeadRef}
        leftLegRef={yashLLegRef}
        leftKneeRef={yashLKneeRef}
        rightLegRef={yashRLegRef}
        rightKneeRef={yashRKneeRef}
        leftArmRef={yashLArmRef}
        rightArmRef={yashRArmRef}
        position={[-1.35, 0, 3.35]}
        castShadow={shadowsEnabled}
      />
    </>
  );
}

