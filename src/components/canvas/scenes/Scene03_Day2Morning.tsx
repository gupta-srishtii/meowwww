'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { animateCharacterRig, animateIshaanWalkRig } from '@/components/canvas/characters/animateCharacterRig';
import {
  DAY2_MORNING_HOTSPOTS,
  DAY2_MORNING_WALK_BOUNDS,
  HotelReturnEnvironment,
} from '@/components/canvas/environment/HotelReturnEnvironment';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import {
  findNearestWalkHotspot,
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
 * Srishti knocks on Ishaan's ground-floor doorway ("Kumbhkaran!"), then ALL FOUR ride scooters together
 * (Ishaan + Srishti on Scooter 1, Manish + Yash on Scooter 2) down the morning town road for Bun Maska & Chai,
 * share breakfast together, and ride smoothly back to the stay before heading to Neelkanth.
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

  const scooter1Ref = useRef<THREE.Group>(null);
  const scooter2Ref = useRef<THREE.Group>(null);

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
    posX: -0.45,
    posZ: 0.22,
    velX: 0,
    velZ: 0,
    facingYaw: Math.PI,
    rideSpeed: 0,
    compX: -2.75,
    compZ: 2.25,
    compYaw: Math.PI,
    waypointIdx: 0,
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
      simRef.current.posX = -2.1;
      simRef.current.posZ = 2.65;
      simRef.current.facingYaw = Math.PI * 0.94;
      simRef.current.rideSpeed = 0;
      simRef.current.compX = -2.8;
      simRef.current.compZ = 1.95;
      simRef.current.compYaw = Math.PI * 0.94;
      simRef.current.waypointIdx = 0;
    } else if (!breakfastActive && breakfastDone) {
      simRef.current.posX = 32.8;
      simRef.current.posZ = 9.45;
      simRef.current.facingYaw = Math.PI * 0.5;
      simRef.current.rideSpeed = 0;
      simRef.current.compX = 34.4;
      simRef.current.compZ = 9.85;
      simRef.current.compYaw = Math.PI * 0.5;
      simRef.current.waypointIdx = 0;
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
    const ridingScooters = !knockPhase && !breakfastActive;

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
      sim.posX = THREE.MathUtils.damp(sim.posX, 33.15, 7, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, 9.0, 7, delta);
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, 0.25, 7, delta);
      const dur = reducedMotion ? 1.0 : BREAKFAST_DURATION_SEC;
      if (sim.breakfastTimer >= dur && !sim.breakfastDoneSent) {
        sim.breakfastDoneSent = true;
        onBreakfastComplete();
      }
    } else if (autoPlayMode && onAutoTriggerHotspot) {
      const outboundWaypoints: Array<[number, number]> = [
        [0.0, 9.6],
        [33.4, 9.45],
      ];
      const returnWaypoints: Array<[number, number]> = [
        [0.0, 9.8],
        [-2.15, 2.75],
      ];
      const pts = breakfastDone ? returnWaypoints : outboundWaypoints;
      const idx = Math.min(sim.waypointIdx, pts.length - 1);
      const [wx, wz] = pts[idx];
      const dx = wx - sim.posX;
      const dz = wz - sim.posZ;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.65) {
        const cruiseSpeed = idx === 0 ? 4.4 : 6.4;
        const step = Math.min(dist, cruiseSpeed * delta);
        sim.posX += (dx / dist) * step;
        sim.posZ += (dz / dist) * step;
        const targetYaw = Math.atan2(-dx, -dz);
        const diff = Math.atan2(Math.sin(targetYaw - sim.facingYaw), Math.cos(targetYaw - sim.facingYaw));
        sim.facingYaw += diff * Math.min(1, delta * 5.2);
      } else if (sim.waypointIdx < pts.length - 1) {
        sim.waypointIdx += 1;
      } else {
        const targetId = breakfastDone ? 'depart_neelkanth' : 'bun_maska_chai';
        if (!autoFiredSetRef.current.has(targetId)) {
          autoFiredSetRef.current.add(targetId);
          onAutoTriggerHotspot(targetId);
        }
      }
    } else {
      // Responsive Play mode scooter driving along lane + town road
      const input = walkInputRef.current;
      const throttle = THREE.MathUtils.clamp(input.moveZ, -1, 1);
      const steer = THREE.MathUtils.clamp(-input.moveX, -1, 1);
      const targetSpeed = throttle * 7.2;
      sim.rideSpeed = THREE.MathUtils.damp(sim.rideSpeed, targetSpeed, 5.5, delta);
      if (Math.abs(steer) > 0.05) {
        const steerSign = sim.rideSpeed >= -0.2 ? 1 : -1;
        sim.facingYaw += steer * steerSign * 2.1 * delta;
      }
      sim.posX = THREE.MathUtils.clamp(
        sim.posX - Math.sin(sim.facingYaw) * sim.rideSpeed * delta,
        DAY2_MORNING_WALK_BOUNDS.minX,
        DAY2_MORNING_WALK_BOUNDS.maxX
      );
      sim.posZ = THREE.MathUtils.clamp(
        sim.posZ - Math.cos(sim.facingYaw) * sim.rideSpeed * delta,
        Math.max(1.2, DAY2_MORNING_WALK_BOUNDS.minZ),
        DAY2_MORNING_WALK_BOUNDS.maxZ
      );
    }

    if (ridingScooters) {
      // Scooter 1 (Ishaan driving + Srishti pillion)
      if (scooter1Ref.current) {
        scooter1Ref.current.position.set(sim.posX, 0.02, sim.posZ);
        scooter1Ref.current.rotation.set(0, sim.facingYaw, 0);
      }
      // Scooter 2 (Manish + Yash following 2.8m behind Scooter 1)
      const followTargetX = sim.posX + Math.sin(sim.facingYaw) * 2.8 + 0.55;
      const followTargetZ = sim.posZ + Math.cos(sim.facingYaw) * 2.8;
      const cdx = followTargetX - sim.compX;
      const cdz = followTargetZ - sim.compZ;
      const cdist = Math.hypot(cdx, cdz);
      if (cdist > 0.25) {
        const cStep = Math.min(cdist, 7.6 * delta);
        sim.compX += (cdx / cdist) * cStep;
        sim.compZ += (cdz / cdist) * cStep;
        const cYaw = Math.atan2(-cdx, -cdz);
        const cDiff = Math.atan2(Math.sin(cYaw - sim.compYaw), Math.cos(cYaw - sim.compYaw));
        sim.compYaw += cDiff * Math.min(1, delta * 5.0);
      } else {
        const cDiff = Math.atan2(Math.sin(sim.facingYaw - sim.compYaw), Math.cos(sim.facingYaw - sim.compYaw));
        sim.compYaw += cDiff * Math.min(1, delta * 4.0);
      }
      if (scooter2Ref.current) {
        scooter2Ref.current.position.set(sim.compX, 0.02, sim.compZ);
        scooter2Ref.current.rotation.set(0, sim.compYaw, 0);
      }
    } else {
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
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: knockPhase ? 'look_around' : 'chat_nod',
        reducedMotion,
      });

      // Srishti knocks at doorway during knockPhase or shares bun-maska & chai with ALL four at x ~ 33.8
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
        posX: knockPhase ? -0.32 : 34.05,
        posZ: knockPhase ? 1.05 : 8.95,
        facingYaw: knockPhase ? 0 : 0.72,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: knockPhase ? 'group_wave' : 'chat_nod',
        reducedMotion,
      });
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
        posX: knockPhase ? -2.4 : 32.35,
        posZ: knockPhase ? 3.1 : 8.95,
        facingYaw: knockPhase ? -0.4 : -0.78,
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
        posX: knockPhase ? -1.35 : 34.72,
        posZ: knockPhase ? 3.35 : 9.3,
        facingYaw: knockPhase ? 0.7 : 0.92,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: 'chat_nod',
        reducedMotion,
      });
    }

    if (knockPhase) {
      scratch.camPos.set(1.55, 1.72, 2.75);
      scratch.lookAt.set(-0.42, 1.18, 0.45);
    } else if (breakfastActive) {
      scratch.camPos.set(35.85, 1.92, 11.45);
      scratch.lookAt.set(33.55, 1.05, 8.35);
    } else {
      const fwdX = -Math.sin(sim.facingYaw);
      const fwdZ = -Math.cos(sim.facingYaw);
      const isNarrow = size.width < 768;
      scratch.camPos.set(
        sim.posX - fwdX * (isNarrow ? 5.6 : 4.65),
        2.15,
        sim.posZ - fwdZ * (isNarrow ? 5.6 : 4.65)
      );
      scratch.lookAt.set(sim.posX + fwdX * 3.8, 1.15, sim.posZ + fwdZ * 3.8);
    }

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.camPos);
      scratch.smoothLook.copy(scratch.lookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.camPos.x, 7.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.camPos.y, 7.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.camPos.z, 7.5, delta);
      scratch.smoothLook.x = THREE.MathUtils.damp(scratch.smoothLook.x, scratch.lookAt.x, 9, delta);
      scratch.smoothLook.y = THREE.MathUtils.damp(scratch.smoothLook.y, scratch.lookAt.y, 9, delta);
      scratch.smoothLook.z = THREE.MathUtils.damp(scratch.smoothLook.z, scratch.lookAt.z, 9, delta);
    }
    camera.lookAt(scratch.smoothLook);

    const visibleSpots = DAY2_MORNING_HOTSPOTS.filter(
      (h) => !(breakfastDone && h.id === 'bun_maska_chai') && !(!breakfastDone && h.id === 'depart_neelkanth')
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

  const ridingScooters = !knockPhase && !breakfastActive;

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
      {ridingScooters ? (
        <>
          <group ref={scooter1Ref} position={[-2.1, 0.02, 2.65]} rotation={[0, Math.PI * 0.94, 0]}>
            <PrototypeScooter variant="lead" castShadow={shadowsEnabled} />
          </group>
          <group ref={scooter2Ref} position={[-2.8, 0.02, 1.95]} rotation={[0, Math.PI * 0.94, 0]}>
            <PrototypeScooter variant="companion" castShadow={shadowsEnabled} />
          </group>
        </>
      ) : (
        <>
          {breakfastActive && (
            <>
              <group position={[31.35, 0.02, 9.65]} rotation={[0, 0.25, 0]}>
                <PrototypeScooter variant="lead" castShadow={shadowsEnabled} hideRiders />
              </group>
              <group position={[29.85, 0.02, 9.8]} rotation={[0, 0.18, 0]}>
                <PrototypeScooter variant="companion" castShadow={shadowsEnabled} hideRiders />
              </group>
            </>
          )}
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
            position={[-0.45, 0, 0.22]}
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
            position={[-0.32, 0, 1.05]}
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
      )}
    </>
  );
}

