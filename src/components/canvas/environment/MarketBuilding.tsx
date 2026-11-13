'use client';

import { MarketShopSign } from './MarketRoadLife';

/** One storefront kit shared by the evening bazaar and its morning continuation. */
export function MarketBuilding({ side, height, width, wall, awning, label, night = false }: {
  side: number; height: number; width: number; wall: string; awning: string; label: string; night?: boolean;
}) {
  return <>
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[2.55, height, width]} /><meshStandardMaterial color={wall} roughness={0.88} /></mesh>
    <mesh position={[-side * 1.32, 1.08, 0]}><boxGeometry args={[0.12, 1.55, width * 0.68]} /><meshStandardMaterial color={night ? '#fde68a' : '#416477'} emissive="#f59e0b" emissiveIntensity={night ? 0.62 : 0.02} /></mesh>
    <mesh position={[-side * 1.74, 2.08, 0]} rotation={[0, 0, side * 0.22]}><boxGeometry args={[0.92, 0.08, width * 0.85]} /><meshStandardMaterial color={awning} roughness={0.8} /></mesh>
    <MarketShopSign side={side} label={label} />
    {height > 3.8 && <>
      <mesh position={[-side * 1.32, 3.35, 0]}><boxGeometry args={[0.1, 0.72, width * 0.55]} /><meshStandardMaterial color="#678c9c" /></mesh>
      <mesh position={[-side * 1.56, 2.92, 0]}><boxGeometry args={[0.6, 0.1, width * 0.75]} /><meshStandardMaterial color="#bdb5a1" /></mesh>
      {[-0.65, 0, 0.65].map(z => <mesh key={z} position={[-side * 1.85, 3.2, z]}><boxGeometry args={[0.04, 0.55, 0.04]} /><meshStandardMaterial color="#3b4852" /></mesh>)}
      <mesh position={[-side * 1.85, 3.48, 0]}><boxGeometry args={[0.04, 0.05, width * 0.75]} /><meshStandardMaterial color="#3b4852" /></mesh>
    </>}
  </>;
}
