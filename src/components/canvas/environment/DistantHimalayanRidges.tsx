'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface HimalayanRidgeSpec {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY?: number;
  color: string;
}

export interface DistantHimalayanRidgesProps {
  ridges?: readonly HimalayanRidgeSpec[];
  centerZ?: number;
}

const _foothillGreen = new THREE.Color('#395645');
const _midSlopeSage = new THREE.Color('#4d6b5e');
const _ridgeSlateBlue = new THREE.Color('#64839d');
const _highMistBlue = new THREE.Color('#84a2ba');

/**
 * Generates a continuous multi-band Himalayan Shivalik massif ring with smooth elevation ridges
 * replacing isolated stretched sphere blocks, seamless against terrain skirts and distant horizon fog.
 */
function buildContinuousMountainRangeGeometry(
  ridges?: readonly HimalayanRidgeSpec[],
  centerZ = -190
): THREE.BufferGeometry {
  const segX = 96;
  const segZ = 72;
  const width = 920;
  const depth = 920;
  const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i += 1) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = lx;
    const wz = lz + centerZ;

    // Normalized radial distance from foreground play corridor
    const distFromCenter = Math.hypot(lx * 0.95, (wz + 190) * 0.72);
    const innerClear = THREE.MathUtils.smoothstep(distFromCenter, 55, 195);
    const farRise = THREE.MathUtils.smoothstep(distFromCenter, 110, 420);

    // Multi-frequency continuous Shivalik ridgelines + valley saddles
    const ridgeA = Math.sin(wx * 0.015 + wz * 0.011) * 0.5 + 0.5;
    const ridgeB = Math.cos(wx * 0.024 - wz * 0.019 + 1.1) * 0.5 + 0.5;
    const ridgeC = Math.sin(wx * 0.045 + wz * 0.038) * 0.5 + 0.5;
    const directionalBias =
      Math.max(0, (-wz - 120) / 360) * 32.0 + Math.abs(wx) * 0.065;

    let ridgeBoost = 0;
    if (ridges && ridges.length > 0) {
      for (let r = 0; r < ridges.length; r += 1) {
        const spec = ridges[r];
        const rx = Math.max(24, spec.scale[0]);
        const rz = Math.max(24, spec.scale[2]);
        const d2 = ((wx - spec.position[0]) / rx) ** 2 + ((wz - spec.position[2]) / rz) ** 2;
        if (d2 < 3.2) {
          ridgeBoost = Math.max(ridgeBoost, Math.exp(-d2 * 1.45) * spec.scale[1] * 1.05);
        }
      }
    }

    const baseElevation = -20.5;
    const h =
      baseElevation +
      innerClear * (16.0 + ridgeA * 24.0 + ridgeB * 14.0) +
      farRise * (28.0 + ridgeC * 18.0 + directionalBias) +
      ridgeBoost * innerClear;

    pos.setXYZ(i, wx, h, wz);

    // Atmospheric elevation & depth tinting (forest foothill green -> hazy slate blue crests)
    const heightNorm = THREE.MathUtils.clamp((h + 18) / 76, 0, 1);
    if (heightNorm < 0.35) {
      tmpColor.copy(_foothillGreen).lerp(_midSlopeSage, heightNorm / 0.35);
    } else if (heightNorm < 0.72) {
      tmpColor.copy(_midSlopeSage).lerp(_ridgeSlateBlue, (heightNorm - 0.35) / 0.37);
    } else {
      tmpColor.copy(_ridgeSlateBlue).lerp(_highMistBlue, (heightNorm - 0.72) / 0.28);
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Continuous multi-layered Himalayan foothill & distant peak mesh replacing floating spheres.
 */
export function DistantHimalayanRidges({
  ridges,
  centerZ = -190,
}: DistantHimalayanRidgesProps) {
  const geometry = useMemo(
    () => buildContinuousMountainRangeGeometry(ridges, centerZ),
    [ridges, centerZ]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.97} metalness={0.01} />
    </mesh>
  );
}
