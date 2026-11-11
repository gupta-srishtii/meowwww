'use client';

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

const FLOWERS: [number, number, number][] = [];
for (let band = 0; band < 3; band++) {
  for (let i = 0; i <= 44; i++) {
    const x = -3.2 + i * 6.4 / 44;
    FLOWERS.push([x, 3.55 - band * 0.20 - 0.32 * Math.abs(Math.sin(i / 44 * Math.PI * 3)), -3.23 + band * 0.025]);
  }
}
for (const x of [-3.15, 3.15]) for (let i = 0; i < 27; i++) FLOWERS.push([x, 0.45 + i * 0.10, -3.20]);
for (let i = 0; i < 48; i++) {
  const a = i / 48 * Math.PI * 2;
  FLOWERS.push([Math.cos(a) * 1.42, 0.035, Math.sin(a) * 1.42 + 0.3]);
}

/** One draw call for all marigold petals; no extra shadow-casting lights. */
export function FestiveDecor() {
  const flowers = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = flowers.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    FLOWERS.forEach(([x, y, z], index) => {
      for (let p = 0; p < 7; p++) {
        const a = p / 6 * Math.PI * 2;
        const floor = y < 0.1;
        dummy.position.set(x + (p === 6 ? 0 : Math.cos(a) * 0.031), y + (floor ? 0.008 : p === 6 ? 0 : Math.sin(a) * 0.031), z + (floor ? (p === 6 ? 0 : Math.sin(a) * 0.031) : p === 6 ? 0.018 : 0));
        dummy.scale.setScalar(p === 6 ? 0.8 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index * 7 + p, dummy.matrix);
        mesh.setColorAt(index * 7 + p, color.set(index % 3 === 0 ? '#fb923c' : p === 6 ? '#b45309' : '#fbbf24'));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <group>
    <instancedMesh ref={flowers} args={[undefined, undefined, FLOWERS.length * 7]}>
      <icosahedronGeometry args={[0.027, 0]} />
      <meshStandardMaterial roughness={0.88} />
    </instancedMesh>
    {[1.17, 1.30, 1.56].map((r, i) => <mesh key={r} position={[0, 0.029 + i * 0.001, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.014, 4, 64]} /><meshStandardMaterial color={i === 1 ? '#f472b6' : '#fcd34d'} roughness={0.9} />
    </mesh>)}
    {[-2.1, 2.1].map(x => <group key={x} position={[x, 0.035, -2.3]}>
      <mesh><cylinderGeometry args={[0.20, 0.15, 0.045, 20]} /><meshStandardMaterial color="#b45309" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.07, 0]} scale={[0.65, 1.6, 0.65]}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color="#ffe6a0" /></mesh>
    </group>)}
  </group>;
}
