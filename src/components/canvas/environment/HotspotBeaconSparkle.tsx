'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

export interface HotspotBeaconSparkleProps {
  position: readonly [number, number, number];
  color?: string;
  visible?: boolean;
  height?: number;
  paused?: boolean;
  reducedMotion?: boolean;
}

/**
 * Subtle warm floating mote indicator replacing oversized arcade floor rings
 * so interactive spots blend cleanly into stone plazas and dhaba courtyards.
 */
export function HotspotBeaconSparkle({
  position,
  color = '#fbbf24',
  visible = true,
  height = 0.85,
  paused = false,
  reducedMotion = false,
}: HotspotBeaconSparkleProps) {
  const orbRef = useRef<THREE.Group | null>(null);
  const phaseRef = useRef(position[0] * 0.7 + position[2] * 0.4);

  useFrame((_, rawDelta) => {
    if (!visible || !orbRef.current) return;
    if (paused || reducedMotion) {
      orbRef.current.position.y = height;
      return;
    }
    phaseRef.current += Math.min(rawDelta, 0.05) * 2.2;
    orbRef.current.position.y = height + Math.sin(phaseRef.current) * 0.08;
    orbRef.current.rotation.y += Math.min(rawDelta, 0.05) * 1.1;
  });

  if (!visible) return null;

  return (
    <group position={[position[0], position[1], position[2]]}>
      <group ref={orbRef} position={[0, height, 0]}>
        <mesh>
          <octahedronGeometry args={[0.068, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.125, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

