'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { SharedAssetRoot } from '@/components/canvas/managers/AssetManager';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface TempPhase1BTestSceneProps {
  sceneId: SceneId;
  transitionToken: number;
  paused: boolean;
  qualityProfile: QualityProfile;
  simulateMountFailure?: boolean;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

/**
 * Temporary non-story Phase 1B test scene hosted at Scene 0's slot.
 * Validates curtain transitions, token-guarded readiness, shared `dispose={null}`
 * retention of the prototype scooter, ErrorBoundary recovery, and CameraDirector pause.
 */
export function TempPhase1BTestScene({
  sceneId,
  transitionToken,
  paused,
  qualityProfile,
  simulateMountFailure = false,
  onSceneReady,
}: TempPhase1BTestSceneProps) {
  if (simulateMountFailure) {
    throw new Error(
      `Simulated Phase 1B ErrorBoundary fault while mounting Scene ${sceneId}.`
    );
  }

  const turntableRef = useRef<THREE.Group>(null);
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;

  useEffect(() => {
    onSceneReady(transitionToken, sceneId);
  }, [onSceneReady, sceneId, transitionToken]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (turntableRef.current) {
      turntableRef.current.rotation.y += delta * 0.28;
    }
  });

  return (
    <group>
      <color attach="background" args={['#141e30']} />
      <fog attach="fog" args={['#141e30', 14, 42]} />

      <hemisphereLight args={['#93c5fd', '#1e293b', 0.85]} />
      <directionalLight
        position={[7, 11, 6]}
        intensity={1.75}
        color="#fde68a"
        castShadow={shadowsEnabled}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 3.2, -3]} intensity={1.4} color="#2dd4bf" distance={18} />

      {/* Ground floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={shadowsEnabled}>
        <circleGeometry args={[28, 48]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Non-story calibration ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.55, 2.75, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
      </mesh>

      {/* Stepped pedestal */}
      <mesh position={[0, 0.14, 0]} receiveShadow={shadowsEnabled}>
        <cylinderGeometry args={[2.45, 2.65, 0.28, 36]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Rotating shared scooter turntable wrapped inside dispose={null} SharedAssetRoot */}
      <group ref={turntableRef} position={[0, 0.28, 0]}>
        <SharedAssetRoot>
          <group position={[-0.95, 0, 0]}>
            <PrototypeScooter variant="lead" castShadow={shadowsEnabled} />
          </group>
          <group position={[0.95, 0, 0]}>
            <PrototypeScooter variant="companion" castShadow={shadowsEnabled} />
          </group>
        </SharedAssetRoot>
      </group>

      {/* Subtle architectural test pillars (strictly geometric, non-story) */}
      {[
        [-6, 1.5, -5],
        [6, 1.5, -5],
        [-7.5, 1.2, 2],
        [7.5, 1.2, 2],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.7, y * 2, 0.7]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

