'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene01KitaabiDastaanProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  simulateMountFailure?: boolean;
  onSceneReady: (token: number, sceneId: SceneId) => void;
}

const BOOK_SPINES: ReadonlyArray<{ x: number; z: number; h: number; color: string; rotY: number }> = [
  { x: -1.8, z: -2.2, h: 0.56, color: '#991b1b', rotY: 0.3 },
  { x: -1.45, z: -2.35, h: 0.62, color: '#1e3a8a', rotY: 0.2 },
  { x: 1.55, z: -2.3, h: 0.58, color: '#065f46', rotY: -0.25 },
  { x: 1.9, z: -2.15, h: 0.52, color: '#b45309', rotY: -0.35 },
];

/**
 * Scene 1 — Kitaabi Dastaan Cozy Study Backdrop.
 * Warm lamp glow over an open book & reading shelves symbolizing chats & phone calls leading to Rishikesh.
 */
export function Scene01_KitaabiDastaan({
  paused,
  transitionToken,
  simulateMountFailure = false,
  onSceneReady,
}: Scene01KitaabiDastaanProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Kitaabi Dastaan scene.');
  }

  const { camera, scene } = useThree();
  const reducedMotion = useReducedMotion();
  const tRef = useRef(0);
  const lampGlowRef = useRef<THREE.Mesh>(null);
  const readyTokenRef = useRef(-1);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#0f1629');
    scene.fog = new THREE.Fog('#0f1629', 8, 28);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  useEffect(() => {
    camera.position.set(0.3, 2.05, 3.6);
    camera.lookAt(0, 1.0, -0.8);
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 1);
    }
  }, [camera, transitionToken, onSceneReady]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      tRef.current += delta;
    }
    const t = tRef.current;
    camera.position.x = Math.sin(t * 0.22) * 0.65;
    camera.position.y = 1.95 + Math.cos(t * 0.18) * 0.12;
    camera.lookAt(0, 1.0, -0.85);

    if (lampGlowRef.current) {
      const mat = lampGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(t * 2.1) * 0.12;
    }
  });

  return (
    <>
      <ambientLight intensity={0.68} color="#fde68a" />
      <hemisphereLight args={['#334155', '#78350f', 0.82]} />
      <pointLight position={[-0.95, 2.05, -0.35]} intensity={5.4} color="#fbbf24" distance={14} />
      <directionalLight position={[2.8, 3.8, 2.5]} intensity={0.95} color="#bae6fd" />

      {/* Cozy dark study floor & curved wooden desk */}
      <mesh position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e1b2e" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.42, -0.85]}>
        <boxGeometry args={[5.2, 0.84, 2.2]} />
        <meshStandardMaterial color="#4a2e1d" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.86, -0.85]}>
        <boxGeometry args={[5.45, 0.06, 2.35]} />
        <meshStandardMaterial color="#6b4228" roughness={0.78} />
      </mesh>

      {/* Open centerpiece book with warm amber paper spread */}
      <group position={[0.15, 0.91, -0.55]} rotation={[0.05, -0.15, 0]}>
        <mesh position={[-0.22, 0.02, 0]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.42, 0.03, 0.56]} />
          <meshStandardMaterial color="#faf3e0" roughness={0.9} />
        </mesh>
        <mesh position={[0.22, 0.02, 0]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.42, 0.03, 0.56]} />
          <meshStandardMaterial color="#faf3e0" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.004, 0]}>
          <boxGeometry args={[0.9, 0.02, 0.6]} />
          <meshStandardMaterial color="#78350f" roughness={0.85} />
        </mesh>
      </group>

      {/* Stylized Vintage Desk Reading Lamp */}
      <group position={[-0.95, 0.89, -0.8]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.1, 14]} />
          <meshStandardMaterial color="#b45309" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.72, 10]} />
          <meshStandardMaterial color="#d97706" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh ref={lampGlowRef} position={[0, 0.8, 0]}>
          <coneGeometry args={[0.28, 0.34, 14, 1, true]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#f59e0b"
            emissiveIntensity={1.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Atmospheric bookshelves behind desk */}
      <mesh position={[0, 1.55, -2.55]}>
        <boxGeometry args={[4.8, 2.2, 0.3]} />
        <meshStandardMaterial color="#3b2316" roughness={0.9} />
      </mesh>
      {BOOK_SPINES.map((b, idx) => (
        <mesh key={idx} position={[b.x, 1.15 + b.h * 0.5, b.z]} rotation={[0, b.rotY, 0]}>
          <boxGeometry args={[0.22, b.h, 0.34]} />
          <meshStandardMaterial color={b.color} roughness={0.85} />
        </mesh>
      ))}
    </>
  );
}

