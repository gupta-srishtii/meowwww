'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { getSceneDefinition } from '@/lib/sceneConfig';
import {
  selectIsSimulationPaused,
  useProgressStore,
} from '@/store/progressStore';

/**
 * Isolated camera coordinator reading `cameraMode` from SCENE_REGISTRY.
 * Uses a scoped `sceneTimelineRef` inside `gsap.context` so pausing gameplay
 * freezes only scene camera motion without ever pausing `gsap.globalTimeline`.
 */
export function CameraDirector() {
  const { camera, clock } = useThree();
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const requestedSceneId = useProgressStore((s) => s.requestedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const isSimulationPaused = useProgressStore(selectIsSimulationPaused);

  const sceneTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasPausedRef = useRef<boolean>(isSimulationPaused);

  const activeSceneId =
    transitionPhase === 'mounting' || transitionPhase === 'fading_in'
      ? requestedSceneId
      : committedSceneId;

  const sceneDef = getSceneDefinition(activeSceneId);
  const isCameraPaused =
    isSimulationPaused ||
    transitionPhase === 'fading_out' ||
    transitionPhase === 'loading' ||
    transitionPhase === 'error';

  useEffect(() => {
    sceneTimelineRef.current?.kill();
    sceneTimelineRef.current = null;

    if (activeSceneId !== 0) {
      // All playable scenes own their camera, including cinematic/fixed/orbit modes.
      // Only the temporary loading/test stage uses the generic director orbit.
      return;
    }

    const ctx = gsap.context(() => {
      const orbitRig = { angle: -0.45, height: 2.8, radius: 7.4 };
      const updateCamera = () => {
        camera.position.set(
          Math.sin(orbitRig.angle) * orbitRig.radius,
          orbitRig.height,
          Math.cos(orbitRig.angle) * orbitRig.radius
        );
        camera.lookAt(0, 0.85, 0);
      };

      updateCamera();

      const timeline = gsap.timeline({
        repeat: -1,
        yoyo: true,
        paused: isCameraPaused,
      });

      timeline.to(orbitRig, {
        angle: 0.45,
        height: 3.35,
        duration: 8.5,
        ease: 'sine.inOut',
        onUpdate: updateCamera,
      });

      sceneTimelineRef.current = timeline;
    });

    return () => {
      sceneTimelineRef.current?.kill();
      sceneTimelineRef.current = null;
      ctx.revert();
    };
    // Intentionally scoped to scene / camera mode swaps rather than pause toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId, sceneDef.cameraMode, camera]);

  useEffect(() => {
    const timeline = sceneTimelineRef.current;

    if (isCameraPaused) {
      timeline?.pause();
      wasPausedRef.current = true;
      return;
    }

    if (wasPausedRef.current) {
      // Discard elapsed pause delta before simulation/camera playback resumes (§7 contract).
      clock.getDelta();
      wasPausedRef.current = false;
    }

    timeline?.resume();
  }, [isCameraPaused, clock]);

  return null;
}

