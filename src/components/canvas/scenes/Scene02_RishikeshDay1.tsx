'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { animateCharacterRig, animateIshaanWalkRig } from '@/components/canvas/characters/animateCharacterRig';
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

export type Day1Phase = 'travel_cinematic' | 'stay_explore' | 'evening_maggi';

export interface Scene02RishikeshDay1Props {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  day1Phase: Day1Phase;
  onAdvanceDay1Phase: (next: Day1Phase) => void;
  onDay1Complete: () => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

const TRAVEL_DURATION_SEC = 7.5;
const EVENING_MAGGI_DURATION_SEC = 7.2;

/**
 * Scene 2 — Day 1: Train from Lucknow & Bus from Delhi -> Modest Lane Stay ->
 * Walk out from connected ground-floor foyer onto yard & scooters -> Evening Maggi vignette.
 */
export function Scene02_RishikeshDay1({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  day1Phase,
  onAdvanceDay1Phase,
  onDay1Complete,
  onNearbyHotspotChange,
  onSceneReady,
  simulateMountFailure = false,
}: Scene02RishikeshDay1Props) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Day 1 Rishikesh arrival scene.');
  }

  const { camera, scene, size } = useThree();
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

  const trainGroupRef = useRef<THREE.Group>(null);
  const busGroupRef = useRef<THREE.Group>(null);

  const simRef = useRef({
    // Starts cleanly inside the connected ground-floor foyer (-0.45 doorway connects at z = -0.6)
    posX: -0.45,
    posZ: -2.45,
    groundY: 0,
    velX: 0,
    velZ: 0,
    facingYaw: Math.PI, // Facing south (+Z) toward open front door & scooters
    stridePhase: 0,
    orbitYaw: 0,
    orbitPitch: 0.24,
    cameraInitialized: false,
    onTerrace: false,
    lastHotspotId: null as string | null,
    phaseTimer: 0,
    readySent: false,
    completedSent: false,
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
    simRef.current.phaseTimer = 0;
    simRef.current.completedSent = false;
  }, [day1Phase]);

  useEffect(() => {
    const toggle = (ev: Event) => {
      const detail = (ev as CustomEvent<{ to: 'up' | 'down' }>).detail;
      const sim = simRef.current;
      if (detail?.to === 'up' && !sim.onTerrace) {
        sim.onTerrace = true;
        sim.posX = 3.1;
        sim.posZ = -2.25;
        sim.groundY = TERRACE_Y;
        sim.facingYaw = 0;
        setOnTerraceState(true);
      } else if (detail?.to === 'down' && sim.onTerrace) {
        sim.onTerrace = false;
        sim.posX = 2.65;
        sim.posZ = 1.45;
        sim.groundY = 0;
        sim.facingYaw = Math.PI;
        setOnTerraceState(false);
      }
    };
    window.addEventListener('day1:toggle-terrace', toggle);
    return () => window.removeEventListener('day1:toggle-terrace', toggle);
  }, []);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = size.width / Math.max(1, size.height) < 0.8 ? 58 : 52;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  const readyTokenRef = useRef(-1);
  useEffect(() => {
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 2);
    }
  }, [transitionToken, onSceneReady]);

  useEffect(() => {
    if (day1Phase === 'travel_cinematic') {
      const prevBg = scene.background;
      const prevFog = scene.fog;
      scene.background = new THREE.Color('#273b56');
      scene.fog = new THREE.Fog('#273b56', 18, 70);
      return () => {
        scene.background = prevBg;
        scene.fog = prevFog;
      };
    }
    return undefined;
  }, [day1Phase, scene]);

  const finishEveningMaggi = useCallback(() => {
    if (!simRef.current.completedSent) {
      simRef.current.completedSent = true;
      onDay1Complete();
    }
  }, [onDay1Complete]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    sim.phaseTimer += delta;

    if (day1Phase === 'travel_cinematic') {
      const dur = reducedMotion ? 1.5 : TRAVEL_DURATION_SEC;
      const u = THREE.MathUtils.clamp(sim.phaseTimer / dur, 0, 1);
      if (trainGroupRef.current) {
        trainGroupRef.current.position.x = THREE.MathUtils.lerp(-14, 14, u);
      }
      if (busGroupRef.current) {
        busGroupRef.current.position.x = THREE.MathUtils.lerp(13, -13, u);
      }
      camera.position.set(0, 4.2, 13.5);
      camera.lookAt(0, 1.4, -2);
      if (u >= 1) {
        onAdvanceDay1Phase('stay_explore');
      }
      return;
    }

    if (day1Phase === 'evening_maggi') {
      const dur = reducedMotion ? 1.4 : EVENING_MAGGI_DURATION_SEC;
      const u = THREE.MathUtils.clamp(sim.phaseTimer / dur, 0, 1);
      // Warm evening Maggi hangout beside scooters near main road edge (separate from Shree's original friends)
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
        posX: -2.15,
        posZ: 6.25,
        facingYaw: 0.45,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: 'sit_eat',
        reducedMotion,
      });
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
        posX: -1.15,
        posZ: 6.25,
        facingYaw: -0.45,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: 'sit_eat',
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
        posX: -1.65,
        posZ: 5.55,
        facingYaw: Math.PI,
        strideRatio: 0,
        stridePhase: 0,
        elapsed: t,
        delta,
        idlePose: 'chat_nod',
        reducedMotion,
      });
      camera.position.set(1.6, 2.35, 9.2);
      camera.lookAt(-1.65, 1.0, 6.1);
      if (u >= 1) {
        finishEveningMaggi();
      }
      return;
    }

    // Walkable Day 1 stay exploration (`stay_explore`)
    const bounds = sim.onTerrace ? TERRACE_WALK_BOUNDS : DAY1_WALK_BOUNDS;
    const obstacles = sim.onTerrace ? TERRACE_OBSTACLES : DAY1_OBSTACLES;
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
    const moveDist = stepWalkSimulation(simPos, walkInputRef.current, delta, bounds, obstacles);
    sim.posX = simPos.posX;
    sim.posZ = simPos.posZ;
    sim.velX = simPos.velX;
    sim.velZ = simPos.velZ;
    sim.facingYaw = simPos.facingYaw;
    sim.orbitYaw = simPos.orbitYaw;
    sim.orbitPitch = simPos.orbitPitch;
    const walkSpeed = Math.hypot(sim.velX, sim.velZ);
    const strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
    if (strideRatio > 0.03) sim.stridePhase += moveDist * 3.8;

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
      reducedMotion,
    });

    // Shree stays by the 1st floor courtyard / terrace; Manish waits beside scooters
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
      posX: sim.onTerrace ? -0.95 : -1.85,
      posZ: sim.onTerrace ? -3.85 : 2.1,
      groundY: sim.onTerrace ? TERRACE_Y : 0,
      facingYaw: 0.2,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: t,
      delta,
      idlePose: 'chat_nod',
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
      posX: -2.4,
      posZ: 3.15,
      facingYaw: -0.4,
      strideRatio: 0,
      stridePhase: 0,
      elapsed: t,
      delta,
      idlePose: 'look_around',
      reducedMotion,
    });

    const camDist = 5.1;
    const hDist = Math.cos(sim.orbitPitch) * camDist;
    const vOff = sim.groundY + 1.25 + Math.sin(sim.orbitPitch) * camDist;
    scratch.camPos.set(
      sim.posX + Math.sin(sim.orbitYaw) * hDist,
      vOff,
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

    const activeSpots = sim.onTerrace ? TERRACE_HOTSPOTS : DAY1_HOTSPOTS;
    const nearest = findNearestWalkHotspot(sim.posX, sim.posZ, activeSpots);
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  if (day1Phase === 'travel_cinematic') {
    return (
      <>
        <ambientLight intensity={0.65} color="#fed7aa" />
        <directionalLight position={[12, 18, 12]} intensity={1.4} color="#fde68a" />
        {/* Stylised Train Track (Upper Back: Lucknow -> Rishikesh) */}
        <mesh position={[0, 1.4, -5.2]}>
          <boxGeometry args={[36, 0.14, 1.8]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <group ref={trainGroupRef} position={[-12, 1.5, -5.2]}>
          {[-2.8, 0, 2.8].map((cx, i) => (
            <mesh key={i} position={[cx, 0.72, 0]}>
              <boxGeometry args={[2.5, 1.35, 1.1]} />
              <meshStandardMaterial color={i === 0 ? '#0f172a' : '#1d4ed8'} roughness={0.6} />
            </mesh>
          ))}
        </group>

        {/* Stylized Highway Bus Track (Foreground: Delhi -> Rishikesh) */}
        <mesh position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 4.0]} />
          <meshStandardMaterial color="#475569" roughness={0.92} />
        </mesh>
        <group ref={busGroupRef} position={[12, 0.1, -0.5]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[3.4, 1.55, 1.28]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.55} />
          </mesh>
          <mesh position={[-0.1, 1.15, 0.66]}>
            <boxGeometry args={[2.7, 0.52, 0.04]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.3} />
          </mesh>
        </group>
      </>
    );
  }

  return (
    <>
      <HotelReturnEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        farewellDone={false}
        onTerrace={onTerraceState}
        variant="day1_stay"
      />

      {/* Evening roadside Maggi bench for Day 1 outing */}
      {day1Phase === 'evening_maggi' && (
        <group position={[-1.65, 0, 6.25]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[1.45, 0.08, 0.65]} />
            <meshStandardMaterial color="#785233" roughness={0.85} />
          </mesh>
          <mesh position={[-0.35, 0.44, 0]}>
            <cylinderGeometry args={[0.12, 0.08, 0.08, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
          <mesh position={[0.35, 0.44, 0]}>
            <cylinderGeometry args={[0.12, 0.08, 0.08, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
          <group position={[-1.1, 0, 1.25]} rotation={[0, 0.65, 0]}>
            <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
          </group>
        </group>
      )}

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
        position={[-0.45, 0, -2.45]}
        castShadow={shadowsEnabled}
      />
      <StylizedPlaceholderCharacter
        characterVariant="srishti"
        groupRef={shreeGroupRef}
        torsoRef={shreeTorsoRef}
        headRef={shreeHeadRef}
        leftLegRef={shreeLLegRef}
        leftKneeRef={shreeLKneeRef}
        rightLegRef={shreeRLegRef}
        rightKneeRef={shreeRKneeRef}
        leftArmRef={shreeLArmRef}
        rightArmRef={shreeRArmRef}
        position={[-1.85, 0, 2.1]}
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
        position={[-2.4, 0, 3.15]}
        castShadow={shadowsEnabled}
      />
    </>
  );
}

