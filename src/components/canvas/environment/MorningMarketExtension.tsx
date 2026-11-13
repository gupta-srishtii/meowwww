'use client';

import { MarketBuilding } from './MarketBuilding';
import { MarketRoadLife } from './MarketRoadLife';
import { PrototypeScooter } from '../PrototypeScooter';
import { StylizedPlaceholderCharacter } from '../characters/StylizedPlaceholderCharacter';

const SHOPS = ['Ganga Cafe', 'Valley Stay', 'Handloom House', 'Chai & Books', 'Pahadi Dhaba', 'Rishikesh Bakery'];

export function MorningMarketExtension({ paused }: { paused: boolean }) {
  return <group position={[25, 0, 10.1]} rotation={[0, Math.PI / 2, 0]}>
    {[-1, 1].flatMap(side => (side > 0 ? [7, 12.2, 17.4, 22.6] : [-9, -3.8, 1.4, 6.6, 11.8, 17]).map((z, i) => <group key={`${side}-${i}`} position={[side * 6.1, 0, z]}>
      <MarketBuilding side={side} height={i % 2 ? 5.2 : 3.8} width={4.5} wall={['#e7dcc8', '#d4ddd8', '#dce1e6'][i % 3]} awning={['#047857', '#b45309', '#0e7490'][i % 3]} label={SHOPS[i % SHOPS.length]} />
    </group>))}
    {[[-3.5, -3], [3.5, 16], [-3.6, 8], [3.6, -7]].map(([x, z], i) => <group key={`resident-${i}`} position={[x, 0, z]}>
      <StylizedPlaceholderCharacter characterVariant="traveler" showNameTag={false} jacketColor={['#b45309', '#3f6c58', '#7c5970', '#527e9b'][i]} />
    </group>)}
    {[-6, 4, 15].map((z, i) => <group key={`parked-${z}`} position={[-3.7, 0, z]} rotation={[0, 0.2, 0]}><PrototypeScooter hideRiders variant={i % 2 ? 'lead' : 'companion'} /></group>)}
    <MarketRoadLife paused={paused} sampleY={() => 0} />
  </group>;
}
