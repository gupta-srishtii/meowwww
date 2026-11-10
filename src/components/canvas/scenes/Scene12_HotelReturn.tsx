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
import { animateIshaanWalkRig } from '@/components/canvas/characters/animateCharacterRig';
import {
  HOTEL_HOTSPOTS,
  HOTEL_OBSTACLES,
  HOTEL_WALK_BOUNDS,
  HotelReturnEnvironment,
  TERRACE_HOTSPOTS,
  TERRACE_OBSTACLES,
  TERRACE_WALK_BOUNDS,
  TERRACE_Y,
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
  srishti: { x: -1.12, z: 4.55, yaw: 0.22 },
  friend_black_tee: { x: 1.08, z: 4.92, yaw: -0.42 },
  friend_plaid: { x: -0.65, z: 6.15, yaw: 0.15 },
};

const HOTEL_COMPANION_CONFIGS: readonly CompanionAgentConfig[] = [
  {
    id: 'srishti',
    followAngleOffset: -0.82,
    followDistance: 1.28,
    idlePose: 'chat_nod',
    gesturePhase: 0.35,
  },
  {
    id: 'friend_black_tee',
    followAngleOffset: 1.05,
    followDistance: 1.75,
    idlePose: 'look_around',
    gesturePhase: 1.8,
  },
  {
    id: 'friend_plaid',
    followAngleOffset: -0.25,
    followDistance: 2.15,
    idlePose: 'chat_nod',
    gesturePhase: 3.1,
  },
];

// Natural relaxed non-linear spacing when farewell triggers
const HOTEL_FAREWELL_SLOTS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: { x: 0.44, z: 3.08, facingYaw: 0.92 },
  friend_black_tee: { x: -1.45, z: 1.55, facingYaw: 0.35 },
  friend_plaid: { x: 1.48, z: 1.25, facingYaw: -0.45 },
};

const GROUND_CHILL_SLOTS: Record<FriendCompanionId, CompanionTargetSlot> = {
  srishti: { x: -0.95, z: 2.15, facingYaw: 0.4 },
  friend_black_tee: { x: -1.55, z: 1.68, facingYaw: 0.65 },
  friend_plaid: { x: 1.45, z: 1.42, facingYaw: -0.58 },
};

const TERRACE_SREE_POS = { x: -0.95, z: -3.85 } as const;
const CAM_DIST_LANE = 5.3;
const CAM_DIST_TERRACE = 5.9;
const STAIR_TRANSIT_DURATION = 1.05;

/**
 * Scene 12 — Safe Evening Return to the Modest Rishikesh House Stay, Narrow Lane,
 * Walkable Rooftop Terrace overlooking hills & neighboring houses, and Srishti Rejoining Friends.
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
    throw new Error('Simulated fault while mounting Scene 12 (Rishikesh Stay & Lane).');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const [onTerraceState, setOnTerraceState] = useState(false);

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
      HOTEL_COMPANION_CONFIGS.map((cfg) => {
        const init = HOTEL_COMPANION_INIT[cfg.id as FriendCompanionId];
        return { id: cfg.id, x: init.x, z: init.z, facingYaw: init.yaw };
      })
    )
  );

  const simRef = useRef({
    posX: -0.25,
    posZ: 5.1,
    groundY: 0,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.14,
    orbitPitch: 0.25,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
    onTerrace: false,
    stairTransit: null as {
      dir: 'up' | 'down';
      elapsed: number;
    } | null,
    stairCooldownSec: 0,
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
    const sim = simRef.current;
    sim.posX = -0.25;
    sim.posZ = 5.1;
    sim.groundY = 0;
    sim.velX = 0;
    sim.velZ = 0;
    sim.facingYaw = 0;
    sim.onTerrace = false;
    sim.stairTransit = null;
    sim.stairCooldownSec = 0;
    sim.cameraInitialized = false;
    setOnTerraceState(false);
    onSceneReady(transitionToken, 12);
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    const handleToggleTerrace = (event: Event) => {
      const detail = (event as CustomEvent<{ direction?: 'up' | 'down' }>).detail;
      const sim = simRef.current;
      if (sim.stairTransit) return;
      const dir = detail?.direction ?? (sim.onTerrace ? 'down' : 'up');
      if (dir === 'up' && !sim.onTerrace) {
        sim.stairTransit = { dir: 'up', elapsed: 0 };
        sim.velX = 0;
        sim.velZ = 0;
      } else if (dir === 'down' && sim.onTerrace) {
        sim.stairTransit = { dir: 'down', elapsed: 0 };
        sim.velX = 0;
        sim.velZ = 0;
      }
    };

    window.addEventListener('scene12:toggle-terrace', handleToggleTerrace);
    return () => window.removeEventListener('scene12:toggle-terrace', handleToggleTerrace);
  }, []);

  useEffect(() => {
    if (!paused) clock.getDelta();
  }, [paused, clock]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 58 : 51;
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
    if (sim.stairCooldownSec > 0) {
      sim.stairCooldownSec = Math.max(0, sim.stairCooldownSec - delta);
    }

    let walkSpeed = 0;
    let strideRatio = 0;
    let climbingStairs = false;

    if (sim.stairTransit) {
      const dur = reducedMotion ? 0.25 : STAIR_TRANSIT_DURATION;
      sim.stairTransit.elapsed += delta;
      const u = THREE.MathUtils.clamp(sim.stairTransit.elapsed / dur, 0, 1);
      const smoothU = u * u * (3 - 2 * u);

      if (sim.stairTransit.dir === 'up') {
        sim.posX = THREE.MathUtils.lerp(3.38, 3.38, smoothU);
        sim.posZ = THREE.MathUtils.lerp(1.35, -1.65, smoothU);
        sim.groundY = THREE.MathUtils.lerp(0, TERRACE_Y, smoothU);
        sim.facingYaw = 0;
      } else {
        sim.posX = THREE.MathUtils.lerp(3.38, 3.38, smoothU);
        sim.posZ = THREE.MathUtils.lerp(-1.65, 1.45, smoothU);
        sim.groundY = THREE.MathUtils.lerp(TERRACE_Y, 0, smoothU);
        sim.facingYaw = Math.PI;
      }
      sim.stridePhase += delta * 9.5;
      strideRatio = 0.85;
      climbingStairs = true;

      if (u >= 1) {
        const wentUp = sim.stairTransit.dir === 'up';
        sim.stairTransit = null;
        sim.onTerrace = wentUp;
        sim.groundY = wentUp ? TERRACE_Y : 0;
        sim.posX = wentUp ? 2.45 : 2.35;
        sim.posZ = wentUp ? -2.45 : 1.55;
        sim.facingYaw = wentUp ? -0.35 : 0.45;
        sim.stairCooldownSec = 1.4;
        setOnTerraceState(wentUp);

        // Place Shree cleanly onto terrace overlook when Ishaan steps up
        const shree = companionStatesRef.current.find((a) => a.id === 'srishti');
        if (shree) {
          shree.posX = wentUp ? TERRACE_SREE_POS.x + 1.2 : -0.95;
          shree.posZ = wentUp ? TERRACE_SREE_POS.z + 1.0 : 2.05;
          shree.velX = 0;
          shree.velZ = 0;
        }
      }
    } else {
      const bounds = sim.onTerrace ? TERRACE_WALK_BOUNDS : HOTEL_WALK_BOUNDS;
      const obstacles = sim.onTerrace ? TERRACE_OBSTACLES : HOTEL_OBSTACLES;

      const moveDist = stepWalkSimulation(sim, walkInputRef.current, delta, bounds, obstacles);
      walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) sim.stridePhase += moveDist * 3.8;
      sim.groundY = sim.onTerrace ? TERRACE_Y : 0;

      // Seamless automatic walk entry onto exterior stairs if player walks right onto staircase mouth
      if (sim.stairCooldownSec <= 0) {
        if (!sim.onTerrace && sim.posX > 2.82 && sim.posZ < 0.72) {
          sim.stairTransit = { dir: 'up', elapsed: 0 };
        } else if (sim.onTerrace && sim.posX > 2.85 && sim.posZ > -1.38) {
          sim.stairTransit = { dir: 'down', elapsed: 0 };
        }
      }
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
      groundY: sim.groundY,
      climbingStairs,
      reducedMotion,
    });

    // Update companions cleanly per floor: Shree follows up onto terrace with Ishaan while Manish & Yash chill in yard
    const isElevated = sim.onTerrace || sim.stairTransit !== null;
    if (isElevated) {
      const shreeAgent = companionStatesRef.current.filter((a) => a.id === 'srishti');
      const groundBoys = companionStatesRef.current.filter((a) => a.id !== 'srishti');

      stepGroupCompanions({
        agents: shreeAgent,
        configs: [HOTEL_COMPANION_CONFIGS[0]],
        playerX: sim.onTerrace ? sim.posX : TERRACE_SREE_POS.x + 1.1,
        playerZ: sim.onTerrace ? sim.posZ : TERRACE_SREE_POS.z + 1.1,
        playerFacingYaw: sim.facingYaw,
        playerSpeed: sim.onTerrace ? walkSpeed : 0,
        bounds: TERRACE_WALK_BOUNDS,
        obstacles: TERRACE_OBSTACLES,
        delta,
        mode: 'follow',
      });
      stepGroupCompanions({
        agents: groundBoys,
        configs: [HOTEL_COMPANION_CONFIGS[1], HOTEL_COMPANION_CONFIGS[2]],
        playerX: 0,
        playerZ: 1.5,
        playerFacingYaw: 0,
        playerSpeed: 0,
        bounds: HOTEL_WALK_BOUNDS,
        obstacles: HOTEL_OBSTACLES,
        delta,
        mode: 'gather',
        explicitTargets: {
          friend_black_tee: GROUND_CHILL_SLOTS.friend_black_tee,
          friend_plaid: GROUND_CHILL_SLOTS.friend_plaid,
        },
      });
    } else {
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
        explicitTargets: farewellDone ? HOTEL_FAREWELL_SLOTS : undefined,
      });
    }

    const rigs = companionRigsRef.current;
    if (rigs) {
      companionStatesRef.current.forEach((agent, i) => {
        const cfg = HOTEL_COMPANION_CONFIGS[i];
        const rig = rigs[agent.id as FriendCompanionId];
        if (!rig) return;
        const agentOnTerrace = isElevated && agent.id === 'srishti';
        const lookX =
          farewellDone && agent.id === 'srishti'
            ? 1.25
            : !isElevated || agent.id === 'srishti'
              ? sim.posX
              : 0;
        const lookZ =
          farewellDone && agent.id === 'srishti'
            ? 3.45
            : !isElevated || agent.id === 'srishti'
              ? sim.posZ
              : 1.6;
        applyCompanionRigFrame({
          agent,
          config: cfg,
          refs: rig,
          lookTargetX: lookX,
          lookTargetZ: lookZ,
          elapsed: t,
          delta,
          groundY: agentOnTerrace ? TERRACE_Y : 0,
          idlePoseOverride: farewellDone ? 'chat_nod' : undefined,
          reducedMotion,
        });
      });
    }

    const camDist = sim.onTerrace ? CAM_DIST_TERRACE : CAM_DIST_LANE;
    const hDist = Math.cos(sim.orbitPitch) * camDist;
    const vOff = 1.25 + Math.sin(sim.orbitPitch) * camDist;
    scratch.camPos.set(
      sim.posX + Math.sin(sim.orbitYaw) * hDist,
      sim.groundY + vOff,
      sim.posZ + Math.cos(sim.orbitYaw) * hDist
    );
    scratch.lookAt.set(sim.posX, sim.groundY + 1.15, sim.posZ);

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

    if (sim.stairTransit) {
      if (sim.lastHotspotId !== null) {
        sim.lastHotspotId = null;
        onNearbyHotspotChange(null);
      }
      return;
    }

    const activeSpots = sim.onTerrace
      ? TERRACE_HOTSPOTS
      : HOTEL_HOTSPOTS.filter((h) => !(farewellDone && h.id === 'rejoin_farewell'));
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
        onTerrace={onTerraceState}
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
        position={[-0.25, 0, 5.1]}
        castShadow={shadowsEnabled}
      />

      <CompanionGroup initialPositions={HOTEL_COMPANION_INIT} onRigsReady={handleRigsReady} />
    </>
  );
}
