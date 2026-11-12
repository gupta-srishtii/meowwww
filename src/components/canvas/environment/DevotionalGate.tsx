'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export function DevotionalGate({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#9a3412'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#fef3c7'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Georgia'; ctx.fillText('Jai Mata Di', 256, 65);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return <group position={position} rotation={[0, rotationY, 0]}>
    {[-2.1, 2.1].map(x => <mesh key={x} position={[x, 1.55, 0]}><boxGeometry args={[0.35, 3.1, 0.4]} /><meshStandardMaterial color="#c68d61" roughness={0.85} /></mesh>)}
    <mesh position={[0, 3.1, 0]}><boxGeometry args={[4.65, 0.65, 0.35]} /><meshStandardMaterial color="#9a3412" /></mesh>
    <mesh position={[0, 3.1, 0.19]}><planeGeometry args={[4.2, 0.6]} /><meshBasicMaterial map={texture} side={THREE.DoubleSide} /></mesh>
  </group>;
}
