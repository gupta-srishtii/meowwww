'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import {
  animateIshaanWalkRig,
  type CharacterIdlePose,
} from '@/components/canvas/characters/animateCharacterRig';
import {
  VIEWPOINT_HOTSPOTS,
  VIEWPOINT_OBSTACLES,
  VIEWPOINT_WALK_BOUNDS,
  ViewpointEnvironment,
} from '@/components/canvas/environment/ViewpointEnvironment';
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

export type ViewpointPhotoMoment = 'none' | 'solo' | 'group';

export interface Scene05ViewpointStopProps {
  walkInputRef: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  capturedSolo: boolean;
  capturedGroup: boolean;
  activePhotoMoment: ViewpointPhotoMoment;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const CAM_DISTANCE = 5.1;
const CAM_LOOK_HEIGHT = 1.15;

// Srishti, Manish, and Yash standing along the scenic overlook rail facing out over the valley
const SRISHTI_POS: [number, number, number] = [0.65, 0, -4.15];
const COMP_A_POS: [number, number, number] = [1.45, 0, -4.22];
const COMP_B_POS: [number, number, number] = [2.25, 0, -4.1];

/**
 * Scene 5 Sub-Stage — Scenic Rishikesh Viewpoint Stop.
 * Third-person exploration as Ishaan overlooking the gorge with Srishti, Manish & Yash.
 */
export function Scene05_ViewpointStop({
  walkInputRef,
  qualityProfile,
  paused,
  transitionToken,
  capturedSolo,
  capturedGroup,
  activePhotoMoment,
  onNearbyHotspotChange,
  onSceneReady,
}: Scene05ViewpointStopProps) {
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

  const srishtiGroupRef = useRef<THREE.Group>(null);
  const srishtiTorsoRef = useRef<THREE.Group>(null);
  const srishtiHeadRef = useRef<THREE.Group>(null);
  const srishtiHairRef = useRef<THREE.Group>(null);
  const srishtiBagRef = useRef<THREE.Group>(null);
  const srishtiArmRef = useRef<THREE.Group>(null);
  const srishtiForearmRef = useRef<THREE.Group>(null);

  const compAGroupRef = useRef<THREE.Group>(null);
  const compATorsoRef = useRef<THREE.Group>(null);
  const compAHeadRef = useRef<THREE.Group>(null);
  const compAArmRef = useRef<THREE.Group>(null);
  const compAForearmRef = useRef<THREE.Group>(null);

  const compBGroupRef = useRef<THREE.Group>(null);
  const compBTorsoRef = useRef<THREE.Group>(null);
  const compBHeadRef = useRef<THREE.Group>(null);
  const compBArmRef = useRef<THREE.Group>(null);
  const compBForearmRef = useRef<THREE.Group>(null);

  const simRef = useRef({
    posX: 0.25,
    posZ: 1.55,
    velX: 0,
    velZ: 0,
    facingYaw: 0,
    orbitYaw: 0.08,
    orbitPitch: 0.26,
    stridePhase: 0,
    cameraInitialized: false,
    lastHotspotId: null as string | null,
  });

  const scratch = useMemo(
    () => ({
      desiredCamPos: new THREE.Vector3(),
      desiredLookAt: new THREE.Vector3(),
      smoothedLookAt: new THREE.Vector3(),
    }),
    []
  );

  useEffect(() => {
    if (transitionToken > 0) {
      onSceneReady(transitionToken, 5);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) {
      clock.getDelta();
    }
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
    return () => {
      onNearbyHotspotChange(null);
    };
  }, [onNearbyHotspotChange]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    let strideRatio = 0;
    let idlePose: CharacterIdlePose = 'default';

    if (activePhotoMoment === 'solo') {
      sim.posX = THREE.MathUtils.damp(sim.posX, -2.55, 8, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, -4.15, 8, delta);
      sim.velX = 0;
      sim.velZ = 0;
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, -0.22, 8, delta);
      idlePose = 'default';
    } else if (activePhotoMoment === 'group') {
      sim.posX = THREE.MathUtils.damp(sim.posX, -0.1, 8, delta);
      sim.posZ = THREE.MathUtils.damp(sim.posZ, -4.08, 8, delta);
      sim.velX = 0;
      sim.velZ = 0;
      sim.facingYaw = THREE.MathUtils.damp(sim.facingYaw, Math.PI - 0.14, 8, delta);
      idlePose = 'group_wave';
    } else {
      const moveDist = stepWalkSimulation(
        sim,
        walkInputRef.current,
        delta,
        VIEWPOINT_WALK_BOUNDS,
        VIEWPOINT_OBSTACLES
      );
      const walkSpeed = Math.hypot(sim.velX, sim.velZ);
      strideRatio = THREE.MathUtils.clamp(walkSpeed / WALK_SPEED_MPS, 0, 1);
      if (strideRatio > 0.03) {
        sim.stridePhase += moveDist * 3.8;
      }
    }

    // 1. Third-person Ishaan walk + pose animation
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
      idlePose,
      reducedMotion,
    });

    // 1b. Raise Ishaan's right arm gently toward mountain valley during Shree & Ishaan overlook moment
    if (activePhotoMoment === 'solo' && rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.damp(
        rightArmRef.current.rotation.x,
        -1.08 + (reducedMotion ? 0 : Math.sin(t * 1.4) * 0.04),
        8,
        delta
      );
      rightArmRef.current.rotation.z = THREE.MathUtils.damp(
        rightArmRef.current.rotation.z,
        -0.16,
        8,
        delta
      );
    }

    // 2. Companions (Srishti, Manish & Yash) at overlook rail
    const isGroupPose = activePhotoMoment === 'group';
    const isCoupleOverlookPose = activePhotoMoment === 'solo';
    const animateOverlookFriend = (
      group: THREE.Group | null,
      torso: THREE.Group | null,
      head: THREE.Group | null,
      arm: THREE.Group | null,
      forearm: THREE.Group | null,
      torsoBaseY: number,
      baseYaw: number,
      groupYaw: number,
      phaseOffset: number,
      groupLeanZ: number,
      armRaiseX: number
    ) => {
      if (group) {
        const targetYaw = isGroupPose ? groupYaw : baseYaw;
        group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetYaw, 8, delta);
      }
      if (torso) {
        torso.position.y = reducedMotion
          ? torsoBaseY
          : torsoBaseY + Math.sin(t * 1.65 + phaseOffset) * 0.007;
        torso.rotation.z = THREE.MathUtils.damp(
          torso.rotation.z,
          isGroupPose ? groupLeanZ : 0,
          8,
          delta
        );
      }
      if (head) {
        const targetHeadY = isGroupPose
          ? 0.04
          : reducedMotion
            ? 0
            : Math.sin(t * 0.65 + phaseOffset) * 0.14;
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, targetHeadY, 6, delta);
        head.rotation.x = THREE.MathUtils.damp(head.rotation.x, isGroupPose ? 0.02 : -0.05, 6, delta);
      }
      if (arm && forearm) {
        const targetArmX = isGroupPose ? armRaiseX : 0.08;
        const targetForearmX = isGroupPose ? armRaiseX * 0.75 : 0.16;
        arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, targetArmX, 8, delta);
        forearm.rotation.x = THREE.MathUtils.damp(forearm.rotation.x, targetForearmX, 8, delta);
      }
    };

    if (srishtiGroupRef.current) {
      const targetSrishtiX = isCoupleOverlookPose ? -1.9 : SRISHTI_POS[0];
      const targetSrishtiZ = isCoupleOverlookPose ? -4.18 : SRISHTI_POS[2];
      srishtiGroupRef.current.position.x = THREE.MathUtils.damp(
        srishtiGroupRef.current.position.x,
        targetSrishtiX,
        8,
        delta
      );
      srishtiGroupRef.current.position.z = THREE.MathUtils.damp(
        srishtiGroupRef.current.position.z,
        targetSrishtiZ,
        8,
        delta
      );
    }

    animateOverlookFriend(
      srishtiGroupRef.current,
      srishtiTorsoRef.current,
      srishtiHeadRef.current,
      srishtiArmRef.current,
      srishtiForearmRef.current,
      0.78,
      isCoupleOverlookPose ? 0.18 : -0.18,
      Math.PI - 0.04,
      0.2,
      -0.05,
      0.32
    );
    if (isCoupleOverlookPose && srishtiHeadRef.current) {
      srishtiHeadRef.current.rotation.y = THREE.MathUtils.damp(
        srishtiHeadRef.current.rotation.y,
        0.22,
        6,
        delta
      );
    }
    if (srishtiHairRef.current) {
      srishtiHairRef.current.rotation.x = 0.14;
      srishtiHairRef.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.015;
    }
    if (srishtiBagRef.current) {
      srishtiBagRef.current.rotation.z = 0.08;
    }

    animateOverlookFriend(
      compAGroupRef.current,
      compATorsoRef.current,
      compAHeadRef.current,
      compAArmRef.current,
      compAForearmRef.current,
      0.82,
      0.06,
      Math.PI + 0.06,
      1.8,
      0.03,
      0.65
    );
    animateOverlookFriend(
      compBGroupRef.current,
      compBTorsoRef.current,
      compBHeadRef.current,
      compBArmRef.current,
      compBForearmRef.current,
      0.82,
      0.25,
      Math.PI + 0.16,
      3.5,
      0.06,
      0.42
    );

    if (activePhotoMoment === 'solo') {
      scratch.desiredCamPos.set(-1.05, 1.54, -1.78);
      scratch.desiredLookAt.set(-2.3, 1.22, -6.5);
    } else if (activePhotoMoment === 'group') {
      scratch.desiredCamPos.set(0.95, 1.48, -1.05);
      scratch.desiredLookAt.set(1.02, 1.16, -4.18);
    } else {
      const horizDist = Math.cos(sim.orbitPitch) * CAM_DISTANCE;
      const vertOffset = 1.2 + Math.sin(sim.orbitPitch) * CAM_DISTANCE;
      scratch.desiredCamPos.set(
        sim.posX + Math.sin(sim.orbitYaw) * horizDist,
        vertOffset,
        sim.posZ + Math.cos(sim.orbitYaw) * horizDist
      );
      scratch.desiredLookAt.set(sim.posX, CAM_LOOK_HEIGHT, sim.posZ);
    }

    if (!sim.cameraInitialized || reducedMotion) {
      camera.position.copy(scratch.desiredCamPos);
      scratch.smoothedLookAt.copy(scratch.desiredLookAt);
      sim.cameraInitialized = true;
    } else {
      const camSpeed = activePhotoMoment === 'none' ? 9 : 5.5;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.desiredCamPos.x, camSpeed, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.desiredCamPos.y, camSpeed, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.desiredCamPos.z, camSpeed, delta);

      scratch.smoothedLookAt.x = THREE.MathUtils.damp(
        scratch.smoothedLookAt.x,
        scratch.desiredLookAt.x,
        camSpeed + 2,
        delta
      );
      scratch.smoothedLookAt.y = THREE.MathUtils.damp(
        scratch.smoothedLookAt.y,
        scratch.desiredLookAt.y,
        camSpeed + 2,
        delta
      );
      scratch.smoothedLookAt.z = THREE.MathUtils.damp(
        scratch.smoothedLookAt.z,
        scratch.desiredLookAt.z,
        camSpeed + 2,
        delta
      );
    }
    camera.lookAt(scratch.smoothedLookAt);

    const nearest =
      activePhotoMoment === 'none'
        ? findNearestWalkHotspot(sim.posX, sim.posZ, VIEWPOINT_HOTSPOTS)
        : null;
    const nextId = nearest?.id ?? null;
    if (nextId !== sim.lastHotspotId) {
      sim.lastHotspotId = nextId;
      onNearbyHotspotChange(nearest);
    }
  });

  return (
    <>
      <ViewpointEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        capturedSolo={capturedSolo}
        capturedGroup={capturedGroup}
      />

      <group position={[1.3, 0, 3.2]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-1.2, 0, 3.2]} rotation={[0, -Math.PI / 2, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Third-person Playable Protagonist: Ishaan */}
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
        position={[0.25, 0, 1.55]}
        scale={1.03}
        castShadow={shadowsEnabled}
      />

      {/* Srishti beside the scenic rail wearing her verified floral outfit & sling bag */}
      <StylizedPlaceholderCharacter
        characterVariant="srishti"
        groupRef={srishtiGroupRef}
        torsoRef={srishtiTorsoRef}
        headRef={srishtiHeadRef}
        hairTailRef={srishtiHairRef}
        bagRef={srishtiBagRef}
        rightArmRef={srishtiArmRef}
        rightForearmRef={srishtiForearmRef}
        position={SRISHTI_POS}
        rotationY={-0.18}
        scale={1.0}
        castShadow={shadowsEnabled}
      />

      <StylizedPlaceholderCharacter
        characterVariant="friend_black_tee"
        groupRef={compAGroupRef}
        torsoRef={compATorsoRef}
        headRef={compAHeadRef}
        rightArmRef={compAArmRef}
        rightForearmRef={compAForearmRef}
        position={COMP_A_POS}
        rotationY={0.06}
        scale={1.01}
        castShadow={shadowsEnabled}
      />
      <StylizedPlaceholderCharacter
        characterVariant="friend_plaid"
        groupRef={compBGroupRef}
        torsoRef={compBTorsoRef}
        headRef={compBHeadRef}
        rightArmRef={compBArmRef}
        rightForearmRef={compBForearmRef}
        position={COMP_B_POS}
        rotationY={0.25}
        scale={1.04}
        castShadow={shadowsEnabled}
      />
    </>
  );
}
