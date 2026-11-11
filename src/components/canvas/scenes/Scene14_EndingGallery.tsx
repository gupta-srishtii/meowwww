'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import { animateCharacterRig } from '@/components/canvas/characters/animateCharacterRig';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { POLAROID_MEMORY_SPECS, getResolvedPolaroidMemory, usePolaroidMemoryRevision } from '@/lib/privateMemoryLoader';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene14EndingGalleryProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  transitionToken: number;
  collectedPolaroids: readonly string[];
  onInspectMemory: (id: string) => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  simulateMountFailure?: boolean;
}

function createGalleryCardTexture(title: string, tag: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(16, 14, 240, 128);
  grad.addColorStop(0, '#fde68a');
  grad.addColorStop(0.55, '#bae6fd');
  grad.addColorStop(1, '#bbf7d0');
  ctx.fillStyle = grad;
  ctx.fillRect(16, 14, 224, 118);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 26), 128, 158);
  ctx.fillStyle = '#64748b';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(tag, 128, 178);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Scene 14 — Serene Epilogue 3D Memory Showcase.
 * Features Ishaan (with festive tilak) and Shree side-by-side beside the parked scooters,
 * framed by an arc of their confirmed mountain memory Polaroid pedestals under warm twilight bokeh.
 */
export function Scene14_EndingGallery({
  qualityProfile,
  paused,
  transitionToken,
  collectedPolaroids,
  onInspectMemory,
  onSceneReady,
  simulateMountFailure = false,
}: Scene14EndingGalleryProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting ending memory showcase.');
  }

  const { camera, scene, size } = useThree();
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

  const animRef = useRef(0);
  const readyTokenRef = useRef(-1);

  const galleryItems = useMemo(() => Object.values(POLAROID_MEMORY_SPECS), []);
  const mediaRevision = usePolaroidMemoryRevision();
  const cardTextures = useMemo(
    () => galleryItems.map((item) => createGalleryCardTexture(item.title, item.locationTag)),
    [galleryItems, mediaRevision]
  );

  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    galleryItems.forEach((item, index) => {
      if (!collectedPolaroids.includes(item.id)) return;
      const url = getResolvedPolaroidMemory(item.id).resolvedUrl;
      const texture = cardTextures[index];
      if (!url || !texture) return;
      const img = new Image();
      images.push(img);
      img.onload = () => {
        if (cancelled) return;
        const canvas = texture.image as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx || img.naturalWidth === 0 || img.naturalHeight === 0) return;
        const scale = Math.min(224 / img.naturalWidth, 118 / img.naturalHeight);
        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;
        ctx.fillStyle = '#efe7d6';
        ctx.fillRect(16, 14, 224, 118);
        ctx.drawImage(img, 16 + (224 - width) / 2, 14 + (118 - height) / 2, width, height);
        texture.needsUpdate = true;
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
      images.forEach((img) => { img.onload = null; img.removeAttribute('src'); });
    };
  }, [galleryItems, cardTextures, collectedPolaroids, mediaRevision]);

  useEffect(() => {
    return () => {
      cardTextures.forEach((tex) => tex?.dispose());
    };
  }, [cardTextures]);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#141928');
    scene.fog = new THREE.Fog('#141928', 12, 34);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  useEffect(() => {
    if (readyTokenRef.current !== transitionToken) {
      readyTokenRef.current = transitionToken;
      onSceneReady(transitionToken, 14);
    }
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 56 : 48;
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
    if (!reducedMotion) {
      animRef.current += delta;
    }
    const t = animRef.current;

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
      },
      posX: 0.45,
      posZ: 0.2,
      facingYaw: 0.12,
      strideRatio: 0,
      stridePhase: 0,
      torsoBaseY: 0.84,
      elapsed: state.clock.elapsedTime,
      delta,
      idlePose: 'look_around',
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
      },
      posX: -0.45,
      posZ: 0.2,
      facingYaw: -0.12,
      strideRatio: 0,
      stridePhase: 0,
      torsoBaseY: 0.78,
      elapsed: state.clock.elapsedTime,
      delta,
      idlePose: 'hands_behind_back',
      reducedMotion,
    });

    const swayAngle = reducedMotion ? 0 : Math.sin(t * 0.22) * 0.35;
    camera.position.set(Math.sin(swayAngle) * 5.2, 2.25, Math.cos(swayAngle) * 5.4);
    camera.lookAt(0, 1.05, -1.6);
  });

  return (
    <>
      <ambientLight intensity={0.78} color="#fde68a" />
      <hemisphereLight args={['#93c5fd', '#451a03', 0.82]} />
      <pointLight position={[0, 3.6, 1.2]} intensity={3.2} color="#fbbf24" distance={16} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.15}
        color="#fed7aa"
        castShadow={shadowsEnabled}
      />

      {/* Rounded warm twilight showcase dais */}
      <mesh position={[0, -0.04, -0.8]} receiveShadow={shadowsEnabled}>
        <cylinderGeometry args={[7.2, 7.6, 0.08, 48]} />
        <meshStandardMaterial color="#1e293b" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.005, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.9, 6.08, 48]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0.004, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.38, 1.44, 36]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.35} />
      </mesh>

      {/* Semicircle of confirmed Polaroid pedestal frames (generous arc spacing for 9+ Polaroids) */}
      {galleryItems.map((item, idx) => {
        const angle = THREE.MathUtils.lerp(-1.42, 1.42, idx / Math.max(1, galleryItems.length - 1));
        const px = Math.sin(angle) * 5.25;
        const pz = -1.1 - Math.cos(angle) * 3.15;
        const collected = collectedPolaroids.includes(item.id);
        return (
          <group
            key={item.id}
            name={`memory-pedestal-${item.id}`}
            position={[px, 0, pz]}
            rotation={[0, -angle * 0.72, 0]}
            onClick={(event) => {
              if (!collected || paused) return;
              event.stopPropagation();
              onInspectMemory(item.id);
            }}
          >
            <mesh position={[0, 0.55, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.14, 0.2, 1.1, 14]} />
              <meshStandardMaterial color="#334155" roughness={0.72} />
            </mesh>
            <mesh position={[0, 1.62, 0]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.0, 0.84, 0.06]} />
              <meshStandardMaterial
                color={collected ? '#fef3c7' : '#cbd5e1'}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[0, 1.62, 0.036]}>
              <planeGeometry args={[0.88, 0.68]} />
              <meshBasicMaterial map={cardTextures[idx] ?? undefined} />
            </mesh>
          </group>
        );
      })}

      {/* Flanking twin scooters */}
      <group position={[2.25, 0, 0.75]} rotation={[0, -0.45, 0]}>
        <PrototypeScooter variant="lead" hideRiders castShadow={shadowsEnabled} />
      </group>
      <group position={[-2.25, 0, 0.75]} rotation={[0, 0.45, 0]}>
        <PrototypeScooter variant="companion" hideRiders castShadow={shadowsEnabled} />
      </group>

      {/* Ishaan & Shree admiring their memories side-by-side */}
      <StylizedPlaceholderCharacter
        characterVariant="ishaan"
        groupRef={ishaanGroupRef}
        torsoRef={ishaanTorsoRef}
        headRef={ishaanHeadRef}
        leftLegRef={ishaanLLegRef}
        leftKneeRef={ishaanLKneeRef}
        rightLegRef={ishaanRLegRef}
        rightKneeRef={ishaanRKneeRef}
        leftArmRef={ishaanLArmRef}
        rightArmRef={ishaanRArmRef}
        position={[0.45, 0, 0.2]}
        rotationY={0.12}
        scale={1.03}
        tilakApplied
        castShadow={shadowsEnabled}
      />

      <StylizedPlaceholderCharacter
        characterVariant="srishti"
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
        position={[-0.45, 0, 0.2]}
        rotationY={-0.12}
        scale={1.0}
        castShadow={shadowsEnabled}
      />
    </>
  );
}

