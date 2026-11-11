'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  animateCharacterRig,
  type CharacterIdlePose,
} from '@/components/canvas/characters/animateCharacterRig';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { BhaiDoojEnvironment } from '@/components/canvas/environment/BhaiDoojEnvironment';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ambientAudio } from '@/lib/ambientAudio';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export type BhaiDoojPhase =
  | 'arrival'
  | 'applying_tilak'
  | 'sweet_offer'
  | 'eating_together'
  | 'playful_laugh'
  | 'jhula_swing'
  | 'complete';

export interface Scene13BhaiDoojFinaleProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  phase: BhaiDoojPhase;
  tilakApplied: boolean;
  onTilakApplied: () => void;
  onTilakComplete: () => void;
  onEatingComplete: () => void;
  onLaughComplete?: () => void;
  onJhulaComplete?: () => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

const TILAK_DURATION_SEC = 2.8;
const EATING_TOGETHER_DURATION_SEC = 4.2;
const PLAYFUL_LAUGH_DURATION_SEC = 3.2;
const JHULA_SWING_HOLD_SEC = 5.4;

/** Smooth bell pulse rising from 0 -> 1 around center `mid` and easing cleanly back to 0. */
function easeBell(u: number, start: number, end: number): number {
  if (u <= start || u >= end) return 0;
  const local = (u - start) / (end - start);
  return 0.5 - 0.5 * Math.cos(local * Math.PI * 2);
}

/**
 * Scene 13 — Interactive Virtual Bhai Dooj Finale:
 * Arrival -> Tilak -> Mithai Offering -> Eating Together -> Playful Laugh -> Marigold Jhula Swing.
 */
export function Scene13_BhaiDoojFinale({
  qualityProfile,
  paused,
  transitionToken,
  phase,
  tilakApplied,
  onTilakApplied,
  onTilakComplete,
  onEatingComplete,
  onLaughComplete,
  onJhulaComplete,
  onSceneReady,
  simulateMountFailure = false,
}: Scene13BhaiDoojFinaleProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Bhai Dooj finale scene.');
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const ishaanGroupRef = useRef<THREE.Group>(null);
  const ishaanTorsoRef = useRef<THREE.Group>(null);
  const ishaanHeadRef = useRef<THREE.Group>(null);
  const ishaanLLegRef = useRef<THREE.Group>(null);
  const ishaanLKneeRef = useRef<THREE.Group>(null);
  const ishaanRLegRef = useRef<THREE.Group>(null);
  const ishaanRKneeRef = useRef<THREE.Group>(null);
  const ishaanLArmRef = useRef<THREE.Group>(null);
  const ishaanRArmRef = useRef<THREE.Group>(null);
  const ishaanRForearmRef = useRef<THREE.Group>(null);

  const shreeGroupRef = useRef<THREE.Group>(null);
  const shreeTorsoRef = useRef<THREE.Group>(null);
  const shreeHeadRef = useRef<THREE.Group>(null);
  const shreeHairRef = useRef<THREE.Group>(null);
  const shreeBagRef = useRef<THREE.Group>(null);
  const shreeLLegRef = useRef<THREE.Group>(null);
  const shreeLKneeRef = useRef<THREE.Group>(null);
  const shreeRLegRef = useRef<THREE.Group>(null);
  const shreeRKneeRef = useRef<THREE.Group>(null);
  const shreeLArmRef = useRef<THREE.Group>(null);
  const shreeRArmRef = useRef<THREE.Group>(null);
  const shreeRForearmRef = useRef<THREE.Group>(null);
  const swingGroupRef = useRef<THREE.Group>(null);

  const simRef = useRef({
    timer: 0,
    tilakMarkFired: false,
    tilakDoneSent: false,
    eatingDoneSent: false,
    laughDoneSent: false,
    jhulaDoneSent: false,
    camInitialized: false,
  });

  const scratch = useMemo(
    () => ({
      camPos: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      smoothLook: new THREE.Vector3(),
      forehead: new THREE.Vector3(),
      handTarget: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      bend: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      down: new THREE.Vector3(0, -1, 0),
      armRotation: new THREE.Quaternion(),
      forearmRotation: new THREE.Quaternion(),
      inverseArm: new THREE.Quaternion(),
    }),
    []
  );

  useEffect(() => {
    simRef.current.timer = 0;
    simRef.current.tilakMarkFired = false;
    simRef.current.tilakDoneSent = false;
    simRef.current.eatingDoneSent = false;
    simRef.current.laughDoneSent = false;
    simRef.current.jhulaDoneSent = false;
    // The contact solver owns all three rotation axes; release its twist between phases.
    if (phase !== 'applying_tilak') {
      shreeRArmRef.current?.rotation.set(0.45, 0, 0.06);
      shreeRForearmRef.current?.rotation.set(0.52, 0, 0);
    }
  }, [phase]);

  useEffect(() => {
    if (!paused) clock.getDelta();
  }, [paused, clock]);

  const readyTokenRef = useRef(-1);
  useEffect(() => {
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 13);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 54 : 44;
      if (Math.abs(camera.fov - nextFov) > 0.1) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, size.width, size.height]);

  useFrame((state, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    sim.timer += delta;

    // Gentle phase state timers
    let tilakReachWeight = 0;
    if (phase === 'applying_tilak') {
      const dur = reducedMotion ? 0.65 : TILAK_DURATION_SEC;
      const u = THREE.MathUtils.clamp(sim.timer / dur, 0, 1);
      // Hold real hand contact around the application beat, then withdraw smoothly.
      tilakReachWeight = THREE.MathUtils.smoothstep(u, 0.06, 0.4) *
        (1 - THREE.MathUtils.smoothstep(u, 0.62, 0.94));
      if (!sim.tilakDoneSent && u >= 1) {
        sim.tilakDoneSent = true;
        onTilakComplete();
      }
    }

    let calmEatReachWeight = 0;
    if (phase === 'eating_together') {
      const dur = reducedMotion ? 0.9 : EATING_TOGETHER_DURATION_SEC;
      const u = THREE.MathUtils.clamp(sim.timer / dur, 0, 1);
      // Single graceful one-shot taste curve (strictly no robotic repetitive loop)
      calmEatReachWeight = easeBell(u, 0.14, 0.68);
      if (!sim.eatingDoneSent && u >= 1) {
        sim.eatingDoneSent = true;
        onEatingComplete();
      }
    }

    if (phase === 'playful_laugh') {
      const dur = reducedMotion ? 0.9 : PLAYFUL_LAUGH_DURATION_SEC;
      if (!sim.laughDoneSent && sim.timer >= dur) {
        sim.laughDoneSent = true;
        onLaughComplete?.();
      }
    }

    if (phase === 'jhula_swing') {
      const dur = reducedMotion ? 1.2 : JHULA_SWING_HOLD_SEC;
      if (!sim.jhulaDoneSent && sim.timer >= dur) {
        sim.jhulaDoneSent = true;
        onJhulaComplete?.();
      }
    }

    const onSwing = phase === 'jhula_swing' || phase === 'complete';
    const swingAngle = onSwing ? Math.sin(t * 1.4) * 0.15 : Math.sin(t * 0.8) * 0.025;
    if (swingGroupRef.current) {
      swingGroupRef.current.rotation.x = swingAngle;
    }

    const jhulaSeatZ = -1.75 - Math.sin(swingAngle) * 1.9;
    const jhulaSeatY = 0.43 + (1 - Math.cos(swingAngle)) * 1.9;

    const ishaanPose: CharacterIdlePose =
      phase === 'playful_laugh' ? 'sit_laugh' : 'sit_ready';
    const shreePose: CharacterIdlePose =
      phase === 'playful_laugh' ? 'sit_laugh' : 'sit_ready';

    animateCharacterRig({
      refs: {
        group: ishaanGroupRef.current,
        torso: ishaanTorsoRef.current,
        head: ishaanHeadRef.current,
        leftLeg: ishaanLLegRef.current,
        leftKnee: ishaanLKneeRef.current,
        rightLeg: ishaanRLegRef.current,
        rightKnee: ishaanRKneeRef.current,
        leftArm: ishaanLArmRef.current,
        rightArm: ishaanRArmRef.current,
        rightForearm: ishaanRForearmRef.current,
      },
      posX: onSwing ? 0.36 : 0.56 - 0.14 * tilakReachWeight,
      posZ: onSwing ? jhulaSeatZ : -0.16,
      groundY: onSwing ? jhulaSeatY : -0.02,
      facingYaw: onSwing ? Math.PI + 0.08 : THREE.MathUtils.lerp(1.85, 1.52, tilakReachWeight),
      strideRatio: 0,
      stridePhase: 0,
      torsoBaseY: 0.84,
      elapsed: t,
      delta,
      idlePose: ishaanPose,
      reducedMotion,
    });

    animateCharacterRig({
      refs: {
        group: shreeGroupRef.current,
        torso: shreeTorsoRef.current,
        head: shreeHeadRef.current,
        hairTail: shreeHairRef.current,
        bag: shreeBagRef.current,
        leftLeg: shreeLLegRef.current,
        leftKnee: shreeLKneeRef.current,
        rightLeg: shreeRLegRef.current,
        rightKnee: shreeRKneeRef.current,
        leftArm: shreeLArmRef.current,
        rightArm: shreeRArmRef.current,
        rightForearm: shreeRForearmRef.current,
      },
      posX: onSwing ? -0.36 : -0.56 + 0.14 * tilakReachWeight,
      posZ: onSwing ? jhulaSeatZ : -0.16,
      groundY: onSwing ? jhulaSeatY : -0.02,
      facingYaw: onSwing ? Math.PI - 0.08 : THREE.MathUtils.lerp(-1.85, -1.52, tilakReachWeight),
      strideRatio: 0,
      stridePhase: 0,
      torsoBaseY: 0.78,
      elapsed: t,
      delta,
      idlePose: shreePose,
      armGesturePhase: phase === 'playful_laugh' ? 1.2 : 0,
      reducedMotion,
    });

    if (onSwing) {
      if (ishaanGroupRef.current) ishaanGroupRef.current.rotation.x = -swingAngle;
      if (shreeGroupRef.current) shreeGroupRef.current.rotation.x = -swingAngle;
    } else {
      if (ishaanGroupRef.current) ishaanGroupRef.current.rotation.x = 0;
      if (shreeGroupRef.current) shreeGroupRef.current.rotation.x = 0;
    }

    // Subtle bespoke expressive overrides for Tilak application & peaceful sweet sharing
    if (phase === 'applying_tilak') {
      // Both remain seated; Ishaan bows into reach instead of stretching Shree's arm.
      if (shreeTorsoRef.current) {
        shreeTorsoRef.current.rotation.x = THREE.MathUtils.lerp(-0.04, -0.2, tilakReachWeight);
      }
      if (ishaanTorsoRef.current) {
        ishaanTorsoRef.current.rotation.x = THREE.MathUtils.lerp(-0.04, -0.68, tilakReachWeight);
      }
      if (ishaanHeadRef.current) {
        ishaanHeadRef.current.rotation.x = -0.14 * tilakReachWeight;
      }
      const arm = shreeRArmRef.current;
      const forearm = shreeRForearmRef.current;
      const head = ishaanHeadRef.current;
      if (arm?.parent && forearm && head && tilakReachWeight > 0) {
        ishaanGroupRef.current?.updateWorldMatrix(true, true);
        shreeGroupRef.current?.updateWorldMatrix(true, true);
        head.localToWorld(scratch.forehead.set(0, 0.044, -0.128));
        arm.parent.worldToLocal(scratch.handTarget.copy(scratch.forehead));
        scratch.handTarget.sub(arm.position);
        const upper = forearm.position.length();
        const lower = 0.178; // Right-hand center in the existing Shree rig.
        const distance = THREE.MathUtils.clamp(scratch.handTarget.length(), 0.02, upper + lower - 0.001);
        scratch.direction.copy(scratch.handTarget).normalize();
        scratch.bend.set(0, 0, -1).addScaledVector(scratch.direction, scratch.direction.z);
        if (scratch.bend.lengthSq() < 0.001) scratch.bend.set(1, 0, 0);
        scratch.bend.normalize();
        const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
        scratch.elbow.copy(scratch.direction).multiplyScalar(along)
          .addScaledVector(scratch.bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
        scratch.armRotation.setFromUnitVectors(scratch.down, scratch.handTarget.copy(scratch.elbow).normalize());
        scratch.inverseArm.copy(scratch.armRotation).invert();
        scratch.handTarget.copy(scratch.direction).multiplyScalar(distance).sub(scratch.elbow)
          .normalize().applyQuaternion(scratch.inverseArm);
        scratch.forearmRotation.setFromUnitVectors(scratch.down, scratch.handTarget);
        arm.quaternion.slerp(scratch.armRotation, tilakReachWeight);
        forearm.quaternion.slerp(scratch.forearmRotation, tilakReachWeight);
        forearm.updateWorldMatrix(true, false);
        forearm.localToWorld(scratch.handTarget.set(0, -lower, 0));
        const dur = reducedMotion ? 0.65 : TILAK_DURATION_SEC;
        if (!sim.tilakMarkFired && sim.timer / dur >= 0.48 &&
          scratch.handTarget.distanceTo(scratch.forehead) < 0.035) {
          sim.tilakMarkFired = true;
          ambientAudio.playTilakBlessingTone();
          onTilakApplied();
        }
      }
    } else if (phase === 'sweet_offer') {
      if (shreeRArmRef.current) {
        shreeRArmRef.current.rotation.x = THREE.MathUtils.damp(
          shreeRArmRef.current.rotation.x,
          0.95,
          6,
          delta
        );
      }
      if (shreeRForearmRef.current) {
        shreeRForearmRef.current.rotation.x = THREE.MathUtils.damp(
          shreeRForearmRef.current.rotation.x,
          0.3,
          6,
          delta
        );
      }
      if (ishaanHeadRef.current) {
        ishaanHeadRef.current.rotation.y = THREE.MathUtils.damp(
          ishaanHeadRef.current.rotation.y,
          0.14,
          6,
          delta
        );
      }
    } else if (phase === 'eating_together') {
      if (ishaanRArmRef.current) {
        ishaanRArmRef.current.rotation.x = THREE.MathUtils.damp(
          ishaanRArmRef.current.rotation.x,
          0.22 + 0.85 * calmEatReachWeight,
          6,
          delta
        );
      }
      if (ishaanRForearmRef.current) {
        ishaanRForearmRef.current.rotation.x = THREE.MathUtils.damp(
          ishaanRForearmRef.current.rotation.x,
          0.2 + 0.55 * calmEatReachWeight,
          6,
          delta
        );
      }
      if (shreeRArmRef.current) {
        shreeRArmRef.current.rotation.x = THREE.MathUtils.damp(
          shreeRArmRef.current.rotation.x,
          0.2 + 0.45 * calmEatReachWeight,
          6,
          delta
        );
      }
    }

    // Warm intimate framing focused solely on Ishaan & Shree by the chowki or swinging on the jhula
    if (phase === 'applying_tilak') {
      scratch.camPos.set(0.05, 1.46, 2.38);
      scratch.lookAt.set(0.04, 0.92, -0.14);
    } else if (phase === 'playful_laugh') {
      scratch.camPos.set(0.0, 1.44, 2.65);
      scratch.lookAt.set(0.0, 0.94, -0.14);
    } else if (phase === 'jhula_swing' || phase === 'complete') {
      scratch.camPos.set(Math.sin(t * 0.25) * 0.42, 1.72, 2.72);
      scratch.lookAt.set(0.0, 1.56, -1.75);
    } else {
      scratch.camPos.set(0.0, 1.5, 2.82);
      scratch.lookAt.set(0.0, 0.82, 0.02);
    }

    if (!sim.camInitialized || reducedMotion) {
      camera.position.copy(scratch.camPos);
      scratch.smoothLook.copy(scratch.lookAt);
      sim.camInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.camPos.x, 4.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.camPos.y, 4.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.camPos.z, 4.5, delta);
      scratch.smoothLook.x = THREE.MathUtils.damp(scratch.smoothLook.x, scratch.lookAt.x, 5.5, delta);
      scratch.smoothLook.y = THREE.MathUtils.damp(scratch.smoothLook.y, scratch.lookAt.y, 5.5, delta);
      scratch.smoothLook.z = THREE.MathUtils.damp(scratch.smoothLook.z, scratch.lookAt.z, 5.5, delta);
    }
    camera.lookAt(scratch.smoothLook);
  });

  return (
    <>
      <BhaiDoojEnvironment
        qualityProfile={qualityProfile}
        paused={paused}
        sweetsTaken={
          phase === 'eating_together' ||
          phase === 'playful_laugh' ||
          phase === 'jhula_swing' ||
          phase === 'complete'
        }
        swingGroupRef={swingGroupRef}
      />

      {/* Only Ishaan & Shree seated on warm floor gaddis around the puja chowki */}
      <StylizedPlaceholderCharacter
        characterVariant="ishaan"
        outfitMode="festive"
        groupRef={ishaanGroupRef}
        torsoRef={ishaanTorsoRef}
        headRef={ishaanHeadRef}
        leftLegRef={ishaanLLegRef}
        leftKneeRef={ishaanLKneeRef}
        rightLegRef={ishaanRLegRef}
        rightKneeRef={ishaanRKneeRef}
        leftArmRef={ishaanLArmRef}
        rightArmRef={ishaanRArmRef}
        rightForearmRef={ishaanRForearmRef}
        position={[0.56, -0.02, -0.16]}
        rotationY={1.85}
        scale={1.03}
        tilakApplied={tilakApplied}
        holdingSweet={phase === 'eating_together'}
        castShadow={shadowsEnabled}
      />

      <StylizedPlaceholderCharacter
        characterVariant="srishti"
        outfitMode="festive"
        groupRef={shreeGroupRef}
        torsoRef={shreeTorsoRef}
        headRef={shreeHeadRef}
        hairTailRef={shreeHairRef}
        bagRef={shreeBagRef}
        leftLegRef={shreeLLegRef}
        leftKneeRef={shreeLKneeRef}
        rightLegRef={shreeRLegRef}
        rightKneeRef={shreeRKneeRef}
        leftArmRef={shreeLArmRef}
        rightArmRef={shreeRArmRef}
        rightForearmRef={shreeRForearmRef}
        position={[-0.56, -0.02, -0.16]}
        rotationY={-1.85}
        scale={1.0}
        holdingSweet={phase === 'sweet_offer' || phase === 'eating_together'}
        castShadow={shadowsEnabled}
      />
    </>
  );
}

