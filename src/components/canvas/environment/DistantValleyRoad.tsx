'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export function DistantValleyRoad({ heightAt }: { heightAt: (x: number, z: number) => number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([[-90, -71], [-60, -83], [-28, -70], [5, -88], [40, -76], [78, -94]]
      .map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.35, z)));
    const positions: number[] = [], indices: number[] = [];
    const point = new THREE.Vector3(), tangent = new THREE.Vector3(), right = new THREE.Vector3();
    for (let i = 0; i <= 100; i++) {
      curve.getPointAt(i / 100, point); curve.getTangentAt(i / 100, tangent);
      right.set(-tangent.z, 0, tangent.x).normalize();
      for (const side of [-1, 1]) positions.push(point.x + right.x * side * 1.05, point.y, point.z + right.z * side * 1.05);
      if (i < 100) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [heightAt]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#9e9780" roughness={0.95} side={THREE.DoubleSide} /></mesh>;
}
