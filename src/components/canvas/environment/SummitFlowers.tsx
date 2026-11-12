'use client';

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

/** A low-cost flower border outside the temple's playable courtyard. */
export function SummitFlowers({ count = 64 }: { count?: number }) {
  const blooms = useRef<THREE.InstancedMesh>(null), stems = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Object3D(), color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = (i % 2 ? -1 : 1) * (6.6 + Math.sin(i * 2.3) * 0.12);
      const z = -4.6 + (i / count) * 9.5;
      const height = 0.2 + (i % 4) * 0.035;
      matrix.position.set(x, height / 2, z); matrix.scale.set(1, height, 1); matrix.updateMatrix();
      stems.current?.setMatrixAt(i, matrix.matrix);
      matrix.position.y = height; matrix.scale.setScalar(0.85 + (i % 3) * 0.12); matrix.updateMatrix();
      blooms.current?.setMatrixAt(i, matrix.matrix);
      blooms.current?.setColorAt(i, color.set(i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#f97316' : '#db2777'));
    }
    for (const mesh of [blooms.current, stems.current]) {
      if (!mesh) continue; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [count]);
  return <>
    <instancedMesh ref={stems} args={[undefined, undefined, count]}><cylinderGeometry args={[0.012, 0.015, 1, 4]} /><meshStandardMaterial color="#3d743b" roughness={1} /></instancedMesh>
    <instancedMesh ref={blooms} args={[undefined, undefined, count]}><icosahedronGeometry args={[0.075, 0]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
  </>;
}
