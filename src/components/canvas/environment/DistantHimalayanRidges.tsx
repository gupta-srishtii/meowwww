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
  baseY?: number;
}

const _foothillGreen = new THREE.Color('#274330');
const _warmSlopeMoss = new THREE.Color('#4a5f42');
const _rockySlateFace = new THREE.Color('#616c78');
const _ridgeSlateBlue = new THREE.Color('#66839b');
const _highMistBlue = new THREE.Color('#9db7cc');

function ridgedNoise(x: number, z: number): number {
  const a = 1 - Math.abs(Math.sin(x * 0.014 + z * 0.01));
  const b = 1 - Math.abs(Math.cos(x * 0.025 - z * 0.018 + 0.9));
  const c = 1 - Math.abs(Math.sin(x * 0.052 + z * 0.044 + 1.7));
  return a * 0.56 + b * 0.3 + c * 0.14;
}

/**
 * Generates a continuous sculpted Shivalik mountain massif with sharp ridgelines,
 * valley saddles, and hazy atmospheric elevation color grading.
 */
function buildContinuousMountainRangeGeometry(
  ridges?: readonly HimalayanRidgeSpec[],
  centerZ = -190,
  baseY = -20.5
): THREE.BufferGeometry {
  const segX = 112;
  const segZ = 92;
  const width = 1080;
  const depth = 1080;
  const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new THREE.Color();
  const clearCenterZ = centerZ === -190 ? -180 : 0;
  const clearInner = centerZ === -190 ? 72 : 48;
  const clearOuter = centerZ === -190 ? 210 : 145;

  for (let i = 0; i < pos.count; i += 1) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = lx;
    const wz = lz + centerZ;

    // Normalized radial distance outside the road/overlook corridor
    const distFromCenter = Math.hypot(lx * 0.92, (wz - clearCenterZ) * 0.72);
    const innerClear = THREE.MathUtils.smoothstep(distFromCenter, clearInner, clearOuter);
    const farRise = THREE.MathUtils.smoothstep(
      distFromCenter,
      clearInner + 45,
      clearOuter + 210
    );

    const crestShape = ridgedNoise(wx, wz);
    const broadSwell = Math.sin(wx * 0.0085 - wz * 0.006) * 0.5 + 0.5;
    const secondaryRange = ridgedNoise(wx * 0.65 + 42, wz * 0.65 - 19);
    const directionalBias =
      Math.max(0, (-wz - 95) / 340) * 44.0 + Math.abs(wx) * 0.08;

    let ridgeBoost = 0;
    if (ridges && ridges.length > 0) {
      for (let r = 0; r < ridges.length; r += 1) {
        const spec = ridges[r];
        const rx = Math.max(26, spec.scale[0]);
        const rz = Math.max(26, spec.scale[2]);
        const d2 = ((wx - spec.position[0]) / rx) ** 2 + ((wz - spec.position[2]) / rz) ** 2;
        if (d2 < 3.4) {
          const spurRidge = 0.78 + ridgedNoise(wx * 1.4, wz * 1.4) * 0.45;
          ridgeBoost = Math.max(
            ridgeBoost,
            Math.exp(-d2 * 1.25) * spec.scale[1] * spurRidge * 1.25
          );
        }
      }
    }

    const h =
      baseY +
      innerClear * (14.0 + crestShape * 36.0 + broadSwell * 16.0) +
      farRise * (24.0 + secondaryRange * 34.0 + directionalBias) +
      ridgeBoost * smoothStepLocal(distFromCenter, clearInner * 0.6, clearOuter * 0.65);

    pos.setXYZ(i, wx, h, wz);

    // Distance & elevation-based hazy Shivalik aerial perspective with rock-band ridges
    const heightNorm = THREE.MathUtils.clamp((h + 18) / 102, 0, 1);
    const strataBand = Math.sin(wx * 0.045 - wz * 0.035 + h * 0.14) * 0.5 + 0.5;
    const valleyDepthShade = Math.sin(wx * 0.03 + wz * 0.025) * 0.038;
    if (heightNorm < 0.34) {
      tmpColor.copy(_foothillGreen).lerp(_warmSlopeMoss, heightNorm / 0.34);
      if (strataBand > 0.62) {
        tmpColor.lerp(_rockySlateFace, (strataBand - 0.62) * 1.15);
      }
    } else if (heightNorm < 0.72) {
      tmpColor
        .copy(_warmSlopeMoss)
        .lerp(_rockySlateFace, strataBand * 0.58)
        .lerp(_ridgeSlateBlue, (heightNorm - 0.34) / 0.38);
    } else {
      tmpColor.copy(_ridgeSlateBlue).lerp(_highMistBlue, (heightNorm - 0.72) / 0.28);
    }
    tmpColor.offsetHSL(0, 0, valleyDepthShade);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

function smoothStepLocal(val: number, edge0: number, edge1: number): number {
  const t = THREE.MathUtils.clamp((val - edge0) / Math.max(1e-4, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Continuous multi-layered Himalayan foothill & distant peak mesh replacing floating spheres.
 */
export function DistantHimalayanRidges({
  ridges,
  centerZ,
  baseY = -20.5,
}: DistantHimalayanRidgesProps) {
  // Local environments are centered at their plaza, not at the long road's -180m corridor.
  const rangeCenterZ = centerZ ?? (ridges?.length ? 0 : -190);
  const geometry = useMemo(
    () => buildContinuousMountainRangeGeometry(ridges, rangeCenterZ, baseY),
    [ridges, rangeCenterZ, baseY]
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
