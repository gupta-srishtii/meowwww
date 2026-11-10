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

        {/* Outer Steel Thali Meal Corner (chhole bhature & hot plate matching real Neelkanth meal photo) */}
        <group position={[-1.08, 0, 1.0]}>
          {/* Table top & warm red runner cloth */}
          <mesh position={[0, 0.7, 0]} castShadow={castShadow} receiveShadow={castShadow}>
            <boxGeometry args={[0.56, 0.05, 0.74]} />
            <meshStandardMaterial color="#6d4c3d" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.728, 0]}>
            <boxGeometry args={[0.42, 0.012, 0.62]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.9} />
          </mesh>
          {[
            [-0.22, -0.3],
            [0.22, -0.3],
            [-0.22, 0.3],
            [0.22, 0.3],
          ].map(([lx, lz], lIdx) => (
            <mesh key={`thali-leg-${lIdx}`} position={[lx, 0.34, lz]} castShadow={castShadow}>
              <boxGeometry args={[0.05, 0.68, 0.05]} />
              <meshStandardMaterial color="#4e3222" roughness={0.9} />
            </mesh>
          ))}
          {/* Shining steel thali plate */}
          <mesh position={[0, 0.745, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.21, 0.19, 0.025, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.82} roughness={0.2} />
          </mesh>
          {/* Steel katori bowls (chhole curry & chutney) */}
          <mesh position={[-0.07, 0.778, -0.06]}>
            <cylinderGeometry args={[0.055, 0.042, 0.04, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.24} />
          </mesh>
          <mesh position={[-0.07, 0.793, -0.06]}>
            <cylinderGeometry args={[0.046, 0.046, 0.015, 12]} />
            <meshStandardMaterial color="#9a3412" roughness={0.75} />
          </mesh>
          <mesh position={[0.06, 0.775, -0.08]}>
            <cylinderGeometry args={[0.042, 0.032, 0.032, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.24} />
          </mesh>
          <mesh position={[0.06, 0.787, -0.08]}>
            <cylinderGeometry args={[0.034, 0.034, 0.012, 10]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          {/* Golden fluffy puffed bhature */}
          <mesh position={[0.03, 0.782, 0.06]} scale={[1.25, 0.45, 0.95]} castShadow={castShadow}>
            <sphereGeometry args={[0.078, 12, 10]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.68} />
          </mesh>
          <mesh position={[-0.06, 0.772, 0.08]} scale={[1.1, 0.4, 0.9]}>
            <sphereGeometry args={[0.066, 10, 8]} />
            <meshStandardMaterial color="#d97706" roughness={0.72} />
          </mesh>
        </group>

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

      {/* 6. SMALL VISITOR CHAT PAIR NEAR MARKET STEP EDGE (`x = +3.3, z = 10.6`) */}
      <group position={[3.35, 0, 10.6]}>
        <DevoteeNpc
          position={[0, 0, -0.35]}
          rotationY={Math.PI * 0.88}
          shirtColor="#fbbf24"
          pantsColor="#334155"
          castShadow={castShadow}
        />
        <DevoteeNpc
          position={[0.48, 0, 0.3]}
          rotationY={-0.38}
          shirtColor="#e2e8f0"
          pantsColor="#1f2937"
          castShadow={castShadow}
        />
      </group>
    </group>
  );
}

