'use client';

import type { RefObject } from 'react';
import type * as THREE from 'three';

export type ScooterVariant = 'lead' | 'companion';

export interface PrototypeScooterProps {
  variant: ScooterVariant;
  groupRef?: RefObject<THREE.Group | null>;
  forkRef?: RefObject<THREE.Group | null>;
  frontWheelRef?: RefObject<THREE.Group | null>;
  rearWheelRef?: RefObject<THREE.Group | null>;
  castShadow?: boolean;
}

interface RiderBlockProps {
  jacketColor: string;
  helmetColor: string;
  hasBackpack?: boolean;
  isFrontPose?: boolean;
  castShadow?: boolean;
}

/**
 * Stylized low-poly placeholder rider seated inside a scooter socket.
 * Forward faces local -Z so seat sockets align with the scooter frame.
 */
function PlaceholderRider({
  jacketColor,
  helmetColor,
  hasBackpack = false,
  isFrontPose = false,
  castShadow = false,
}: RiderBlockProps) {
  return (
    <group>
      {/* Pelvis / seated lower torso */}
      <mesh position={[0, 0.07, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.28, 0.14, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* Left & right thighs angled forward */}
      <mesh position={[-0.12, 0.02, -0.14]} rotation={[0.35, 0, 0.08]} castShadow={castShadow}>
        <boxGeometry args={[0.1, 0.1, 0.28]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 0.02, -0.14]} rotation={[0.35, 0, -0.08]} castShadow={castShadow}>
        <boxGeometry args={[0.1, 0.1, 0.28]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* Lower legs resting near deck */}
      <mesh position={[-0.14, -0.2, -0.24]} rotation={[-0.15, 0, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.09, 0.34, 0.09]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      <mesh position={[0.14, -0.2, -0.24]} rotation={[-0.15, 0, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.09, 0.34, 0.09]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.31, -0.02]} rotation={[isFrontPose ? -0.14 : -0.08, 0, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.3, 0.4, 0.2]} />
        <meshStandardMaterial color={jacketColor} roughness={0.72} />
      </mesh>

      {/* Arms reaching forward */}
      <mesh
        position={[-0.18, 0.34, isFrontPose ? -0.22 : -0.12]}
        rotation={[isFrontPose ? 1.15 : 0.72, 0.12, 0]}
        castShadow={castShadow}
      >
        <boxGeometry args={[0.08, 0.34, 0.08]} />
        <meshStandardMaterial color={jacketColor} roughness={0.75} />
      </mesh>
      <mesh
        position={[0.18, 0.34, isFrontPose ? -0.22 : -0.12]}
        rotation={[isFrontPose ? 1.15 : 0.72, -0.12, 0]}
        castShadow={castShadow}
      >
        <boxGeometry args={[0.08, 0.34, 0.08]} />
        <meshStandardMaterial color={jacketColor} roughness={0.75} />
      </mesh>

      {/* Head & protective helmet */}
      <group position={[0, 0.62, -0.05]}>
        <mesh castShadow={castShadow}>
          <sphereGeometry args={[0.135, 14, 12]} />
          <meshStandardMaterial color={helmetColor} roughness={0.35} metalness={0.15} />
        </mesh>
        {/* Dark visor */}
        <mesh position={[0, -0.01, -0.09]}>
          <boxGeometry args={[0.19, 0.07, 0.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.5} />
        </mesh>
      </group>

      {hasBackpack && (
        <mesh position={[0, 0.32, 0.14]} rotation={[-0.08, 0, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.24, 0.3, 0.14]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Reusable stylized low-poly scooter prototype.
 * Local orientation: forward points along -Z, up along +Y, right along +X.
 * Socket groups (`attach_seat_driver`, `attach_seat_pillion`) use `dispose={null}`
 * so future rigged GLB characters can swap in without modifying transform anchors.
 */
export function PrototypeScooter({
  variant,
  groupRef,
  forkRef,
  frontWheelRef,
  rearWheelRef,
  castShadow = false,
}: PrototypeScooterProps) {
  const isLead = variant === 'lead';
  const bodyColor = isLead ? '#d9623b' : '#1f8a82';
  const accentColor = isLead ? '#fde68a' : '#a7f3d0';
  const bodyDarkTrim = '#1e293b';

  return (
    <group ref={groupRef}>
      {/* Ground contact oval decal so scooters feel anchored even when shadows are disabled on mobile */}
      <mesh position={[0, 0.018, 0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.58, 1.45, 1]}>
        <circleGeometry args={[0.72, 20]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* Main scooter chassis */}
      <group>
        {/* Floorboard / foot deck */}
        <mesh position={[0, 0.25, -0.14]} castShadow={castShadow}>
          <boxGeometry args={[0.42, 0.08, 0.72]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>

        {/* Lower underbelly keel */}
        <mesh position={[0, 0.19, 0.04]} castShadow={castShadow}>
          <boxGeometry args={[0.3, 0.08, 1.05]} />
          <meshStandardMaterial color={bodyDarkTrim} roughness={0.8} />
        </mesh>

        {/* Rear engine fairing / body panels */}
        <mesh position={[0, 0.45, 0.39]} castShadow={castShadow}>
          <boxGeometry args={[0.44, 0.34, 0.78]} />
          <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.1} />
        </mesh>

        {/* Accent stripes on rear body */}
        <mesh position={[0, 0.48, 0.41]}>
          <boxGeometry args={[0.46, 0.05, 0.64]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} />
        </mesh>

        {/* Dual seat */}
        <mesh position={[0, 0.66, 0.36]} castShadow={castShadow}>
          <boxGeometry args={[0.34, 0.11, 0.76]} />
          <meshStandardMaterial color="#1f2937" roughness={0.85} />
        </mesh>

        {/* Rear grab rail */}
        <mesh position={[0, 0.69, 0.77]} castShadow={castShadow}>
          <boxGeometry args={[0.34, 0.04, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Rear mudguard */}
        <mesh position={[0, 0.34, 0.76]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.14]} />
          <meshStandardMaterial color={bodyDarkTrim} roughness={0.8} />
        </mesh>

        {/* Taillight */}
        <mesh position={[0, 0.52, 0.79]}>
          <boxGeometry args={[0.22, 0.08, 0.04]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.65} roughness={0.3} />
        </mesh>

        {/* Front leg shield */}
        <mesh position={[0, 0.61, -0.5]} rotation={[-0.2, 0, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.38, 0.6, 0.16]} />
          <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.1} />
        </mesh>

        {/* Front trim badge */}
        <mesh position={[0, 0.7, -0.58]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.16, 0.24, 0.03]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} />
        </mesh>

        {/* Exhaust muffler (right side) */}
        <mesh position={[0.23, 0.24, 0.48]} rotation={[Math.PI / 2, 0, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.045, 0.05, 0.56, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.65} />
        </mesh>

        {/* Rear Wheel */}
        <group ref={rearWheelRef} position={[0, 0.22, 0.6]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.22, 0.22, 0.13, 18]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.14, 12]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>

        {/* Steerable front fork, handlebars, headlight & front wheel */}
        <group ref={forkRef} position={[0, 0, -0.56]}>
          {/* Steering stem */}
          <mesh position={[0, 0.64, 0.04]} rotation={[-0.22, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.035, 0.04, 0.72, 10]} />
            <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
          </mesh>

          {/* Front fender */}
          <mesh position={[0, 0.39, -0.02]} rotation={[-0.2, 0, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.18, 0.07, 0.34]} />
            <meshStandardMaterial color={bodyColor} roughness={0.45} />
          </mesh>

          {/* Handlebar cowl & headlight nacelle */}
          <mesh position={[0, 0.99, 0.08]} castShadow={castShadow}>
            <boxGeometry args={[0.26, 0.14, 0.22]} />
            <meshStandardMaterial color={bodyColor} roughness={0.45} />
          </mesh>

          {/* Warm Headlight */}
          <mesh position={[0, 0.99, -0.04]}>
            <boxGeometry args={[0.16, 0.09, 0.04]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.8} roughness={0.2} />
          </mesh>

          {/* Wide handlebar */}
          <mesh position={[0, 1.0, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.022, 0.022, 0.66, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
          </mesh>

          {/* Mirrors */}
          <mesh position={[-0.28, 1.12, 0.08]}>
            <boxGeometry args={[0.1, 0.06, 0.03]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0.28, 1.12, 0.08]}>
            <boxGeometry args={[0.1, 0.06, 0.03]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>

          {/* Front Wheel */}
          <group ref={frontWheelRef} position={[0, 0.22, -0.02]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
              <cylinderGeometry args={[0.22, 0.22, 0.13, 18]} />
              <meshStandardMaterial color="#111827" roughness={0.9} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.11, 0.11, 0.14, 12]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.7} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Socket groups prepared for future rigged GLB swaps */}
      <group name="attach_seat_driver" position={[0, 0.73, 0.13]} dispose={null}>
        {isLead ? (
          /* Ishaan seated in Scooter 1 front driver socket */
          <PlaceholderRider
            jacketColor="#4d7c0f"
            helmetColor="#334155"
            isFrontPose
            castShadow={castShadow}
          />
        ) : (
          /* Scooter 2 carries Manish & Yash; driver vs. pillion roles intentionally unassigned */
          <PlaceholderRider
            jacketColor="#4f46e5"
            helmetColor="#1e293b"
            isFrontPose
            castShadow={castShadow}
          />
        )}
      </group>

      <group name="attach_seat_pillion" position={[0, 0.76, 0.52]} dispose={null}>
        {isLead ? (
          /* Srishti seated in Scooter 1 rear pillion socket */
          <PlaceholderRider
            jacketColor="#e11d48"
            helmetColor="#f8fafc"
            hasBackpack
            castShadow={castShadow}
          />
        ) : (
          /* Scooter 2 second rider; Manish vs. Yash role intentionally unassigned */
          <PlaceholderRider
            jacketColor="#0284c7"
            helmetColor="#e2e8f0"
            hasBackpack
            castShadow={castShadow}
          />
        )}
      </group>
    </group>
  );
}

