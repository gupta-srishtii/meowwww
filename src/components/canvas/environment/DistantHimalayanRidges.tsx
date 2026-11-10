'use client';

import * as THREE from 'three';

export interface HimalayanRidgeSpec {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY?: number;
  color: string;
}

const SHARED_RIDGE_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 18, 10);

const DEFAULT_HIGHWAY_RIDGES: readonly HimalayanRidgeSpec[] = [
  { position: [-165, -8, -110], scale: [120, 62, 95], rotationY: 0.35, color: '#6b8ba4' },
  { position: [158, -10, -145], scale: [132, 58, 108], rotationY: -0.4, color: '#64839c' },
  { position: [-176, -6, -265], scale: [148, 76, 120], rotationY: 0.22, color: '#58768f' },
  { position: [164, -8, -295], scale: [142, 70, 118], rotationY: -0.25, color: '#5e7d96' },
  { position: [94, -4, -455], scale: [185, 88, 130], rotationY: 0.12, color: '#7898b0' },
  { position: [-215, -2, -440], scale: [176, 86, 135], rotationY: -0.18, color: '#6786a0' },
  { position: [-95, -14, 65], scale: [110, 44, 88], rotationY: 0.5, color: '#6c8aa3' },
  // Soft intervening foothill saddles so ridgelines blend organically without sharp gaps
  { position: [-135, -16, -185], scale: [96, 46, 86], rotationY: -0.3, color: '#4d6b57' },
  { position: [130, -18, -218], scale: [104, 42, 92], rotationY: 0.28, color: '#4b6855' },
  { position: [-20, -10, -490], scale: [210, 74, 110], rotationY: 0, color: '#83a1b8' },
];

export interface DistantHimalayanRidgesProps {
  ridges?: readonly HimalayanRidgeSpec[];
}

/**
 * Smooth rolling multi-layered mountain massifs that frame valley vistas organically
 * without harsh low-poly pyramid/triangle walls.
 */
export function DistantHimalayanRidges({
  ridges = DEFAULT_HIGHWAY_RIDGES,
}: DistantHimalayanRidgesProps) {
  return (
    <group>
      {ridges.map((ridge, index) => (
        <mesh
          key={index}
          geometry={SHARED_RIDGE_SPHERE_GEOMETRY}
          position={[ridge.position[0], ridge.position[1], ridge.position[2]]}
          rotation={[0, ridge.rotationY ?? 0, 0]}
          scale={[ridge.scale[0], ridge.scale[1], ridge.scale[2]]}
        >
          <meshStandardMaterial color={ridge.color} roughness={0.96} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

