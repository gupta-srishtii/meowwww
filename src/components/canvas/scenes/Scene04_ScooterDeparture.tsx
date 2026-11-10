'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MountainRoadEnvironment } from '@/components/canvas/MountainRoadEnvironment';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { createMountainRoadCurve, sampleRoadFrame } from '@/lib/mountainSpline';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene04ScooterDepartureProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  onDepartureComplete: () => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

const DEPARTURE_DURATION_SEC = 5.4;

/**
 * Scene 4 — Brief morning scooter departure rollout in Indian left-hand lane formation:
 * Scooter 1 (Ishaan + Shree) ahead, Scooter 2 (Manish & Yash) behind, swinging into Scene 5 mountain road.
 */
export function Scene04_ScooterDeparture({
  qualityProfile,
  paused,
  transitionToken,
  onDepartureComplete,
  onSceneReady,
  simulateMountFailure = false,
}: Scene04ScooterDepartureProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting scooter departure sequence.');
  }

  const { camera } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();

  const curve = useMemo(() => createMountainRoadCurve('to_dhaba'), []);
  const totalLength = useMemo(() => curve.getLength(), [curve]);

  const leadRef = useRef<THREE.Group>(null);
  const compRef = useRef<THREE.Group>(null);
  const simRef = useRef({ elapsed: 0, done: false });

  const scratch = useMemo(
    () => ({
      p: new THREE.Vector3(),
      t: new THREE.Vector3(),
      r: new THREE.Vector3(),
      u: new THREE.Vector3(),
      nT: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      camPos: new THREE.Vector3(),
    }),
    []
  );

  const readyTokenRef = useRef(-1);
  useEffect(() => {
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 4);
    }
  }, [transitionToken, onSceneReady]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;
    sim.elapsed += delta;
    const dur = reducedMotion ? 1.1 : DEPARTURE_DURATION_SEC;
    const u = THREE.MathUtils.clamp(sim.elapsed / dur, 0, 1);

    const leadD = THREE.MathUtils.lerp(4.0, 26.0, u * u * (3 - 2 * u));
    const compD = Math.max(1.2, leadD - 4.6);

    const placeScooter = (grp: THREE.Group | null, d: number, lateral: number) => {
      if (!grp) return;
      sampleRoadFrame(curve, d, totalLength, scratch.p, scratch.t, scratch.r, scratch.u);
      grp.position.copy(scratch.p).addScaledVector(scratch.r, lateral);
      scratch.nT.copy(scratch.t).negate();
      scratch.m.makeBasis(scratch.r, scratch.u, scratch.nT);
      scratch.q.setFromRotationMatrix(scratch.m);
      grp.quaternion.copy(scratch.q);
    };

    placeScooter(compRef.current, compD, -2.05);
    placeScooter(leadRef.current, leadD, -1.25);

    sampleRoadFrame(curve, leadD, totalLength, scratch.p, scratch.t, scratch.r, scratch.u);
    scratch.camPos
      .copy(scratch.p)
      .addScaledVector(scratch.t, -7.8 + u * 0.5)
      .addScaledVector(scratch.u, 2.75)
      .addScaledVector(scratch.r, 1.5 - u * 1.5);
    camera.position.lerp(scratch.camPos, Math.min(1, delta * 5.5));
    camera.lookAt(scratch.p.x, scratch.p.y + 0.9, scratch.p.z);

    if (u >= 1 && !sim.done) {
      sim.done = true;
      onDepartureComplete();
    }
  });

  return (
    <>
      <MountainRoadEnvironment
        curve={curve}
        totalLength={totalLength}
        stopDist={totalLength - 60}
        roadSegment="to_dhaba"
        qualityProfile={qualityProfile}
        paused={paused}
      />
      <group ref={leadRef}>
        <PrototypeScooter variant="lead" castShadow={shadowsEnabled} />
      </group>
      <group ref={compRef}>
        <PrototypeScooter variant="companion" castShadow={shadowsEnabled} />
      </group>
    </>
  );
}

