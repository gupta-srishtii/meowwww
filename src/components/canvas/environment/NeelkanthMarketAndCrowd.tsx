'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface NeelkanthMarketAndCrowdProps {
  paused: boolean;
  castShadow?: boolean;
}

interface PilgrimVisualProps {
  shirtColor: string;
  pantsColor: string;
  hasStoleOrDupatta?: string;
  holdingThali?: boolean;
  rotationY?: number;
  position?: [number, number, number];
  castShadow?: boolean;
}

function DevoteeNpc({
  shirtColor,
  pantsColor,
  hasStoleOrDupatta,
  holdingThali = false,
  rotationY = 0,
  position = [0, 0, 0],
  castShadow = false,
}: PilgrimVisualProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 12]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh position={[-0.08, 0.37, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.052, 0.044, 0.72, 8]} />
        <meshStandardMaterial color={pantsColor} roughness={0.86} />
      </mesh>
      <mesh position={[0.08, 0.37, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.052, 0.044, 0.72, 8]} />
        <meshStandardMaterial color={pantsColor} roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.0, 0]} scale={[1.1, 1, 0.78]} castShadow={castShadow}>
        <cylinderGeometry args={[0.14, 0.12, 0.5, 10]} />
        <meshStandardMaterial color={shirtColor} roughness={0.82} />
      </mesh>
      {hasStoleOrDupatta && (
        <mesh position={[-0.1, 1.04, -0.02]} rotation={[0.05, 0, 0.12]}>
          <boxGeometry args={[0.06, 0.45, 0.16]} />
          <meshStandardMaterial color={hasStoleOrDupatta} roughness={0.85} />
        </mesh>
      )}
      <mesh position={[-0.17, 1.02, -0.06]} rotation={[holdingThali ? 0.85 : 0.08, 0, -0.06]}>
        <cylinderGeometry args={[0.036, 0.03, 0.36, 8]} />
        <meshStandardMaterial color={shirtColor} roughness={0.82} />
      </mesh>
      <mesh position={[0.17, 1.02, -0.06]} rotation={[holdingThali ? 0.85 : 0.08, 0, 0.06]}>
        <cylinderGeometry args={[0.036, 0.03, 0.36, 8]} />
        <meshStandardMaterial color={shirtColor} roughness={0.82} />
      </mesh>
      {holdingThali && (
        <mesh position={[0, 0.96, -0.26]}>
          <cylinderGeometry args={[0.14, 0.12, 0.025, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.65} roughness={0.3} />
        </mesh>
      )}
      <mesh position={[0, 1.38, 0]} castShadow={castShadow}>
        <sphereGeometry args={[0.115, 12, 10]} />
        <meshStandardMaterial color="#dda47e" roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.42, 0.015]}>
        <sphereGeometry args={[0.118, 10, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
    </group>
  );
}

const QUEUE_SPOTS: Array<{
  pos: [number, number, number];
  yaw: number;
  shirt: string;
  pants: string;
  stole?: string;
  thali?: boolean;
}> = [
  { pos: [3.2, 0, -2.35], yaw: 0.35, shirt: '#f97316', pants: '#334155', thali: true },
  { pos: [3.3, 0, -1.05], yaw: 0.25, shirt: '#fef3c7', pants: '#475569', stole: '#dc2626' },
  { pos: [3.35, 0, 0.25], yaw: 0.12, shirt: '#0ea5e9', pants: '#1e293b', thali: true },
  { pos: [3.4, 0, 1.55], yaw: 0.06, shirt: '#d97706', pants: '#27272a', stole: '#fbbf24' },
];

export function NeelkanthMarketAndCrowd({
  paused,
  castShadow = false,
}: NeelkanthMarketAndCrowdProps) {
  const reducedMotion = useReducedMotion();
  const vendorHandRefs = useRef<(THREE.Mesh | null)[]>([]);
  const queueRefs = useRef<(THREE.Group | null)[]>([]);
  const walkerRefs = useRef<(THREE.Group | null)[]>([]);
  const animPhaseRef = useRef(0);

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    animPhaseRef.current += Math.min(rawDelta, 0.05);
    const t = animPhaseRef.current;

    // Gentle animated hand motion for flower/prasad stall vendors
    vendorHandRefs.current.forEach((hand, idx) => {
      if (!hand) return;
      hand.position.y = 1.04 + Math.sin(t * 2.4 + idx * 1.4) * 0.035;
    });

    // Subtle idle devotional sway in darshan queue
    queueRefs.current.forEach((devotee, idx) => {
      if (!devotee) return;
      devotee.position.y = Math.sin(t * 1.5 + idx * 1.1) * 0.008;
      devotee.rotation.y = QUEUE_SPOTS[idx].yaw + Math.sin(t * 0.7 + idx) * 0.06;
    });

    // Respectful non-blocking walking pilgrims along outer market & perimeter path
    if (walkerRefs.current[0]) {
      // Pilgrim strolling softly in outer bazaar entry corridor (left side `x = -2.35`, `z = 6.0..10.4`)
      const cycle = (t * 0.14) % 2;
      const forward = cycle <= 1;
      const u = forward ? cycle : 2 - cycle;
      walkerRefs.current[0].position.set(-2.35, 0, THREE.MathUtils.lerp(10.5, 6.0, u));
      walkerRefs.current[0].rotation.y = forward ? 0 : Math.PI;
    }
    if (walkerRefs.current[1]) {
      // Pilgrim strolling outer right courtyard perimeter near stone cloister (`x = +5.1`, `z = -2.8..+2.8`)
      const cycle = (t * 0.11 + 0.7) % 2;
      const forward = cycle <= 1;
      const u = forward ? cycle : 2 - cycle;
      walkerRefs.current[1].position.set(5.1, 0, THREE.MathUtils.lerp(2.7, -2.5, u));
      walkerRefs.current[1].rotation.y = forward ? 0 : Math.PI;
    }
  });

  return (
    <group>
      {/* 1. LEFT TEMPLE BAZAAR: Marigold Flower Garland & Bel Patra Stall (`x = -4.85, z = 7.6`) */}
      <group position={[-4.85, 0, 7.6]}>
        {/* Timber canopy posts & sloped cloth awning facing central aisle (`+X`) */}
        {[
          [-0.9, -1.2],
          [0.9, -1.2],
          [-0.9, 1.2],
          [0.9, 1.2],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.25, pz]} castShadow={castShadow}>
            <cylinderGeometry args={[0.055, 0.065, 2.5, 8]} />
            <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 2.52, 0]} rotation={[0, 0, 0.12]} castShadow={castShadow}>
          <boxGeometry args={[2.3, 0.08, 2.9]} />
          <meshStandardMaterial color="#dc2626" roughness={0.82} />
        </mesh>
        {/* Warm yellow shop bulb */}
        <pointLight position={[0.6, 2.2, 0]} intensity={1.1} color="#fbbf24" distance={5.5} />

        {/* Hanging strands of vibrant orange & yellow genda phool malas along eave */}
        {[-0.95, -0.55, -0.15, 0.25, 0.65, 1.0].map((fz, idx) => (
          <mesh key={idx} position={[0.92, 2.02, fz]}>
            <cylinderGeometry args={[0.045, 0.045, 0.75, 8]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#f97316' : '#facc15'} roughness={0.85} />
          </mesh>
        ))}

        {/* Stall table + flower baskets & green Bel Patra bowl */}
        <mesh position={[0.42, 0.44, 0]} castShadow={castShadow} receiveShadow={castShadow}>
          <boxGeometry args={[0.85, 0.88, 2.45]} />
          <meshStandardMaterial color="#78513c" roughness={0.88} />
        </mesh>
        {/* Flower & Bel leaf baskets on display */}
        {[
          { z: -0.75, color: '#f97316' },
          { z: -0.25, color: '#facc15' },
          { z: 0.25, color: '#16a34a' }, // green bel patra bowl
          { z: 0.75, color: '#e11d48' }, // red hibiscus/rose offerings
        ].map((basket, idx) => (
          <group key={idx} position={[0.52, 0.94, basket.z]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.15, 0.14, 10]} />
              <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <sphereGeometry args={[0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color={basket.color} roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Flower Vendor standing neatly behind stall tending garland baskets */}
        <DevoteeNpc
          position={[-0.32, 0, 0]}
          rotationY={-Math.PI / 2}
          shirtColor="#fef08a"
          pantsColor="#7c2d12"
          hasStoleOrDupatta="#f97316"
          castShadow={castShadow}
        />
        <mesh
          ref={(el) => {
            vendorHandRefs.current[0] = el;
          }}
          position={[0.12, 1.04, 0.06]}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#dda47e" roughness={0.78} />
        </mesh>
      </group>

      {/* 2. RIGHT TEMPLE BAZAAR: Puja Thali, Coconut & Prasad Stall (`x = +4.85, z = 7.6`) */}
      <group position={[4.85, 0, 7.6]}>
        {[
          [-0.9, -1.2],
          [0.9, -1.2],
          [-0.9, 1.2],
          [0.9, 1.2],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.25, pz]} castShadow={castShadow}>
            <cylinderGeometry args={[0.055, 0.065, 2.5, 8]} />
            <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 2.52, 0]} rotation={[0, 0, -0.12]} castShadow={castShadow}>
          <boxGeometry args={[2.3, 0.08, 2.9]} />
          <meshStandardMaterial color="#d97706" roughness={0.82} />
        </mesh>
        <pointLight position={[-0.6, 2.2, 0]} intensity={1.1} color="#fbbf24" distance={5.5} />

        {/* Shop counter */}
        <mesh position={[-0.42, 0.44, 0]} castShadow={castShadow} receiveShadow={castShadow}>
          <boxGeometry args={[0.85, 0.88, 2.45]} />
          <meshStandardMaterial color="#78513c" roughness={0.88} />
        </mesh>
        {/* Brass puja thalis, coconuts & vermilion/prasad offerings */}
        {[-0.75, -0.2, 0.35].map((tz, idx) => (
          <group key={idx} position={[-0.45, 0.91, tz]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.17, 0.03, 12]} />
              <meshStandardMaterial color="#eab308" metalness={0.68} roughness={0.3} />
            </mesh>
            <mesh position={[0.04, 0.07, 0]}>
              <sphereGeometry args={[0.075, 8, 8]} />
              <meshStandardMaterial color="#5c3d2e" roughness={0.92} />
            </mesh>
            <mesh position={[-0.08, 0.05, 0.05]}>
              <boxGeometry args={[0.08, 0.06, 0.08]} />
              <meshStandardMaterial color="#ef4444" roughness={0.85} />
            </mesh>
          </group>
        ))}
        {/* Stacked brass lota / water vessels */}
        <mesh position={[-0.42, 0.98, 0.85]}>
          <cylinderGeometry args={[0.08, 0.12, 0.18, 12]} />
          <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.28} />
        </mesh>

        {/* Prasad Stall Vendor behind counter */}
        <DevoteeNpc
          position={[0.32, 0, 0]}
          rotationY={Math.PI / 2}
          shirtColor="#e0f2fe"
          pantsColor="#334155"
          castShadow={castShadow}
        />
        <mesh
          ref={(el) => {
            vendorHandRefs.current[1] = el;
          }}
          position={[-0.12, 1.04, -0.05]}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#dda47e" roughness={0.78} />
        </mesh>
      </group>

      {/* 3. OUTER LEFT LOCAL KIOSK (Rudraksha, Brass Bells & Offerings, `x = -4.85, z = 10.6`) */}
      <group position={[-4.85, 0, 10.6]}>
        {/* Ground stone plinth anchoring the kiosk posts */}
        <mesh position={[0, 0.04, 0]} receiveShadow={castShadow}>
          <boxGeometry args={[1.95, 0.08, 2.1]} />
          <meshStandardMaterial color="#78716c" roughness={0.92} />
        </mesh>
        {/* Four grounded corner support posts matching roof pitch */}
        {[-0.86, 0.86].map((px) =>
          [-0.92, 0.92].map((pz) => {
            const postHeight = px < 0 ? 2.3 : 2.46;
            return (
              <mesh
                key={`kiosk-post-${px}-${pz}`}
                position={[px, postHeight / 2, pz]}
                castShadow={castShadow}
              >
                <cylinderGeometry args={[0.042, 0.048, postHeight, 6]} />
                <meshStandardMaterial color="#573922" roughness={0.9} />
              </mesh>
            );
          })
        )}
        {/* Roof support rafters */}
        {[-0.86, 0.86].map((px) => (
          <mesh
            key={`kiosk-rafter-${px}`}
            position={[px, px < 0 ? 2.26 : 2.42, 0]}
            castShadow={castShadow}
          >
            <boxGeometry args={[0.07, 0.07, 2.0]} />
            <meshStandardMaterial color="#452715" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 2.38, 0]} rotation={[0, 0, 0.1]} castShadow={castShadow}>
          <boxGeometry args={[1.95, 0.08, 2.1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.82} />
        </mesh>
        <mesh position={[0.38, 0.44, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.75, 0.88, 1.85]} />
          <meshStandardMaterial color="#6d4c3d" roughness={0.88} />
        </mesh>
        <mesh position={[0.42, 0.96, -0.4]}>
          <cylinderGeometry args={[0.14, 0.16, 0.18, 10]} />
          <meshStandardMaterial color="#b45309" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0.42, 0.94, 0.35]}>
          <boxGeometry args={[0.32, 0.1, 0.42]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.8} />
        </mesh>
        <DevoteeNpc
          position={[-0.28, 0, 0]}
          rotationY={-Math.PI / 2}
          shirtColor="#fed7aa"
          pantsColor="#1e293b"
          castShadow={castShadow}
        />
      </group>

      {/* 4. RESPECTFUL DARSHAN QUEUE IN COURTYARD (`right colonnade side, never blocking walkway`) */}
      {QUEUE_SPOTS.map((q, idx) => (
        <group
          key={idx}
          ref={(el) => {
            queueRefs.current[idx] = el;
          }}
          position={q.pos}
          rotation={[0, q.yaw, 0]}
        >
          <DevoteeNpc
            shirtColor={q.shirt}
            pantsColor={q.pants}
            hasStoleOrDupatta={q.stole}
            holdingThali={q.thali}
            castShadow={castShadow}
          />
        </group>
      ))}

      {/* 5. WALKING DEVOTEES (moving calmly along perimeter walkways) */}
      <group
        ref={(el) => {
          walkerRefs.current[0] = el;
        }}
        position={[-2.35, 0, 9.0]}
      >
        <DevoteeNpc
          shirtColor="#fef2f2"
          pantsColor="#334155"
          hasStoleOrDupatta="#f97316"
          holdingThali
          castShadow={castShadow}
        />
      </group>
      <group
        ref={(el) => {
          walkerRefs.current[1] = el;
        }}
        position={[5.1, 0, 1.0]}
      >
        <DevoteeNpc
          shirtColor="#38bdf8"
          pantsColor="#1e293b"
          castShadow={castShadow}
        />
      </group>

      {/* 6. CONNECTED TEMPLE EXIT MARKET LANE: CONTINUOUS SHOPS ON BOTH SIDES + PILGRIMS + CHHOLE BHATURE CAFE */}
      {/* Right side: Brass Bells, Rudraksha & Damru Stall closing the upper gap (`z = 11.8`) */}
      <group position={[5.15, 0, 11.8]}>
        <mesh position={[0.45, 1.45, 0]} castShadow={castShadow} receiveShadow={castShadow}>
          <boxGeometry args={[1.9, 2.9, 4.2]} />
          <meshStandardMaterial color="#e6dac4" roughness={0.88} />
        </mesh>
        <mesh position={[-0.75, 0.44, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.72, 0.88, 3.6]} />
          <meshStandardMaterial color="#78513c" roughness={0.86} />
        </mesh>
        {[-1.2, -0.4, 0.4, 1.2].map((bz, bIdx) => (
          <mesh key={`bell-${bIdx}`} position={[-0.95, 1.85, bz]}>
            <cylinderGeometry args={[0.04, 0.085, 0.16, 10]} />
            <meshStandardMaterial color="#eab308" metalness={0.75} roughness={0.28} />
          </mesh>
        ))}
        <mesh position={[-1.05, 2.35, 0]} rotation={[0, 0, 0.16]} castShadow={castShadow}>
          <boxGeometry args={[1.65, 0.08, 4.4]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.8} />
        </mesh>
        <DevoteeNpc
          position={[-0.18, 0, 0.35]}
          rotationY={Math.PI / 2}
          shirtColor="#fb923c"
          pantsColor="#334155"
          castShadow={castShadow}
        />
      </group>

      {/* Left side continuous woollens, wooden crafts & prasad bazaar shops (`z = 13.6..24.4`) */}
      {[
        { z: 13.8, len: 3.8, wall: '#e4d8c3', awning: '#b45309', sh1: '#be123c', sh2: '#ca8a04' },
        { z: 18.0, len: 4.4, wall: '#dfd4c0', awning: '#0f766e', sh1: '#0284c7', sh2: '#d97706' },
        { z: 22.6, len: 4.4, wall: '#dadce2', awning: '#7c2d12', sh1: '#15803d', sh2: '#ea580c' },
      ].map((shop, sIdx) => (
        <group key={`left-mkt-shop-${sIdx}`} position={[-5.4, 0, shop.z]}>
          <mesh position={[0, 1.55, 0]} castShadow={castShadow} receiveShadow={castShadow}>
            <boxGeometry args={[2.3, 3.1, shop.len]} />
            <meshStandardMaterial color={shop.wall} roughness={0.88} />
          </mesh>
          <mesh position={[1.18, 1.15, -shop.len * 0.22]}>
            <boxGeometry args={[0.08, 1.9, shop.len * 0.36]} />
            <meshStandardMaterial color={shop.sh1} roughness={0.7} />
          </mesh>
          <mesh position={[1.18, 1.15, shop.len * 0.22]}>
            <boxGeometry args={[0.08, 1.9, shop.len * 0.36]} />
            <meshStandardMaterial color={shop.sh2} roughness={0.72} />
          </mesh>
          <mesh position={[1.45, 2.35, 0]} rotation={[0, 0, -0.18]} castShadow={castShadow}>
            <boxGeometry args={[1.12, 0.08, shop.len + 0.2]} />
            <meshStandardMaterial color={shop.awning} roughness={0.82} />
          </mesh>
          {/* Open front shop counter & spice/prasad jars */}
          <mesh position={[1.42, 0.42, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.62, 0.84, shop.len * 0.82]} />
            <meshStandardMaterial color="#78513c" roughness={0.88} />
          </mesh>
          <DevoteeNpc
            position={[0.88, 0, 0]}
            rotationY={-Math.PI / 2}
            shirtColor={sIdx % 2 === 0 ? '#fde68a' : '#bae6fd'}
            pantsColor="#1e293b"
            castShadow={castShadow}
          />
        </group>
      ))}

      {/* Right side sweets & rudraksha counter right before Cafe (`z = 16.0`) */}
      <group position={[5.4, 0, 16.0]}>
        <mesh position={[0.3, 1.5, 0]} castShadow={castShadow}>
          <boxGeometry args={[2.0, 3.0, 4.0]} />
          <meshStandardMaterial color="#e0d6c2" roughness={0.88} />
        </mesh>
        <mesh position={[-0.85, 2.32, 0]} rotation={[0, 0, 0.16]}>
          <boxGeometry args={[1.35, 0.08, 4.1]} />
          <meshStandardMaterial color="#0f766e" roughness={0.82} />
        </mesh>
        <mesh position={[-0.85, 0.44, 0]}>
          <boxGeometry args={[0.7, 0.88, 3.2]} />
          <meshStandardMaterial color="#78513c" roughness={0.86} />
        </mesh>
      </group>

      {/* Festive Overhead Saffron & Crimson Temple Market Flags / Bulbs Above Cobblestone Street */}
      {[7.5, 11.5, 15.5, 19.5, 23.5].map((fz, fIdx) => (
        <group key={`nk-flags-${fIdx}`} position={[0, 2.95, fz]}>
          <mesh>
            <boxGeometry args={[8.4, 0.025, 0.025]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>
          {[-2.8, -1.6, -0.5, 0.5, 1.6, 2.8].map((bx, bIdx) => (
            <mesh key={`nk-fl-${bIdx}`} position={[bx, -0.14, 0]}>
              <coneGeometry args={[0.14, 0.24, 3]} />
              <meshStandardMaterial
                color={bIdx % 3 === 0 ? '#f97316' : bIdx % 3 === 1 ? '#dc2626' : '#facc15'}
                roughness={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Extra Browsing Pilgrims Along Bazaar Stalls */}
      {[
        { x: -2.4, z: 14.5, yaw: 1.4, shirt: '#fef08a', pants: '#334155' },
        { x: 2.3, z: 12.6, yaw: -1.5, shirt: '#38bdf8', pants: '#1e293b' },
        { x: -2.2, z: 22.8, yaw: 1.2, shirt: '#f472b6', pants: '#1e293b' },
      ].map((p, idx) => (
        <DevoteeNpc
          key={`mkt-browser-${idx}`}
          position={[p.x, 0, p.z]}
          rotationY={p.yaw}
          shirtColor={p.shirt}
          pantsColor={p.pants}
          castShadow={castShadow}
        />
      ))}

      {/* Dhaba-Style Open-Front Market Cafe Kitchen & Dining Deck (`x = 5.45 / 2.85, z = 20.6`) */}
      <group position={[5.45, 0, 20.6]}>
        {/* Back kitchen wall & counter */}
        <mesh position={[0.45, 1.55, 0]} castShadow={castShadow} receiveShadow={castShadow}>
          <boxGeometry args={[1.9, 3.1, 4.2]} />
          <meshStandardMaterial color="#e7d9c3" roughness={0.88} />
        </mesh>
        <mesh position={[-1.4, 2.65, 0]} rotation={[0, 0, 0.14]} castShadow={castShadow}>
          <boxGeometry args={[2.55, 0.1, 4.45]} />
          <meshStandardMaterial color="#9a3412" roughness={0.82} />
        </mesh>
        <mesh position={[-1.4, 1.32, -1.95]}>
          <cylinderGeometry args={[0.055, 0.065, 2.6, 8]} />
          <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
        </mesh>
        <mesh position={[-1.4, 1.32, 1.95]}>
          <cylinderGeometry args={[0.055, 0.065, 2.6, 8]} />
          <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
        </mesh>
        {/* Serving counter + kadhai for piping-hot bhature */}
        <mesh position={[-0.75, 0.48, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.78, 0.96, 3.2]} />
          <meshStandardMaterial color="#78513c" roughness={0.86} />
        </mesh>
        <mesh position={[-0.72, 1.02, -0.55]}>
          <cylinderGeometry args={[0.26, 0.16, 0.14, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[-0.72, 1.04, 0.55]}>
          <cylinderGeometry args={[0.2, 0.18, 0.24, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.65} />
        </mesh>
        <pointLight position={[-1.55, 2.35, 0]} intensity={1.8} color="#fbbf24" distance={7} />
        <DevoteeNpc
          position={[0.0, 0, -0.1]}
          rotationY={Math.PI / 2}
          shirtColor="#fef08a"
          pantsColor="#334155"
          castShadow={castShadow}
        />
      </group>

      {/* Right Exit Sweets & Chai Shop past Cafe (`x = 5.45, z = 24.4`) */}
      <group position={[5.45, 0, 24.4]}>
        <mesh position={[0.3, 1.48, 0]} castShadow={castShadow}>
          <boxGeometry args={[1.95, 2.95, 3.2]} />
          <meshStandardMaterial color="#e5dac8" roughness={0.88} />
        </mesh>
        <mesh position={[-0.85, 2.28, 0]} rotation={[0, 0, 0.16]}>
          <boxGeometry args={[1.25, 0.08, 3.3]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
      </group>

      {/* Cafe Outdoor Dining Table (`x = 2.85, z = 20.6`, top y = 0.76m) & 4 Grounded Chairs + Chole Bhature Thalis */}
      <group position={[2.85, 0, 20.6]}>
        <mesh position={[0, 0.73, 0]} castShadow={castShadow} receiveShadow={castShadow}>
          <boxGeometry args={[1.18, 0.06, 0.98]} />
          <meshStandardMaterial color="#7c4a26" roughness={0.84} />
        </mesh>
        <mesh position={[0, 0.764, 0]}>
          <boxGeometry args={[0.96, 0.012, 0.8]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.88} />
        </mesh>
        {[
          [-0.48, -0.38],
          [0.48, -0.38],
          [-0.48, 0.38],
          [0.48, 0.38],
        ].map(([lx, lz], idx) => (
          <mesh key={`cafe-tbl-leg-${idx}`} position={[lx, 0.36, lz]} castShadow={castShadow}>
            <boxGeometry args={[0.065, 0.72, 0.065]} />
            <meshStandardMaterial color="#4e301d" roughness={0.9} />
          </mesh>
        ))}

        {/* 4 Shining Steel Chole Bhature Thalis */}
        {[
          [0, 0.28],
          [0, -0.28],
          [-0.35, 0],
          [0.35, 0],
        ].map(([px, pz], idx) => (
          <group key={`cafe-thali-${idx}`} position={[px, 0.77, pz]}>
            <mesh castShadow={castShadow}>
              <cylinderGeometry args={[0.155, 0.14, 0.022, 14]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.82} roughness={0.22} />
            </mesh>
            <mesh position={[-0.045, 0.03, -0.04]}>
              <cylinderGeometry args={[0.045, 0.036, 0.034, 10]} />
              <meshStandardMaterial color="#9a3412" roughness={0.74} />
            </mesh>
            <mesh position={[0.04, 0.028, -0.05]}>
              <cylinderGeometry args={[0.036, 0.03, 0.028, 10]} />
              <meshStandardMaterial color="#15803d" roughness={0.78} />
            </mesh>
            <mesh position={[0.02, 0.034, 0.045]} scale={[1.22, 0.45, 0.92]}>
              <sphereGeometry args={[0.06, 10, 8]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.68} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4 Grounded Wooden Chairs/Stools Around Cafe Table (`seatTopY = 0.43m`) */}
      {[
        { x: 2.85, z: 21.42, rotY: 0 },
        { x: 2.85, z: 19.78, rotY: Math.PI },
        { x: 1.88, z: 20.6, rotY: Math.PI / 2 },
        { x: 3.82, z: 20.6, rotY: -Math.PI / 2 },
      ].map((chair, idx) => (
        <group key={`cafe-chair-${idx}`} position={[chair.x, 0, chair.z]} rotation={[0, chair.rotY, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow={castShadow} receiveShadow={castShadow}>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
            <meshStandardMaterial color="#784a2a" roughness={0.86} />
          </mesh>
          {/* Low backrest safely outward from table */}
          <mesh position={[0, 0.65, 0.18]} castShadow={castShadow}>
            <boxGeometry args={[0.4, 0.44, 0.05]} />
            <meshStandardMaterial color="#6d4327" roughness={0.88} />
          </mesh>
          {[
            [-0.16, -0.16],
            [0.16, -0.16],
            [-0.16, 0.16],
            [0.16, 0.16],
          ].map(([lx, lz], lIdx) => (
            <mesh key={`ch-leg-${lIdx}`} position={[lx, 0.2, lz]} castShadow={castShadow}>
              <boxGeometry args={[0.05, 0.4, 0.05]} />
              <meshStandardMaterial color="#4e2e19" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

