'use client';

import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';

export interface SlingBagAccessoryProps {
  variant?: 'standing' | 'seated';
  bagRef?: RefObject<THREE.Group | null>;
  castShadow?: boolean;
}

let cachedStandingStrap: THREE.TubeGeometry | null = null;
let cachedSeatedStrap: THREE.TubeGeometry | null = null;

function getStrapGeometry(variant: 'standing' | 'seated'): THREE.TubeGeometry {
  if (variant === 'standing' && cachedStandingStrap) return cachedStandingStrap;
  if (variant === 'seated' && cachedSeatedStrap) return cachedSeatedStrap;

  // Coordinates relative to Srishti's torso pivot (`y = 0.78` standing, `y = 0.29` seated)
  const yDrop = variant === 'seated' ? -0.11 : 0;
  const bagZ = variant === 'seated' ? 0.08 : 0.052;
  const frontChestZ = variant === 'seated' ? -0.118 : -0.116;

  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.188, 0.055 + yDrop, bagZ - 0.02),
      new THREE.Vector3(-0.186, 0.12 + yDrop * 0.4, -0.055),
      new THREE.Vector3(-0.088, 0.22 + yDrop * 0.2, frontChestZ),
      new THREE.Vector3(0.025, 0.305, frontChestZ + 0.006),
      new THREE.Vector3(0.1, 0.39, -0.056),
      new THREE.Vector3(0.106, 0.402, 0.015),
      new THREE.Vector3(0.09, 0.365, 0.088),
      new THREE.Vector3(0.025, 0.275, 0.114),
      new THREE.Vector3(-0.095, 0.168, 0.116),
      new THREE.Vector3(-0.182, 0.082 + yDrop * 0.6, bagZ + 0.032),
      new THREE.Vector3(-0.188, 0.055 + yDrop, bagZ + 0.015),
    ],
    false,
    'catmullrom',
    0.45
  );

  const geom = new THREE.TubeGeometry(curve, 36, 0.0095, 8, false);
  if (variant === 'standing') {
    cachedStandingStrap = geom;
  } else {
    cachedSeatedStrap = geom;
  }
  return geom;
}

/**
 * Curved crossbody canvas sling bag & contoured shoulder strap matching Srishti's
 * verified reference bag (`IMG_20250614_215645.jpg`, `20250612_132915.jpg`):
 * heather-olive grey body, vertical cobalt-blue center stripe, and subtle metallic hardware.
 */
export function SlingBagAccessory({
  variant = 'standing',
  bagRef,
  castShadow = false,
}: SlingBagAccessoryProps) {
  const strapGeom = useMemo(() => getStrapGeometry(variant), [variant]);
  const pouchPos: [number, number, number] =
    variant === 'seated' ? [-0.195, -0.135, 0.082] : [-0.194, -0.035, 0.052];

  return (
    <group>
      {/* Contoured fabric crossbody strap hugging collar, chest & back without body intersection */}
      <mesh geometry={strapGeom} castShadow={castShadow}>
        <meshStandardMaterial color="#454a40" roughness={0.88} />
      </mesh>

      {/* Swinging left-hip crossbody pouch */}
      <group ref={bagRef} position={pouchPos} rotation={[0.04, 0.24, 0.07]}>
        {/* Brass strap swivel clasp rings */}
        <mesh position={[0, 0.105, -0.02]}>
          <torusGeometry args={[0.014, 0.004, 6, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.105, 0.025]}>
          <torusGeometry args={[0.014, 0.004, 6, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Main olive-grey rectangular sling pouch */}
        <mesh castShadow={castShadow}>
          <boxGeometry args={[0.068, 0.195, 0.148]} />
          <meshStandardMaterial color="#61665b" roughness={0.86} />
        </mesh>
        {/* Top folded zipper flap lip */}
        <mesh position={[-0.004, 0.088, 0]}>
          <boxGeometry args={[0.074, 0.032, 0.152]} />
          <meshStandardMaterial color="#51554b" roughness={0.88} />
        </mesh>
        {/* Iconic vertical cobalt-blue center strap strip visible in reference */}
        <mesh position={[-0.036, -0.005, 0]}>
          <boxGeometry args={[0.009, 0.175, 0.034]} />
          <meshStandardMaterial color="#2563eb" roughness={0.62} />
        </mesh>
        {/* Tiny subtle white brand tag bar */}
        <mesh position={[-0.036, 0.055, -0.036]}>
          <boxGeometry args={[0.006, 0.016, 0.034]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.75} />
        </mesh>
      </group>
    </group>
  );
}

