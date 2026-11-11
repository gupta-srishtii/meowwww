'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import {
  animateCharacterRig,
  animateIshaanWalkRig,
  type HumanRigRefs,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  DAY1_MAGGI_HOTSPOTS,
  DAY1_MAGGI_SEATS,
  DAY1_MAGGI_TABLE_CENTER,
  DAY1_MARKET_HOTSPOTS,
  DAY1_MARKET_WALK_BOUNDS,
  DAY1_NIGHT_DHABA_SEATS,
  DAY1_NIGHT_DHABA_TABLE_CENTER,
  DAY1_WATERFALL_HOTSPOTS,
  DAY1_WATERFALL_ROCK_SEATS,
  DAY1_WATERFALL_WALK_BOUNDS,
  Day1MaggiStopEnvironment,
  Day1MarketWalkEnvironment,
  Day1NightDhabaEnvironment,
  Day1WaterfallEnvironment,
  sampleMarketStreetY,
} from '@/components/canvas/environment/Day1EveningEnvironments';
import {
  DAY1_HOTSPOTS,
  DAY1_OBSTACLES,
  DAY1_WALK_BOUNDS,
  HotelReturnEnvironment,
  TERRACE_HOTSPOTS,
  TERRACE_OBSTACLES,
  TERRACE_WALK_BOUNDS,
  TERRACE_Y,
} from '@/components/canvas/environment/HotelReturnEnvironment';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
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
import type { Day1StoryPhase } from '@/components/ui/PrologueStoryHUD';

export type Day1Phase = Day1StoryPhase;

export interface Scene02RishikeshDay1Props {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  day1Phase: Day1Phase;
  autoPlayMode?: boolean;
  terraceToggleNonce?: number;
  waterfallSitNonce?: number;
  onAdvanceDay1Phase: (next: Day1Phase) => void;
  onDay1CallStateChange: (active: boolean) => void;
  onDay1Complete: () => void;
  onUnlockDay1StreamVideo?: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

const STAY_HOLD_BEFORE_WALK_SEC = 2.2;
const WATERFALL_RIDE_DURATION_SEC = 4.6;
const WATERFALL_WALK_IN_DURATION_SEC = 3.0;
const WATERFALL_TOTAL_DURATION_SEC = 17.0;
const EVENING_MAGGI_DURATION_SEC = 5.8;
const RETURN_ROLLOUT_DURATION_SEC = 2.8;
const NIGHT_DHABA_DURATION_SEC = 6.2;
const NIGHT_RETURN_DURATION_SEC = 4.6;

function useRigRefs(): HumanRigRefs & {
  groupRef: RefObject<THREE.Group | null>;
  torsoRef: RefObject<THREE.Group | null>;
  headRef: RefObject<THREE.Group | null>;
  leftLegRef: RefObject<THREE.Group | null>;
  leftKneeRef: RefObject<THREE.Group | null>;
  rightLegRef: RefObject<THREE.Group | null>;
  rightKneeRef: RefObject<THREE.Group | null>;
  leftArmRef: RefObject<THREE.Group | null>;
  rightArmRef: RefObject<THREE.Group | null>;
  rightForearmRef: RefObject<THREE.Group | null>;
} {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);

  return useMemo(
    () => ({
      groupRef,
      torsoRef,
      headRef,
      leftLegRef,
      leftKneeRef,
      rightLegRef,
      rightKneeRef,
      leftArmRef,
      rightArmRef,
      rightForearmRef,
      get group() {
        return groupRef.current;
      },
      get torso() {
        return torsoRef.current;
      },
      get head() {
        return headRef.current;
      },
      get leftLeg() {
        return leftLegRef.current;
      },
      get leftKnee() {
        return leftKneeRef.current;
      },
      get rightLeg() {
        return rightLegRef.current;
      },
      get rightKnee() {
        return rightKneeRef.current;
      },
      get leftArm() {
        return leftArmRef.current;
      },
      get rightArm() {
        return rightArmRef.current;
      },
      get rightForearm() {
        return rightForearmRef.current;
      },
    }),
    []
  );
}

/**
 * Scene 2 — Authentic Day 1 Evening Reconstruction:
 * 1) `stay_meet`: Post-rafting evening meet at modest lane stay in Day 1 outfits (green graphic tee & yellow kurti).
 * 2) `waterfall_ride_stop`: Daytime/golden-hour road stop + subtle natural stream water flow over mossy rocks.
 * 2B) `evening_maggi_stop`: ~5:00 PM golden-hour roadside Maggi & chai together.
 * 3) `return_and_kanishka`: Return at dusk -> Srishti spends relaxed evening time with Kanishka as evening turns to ~9 PM night -> Ishaan calls for dhaba dinner.
 * 4) `market_street_walk` -> `night_dhaba_dinner` -> `night_hotel_return`.
 */
export function Scene02_RishikeshDay1({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  day1Phase,
  autoPlayMode = false,
  terraceToggleNonce = 0,
  waterfallSitNonce = 0,
  onAdvanceDay1Phase,
  onDay1CallStateChange,
  onDay1Complete,
  onUnlockDay1StreamVideo,
  onNearbyHotspotChange,
  onSceneReady,
  simulateMountFailure = false,
}: Scene02RishikeshDay1Props) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Day 1 Rishikesh evening scene.');
  }

  const { camera, size } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const [onTerraceState, setOnTerraceState] = useState(false);
  const [waterfallParked, setWaterfallParked] = useState(false);
  const [waterfallSeated, setWaterfallSeated] = useState(false);
  const [duskNight, setDuskNight] = useState(false);

  const ishaanRig = useRigRefs();
  const shreeRig = useRigRefs();
  const manishRig = useRigRefs();
  const yashRig = useRigRefs();

  const leadScooterRef = useRef<THREE.Group>(null);
  const compScooterRef = useRef<THREE.Group>(null);
  const returnScooter1Ref = useRef<THREE.Group>(null);
  const returnScooter2Ref = useRef<THREE.Group>(null);
  const marketScooterRef = useRef<THREE.Group>(null);

  const readyTokenRef = useRef(-1);
  const phaseTimerRef = useRef(0);
  const completedRef = useRef(false);
  const phaseAdvancedRef = useRef(false);
  const callTriggeredRef = useRef(false);
  const streamVideoUnlockedRef = useRef(false);
  const prevHotspotIdRef = useRef<string | null>(null);
  const onTerraceRef = useRef(false);
  const waterfallSeatedRef = useRef(false);

  const simRef = useRef({
    posX: -0.45,
    posZ: -0.35,
    velX: 0,
    velZ: 0,
    facingYaw: Math.PI,
    orbitYaw: Math.PI,
    orbitPitch: 0.25,
    stridePhase: 0,
    strideRatio: 0,
    elapsed: 0,
  });

  const scratch = useMemo(
    () => ({
      desiredCamPos: new THREE.Vector3(),
      desiredLookAt: new THREE.Vector3(),
      currentLookAt: new THREE.Vector3(-0.45, 1.3, 2.0),
    }),
    []
  );

  useEffect(() => {
    phaseTimerRef.current = 0;
    phaseAdvancedRef.current = false;
    callTriggeredRef.current = false;
    streamVideoUnlockedRef.current = false;
    prevHotspotIdRef.current = null;
    onNearbyHotspotChange(null);
    if (day1Phase !== 'waterfall_ride_stop') {
      setWaterfallParked(false);
      waterfallSeatedRef.current = false;
      setWaterfallSeated(false);
    }
    if (day1Phase !== 'return_and_kanishka') {
      onDay1CallStateChange(false);
      setDuskNight(false);
    }
    if (day1Phase === 'stay_meet') {
      simRef.current.posX = -0.45;
      simRef.current.posZ = -0.35;
      simRef.current.velX = 0;
      simRef.current.velZ = 0;
      simRef.current.facingYaw = Math.PI;
      simRef.current.orbitYaw = Math.PI;
      simRef.current.orbitPitch = 0.25;
      onTerraceRef.current = false;
      setOnTerraceState(false);
    } else if (day1Phase === 'waterfall_ride_stop') {
      simRef.current.posX = -2.15;
      simRef.current.posZ = -1.35;
      simRef.current.velX = 0;
      simRef.current.velZ = 0;
      simRef.current.facingYaw = -Math.PI * 0.48;
      simRef.current.orbitYaw = -Math.PI * 0.45;
      simRef.current.orbitPitch = 0.22;
      waterfallSeatedRef.current = false;
      setWaterfallSeated(false);
    } else if (day1Phase === 'market_street_walk') {
      simRef.current.posX = 0.0;
      simRef.current.posZ = 10.2;
      simRef.current.velX = 0;
      simRef.current.velZ = 0;
      simRef.current.facingYaw = 0;
      simRef.current.orbitYaw = 0;
      simRef.current.orbitPitch = 0.22;
    }
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 2);
    }
  }, [day1Phase, transitionToken, autoPlayMode, onDay1CallStateChange, onNearbyHotspotChange, onSceneReady]);

  const toggleTerrace = useCallback((goTerrace: boolean) => {
    onTerraceRef.current = goTerrace;
    setOnTerraceState(goTerrace);
    simRef.current.velX = 0;
    simRef.current.velZ = 0;
    if (goTerrace) {
      simRef.current.posX = 2.85;
      simRef.current.posZ = -1.65;
      simRef.current.facingYaw = 0;
    } else {
      simRef.current.posX = 2.75;
      simRef.current.posZ = 1.65;
      simRef.current.facingYaw = Math.PI;
    }
  }, []);

  useEffect(() => {
    if (terraceToggleNonce > 0 && day1Phase === 'stay_meet') {
      toggleTerrace(!onTerraceRef.current);
    }
  }, [terraceToggleNonce, day1Phase, toggleTerrace]);

  useEffect(() => {
    if (waterfallSitNonce > 0 && day1Phase === 'waterfall_ride_stop') {
      const next = !waterfallSeatedRef.current;
      waterfallSeatedRef.current = next;
      setWaterfallSeated(next);
      simRef.current.velX = 0;
      simRef.current.velZ = 0;
      if (next && !streamVideoUnlockedRef.current) {
        streamVideoUnlockedRef.current = true;
        onUnlockDay1StreamVideo?.();
      } else if (!next) {
        simRef.current.posX = -0.35;
        simRef.current.posZ = -1.25;
      }
    }
  }, [waterfallSitNonce, day1Phase, onUnlockDay1StreamVideo]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const sim = simRef.current;
    sim.elapsed += delta;

    // ---------------------------------------------------------
    // PHASE 2: WATERFALL RIDE & ROCK STREAM SITTING
    // ---------------------------------------------------------
    if (day1Phase === 'waterfall_ride_stop') {
      phaseTimerRef.current += delta;
      const t = phaseTimerRef.current;
      const rideAlpha = Math.min(1, t / WATERFALL_RIDE_DURATION_SEC);
      const ease = rideAlpha * rideAlpha * (3 - 2 * rideAlpha);

      const isNowParked = t >= WATERFALL_RIDE_DURATION_SEC;
      if (isNowParked !== waterfallParked) {
        setWaterfallParked(isNowParked);
      }

      if (!isNowParked) {
        const zLead = THREE.MathUtils.lerp(16.5, -1.6, ease);
        const zComp = THREE.MathUtils.lerp(20.5, -0.35, ease);
        if (leadScooterRef.current) {
          leadScooterRef.current.position.set(-3.35 + Math.sin(ease * Math.PI) * 0.35, 0.02, zLead);
          leadScooterRef.current.rotation.set(0, -0.18 - (1 - ease) * 0.08, 0);
        }
        if (compScooterRef.current) {
          compScooterRef.current.position.set(-4.55 + Math.sin(ease * Math.PI) * 0.25, 0.02, zComp);
          compScooterRef.current.rotation.set(0, -0.25, 0);
        }
        scratch.desiredCamPos.set(-5.65, 2.25, zLead + 4.8);
        scratch.desiredLookAt.set(0.65, 1.35, zLead - 2.6);
        camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
        scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5.2));
        camera.lookAt(scratch.currentLookAt);
      } else {
        const walkElapsed = t - WATERFALL_RIDE_DURATION_SEC;
        const autoShouldSit = walkElapsed >= WATERFALL_WALK_IN_DURATION_SEC;
        if (autoPlayMode && autoShouldSit !== waterfallSeatedRef.current) {
          waterfallSeatedRef.current = autoShouldSit;
          setWaterfallSeated(autoShouldSit);
        }

        const sitT = Math.max(0, Math.min(1, (walkElapsed - WATERFALL_WALK_IN_DURATION_SEC) / 5.4));
        const rockSeatIshaan = DAY1_WATERFALL_ROCK_SEATS.ishaan;
        const rockSeatShree = DAY1_WATERFALL_ROCK_SEATS.srishti;
        const rockSeatManish = DAY1_WATERFALL_ROCK_SEATS.friend_black_tee;
        const rockSeatYash = DAY1_WATERFALL_ROCK_SEATS.friend_plaid;

        animateCharacterRig({
          refs: manishRig,
          posX: rockSeatManish.x,
          posZ: rockSeatManish.z,
          facingYaw: rockSeatManish.yaw,
          groundY: rockSeatManish.rockTopY - 0.52,
          strideRatio: 0,
          stridePhase: 0,
          elapsed: sim.elapsed,
          delta,
          idlePose: 'sit_ready',
          reducedMotion,
        });
        animateCharacterRig({
          refs: yashRig,
          posX: rockSeatYash.x,
          posZ: rockSeatYash.z,
          facingYaw: rockSeatYash.yaw,
          groundY: rockSeatYash.rockTopY - 0.52,
          strideRatio: 0,
          stridePhase: 0,
          elapsed: sim.elapsed,
          delta,
          idlePose: 'sit_laugh',
          armGesturePhase: 2.3,
          reducedMotion,
        });

        if (autoPlayMode && !autoShouldSit) {
          // Walk in visibly together along the stony slope toward the stream boulders before sitting
          const wAlpha = Math.min(1, walkElapsed / WATERFALL_WALK_IN_DURATION_SEC);
          const wEase = wAlpha * wAlpha * (3 - 2 * wAlpha);
          const curIx = THREE.MathUtils.lerp(-2.15, rockSeatIshaan.x - 0.55, wEase);
          const curIz = THREE.MathUtils.lerp(-1.35, rockSeatIshaan.z - 0.1, wEase);
          const curSx = THREE.MathUtils.lerp(-1.95, rockSeatShree.x - 0.55, wEase);
          const curSz = THREE.MathUtils.lerp(-2.0, rockSeatShree.z + 0.05, wEase);
          const walkYaw = -Math.PI * 0.46;

          animateIshaanWalkRig({
            refs: ishaanRig,
            posX: curIx,
            posZ: curIz,
            facingYaw: walkYaw,
            strideRatio: 0.72,
            stridePhase: walkElapsed * 5.8,
            elapsed: sim.elapsed,
            delta,
            groundY: 0.02,
            reducedMotion,
          });
          animateCharacterRig({
            refs: shreeRig,
            posX: curSx,
            posZ: curSz,
            facingYaw: walkYaw,
            strideRatio: 0.72,
            stridePhase: walkElapsed * 5.8 + 0.4,
            elapsed: sim.elapsed,
            delta,
            groundY: 0.02,
            idlePose: 'chat_nod',
            reducedMotion,
          });

          scratch.desiredCamPos.set(curIx - 2.35, 1.92, curIz + 2.55);
          scratch.desiredLookAt.set(curIx + 1.8, 1.05, -1.65);
          camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 5));
          scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 6));
          camera.lookAt(scratch.currentLookAt);
        } else if (waterfallSeatedRef.current) {
          if (walkElapsed >= WATERFALL_WALK_IN_DURATION_SEC + 1.2 && !streamVideoUnlockedRef.current) {
            streamVideoUnlockedRef.current = true;
            onUnlockDay1StreamVideo?.();
          }

          animateCharacterRig({
            refs: ishaanRig,
            posX: rockSeatIshaan.x,
            posZ: rockSeatIshaan.z,
            facingYaw: rockSeatIshaan.yaw,
            groundY: rockSeatIshaan.rockTopY - 0.52,
            strideRatio: 0,
            stridePhase: 0,
            elapsed: sim.elapsed,
            delta,
            idlePose: 'sit_laugh',
            reducedMotion,
          });
          animateCharacterRig({
            refs: shreeRig,
            posX: rockSeatShree.x,
            posZ: rockSeatShree.z,
            facingYaw: rockSeatShree.yaw,
            groundY: rockSeatShree.rockTopY - 0.52,
            strideRatio: 0,
            stridePhase: 0,
            elapsed: sim.elapsed,
            delta,
            idlePose: 'sit_laugh',
            armGesturePhase: 1.4,
            reducedMotion,
          });
          scratch.desiredCamPos.set(-1.35 + Math.sin(sitT * 1.15) * 0.6, 2.05, 1.95 - sitT * 0.65);
          scratch.desiredLookAt.set(3.25, 1.12, -1.65);
          camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
          scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5.2));
          camera.lookAt(scratch.currentLookAt);

          if (!autoPlayMode && prevHotspotIdRef.current !== 'sit_boulders_stand') {
            prevHotspotIdRef.current = 'sit_boulders_stand';
            onNearbyHotspotChange({
              id: 'sit_boulders',
              label: 'Stand Up & Walk Back to Scooters',
              x: rockSeatIshaan.x,
              z: rockSeatIshaan.z,
              radius: 2.0,
              actionType: 'interact',
            });
          }
        } else {
          const input = walkInputRef.current;
          if (input) {
            const moveDist = stepWalkSimulation(
              sim,
              input,
              delta,
              DAY1_WATERFALL_WALK_BOUNDS,
              []
            );
            const speed = Math.hypot(sim.velX, sim.velZ);
            sim.strideRatio = THREE.MathUtils.clamp(speed / WALK_SPEED_MPS, 0, 1);
            if (sim.strideRatio > 0.03) {
              sim.stridePhase += moveDist * 3.8;
            }
          }
          animateIshaanWalkRig({
            refs: ishaanRig,
            posX: sim.posX,
            posZ: sim.posZ,
            facingYaw: sim.facingYaw,
            strideRatio: sim.strideRatio,
            stridePhase: sim.stridePhase,
            elapsed: sim.elapsed,
            delta,
            groundY: 0.02,
            reducedMotion,
          });
          animateCharacterRig({
            refs: shreeRig,
            posX: 1.15,
            posZ: -1.75,
            facingYaw: Math.atan2(-(sim.posX - 1.15), -(sim.posZ + 1.75)),
            strideRatio: 0,
            stridePhase: 0,
            elapsed: sim.elapsed,
            delta,
            idlePose: 'look_around',
            reducedMotion,
          });
          const camSin = Math.sin(sim.orbitYaw);
          const camCos = Math.cos(sim.orbitYaw);
          const isNarrow = size.width < 768;
          scratch.desiredCamPos.set(
            sim.posX + camSin * (isNarrow ? 3.6 : 3.05),
            1.78,
            sim.posZ + camCos * (isNarrow ? 3.6 : 3.05)
          );
          scratch.desiredLookAt.set(sim.posX - camSin * 1.4, 1.16, sim.posZ - camCos * 1.4);
          camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 8));
          scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 10));
          camera.lookAt(scratch.currentLookAt);

          const wfHotspot = findNearestWalkHotspot(sim.posX, sim.posZ, DAY1_WATERFALL_HOTSPOTS);
          if ((wfHotspot?.id ?? null) !== prevHotspotIdRef.current) {
            prevHotspotIdRef.current = wfHotspot?.id ?? null;
            onNearbyHotspotChange(wfHotspot);
          }
        }
      }

      if (autoPlayMode && t >= WATERFALL_TOTAL_DURATION_SEC && !phaseAdvancedRef.current) {
        phaseAdvancedRef.current = true;
        onAdvanceDay1Phase('evening_maggi_stop');
      }
      return;
    }

    // ---------------------------------------------------------
    // PHASE 2B: ~5:00 PM ROADSIDE MAGGI STOP TOGETHER
    // ---------------------------------------------------------
    if (day1Phase === 'evening_maggi_stop') {
      phaseTimerRef.current += delta;
      const t = phaseTimerRef.current;

      animateCharacterRig({
        refs: ishaanRig,
        posX: DAY1_MAGGI_SEATS.ishaan.x,
        posZ: DAY1_MAGGI_SEATS.ishaan.z,
        facingYaw: DAY1_MAGGI_SEATS.ishaan.yaw,
        groundY: -0.25,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_eat',
        reducedMotion,
      });
      animateCharacterRig({
        refs: shreeRig,
        posX: DAY1_MAGGI_SEATS.srishti.x,
        posZ: DAY1_MAGGI_SEATS.srishti.z,
        facingYaw: DAY1_MAGGI_SEATS.srishti.yaw,
        groundY: -0.25,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_laugh',
        armGesturePhase: 1.1,
        reducedMotion,
      });
      animateCharacterRig({
        refs: manishRig,
        posX: DAY1_MAGGI_SEATS.friend_black_tee.x,
        posZ: DAY1_MAGGI_SEATS.friend_black_tee.z,
        facingYaw: DAY1_MAGGI_SEATS.friend_black_tee.yaw,
        groundY: -0.25,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_eat',
        armGesturePhase: 1.9,
        reducedMotion,
      });
      animateCharacterRig({
        refs: yashRig,
        posX: DAY1_MAGGI_SEATS.friend_plaid.x,
        posZ: DAY1_MAGGI_SEATS.friend_plaid.z,
        facingYaw: DAY1_MAGGI_SEATS.friend_plaid.yaw,
        groundY: -0.25,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_laugh',
        armGesturePhase: 0.7,
        reducedMotion,
      });

      const angle = 0.3 + Math.sin(t * 0.45) * 0.55;
      scratch.desiredCamPos.set(
        DAY1_MAGGI_TABLE_CENTER.x + Math.sin(angle) * 3.1,
        1.85,
        DAY1_MAGGI_TABLE_CENTER.z + Math.cos(angle) * 3.1
      );
      scratch.desiredLookAt.set(
        DAY1_MAGGI_TABLE_CENTER.x,
        0.95,
        DAY1_MAGGI_TABLE_CENTER.z
      );
      camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
      scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5));
      camera.lookAt(scratch.currentLookAt);

      if (autoPlayMode && t >= EVENING_MAGGI_DURATION_SEC && !phaseAdvancedRef.current) {
        phaseAdvancedRef.current = true;
        onAdvanceDay1Phase('return_and_kanishka');
      }
      return;
    }

    // ---------------------------------------------------------
    // PHASE 3: RETURN TO STAY (SRISHTI WITH KANISHKA DUSK -> NIGHT) + ~9 PM CALL
    // ---------------------------------------------------------
    if (day1Phase === 'return_and_kanishka') {
      phaseTimerRef.current += delta;
      const t = phaseTimerRef.current;
      const rollAlpha = Math.min(1, t / RETURN_ROLLOUT_DURATION_SEC);
      const rollEase = rollAlpha * rollAlpha * (3 - 2 * rollAlpha);

      // Srishti spends relaxed evening time with Kanishka & original friends downstairs
      animateCharacterRig({
        refs: shreeRig,
        posX: 0.75,
        posZ: 1.55,
        facingYaw: -Math.PI * 0.45,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: t > RETURN_ROLLOUT_DURATION_SEC ? 'look_around' : 'chat_nod',
        reducedMotion,
      });

      const zScooter1 = THREE.MathUtils.lerp(2.55, 8.85, rollEase);
      const xScooter1 = THREE.MathUtils.lerp(-1.1, 2.4, rollEase);
      if (returnScooter1Ref.current) {
        returnScooter1Ref.current.position.set(xScooter1, 0, zScooter1);
        returnScooter1Ref.current.rotation.set(0, -Math.PI * 0.72, 0);
      }
      if (returnScooter2Ref.current) {
        returnScooter2Ref.current.position.set(xScooter1 - 1.35, 0, zScooter1 - 1.15);
        returnScooter2Ref.current.rotation.set(0, -Math.PI * 0.72, 0);
      }

      if (t >= RETURN_ROLLOUT_DURATION_SEC && !duskNight) {
        setDuskNight(true);
      }

      if (t >= RETURN_ROLLOUT_DURATION_SEC + 1.8 && !callTriggeredRef.current) {
        callTriggeredRef.current = true;
        onDay1CallStateChange(true);
      }

      if (autoPlayMode && t >= RETURN_ROLLOUT_DURATION_SEC + 4.6 && !phaseAdvancedRef.current) {
        phaseAdvancedRef.current = true;
        onDay1CallStateChange(false);
        onAdvanceDay1Phase('market_street_walk');
      }

      scratch.desiredCamPos.set(-2.05, 2.28, 6.25);
      scratch.desiredLookAt.set(1.08, 1.32, 2.15);
      camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
      scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5));
      camera.lookAt(scratch.currentLookAt);
      return;
    }

    // ---------------------------------------------------------
    // PHASE 3B: ~9:00 PM SCOOTER RIDE THROUGH ILLUMINATED RISHIKESH MARKET
    // ---------------------------------------------------------
    if (day1Phase === 'market_street_walk') {
      phaseTimerRef.current += delta;
      const input = walkInputRef.current;
      let leanAngle = 0;

      if (autoPlayMode) {
        const target = DAY1_MARKET_HOTSPOTS[0];
        const targetZ = target.z + 0.6;
        const targetX = Math.sin((10.2 - sim.posZ) * 0.14) * 0.22;
        const dz = targetZ - sim.posZ;
        if (Math.abs(dz) > 0.35) {
          const speed = Math.abs(dz) < 2.8 ? 1.8 : 3.0;
          const stepZ = Math.min(Math.abs(dz), speed * delta);
          sim.posZ -= stepZ;
          sim.posX = THREE.MathUtils.damp(sim.posX, targetX, 5, delta);
          sim.facingYaw = Math.atan2(-(targetX - sim.posX), 2.5) * 0.45;
          leanAngle = -sim.facingYaw * 0.45;
        } else {
          sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, 0, 6, delta);
          if (!phaseAdvancedRef.current && phaseTimerRef.current >= 6.8) {
            phaseAdvancedRef.current = true;
            onAdvanceDay1Phase('night_dhaba_dinner');
          }
        }
      } else if (input) {
        const throttle = THREE.MathUtils.clamp(input.moveZ, -1, 1);
        const steer = THREE.MathUtils.clamp(input.moveX, -1, 1);
        const driveSpeed = throttle !== 0 ? throttle * 5.6 : 0;
        sim.posZ = THREE.MathUtils.clamp(sim.posZ - driveSpeed * delta, -9.2, 10.6);
        sim.posX = THREE.MathUtils.clamp(sim.posX + steer * 2.2 * delta, -1.45, 1.45);
        leanAngle = -steer * 0.09;
        sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, -steer * 0.22, 8, delta);
      }

      const streetY = sampleMarketStreetY(sim.posZ);
      if (marketScooterRef.current) {
        marketScooterRef.current.position.set(sim.posX, streetY + 0.02, sim.posZ);
        marketScooterRef.current.rotation.set(-0.04, sim.facingYaw, leanAngle);
      }

      const isNarrow = size.width < 768;
      scratch.desiredCamPos.set(
        sim.posX * 0.65 + (isNarrow ? 0.45 : 0.35),
        streetY + 2.05,
        sim.posZ + (isNarrow ? 4.4 : 3.7)
      );
      scratch.desiredLookAt.set(
        sim.posX * 0.5,
        streetY + 1.18,
        sim.posZ - 4.2
      );
      camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 6.5));
      scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 8));
      camera.lookAt(scratch.currentLookAt);

      const mktHotspot = findNearestWalkHotspot(sim.posX, sim.posZ, DAY1_MARKET_HOTSPOTS);
      if ((mktHotspot?.id ?? null) !== prevHotspotIdRef.current) {
        prevHotspotIdRef.current = mktHotspot?.id ?? null;
        onNearbyHotspotChange(mktHotspot);
      }
      return;
    }

    // ---------------------------------------------------------
    // PHASE 4: NIGHTTIME ROADSIDE DHABA DINNER UNDER STARS
    // ---------------------------------------------------------
    if (day1Phase === 'night_dhaba_dinner') {
      phaseTimerRef.current += delta;
      const t = phaseTimerRef.current;

      animateCharacterRig({
        refs: ishaanRig,
        posX: DAY1_NIGHT_DHABA_SEATS.ishaan.x,
        posZ: DAY1_NIGHT_DHABA_SEATS.ishaan.z,
        facingYaw: DAY1_NIGHT_DHABA_SEATS.ishaan.yaw,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_eat',
        reducedMotion,
      });
      animateCharacterRig({
        refs: shreeRig,
        posX: DAY1_NIGHT_DHABA_SEATS.srishti.x,
        posZ: DAY1_NIGHT_DHABA_SEATS.srishti.z,
        facingYaw: DAY1_NIGHT_DHABA_SEATS.srishti.yaw,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_laugh',
        armGesturePhase: 1.2,
        reducedMotion,
      });
      animateCharacterRig({
        refs: manishRig,
        posX: DAY1_NIGHT_DHABA_SEATS.friend_black_tee.x,
        posZ: DAY1_NIGHT_DHABA_SEATS.friend_black_tee.z,
        facingYaw: DAY1_NIGHT_DHABA_SEATS.friend_black_tee.yaw,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_eat',
        armGesturePhase: 2.1,
        reducedMotion,
      });
      animateCharacterRig({
        refs: yashRig,
        posX: DAY1_NIGHT_DHABA_SEATS.friend_plaid.x,
        posZ: DAY1_NIGHT_DHABA_SEATS.friend_plaid.z,
        facingYaw: DAY1_NIGHT_DHABA_SEATS.friend_plaid.yaw,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: sim.elapsed,
        delta,
        idlePose: 'sit_laugh',
        armGesturePhase: 0.7,
        reducedMotion,
      });

      const angle = 0.25 + Math.sin(t * 0.45) * 0.55;
      scratch.desiredCamPos.set(
        DAY1_NIGHT_DHABA_TABLE_CENTER.x + Math.sin(angle) * 3.1,
        1.92,
        DAY1_NIGHT_DHABA_TABLE_CENTER.z + Math.cos(angle) * 3.1
      );
      scratch.desiredLookAt.set(
        DAY1_NIGHT_DHABA_TABLE_CENTER.x,
        0.92,
        DAY1_NIGHT_DHABA_TABLE_CENTER.z
      );
      camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
      scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5));
      camera.lookAt(scratch.currentLookAt);

      if (autoPlayMode && t >= NIGHT_DHABA_DURATION_SEC && !phaseAdvancedRef.current) {
        phaseAdvancedRef.current = true;
        onAdvanceDay1Phase('night_hotel_return');
      }
      return;
    }

    // ---------------------------------------------------------
    // PHASE 5: RETURN TO HOTEL AT NIGHT -> DAY 1 ENDS GENTLY
    // ---------------------------------------------------------
    if (day1Phase === 'night_hotel_return') {
      phaseTimerRef.current += delta;
      const t = phaseTimerRef.current;
      const walkAlpha = Math.min(1, t / 2.6);
      const walkEase = walkAlpha * walkAlpha * (3 - 2 * walkAlpha);
      const zPos = THREE.MathUtils.lerp(6.4, 2.0, walkEase);
      const walking = walkAlpha < 1;

      animateIshaanWalkRig({
        refs: ishaanRig,
        posX: -0.42,
        posZ: zPos,
        facingYaw: 0,
        strideRatio: walking ? 0.72 : 0,
        stridePhase: sim.elapsed * 5.8,
        elapsed: sim.elapsed,
        delta,
        groundY: 0,
        reducedMotion,
      });
      animateCharacterRig({
        refs: shreeRig,
        posX: 0.42,
        posZ: zPos + 0.15,
        facingYaw: walking ? 0 : -0.35,
        strideRatio: walking ? 0.72 : 0,
        stridePhase: sim.elapsed * 5.8 + 0.4,
        elapsed: sim.elapsed,
        delta,
        idlePose: walking ? 'chat_nod' : 'group_wave',
        reducedMotion,
      });

      scratch.desiredCamPos.set(-1.95, 2.15, zPos + 4.4);
      scratch.desiredLookAt.set(0, 1.35, zPos - 2.2);
      camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 4.5));
      scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 5));
      camera.lookAt(scratch.currentLookAt);

      if (autoPlayMode && t >= NIGHT_RETURN_DURATION_SEC && !completedRef.current) {
        completedRef.current = true;
        onDay1Complete();
      }
      return;
    }

    // ---------------------------------------------------------
    // PHASE 1: PLAYABLE RISHIKESH STAY MEET (WITH WATCH AUTOPILOT)
    // ---------------------------------------------------------
    const input = walkInputRef.current;
    if (!input) return;

    const currentTerrace = onTerraceRef.current;
    const activeBounds = currentTerrace ? TERRACE_WALK_BOUNDS : DAY1_WALK_BOUNDS;
    const activeObstacles = currentTerrace ? TERRACE_OBSTACLES : DAY1_OBSTACLES;
    const activeHotspots = currentTerrace ? TERRACE_HOTSPOTS : DAY1_HOTSPOTS;

    if (autoPlayMode && !currentTerrace) {
      phaseTimerRef.current += delta;
      // Hold warm post-rafting greeting visibly for ~2.2s before strolling out to the scooters
      if (phaseTimerRef.current < STAY_HOLD_BEFORE_WALK_SEC) {
        sim.strideRatio = 0;
      } else {
        const targetSpot = DAY1_HOTSPOTS[1];
        const dx = targetSpot.x - sim.posX;
        const dz = targetSpot.z - sim.posZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.65) {
          const moveStep = Math.min(dist, WALK_SPEED_MPS * 0.85 * delta);
          sim.posX += (dx / dist) * moveStep;
          sim.posZ += (dz / dist) * moveStep;
          sim.facingYaw = Math.atan2(-dx, -dz);
          sim.stridePhase += delta * 6.8;
          sim.strideRatio = 0.82;
        } else {
          sim.strideRatio = 0;
          if (!phaseAdvancedRef.current) {
            phaseAdvancedRef.current = true;
            onAdvanceDay1Phase('waterfall_ride_stop');
          }
        }
      }
    } else {
      const moveDist = stepWalkSimulation(sim, input, delta, activeBounds, activeObstacles);
      const speed = Math.hypot(sim.velX, sim.velZ);
      sim.strideRatio = THREE.MathUtils.clamp(speed / WALK_SPEED_MPS, 0, 1);
      if (sim.strideRatio > 0.03) {
        sim.stridePhase += moveDist * 3.8;
      }
    }

    const activeFloorY = currentTerrace ? TERRACE_Y : 0;
    animateIshaanWalkRig({
      refs: ishaanRig,
      posX: sim.posX,
      posZ: sim.posZ,
      facingYaw: sim.facingYaw,
      strideRatio: sim.strideRatio,
      stridePhase: sim.stridePhase,
      elapsed: sim.elapsed,
      delta,
      groundY: activeFloorY,
      reducedMotion,
    });

    // Shree stands near lane courtyard welcoming Ishaan after rafting
    animateCharacterRig({
      refs: shreeRig,
      posX: 0.35,
      posZ: 2.25,
      facingYaw: Math.atan2(-(sim.posX - 0.35), -(sim.posZ - 2.25)),
      strideRatio: 0,
      stridePhase: 0,
      elapsed: sim.elapsed,
      delta,
      idlePose: 'group_wave',
      reducedMotion,
    });
    animateCharacterRig({
      refs: manishRig,
      posX: -1.85,
      posZ: 3.15,
      facingYaw: 2.55,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: sim.elapsed,
      delta,
      idlePose: 'chat_nod',
      reducedMotion,
    });
    animateCharacterRig({
      refs: yashRig,
      posX: -1.05,
      posZ: 3.45,
      facingYaw: -1.15,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: sim.elapsed,
      delta,
      idlePose: 'chat_nod',
      armGesturePhase: 1.5,
      reducedMotion,
    });

    const camSin = Math.sin(sim.orbitYaw);
    const camCos = Math.cos(sim.orbitYaw);
    const isNarrow = size.width < 768;
    scratch.desiredCamPos.set(
      sim.posX + camSin * (isNarrow ? 3.55 : 2.95),
      activeFloorY + (currentTerrace ? 1.88 : 1.72),
      sim.posZ + camCos * (isNarrow ? 3.55 : 2.95)
    );
    scratch.desiredLookAt.set(
      sim.posX - camSin * 1.4,
      activeFloorY + 1.18,
      sim.posZ - camCos * 1.4
    );
    camera.position.lerp(scratch.desiredCamPos, 1 - Math.exp(-delta * 8));
    scratch.currentLookAt.lerp(scratch.desiredLookAt, 1 - Math.exp(-delta * 10));
    camera.lookAt(scratch.currentLookAt);

    const hotspot = findNearestWalkHotspot(sim.posX, sim.posZ, activeHotspots);
    if ((hotspot?.id ?? null) !== prevHotspotIdRef.current) {
      prevHotspotIdRef.current = hotspot?.id ?? null;
      onNearbyHotspotChange(hotspot);
    }
  });

  if (day1Phase === 'waterfall_ride_stop') {
    return (
      <>
        <Day1WaterfallEnvironment
          qualityProfile={qualityProfile}
          paused={paused}
          scootersParked={waterfallParked}
          sittingOnBoulders={waterfallSeated}
        />

        {!waterfallParked ? (
          <>
            <group ref={leadScooterRef} position={[-3.35, 0.02, 16.5]} rotation={[0, -0.25, 0]}>
              <PrototypeScooter variant="lead" castShadow={shadowsEnabled} outfitMode="day1" />
            </group>
            <group ref={compScooterRef} position={[-4.55, 0.02, 20.5]} rotation={[0, -0.25, 0]}>
              <PrototypeScooter variant="companion" castShadow={shadowsEnabled} outfitMode="day1" />
            </group>
          </>
        ) : (
          <>
            <StylizedPlaceholderCharacter
              characterVariant="ishaan"
              outfitMode="day1"
              groupRef={ishaanRig.groupRef}
              torsoRef={ishaanRig.torsoRef}
              headRef={ishaanRig.headRef}
              leftLegRef={ishaanRig.leftLegRef}
              leftKneeRef={ishaanRig.leftKneeRef}
              rightLegRef={ishaanRig.rightLegRef}
              rightKneeRef={ishaanRig.rightKneeRef}
              leftArmRef={ishaanRig.leftArmRef}
              rightArmRef={ishaanRig.rightArmRef}
              rightForearmRef={ishaanRig.rightForearmRef}
              position={
                waterfallSeated
                  ? [
                      DAY1_WATERFALL_ROCK_SEATS.ishaan.x,
                      DAY1_WATERFALL_ROCK_SEATS.ishaan.rockTopY - 0.52,
                      DAY1_WATERFALL_ROCK_SEATS.ishaan.z,
                    ]
                  : [-2.15, 0.02, -1.35]
              }
              rotationY={
                waterfallSeated ? DAY1_WATERFALL_ROCK_SEATS.ishaan.yaw : -Math.PI * 0.48
              }
              castShadow={shadowsEnabled}
            />
            <StylizedPlaceholderCharacter
              characterVariant="srishti"
              outfitMode="day1"
              groupRef={shreeRig.groupRef}
              torsoRef={shreeRig.torsoRef}
              headRef={shreeRig.headRef}
              leftLegRef={shreeRig.leftLegRef}
              leftKneeRef={shreeRig.leftKneeRef}
              rightLegRef={shreeRig.rightLegRef}
              rightKneeRef={shreeRig.rightKneeRef}
              leftArmRef={shreeRig.leftArmRef}
              rightArmRef={shreeRig.rightArmRef}
              rightForearmRef={shreeRig.rightForearmRef}
              position={
                waterfallSeated
                  ? [
                      DAY1_WATERFALL_ROCK_SEATS.srishti.x,
                      DAY1_WATERFALL_ROCK_SEATS.srishti.rockTopY - 0.52,
                      DAY1_WATERFALL_ROCK_SEATS.srishti.z,
                    ]
                  : [1.15, 0.02, -1.75]
              }
              rotationY={waterfallSeated ? DAY1_WATERFALL_ROCK_SEATS.srishti.yaw : -1.2}
              castShadow={shadowsEnabled}
            />
            <StylizedPlaceholderCharacter
              characterVariant="friend_black_tee"
              outfitMode="day1"
              groupRef={manishRig.groupRef}
              torsoRef={manishRig.torsoRef}
              headRef={manishRig.headRef}
              leftLegRef={manishRig.leftLegRef}
              leftKneeRef={manishRig.leftKneeRef}
              rightLegRef={manishRig.rightLegRef}
              rightKneeRef={manishRig.rightKneeRef}
              leftArmRef={manishRig.leftArmRef}
              rightArmRef={manishRig.rightArmRef}
              rightForearmRef={manishRig.rightForearmRef}
              position={[
                DAY1_WATERFALL_ROCK_SEATS.friend_black_tee.x,
                DAY1_WATERFALL_ROCK_SEATS.friend_black_tee.rockTopY - 0.52,
                DAY1_WATERFALL_ROCK_SEATS.friend_black_tee.z,
              ]}
              rotationY={DAY1_WATERFALL_ROCK_SEATS.friend_black_tee.yaw}
              castShadow={shadowsEnabled}
            />
            <StylizedPlaceholderCharacter
              characterVariant="friend_plaid"
              outfitMode="day1"
              groupRef={yashRig.groupRef}
              torsoRef={yashRig.torsoRef}
              headRef={yashRig.headRef}
              leftLegRef={yashRig.leftLegRef}
              leftKneeRef={yashRig.leftKneeRef}
              rightLegRef={yashRig.rightLegRef}
              rightKneeRef={yashRig.rightKneeRef}
              leftArmRef={yashRig.leftArmRef}
              rightArmRef={yashRig.rightArmRef}
              rightForearmRef={yashRig.rightForearmRef}
              position={[
                DAY1_WATERFALL_ROCK_SEATS.friend_plaid.x,
                DAY1_WATERFALL_ROCK_SEATS.friend_plaid.rockTopY - 0.52,
                DAY1_WATERFALL_ROCK_SEATS.friend_plaid.z,
              ]}
              rotationY={DAY1_WATERFALL_ROCK_SEATS.friend_plaid.yaw}
              castShadow={shadowsEnabled}
            />
          </>
        )}
      </>
    );
  }

  if (day1Phase === 'evening_maggi_stop') {
    return (
      <>
        <Day1MaggiStopEnvironment qualityProfile={qualityProfile} paused={paused} />

        <StylizedPlaceholderCharacter
          characterVariant="ishaan"
          outfitMode="day1"
          groupRef={ishaanRig.groupRef}
          torsoRef={ishaanRig.torsoRef}
          headRef={ishaanRig.headRef}
          leftLegRef={ishaanRig.leftLegRef}
          leftKneeRef={ishaanRig.leftKneeRef}
          rightLegRef={ishaanRig.rightLegRef}
          rightKneeRef={ishaanRig.rightKneeRef}
          leftArmRef={ishaanRig.leftArmRef}
          rightArmRef={ishaanRig.rightArmRef}
          rightForearmRef={ishaanRig.rightForearmRef}
          position={[DAY1_MAGGI_SEATS.ishaan.x, -0.25, DAY1_MAGGI_SEATS.ishaan.z]}
          rotationY={DAY1_MAGGI_SEATS.ishaan.yaw}
          holdingFork
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="srishti"
          outfitMode="day1"
          groupRef={shreeRig.groupRef}
          torsoRef={shreeRig.torsoRef}
          headRef={shreeRig.headRef}
          leftLegRef={shreeRig.leftLegRef}
          leftKneeRef={shreeRig.leftKneeRef}
          rightLegRef={shreeRig.rightLegRef}
          rightKneeRef={shreeRig.rightKneeRef}
          leftArmRef={shreeRig.leftArmRef}
          rightArmRef={shreeRig.rightArmRef}
          rightForearmRef={shreeRig.rightForearmRef}
          position={[DAY1_MAGGI_SEATS.srishti.x, -0.25, DAY1_MAGGI_SEATS.srishti.z]}
          rotationY={DAY1_MAGGI_SEATS.srishti.yaw}
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="friend_black_tee"
          outfitMode="day1"
          groupRef={manishRig.groupRef}
          torsoRef={manishRig.torsoRef}
          headRef={manishRig.headRef}
          leftLegRef={manishRig.leftLegRef}
          leftKneeRef={manishRig.leftKneeRef}
          rightLegRef={manishRig.rightLegRef}
          rightKneeRef={manishRig.rightKneeRef}
          leftArmRef={manishRig.leftArmRef}
          rightArmRef={manishRig.rightArmRef}
          rightForearmRef={manishRig.rightForearmRef}
          position={[
            DAY1_MAGGI_SEATS.friend_black_tee.x,
            -0.25,
            DAY1_MAGGI_SEATS.friend_black_tee.z,
          ]}
          rotationY={DAY1_MAGGI_SEATS.friend_black_tee.yaw}
          holdingFork
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="friend_plaid"
          outfitMode="day1"
          groupRef={yashRig.groupRef}
          torsoRef={yashRig.torsoRef}
          headRef={yashRig.headRef}
          leftLegRef={yashRig.leftLegRef}
          leftKneeRef={yashRig.leftKneeRef}
          rightLegRef={yashRig.rightLegRef}
          rightKneeRef={yashRig.rightKneeRef}
          leftArmRef={yashRig.leftArmRef}
          rightArmRef={yashRig.rightArmRef}
          rightForearmRef={yashRig.rightForearmRef}
          position={[
            DAY1_MAGGI_SEATS.friend_plaid.x,
            -0.25,
            DAY1_MAGGI_SEATS.friend_plaid.z,
          ]}
          rotationY={DAY1_MAGGI_SEATS.friend_plaid.yaw}
          castShadow={shadowsEnabled}
        />
      </>
    );
  }

  if (day1Phase === 'market_street_walk') {
    return (
      <>
        <Day1MarketWalkEnvironment qualityProfile={qualityProfile} paused={paused} />
        <group
          ref={marketScooterRef}
          position={[0.0, sampleMarketStreetY(10.2) + 0.02, 10.2]}
          rotation={[-0.04, 0, 0]}
        >
          <PrototypeScooter variant="lead" soloRiderVariant="srishti" castShadow={shadowsEnabled} outfitMode="day1" />
        </group>
      </>
    );
  }

  if (day1Phase === 'night_dhaba_dinner') {
    return (
      <>
        <Day1NightDhabaEnvironment qualityProfile={qualityProfile} />

        <StylizedPlaceholderCharacter
          characterVariant="ishaan"
          outfitMode="day1"
          groupRef={ishaanRig.groupRef}
          torsoRef={ishaanRig.torsoRef}
          headRef={ishaanRig.headRef}
          leftLegRef={ishaanRig.leftLegRef}
          leftKneeRef={ishaanRig.leftKneeRef}
          rightLegRef={ishaanRig.rightLegRef}
          rightKneeRef={ishaanRig.rightKneeRef}
          leftArmRef={ishaanRig.leftArmRef}
          rightArmRef={ishaanRig.rightArmRef}
          rightForearmRef={ishaanRig.rightForearmRef}
          position={[DAY1_NIGHT_DHABA_SEATS.ishaan.x, -0.25, DAY1_NIGHT_DHABA_SEATS.ishaan.z]}
          rotationY={DAY1_NIGHT_DHABA_SEATS.ishaan.yaw}
          holdingFork
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="srishti"
          outfitMode="day1"
          groupRef={shreeRig.groupRef}
          torsoRef={shreeRig.torsoRef}
          headRef={shreeRig.headRef}
          leftLegRef={shreeRig.leftLegRef}
          leftKneeRef={shreeRig.leftKneeRef}
          rightLegRef={shreeRig.rightLegRef}
          rightKneeRef={shreeRig.rightKneeRef}
          leftArmRef={shreeRig.leftArmRef}
          rightArmRef={shreeRig.rightArmRef}
          rightForearmRef={shreeRig.rightForearmRef}
          position={[DAY1_NIGHT_DHABA_SEATS.srishti.x, -0.25, DAY1_NIGHT_DHABA_SEATS.srishti.z]}
          rotationY={DAY1_NIGHT_DHABA_SEATS.srishti.yaw}
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="friend_black_tee"
          outfitMode="day1"
          groupRef={manishRig.groupRef}
          torsoRef={manishRig.torsoRef}
          headRef={manishRig.headRef}
          leftLegRef={manishRig.leftLegRef}
          leftKneeRef={manishRig.leftKneeRef}
          rightLegRef={manishRig.rightLegRef}
          rightKneeRef={manishRig.rightKneeRef}
          leftArmRef={manishRig.leftArmRef}
          rightArmRef={manishRig.rightArmRef}
          rightForearmRef={manishRig.rightForearmRef}
          position={[
            DAY1_NIGHT_DHABA_SEATS.friend_black_tee.x,
            -0.25,
            DAY1_NIGHT_DHABA_SEATS.friend_black_tee.z,
          ]}
          rotationY={DAY1_NIGHT_DHABA_SEATS.friend_black_tee.yaw}
          holdingFork
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="friend_plaid"
          outfitMode="day1"
          groupRef={yashRig.groupRef}
          torsoRef={yashRig.torsoRef}
          headRef={yashRig.headRef}
          leftLegRef={yashRig.leftLegRef}
          leftKneeRef={yashRig.leftKneeRef}
          rightLegRef={yashRig.rightLegRef}
          rightKneeRef={yashRig.rightKneeRef}
          leftArmRef={yashRig.leftArmRef}
          rightArmRef={yashRig.rightArmRef}
          rightForearmRef={yashRig.rightForearmRef}
          position={[
            DAY1_NIGHT_DHABA_SEATS.friend_plaid.x,
            -0.25,
            DAY1_NIGHT_DHABA_SEATS.friend_plaid.z,
          ]}
          rotationY={DAY1_NIGHT_DHABA_SEATS.friend_plaid.yaw}
          castShadow={shadowsEnabled}
        />
      </>
    );
  }

  if (day1Phase === 'night_hotel_return') {
    return (
      <>
        <HotelReturnEnvironment
          qualityProfile={qualityProfile}
          paused={paused}
          farewellDone
          onTerrace={false}
          variant="day1_stay"
          hideOriginFriends
          nightReturn
          day1Done
        />
        <StylizedPlaceholderCharacter
          characterVariant="ishaan"
          outfitMode="day1"
          groupRef={ishaanRig.groupRef}
          torsoRef={ishaanRig.torsoRef}
          headRef={ishaanRig.headRef}
          leftLegRef={ishaanRig.leftLegRef}
          leftKneeRef={ishaanRig.leftKneeRef}
          rightLegRef={ishaanRig.rightLegRef}
          rightKneeRef={ishaanRig.rightKneeRef}
          leftArmRef={ishaanRig.leftArmRef}
          rightArmRef={ishaanRig.rightArmRef}
          rightForearmRef={ishaanRig.rightForearmRef}
          position={[-0.42, 0, 6.4]}
          rotationY={0}
          castShadow={shadowsEnabled}
        />
        <StylizedPlaceholderCharacter
          characterVariant="srishti"
          outfitMode="day1"
          groupRef={shreeRig.groupRef}
          torsoRef={shreeRig.torsoRef}
          headRef={shreeRig.headRef}
          leftLegRef={shreeRig.leftLegRef}
          leftKneeRef={shreeRig.leftKneeRef}
          rightLegRef={shreeRig.rightLegRef}
          rightKneeRef={shreeRig.rightKneeRef}
          leftArmRef={shreeRig.leftArmRef}
          rightArmRef={shreeRig.rightArmRef}
          rightForearmRef={shreeRig.rightForearmRef}
          position={[0.42, 0, 6.55]}
          rotationY={0}
          castShadow={shadowsEnabled}
        />
      </>
    );
  }

  return (
    <>
      <HotelReturnEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        farewellDone={day1Phase === 'return_and_kanishka'}
        onTerrace={onTerraceState}
        variant="day1_stay"
        hideOriginFriends={false}
        nightReturn={day1Phase === 'return_and_kanishka' && duskNight}
        day1Done={day1Phase === 'return_and_kanishka'}
      />

      {day1Phase === 'return_and_kanishka' ? (
        <>
          <StylizedPlaceholderCharacter
            characterVariant="srishti"
            outfitMode="day1"
            groupRef={shreeRig.groupRef}
            torsoRef={shreeRig.torsoRef}
            headRef={shreeRig.headRef}
            leftLegRef={shreeRig.leftLegRef}
            leftKneeRef={shreeRig.leftKneeRef}
            rightLegRef={shreeRig.rightLegRef}
            rightKneeRef={shreeRig.rightKneeRef}
            leftArmRef={shreeRig.leftArmRef}
            rightArmRef={shreeRig.rightArmRef}
            rightForearmRef={shreeRig.rightForearmRef}
            position={[0.75, 0, 1.55]}
            rotationY={-Math.PI * 0.45}
            castShadow={shadowsEnabled}
          />
          <group ref={returnScooter1Ref} position={[-1.1, 0, 2.55]} rotation={[0, -Math.PI * 0.72, 0]}>
            <PrototypeScooter variant="lead" castShadow={shadowsEnabled} outfitMode="day1" driverOnly />
          </group>
          <group ref={returnScooter2Ref} position={[-2.45, 0, 1.4]} rotation={[0, -Math.PI * 0.72, 0]}>
            <PrototypeScooter variant="companion" castShadow={shadowsEnabled} outfitMode="day1" />
          </group>
        </>
      ) : (
        <>
          <StylizedPlaceholderCharacter
            characterVariant="ishaan"
            outfitMode="day1"
            groupRef={ishaanRig.groupRef}
            torsoRef={ishaanRig.torsoRef}
            headRef={ishaanRig.headRef}
            leftLegRef={ishaanRig.leftLegRef}
            leftKneeRef={ishaanRig.leftKneeRef}
            rightLegRef={ishaanRig.rightLegRef}
            rightKneeRef={ishaanRig.rightKneeRef}
            leftArmRef={ishaanRig.leftArmRef}
            rightArmRef={ishaanRig.rightArmRef}
            rightForearmRef={ishaanRig.rightForearmRef}
            position={[-0.45, 0, -2.0]}
            rotationY={Math.PI}
            castShadow={shadowsEnabled}
          />
          <StylizedPlaceholderCharacter
            characterVariant="srishti"
            outfitMode="day1"
            groupRef={shreeRig.groupRef}
            torsoRef={shreeRig.torsoRef}
            headRef={shreeRig.headRef}
            leftLegRef={shreeRig.leftLegRef}
            leftKneeRef={shreeRig.leftKneeRef}
            rightLegRef={shreeRig.rightLegRef}
            rightKneeRef={shreeRig.rightKneeRef}
            leftArmRef={shreeRig.leftArmRef}
            rightArmRef={shreeRig.rightArmRef}
            rightForearmRef={shreeRig.rightForearmRef}
            position={[0.35, 0, 2.25]}
            rotationY={0}
            castShadow={shadowsEnabled}
          />
          <StylizedPlaceholderCharacter
            characterVariant="friend_black_tee"
            outfitMode="day1"
            groupRef={manishRig.groupRef}
            torsoRef={manishRig.torsoRef}
            headRef={manishRig.headRef}
            leftLegRef={manishRig.leftLegRef}
            leftKneeRef={manishRig.leftKneeRef}
            rightLegRef={manishRig.rightLegRef}
            rightKneeRef={manishRig.rightKneeRef}
            leftArmRef={manishRig.leftArmRef}
            rightArmRef={manishRig.rightArmRef}
            rightForearmRef={manishRig.rightForearmRef}
            position={[-1.85, 0, 3.15]}
            rotationY={2.55}
            castShadow={shadowsEnabled}
          />
          <StylizedPlaceholderCharacter
            characterVariant="friend_plaid"
            outfitMode="day1"
            groupRef={yashRig.groupRef}
            torsoRef={yashRig.torsoRef}
            headRef={yashRig.headRef}
            leftLegRef={yashRig.leftLegRef}
            leftKneeRef={yashRig.leftKneeRef}
            rightLegRef={yashRig.rightLegRef}
            rightKneeRef={yashRig.rightKneeRef}
            leftArmRef={yashRig.leftArmRef}
            rightArmRef={yashRig.rightArmRef}
            rightForearmRef={yashRig.rightForearmRef}
            position={[-1.05, 0, 3.45]}
            rotationY={-1.15}
            castShadow={shadowsEnabled}
          />
        </>
      )}
    </>
  );
}
