'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';

export interface BhaiDoojEnvironmentProps {
  qualityProfile: QualityProfile;
  paused: boolean;
  sweetsTaken?: boolean;
}

const FAIRY_LIGHTS_X = [-2.2, -1.65, -1.1, -0.55, 0, 0.55, 1.1, 1.65, 2.2];

/**
 * Warm cozy Indian home interior for the Bhai Dooj Tilak finale.
 * Grounded cushions (gaddis), low wooden puja chowki, brass thali, roli, akshat, mithai & lit diya.
 * Explicitly staged with zero crowd — only Ishaan & Shree present.
 */
export function BhaiDoojEnvironment({
  qualityProfile,
  paused,
  sweetsTaken = false,
}: BhaiDoojEnvironmentProps) {
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;
  const reducedMotion = useReducedMotion();
  const diyaFlameRef = useRef<THREE.Mesh>(null);
  const diyaLightRef = useRef<THREE.PointLight>(null);
  const animRef = useRef(0);

  const { scene } = useThree();
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color('#231510');
    scene.fog = new THREE.Fog('#231510', 8, 22);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    animRef.current += Math.min(rawDelta, 0.05);
    const t = animRef.current;

    if (diyaFlameRef.current) {
      const flicker = 0.94 + Math.sin(t * 7.5) * 0.06 + Math.cos(t * 11.2) * 0.04;
      diyaFlameRef.current.scale.set(0.95, flicker, 0.95);
    }
    if (diyaLightRef.current) {
      diyaLightRef.current.intensity = 1.65 + Math.sin(t * 6.5) * 0.14;
    }
  });

  return (
    <>
      <ambientLight intensity={0.72} color="#fde68a" />
      <hemisphereLight args={['#ffedd5', '#3b1d12', 0.85]} />
      <directionalLight
        position={[2.5, 4.8, 3.6]}
        intensity={1.35}
        color="#ffe4c4"
        castShadow={shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-bias={-0.0005}
      />

      {/* Warm polished hardwood floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={shadowsEnabled}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#5b3421" roughness={0.78} />
      </mesh>

      {/* Woven crimson-and-gold ceremonial floor rug */}
      <mesh position={[0, 0.008, 0.05]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[3.9, 0.016, 2.75]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.012, 0.05]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[3.55, 0.014, 2.4]} />
        <meshStandardMaterial color="#b45309" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.015, 0.05]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[3.25, 0.012, 2.1]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.92} />
      </mesh>

      {/* Back & flanking warm cream plaster Indian home walls */}
      <mesh position={[0, 2.2, -2.5]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[12, 4.6, 0.25]} />
        <meshStandardMaterial color="#f5e6cf" roughness={0.88} />
      </mesh>
      <mesh position={[-4.5, 2.2, 0.5]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.25, 4.6, 8.5]} />
        <meshStandardMaterial color="#ecd8ba" roughness={0.88} />
      </mesh>
      <mesh position={[4.5, 2.2, 0.5]} receiveShadow={shadowsEnabled}>
        <boxGeometry args={[0.25, 4.6, 8.5]} />
        <meshStandardMaterial color="#ecd8ba" roughness={0.88} />
      </mesh>

      {/* Warm teak wooden wainscoting dado & festive marigold garlands along back wall */}
      <mesh position={[0, 0.45, -2.35]}>
        <boxGeometry args={[11.6, 0.9, 0.08]} />
        <meshStandardMaterial color="#6d4329" roughness={0.82} />
      </mesh>
      {/* Draped warm saffron/crimson festive side curtains flanking altar wall */}
      {[-3.45, 3.45].map((dx) => (
        <mesh key={`curtain-${dx}`} position={[dx, 2.2, -2.32]} castShadow={shadowsEnabled}>
          <boxGeometry args={[0.72, 3.2, 0.08]} />
          <meshStandardMaterial color="#9f1239" roughness={0.9} />
        </mesh>
      ))}
      {/* Brass mandala/sunburst frame centered on home altar wall */}
      <mesh position={[0, 2.1, -2.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.04, 24]} />
        <meshStandardMaterial color="#d97706" metalness={0.62} roughness={0.32} />
      </mesh>
      <mesh position={[0, 2.1, -2.32]}>
        <circleGeometry args={[0.38, 24]} />
        <meshStandardMaterial color="#9a3412" roughness={0.78} />
      </mesh>

      {/* Warm string fairy lights draped in gentle catenary across back wall */}
      {FAIRY_LIGHTS_X.map((fx, idx) => {
        const sag = Math.cos((fx / 2.2) * (Math.PI / 2)) * -0.22 + 2.85;
        return (
          <mesh key={idx} position={[fx, sag, -2.32]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#fbbf24"
              emissiveIntensity={1.5}
            />
          </mesh>
        );
      })}
      {/* Left & right vertical marigold floral strings framing altar */}
      {[-2.4, 2.4].map((mx) =>
        [1.55, 1.85, 2.15, 2.45, 2.75].map((my, idx) => (
          <mesh key={`${mx}-${my}`} position={[mx, my, -2.33]}>
            <sphereGeometry args={[0.068, 10, 10]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#f59e0b' : '#ea580c'}
              roughness={0.75}
            />
          </mesh>
        ))
      )}

      {/* Plush Crimson-Gold Upholstered Low Wooden Seated Cushions (gaddi patlas) */}
      {[
        [-0.56, -0.16, -0.35],
        [0.56, -0.16, 0.35],
      ].map(([cx, cz, yaw], idx) => (
        <group key={idx} position={[cx, 0.02, cz]} rotation={[0, yaw, 0]}>
          {/* Carved teak seat frame */}
          <mesh position={[0, 0.25, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[0.58, 0.06, 0.54]} />
            <meshStandardMaterial color="#6d3a1e" roughness={0.82} />
          </mesh>
          {[
            [-0.22, -0.2],
            [0.22, -0.2],
            [-0.22, 0.2],
            [0.22, 0.2],
          ].map(([lx, lz], lIdx) => (
            <mesh key={lIdx} position={[lx, 0.11, lz]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.04, 0.032, 0.22, 10]} />
              <meshStandardMaterial color="#4e2813" roughness={0.86} />
            </mesh>
          ))}
          {/* Lush brocade crimson top cushion + gold trim */}
          <mesh position={[0, 0.33, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[0.56, 0.1, 0.52]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.295, 0]}>
            <boxGeometry args={[0.58, 0.024, 0.54]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.62} />
          </mesh>
        </group>
      ))}

      {/* Low Carved Wooden Puja Chowki centered forward */}
      <group position={[0, 0.02, 0.44]}>
        <mesh position={[0, 0.22, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <boxGeometry args={[0.88, 0.06, 0.58]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.78} />
        </mesh>
        {[
          [-0.36, -0.22],
          [0.36, -0.22],
          [-0.36, 0.22],
          [0.36, 0.22],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.1, lz]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.042, 0.032, 0.2, 10]} />
            <meshStandardMaterial color="#5c210e" roughness={0.84} />
          </mesh>
        ))}

        {/* Polished Brass Puja Thali Platter */}
        <mesh position={[0, 0.262, 0]} castShadow={shadowsEnabled}>
          <cylinderGeometry args={[0.24, 0.2, 0.024, 24]} />
          <meshStandardMaterial color="#eab308" metalness={0.72} roughness={0.28} />
        </mesh>
        {/* Vermilion Roli Kumkum Katori Bowl */}
        <mesh position={[-0.09, 0.288, -0.05]}>
          <cylinderGeometry args={[0.042, 0.032, 0.03, 14]} />
          <meshStandardMaterial color="#d97706" metalness={0.68} roughness={0.32} />
        </mesh>
        <mesh position={[-0.09, 0.302, -0.05]}>
          <sphereGeometry args={[0.026, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#dc2626" roughness={0.75} />
        </mesh>

        {/* Golden Akshat Rice Katori Bowl */}
        <mesh position={[0.09, 0.288, -0.05]}>
          <cylinderGeometry args={[0.042, 0.032, 0.03, 14]} />
          <meshStandardMaterial color="#d97706" metalness={0.68} roughness={0.32} />
        </mesh>
        <mesh position={[0.09, 0.302, -0.05]}>
          <sphereGeometry args={[0.026, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.78} />
        </mesh>

        {/* Lit Brass Puja Diya & Gentle Flame + Delicate Marigold Petals on Chowki Corners */}
        <mesh position={[0, 0.288, 0.1]}>
          <cylinderGeometry args={[0.04, 0.025, 0.03, 12]} />
          <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh ref={diyaFlameRef} position={[0, 0.335, 0.1]}>
          <coneGeometry args={[0.018, 0.06, 10]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
        {[
          [-0.32, 0.18, '#f59e0b'],
          [-0.25, 0.21, '#ea580c'],
          [0.24, -0.18, '#f59e0b'],
          [-0.28, -0.17, '#ef4444'],
        ].map(([px, pz, col], idx) => (
          <mesh
            key={`petal-${idx}`}
            position={[px as number, 0.252, pz as number]}
            rotation={[-Math.PI / 2, 0, idx * 0.7]}
          >
            <circleGeometry args={[0.024, 8]} />
            <meshStandardMaterial color={col as string} roughness={0.8} />
          </mesh>
        ))}
        <pointLight
          ref={diyaLightRef}
          position={[0, 0.52, 0.1]}
          intensity={1.65}
          color="#fbbf24"
          distance={5.5}
        />

        {/* Kesar Mithai & Laddoo Plate */}
        <group position={[0.31, 0.26, 0.03]}>
          <mesh castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.1, 0.08, 0.02, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.65} roughness={0.28} />
          </mesh>
          {!sweetsTaken && (
            <>
              <mesh position={[-0.032, 0.028, 0.02]}>
                <sphereGeometry args={[0.028, 10, 10]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.66} />
              </mesh>
              <mesh position={[0.032, 0.028, 0.01]}>
                <sphereGeometry args={[0.028, 10, 10]} />
                <meshStandardMaterial color="#ea580c" roughness={0.68} />
              </mesh>
            </>
          )}
          <mesh position={[0, 0.024, -0.035]}>
            <boxGeometry args={[0.044, 0.026, 0.044]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </>
  );
}
