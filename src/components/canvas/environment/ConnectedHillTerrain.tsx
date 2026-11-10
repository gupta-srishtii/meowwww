'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface ConnectedHillTerrainProps {
  width: number;
  depth: number;
  centerX?: number;
  centerZ?: number;
  segX?: number;
  segZ?: number;
  heightFn: (worldX: number, worldZ: number) => number;
  colorFn?: (worldX: number, worldZ: number, height: number, targetColor: THREE.Color) => void;
  receiveShadow?: boolean;
}

const _defaultLow = new THREE.Color('#34593b');
const _defaultMid = new THREE.Color('#4d6b41');
const _defaultSoil = new THREE.Color('#6b5e4c');

/**
 * Generates a continuous, gently contoured mountain terrain mesh parameterized by `heightFn(x, z)`.
 * Share the exact same `heightFn` for trees, boulders, and retaining walls so nothing ever floats.
 */
export function ConnectedHillTerrain({
  width,
  depth,
  centerX = 0,
  centerZ = 0,
  segX = 56,
  segZ = 48,
  heightFn,
  colorFn,
  receiveShadow = false,
}: ConnectedHillTerrainProps) {
  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);
      const wx = localX + centerX;
      const wz = localZ + centerZ;
      const y = heightFn(wx, wz);

      pos.setXYZ(i, wx, y, wz);

      if (colorFn) {
        colorFn(wx, wz, y, tmpColor);
      } else if (y > 2.0) {
        tmpColor.copy(_defaultLow).lerp(_defaultMid, THREE.MathUtils.clamp((y - 2) / 6, 0, 1));
      } else if (y > -1.2) {
        tmpColor.copy(_defaultSoil).lerp(_defaultMid, 0.55);
      } else {
        tmpColor.copy(_defaultLow);
      }

      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, [width, depth, centerX, centerZ, segX, segZ, heightFn, colorFn]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow={receiveShadow}>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0.02} />
    </mesh>
  );
}

