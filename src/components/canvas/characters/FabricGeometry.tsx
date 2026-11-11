'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Baked fabric contours: no cloth simulation or per-frame vertex work. */
export function FabricGeometry({ top, bottom, height, folds = 0.003 }: { top: number; bottom: number; height: number; folds?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(top, bottom, height, 16, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.hypot(x, z) < 0.00001) continue;
      const u = (y + height / 2) / height;
      const a = Math.atan2(z, x);
      const radius = THREE.MathUtils.lerp(bottom, top, u) * (0.96 + 0.04 * Math.sin(Math.PI * u)) +
        folds * Math.sin(a * 7 + u * 1.4) * Math.sin(Math.PI * u);
      p.setXYZ(i, Math.cos(a) * radius, y, Math.sin(a) * radius);
    }
    g.computeVertexNormals();
    return g;
  }, [top, bottom, height, folds]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

export function SoftBoxGeometry({ size }: { size: [number, number, number] }) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.24), [w, h, d]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

export function DrapedFabricGeometry({ width, height, depth = 0.025, shoulderDrape = false }: { width: number; height: number; depth?: number; shoulderDrape?: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 16, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const u = x / width + 0.5, v = y / height + 0.5;
      const sag = shoulderDrape ? 0.65 : 0.12 * (1 - v);
      const wrap = shoulderDrape ? Math.pow(u * 2 - 1, 2) * width * 0.18 : 0;
      p.setXYZ(i, x, y - height * sag * Math.sin(u * Math.PI),
        depth * Math.sin(u * Math.PI * 8) + depth * 0.6 * Math.sin(v * Math.PI) + wrap);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, shoulderDrape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}
