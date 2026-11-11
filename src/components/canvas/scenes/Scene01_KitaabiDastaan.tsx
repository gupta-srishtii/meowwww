'use client';

import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
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

/**
 * Scene 1 — Split-Screen Phone Call Intro:
 * LEFT: Srishti at home in Delhi, talking on her phone.
 * RIGHT: Ishaan at home in Lucknow, talking on his phone.
 * Warm late-evening interiors before heading to Rishikesh (Day 1 evening after rafting).
 */
export function Scene01_KitaabiDastaan({
  paused,
  transitionToken,
  simulateMountFailure = false,
  onSceneReady,
}: Scene01KitaabiDastaanProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting Intro Phone Call scene.');
  }

  const { camera, scene } = useThree();
  const reducedMotion = useReducedMotion();
  const tRef = useRef(0);
  const readyTokenRef = useRef(-1);

  const srishtiHeadRef = useRef<THREE.Group>(null);
  const srishtiLeftArmRef = useRef<THREE.Group>(null);
  const srishtiRightArmRef = useRef<THREE.Group>(null);
  const srishtiRightForearmRef = useRef<THREE.Group>(null);
  const srishtiTorsoRef = useRef<THREE.Group>(null);

  const ishaanHeadRef = useRef<THREE.Group>(null);
  const ishaanLeftArmRef = useRef<THREE.Group>(null);
  const ishaanRightArmRef = useRef<THREE.Group>(null);
  const ishaanRightForearmRef = useRef<THREE.Group>(null);
  const ishaanTorsoRef = useRef<THREE.Group>(null);

  const pulseDotRef = useRef<THREE.Mesh>(null);
  const delhiLampRef = useRef<THREE.Mesh>(null);
  const lucknowLampRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#0c111e');
    scene.fog = null;
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  useEffect(() => {
    camera.position.set(0, 1.38, 3.05);
    camera.lookAt(0, 1.24, 0);
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

    // Gentle camera breathing while preserving the exact 50/50 split center seam
    camera.position.set(0, 1.38 + Math.sin(t * 0.45) * 0.025, 3.05);
    camera.lookAt(0, 1.24, 0);

    // Srishti (Delhi, Left) holding smartphone up to ear + expressive phone-call gestures
    if (srishtiRightArmRef.current && srishtiRightForearmRef.current) {
      srishtiRightArmRef.current.rotation.set(0.76 + Math.sin(t * 1.4) * 0.025, 0.05, 0.14);
      srishtiRightForearmRef.current.rotation.set(1.74 + Math.cos(t * 1.6) * 0.03, 0.24, -0.32);
    }
    if (srishtiLeftArmRef.current) {
      srishtiLeftArmRef.current.rotation.set(0.22 + Math.sin(t * 2.1) * 0.08, 0, -0.14);
    }
    if (srishtiHeadRef.current) {
      srishtiHeadRef.current.rotation.set(
        -0.03 + Math.sin(t * 2.2) * 0.04,
        0.1 + Math.cos(t * 1.1) * 0.05,
        -0.04 + Math.sin(t * 1.3) * 0.03
      );
    }
    if (srishtiTorsoRef.current) {
      srishtiTorsoRef.current.position.y = 0.82 + Math.sin(t * 1.8) * 0.008;
    }

    // Ishaan (Lucknow, Right) holding smartphone up to ear + conversational nod
    if (ishaanRightArmRef.current && ishaanRightForearmRef.current) {
      ishaanRightArmRef.current.rotation.set(0.76 + Math.cos(t * 1.3) * 0.025, 0.04, 0.15);
      ishaanRightForearmRef.current.rotation.set(1.74 + Math.sin(t * 1.5) * 0.03, 0.24, -0.32);
    }
    if (ishaanLeftArmRef.current) {
      ishaanLeftArmRef.current.rotation.set(0.18 + Math.cos(t * 1.85) * 0.07, 0, -0.12);
    }
    if (ishaanHeadRef.current) {
      ishaanHeadRef.current.rotation.set(
        -0.02 + Math.cos(t * 2.0) * 0.045,
        -0.1 + Math.sin(t * 1.2) * 0.05,
        0.03 + Math.cos(t * 1.4) * 0.03
      );
    }
    if (ishaanTorsoRef.current) {
      ishaanTorsoRef.current.position.y = 0.82 + Math.cos(t * 1.7) * 0.008;
    }

    if (pulseDotRef.current) {
      const mat = pulseDotRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.15 + Math.sin(t * 3.2) * 0.35;
    }
    if (delhiLampRef.current) {
      const mat = delhiLampRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.05 + Math.sin(t * 1.6) * 0.1;
    }
    if (lucknowLampRef.current) {
      const mat = lucknowLampRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.05 + Math.cos(t * 1.8) * 0.1;
    }
  });

  return (
    <group>
      {/* Balanced key + ambient fill across both rooms */}
      <ambientLight intensity={0.62} color="#e2e8f0" />
      <directionalLight position={[0.4, 4.2, 4.5]} intensity={0.95} color="#fff7ed" />

      {/* ===================================================================
          LEFT HALF — SRISHTI AT HOME IN DELHI
      =================================================================== */}
      <group position={[-1.02, 0, 0]}>
        <pointLight position={[-0.65, 2.1, 1.35]} intensity={1.9} distance={6.5} color="#fed7aa" />
        <pointLight position={[0.1, 1.55, 1.1]} intensity={1.1} distance={4.5} color="#fde68a" />

        {/* Cozy terracotta-cream Delhi bedroom walls & floor */}
        <mesh position={[-0.85, 1.5, -1.45]}>
          <boxGeometry args={[3.7, 3.6, 0.12]} />
          <meshStandardMaterial color="#3b262b" roughness={0.92} />
        </mesh>
        <mesh position={[-2.65, 1.5, 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[3.4, 3.6, 0.12]} />
          <meshStandardMaterial color="#311f24" roughness={0.92} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.85, 0, 0]}>
          <planeGeometry args={[3.8, 3.8]} />
          <meshStandardMaterial color="#2a1d19" roughness={0.88} />
        </mesh>

        {/* Window with Delhi evening sky + curtains */}
        <group position={[-0.45, 1.72, -1.36]}>
          <mesh>
            <planeGeometry args={[1.08, 0.96]} />
            <meshStandardMaterial
              color="#1e293b"
              emissive="#312e81"
              emissiveIntensity={0.45}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[-0.56, 0, 0.04]}>
            <boxGeometry args={[0.16, 1.12, 0.06]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.85} />
          </mesh>
          <mesh position={[0.56, 0, 0.04]}>
            <boxGeometry args={[0.16, 1.12, 0.06]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.52, 0.04]}>
            <boxGeometry args={[1.28, 0.06, 0.12]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
        </group>

        {/* Warm bedside table & glowing lamp */}
        <group position={[-0.78, 0, -0.55]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.56, 0.72, 0.44]} />
            <meshStandardMaterial color="#5c3a21" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.84, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.24, 10]} />
            <meshStandardMaterial color="#d97706" roughness={0.45} />
          </mesh>
          <mesh ref={delhiLampRef} position={[0, 1.02, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 0.22, 14]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fbbf24"
              emissiveIntensity={1.08}
              roughness={0.45}
            />
          </mesh>
        </group>

        {/* Packed backpack by wall */}
        <group position={[-1.18, 0.22, -0.95]}>
          <mesh>
            <boxGeometry args={[0.34, 0.44, 0.22]} />
            <meshStandardMaterial color="#4338ca" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.06, 0.12]}>
            <boxGeometry args={[0.26, 0.22, 0.04]} />
            <meshStandardMaterial color="#312e81" roughness={0.85} />
          </mesh>
        </group>

        {/* Srishti standing indoors talking on her phone */}
        <StylizedPlaceholderCharacter
          characterVariant="srishti"
          outfitMode="default"
          position={[0.14, 0, 0.28]}
          rotationY={Math.PI - 0.18}
          holdingPhone
          showNameTag={false}
          torsoRef={srishtiTorsoRef}
          headRef={srishtiHeadRef}
          leftArmRef={srishtiLeftArmRef}
          rightArmRef={srishtiRightArmRef}
          rightForearmRef={srishtiRightForearmRef}
        />

        <Html position={[0.04, 1.88, 0.28]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div className="whitespace-nowrap rounded-full border border-rose-300/60 bg-slate-950/88 px-3 py-1 text-[11px] font-semibold tracking-wide text-rose-100 shadow-lg backdrop-blur-sm">
            Delhi · Srishti
          </div>
        </Html>
      </group>

      {/* ===================================================================
          CENTER SPLIT-SCREEN SEAM (EXACT 50/50 VERTICAL DIVIDER + CALL PULSE)
      =================================================================== */}
      <group position={[0, 1.3, 1.15]}>
        <mesh>
          <boxGeometry args={[0.036, 3.8, 0.04]} />
          <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[0.008, 3.8, 0.01]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#f59e0b"
            emissiveIntensity={0.85}
            roughness={0.3}
          />
        </mesh>
        <mesh ref={pulseDotRef} position={[0, 0.1, 0.03]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#10b981"
            emissiveIntensity={1.25}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* ===================================================================
          RIGHT HALF — ISHAAN AT HOME IN LUCKNOW
      =================================================================== */}
      <group position={[1.02, 0, 0]}>
        <pointLight position={[0.68, 2.1, 1.35]} intensity={1.9} distance={6.5} color="#bfdbfe" />
        <pointLight position={[-0.08, 1.55, 1.1]} intensity={1.1} distance={4.5} color="#fde68a" />

        {/* Cozy slate-indigo Lucknow study/bedroom walls & floor */}
        <mesh position={[0.85, 1.5, -1.45]}>
          <boxGeometry args={[3.7, 3.6, 0.12]} />
          <meshStandardMaterial color="#1b263b" roughness={0.92} />
        </mesh>
        <mesh position={[2.65, 1.5, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[3.4, 3.6, 0.12]} />
          <meshStandardMaterial color="#162033" roughness={0.92} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.85, 0, 0]}>
          <planeGeometry args={[3.8, 3.8]} />
          <meshStandardMaterial color="#181f2c" roughness={0.88} />
        </mesh>

        {/* Lucknow bedroom window with evening stars & frame */}
        <group position={[0.45, 1.72, -1.36]}>
          <mesh>
            <planeGeometry args={[1.08, 0.96]} />
            <meshStandardMaterial
              color="#0f172a"
              emissive="#1d4ed8"
              emissiveIntensity={0.38}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.04, 0.96, 0.04]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.52, 0.04]}>
            <boxGeometry args={[1.24, 0.06, 0.12]} />
            <meshStandardMaterial color="#475569" roughness={0.75} />
          </mesh>
        </group>

        {/* Warm wooden desk, books & desk lamp */}
        <group position={[0.78, 0, -0.55]}>
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.68, 0.76, 0.46]} />
            <meshStandardMaterial color="#473325" roughness={0.78} />
          </mesh>
          <mesh position={[-0.12, 0.8, 0.05]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.24, 0.06, 0.18]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
          </mesh>
          <mesh position={[0.14, 0.88, -0.05]}>
            <cylinderGeometry args={[0.035, 0.05, 0.22, 10]} />
            <meshStandardMaterial color="#334155" roughness={0.45} />
          </mesh>
          <mesh ref={lucknowLampRef} position={[0.14, 1.04, -0.05]}>
            <coneGeometry args={[0.15, 0.2, 14]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#f59e0b"
              emissiveIntensity={1.08}
              roughness={0.45}
            />
          </mesh>
        </group>

        {/* Ishaan's travel bag ready near room wall */}
        <group position={[1.15, 0.22, -0.95]}>
          <mesh>
            <boxGeometry args={[0.38, 0.42, 0.24]} />
            <meshStandardMaterial color="#0f766e" roughness={0.82} />
          </mesh>
        </group>

        {/* Ishaan standing indoors talking on his phone */}
        <StylizedPlaceholderCharacter
          characterVariant="ishaan"
          outfitMode="default"
          position={[-0.14, 0, 0.28]}
          rotationY={Math.PI + 0.18}
          holdingPhone
          showNameTag={false}
          torsoRef={ishaanTorsoRef}
          headRef={ishaanHeadRef}
          leftArmRef={ishaanLeftArmRef}
          rightArmRef={ishaanRightArmRef}
          rightForearmRef={ishaanRightForearmRef}
        />

        <Html position={[-0.04, 1.88, 0.28]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div className="whitespace-nowrap rounded-full border border-sky-300/60 bg-slate-950/88 px-3 py-1 text-[11px] font-semibold tracking-wide text-sky-100 shadow-lg backdrop-blur-sm">
            Lucknow · Ishaan
          </div>
        </Html>
      </group>
    </group>
  );
}
