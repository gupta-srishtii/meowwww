'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PrototypeScooter } from '../PrototypeScooter';

export function MarketShopSign({ side, label }: { side: number; label: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#442917'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#ffe8a3'; ctx.font = 'bold 44px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(label, 256, 63);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, [label]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return <mesh position={[-side * 1.44, 2.48, 0]} rotation={[0, -side * Math.PI / 2, 0]}>
    <planeGeometry args={[2.1, 0.4]} /><meshBasicMaterial map={texture} color="#fff4cf" side={THREE.DoubleSide} />
  </mesh>;
}

/** Traffic stays in road lanes; the story group uses a separate raised footpath. */
export function MarketRoadLife({ paused, sampleY }: { paused: boolean; sampleY: (z: number) => number }) {
  const vehicles = useRef<(THREE.Group | null)[]>([]);
  const elapsed = useRef(0);
  useFrame((_, rawDelta) => {
    if (paused || document.hidden) return;
    elapsed.current += Math.min(rawDelta, 0.05);
    vehicles.current.forEach((group, i) => {
      if (!group) return;
      const dir = i % 2 ? 1 : -1;
      const z = (((elapsed.current * (1.4 + i * 0.15) + i * 13) % 60) - 30) * dir;
      group.position.set(dir * 1.45, sampleY(z) + 0.09, z);
      group.rotation.y = dir > 0 ? Math.PI : 0;
    });
  });
  return <>{[0, 1, 2].map(i => <group key={i} ref={g => { vehicles.current[i] = g; }}>
    {i === 1 ? <PrototypeScooter variant="companion" outfitMode="day1" /> : <>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[1.15, 0.55, 2.1]} /><meshStandardMaterial color={i ? '#d9d2bc' : '#44687c'} roughness={0.42} /></mesh>
      <mesh position={[0, 0.86, -0.12]}><boxGeometry args={[1.0, 0.46, 1.05]} /><meshStandardMaterial color="#283c50" metalness={0.2} roughness={0.3} /></mesh>
      {[-0.52, 0.52].flatMap(x => [-0.64, 0.64].map(z => <mesh key={`${x}-${z}`} position={[x, 0.22, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.16, 10]} /><meshStandardMaterial color="#141820" /></mesh>))}
      {[-0.4, 0.4].map(x => <mesh key={x} position={[x, 0.48, -1.065]}><planeGeometry args={[0.18, 0.12]} /><meshBasicMaterial color="#ffe8b1" /></mesh>)}
    </>}
  </group>)}</>;
}
