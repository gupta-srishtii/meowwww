'use client';

import { useMemo, type RefObject } from 'react';
import type * as THREE from 'three';
import { SlingBagAccessory } from '@/components/canvas/characters/SlingBagAccessory';
import {
  getDenimTexture,
  getPlaidShirtTexture,
  getSrishtiDay1KurtiTexture,
  getSrishtiFloralPeplumTexture,
} from '@/lib/proceduralTextures';

export type ScooterVariant = 'lead' | 'companion';
type SeatedRiderVariant = 'srishti' | 'ishaan' | 'friend_black_tee' | 'friend_plaid';

export interface PrototypeScooterProps {
  variant: ScooterVariant;
  groupRef?: RefObject<THREE.Group | null>;
  forkRef?: RefObject<THREE.Group | null>;
  frontWheelRef?: RefObject<THREE.Group | null>;
  rearWheelRef?: RefObject<THREE.Group | null>;
  castShadow?: boolean;
  hideRiders?: boolean;
  driverOnly?: boolean;
  soloRiderVariant?: 'srishti' | 'ishaan';
  outfitMode?: 'default' | 'day1';
}

interface RiderBlockProps {
  riderVariant: SeatedRiderVariant;
  helmetColor: string;
  hasBackpack?: boolean;
  isFrontPose?: boolean;
  castShadow?: boolean;
  outfitMode?: 'default' | 'day1';
}

/**
 * Stylized-realistic rider seated inside a scooter socket (`Phase 2C`).
 * Forward faces local -Z so seat sockets align with the scooter frame.
 */
function SeatedRider({
  riderVariant,
  helmetColor,
  hasBackpack = false,
  isFrontPose = false,
  castShadow = false,
  outfitMode = 'default',
}: RiderBlockProps) {
  const floralPeplumTex = useMemo(() => getSrishtiFloralPeplumTexture(), []);
  const day1KurtiTex = useMemo(() => getSrishtiDay1KurtiTexture(), []);
  const denimTex = useMemo(() => getDenimTexture(), []);
  const plaidTex = useMemo(() => getPlaidShirtTexture(), []);

  const isDay1 = outfitMode === 'day1';
  const isSrishti = riderVariant === 'srishti';
  const isIshaan = riderVariant === 'ishaan';
  const isBlackTee = riderVariant === 'friend_black_tee';
  const isPlaid = riderVariant === 'friend_plaid';

  const srishtiTex = isDay1 ? day1KurtiTex : floralPeplumTex;
  const topColor = isSrishti
    ? isDay1
      ? '#fef08a'
      : '#ebe6da'
    : isIshaan
      ? isDay1
        ? '#166534'
        : '#f1f5f9'
      : isBlackTee
        ? '#18181b'
        : '#c7b8a8';
  const pantsColor = isSrishti
    ? '#1f497d'
    : isIshaan
      ? '#22262e'
      : isBlackTee
        ? '#8b929a'
        : '#eae4d7';
  const skinTone = '#dfa880';

  return (
    <group>
      {/* Pelvis / seated lower torso */}
      <mesh position={[0, 0.065, 0]} scale={[1.05, 1, 0.88]} castShadow={castShadow}>
        <cylinderGeometry args={[isSrishti ? 0.12 : 0.135, isSrishti ? 0.13 : 0.145, 0.13, 12]} />
        <meshStandardMaterial
          color={pantsColor}
          map={isSrishti ? denimTex ?? undefined : undefined}
          roughness={0.85}
        />
      </mesh>

      {/* Left & right thighs angled forward */}
      <mesh position={[-0.11, 0.015, -0.14]} rotation={[0.38, 0, 0.08]} castShadow={castShadow}>
        <cylinderGeometry
          args={[isSrishti ? 0.048 : 0.056, isSrishti ? 0.044 : 0.052, 0.28, 12]}
        />
        <meshStandardMaterial
          color={pantsColor}
          map={isSrishti ? denimTex ?? undefined : undefined}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0.11, 0.015, -0.14]} rotation={[0.38, 0, -0.08]} castShadow={castShadow}>
        <cylinderGeometry
          args={[isSrishti ? 0.048 : 0.056, isSrishti ? 0.044 : 0.052, 0.28, 12]}
        />
        <meshStandardMaterial
          color={pantsColor}
          map={isSrishti ? denimTex ?? undefined : undefined}
          roughness={0.85}
        />
      </mesh>

      {/* Lower legs & Ishaan outer double white track stripes */}
      <mesh position={[-0.13, -0.19, -0.24]} rotation={[-0.15, 0, 0]} castShadow={castShadow}>
        <cylinderGeometry
          args={[isSrishti ? 0.043 : 0.048, isSrishti ? 0.068 : 0.045, 0.34, 12]}
        />
        <meshStandardMaterial
          color={pantsColor}
          map={isSrishti ? denimTex ?? undefined : undefined}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0.13, -0.19, -0.24]} rotation={[-0.15, 0, 0]} castShadow={castShadow}>
        <cylinderGeometry
          args={[isSrishti ? 0.043 : 0.048, isSrishti ? 0.068 : 0.045, 0.34, 12]}
        />
        <meshStandardMaterial
          color={pantsColor}
          map={isSrishti ? denimTex ?? undefined : undefined}
          roughness={0.85}
        />
      </mesh>

      {isIshaan && (
        <>
          <mesh position={[-0.18, -0.18, -0.24]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.008, 0.32, 0.022]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
          </mesh>
          <mesh position={[0.18, -0.18, -0.24]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.008, 0.32, 0.022]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Footwear */}
      {isIshaan ? (
        <>
          <mesh position={[-0.13, -0.375, -0.27]} castShadow={castShadow}>
            <boxGeometry args={[0.085, 0.032, 0.16]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.88} />
          </mesh>
          <mesh position={[0.13, -0.375, -0.27]} castShadow={castShadow}>
            <boxGeometry args={[0.085, 0.032, 0.16]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.88} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-0.13, -0.37, -0.27]} castShadow={castShadow}>
            <boxGeometry args={[0.082, 0.056, 0.158]} />
            <meshStandardMaterial
              color={isBlackTee ? '#f8fafc' : isPlaid ? '#78513c' : '#18181b'}
              roughness={0.85}
            />
          </mesh>
          <mesh position={[0.13, -0.37, -0.27]} castShadow={castShadow}>
            <boxGeometry args={[0.082, 0.056, 0.158]} />
            <meshStandardMaterial
              color={isBlackTee ? '#f8fafc' : isPlaid ? '#78513c' : '#18181b'}
              roughness={0.85}
            />
          </mesh>
        </>
      )}

      {/* Torso silhouette */}
      {isSrishti ? (
        <group position={[0, 0.29, -0.02]} rotation={[-0.08, 0, 0]}>
          {/* Fitted waist-to-ribcage bodice */}
          <mesh position={[0, 0.06, 0]} scale={[1.05, 1, 0.78]} castShadow={castShadow}>
            <cylinderGeometry args={[0.115, 0.088, 0.26, 14]} />
            <meshStandardMaterial
              color={topColor}
              map={srishtiTex ?? undefined}
              roughness={0.8}
            />
          </mesh>
          {/* Short kurti / peplum flare */}
          <mesh position={[0, -0.11, 0.01]} scale={[1.08, 1, 0.88]} castShadow={castShadow}>
            <cylinderGeometry args={[0.092, 0.18, 0.2, 16]} />
            <meshStandardMaterial
              color={isDay1 ? '#fde047' : '#e6dfd2'}
              map={srishtiTex ?? undefined}
              roughness={0.82}
            />
          </mesh>
          {!isDay1 && (
            <>
              {/* Square open upper back & tie ribbon (`ishaan and srishti.jpg`) */}
              <mesh position={[0, 0.145, 0.084]}>
                <boxGeometry args={[0.11, 0.064, 0.016]} />
                <meshStandardMaterial color={skinTone} roughness={0.76} />
              </mesh>
              <mesh position={[0, 0.168, 0.094]}>
                <boxGeometry args={[0.1, 0.012, 0.01]} />
                <meshStandardMaterial color="#d4ccc0" roughness={0.82} />
              </mesh>
            </>
          )}
          {/* Contoured crossbody olive-grey sling bag sitting clearly outside left hip */}
          <group position={[0, -0.16, 0]}>
            <SlingBagAccessory variant="seated" castShadow={castShadow} />
          </group>
        </group>
      ) : (
        <mesh
          position={[0, 0.305, -0.02]}
          rotation={[isFrontPose ? -0.14 : -0.08, 0, 0]}
          scale={[1.1, 1, 0.8]}
          castShadow={castShadow}
        >
          <cylinderGeometry args={[0.148, 0.13, 0.42, 14]} />
          <meshStandardMaterial
            color={topColor}
            map={isPlaid ? plaidTex ?? undefined : undefined}
            roughness={0.78}
          />
        </mesh>
      )}

      {/* Arms reaching to handlebars or gripping pillion safety rail */}
      {[-1, 1].map((side) => {
        const isShort = isIshaan || isBlackTee;
        return (
          <group
            key={side}
            position={[side * (isSrishti ? 0.162 : 0.176), 0.34, isFrontPose ? -0.21 : -0.11]}
            rotation={[isFrontPose ? 1.15 : 0.72, -side * 0.12, 0]}
          >
            <mesh position={[0, 0.06, 0]} castShadow={castShadow}>
              <cylinderGeometry
                args={[isSrishti ? 0.034 : 0.042, isSrishti ? 0.042 : 0.038, 0.16, 10]}
              />
              <meshStandardMaterial
                color={topColor}
                map={isSrishti ? srishtiTex ?? undefined : isPlaid ? plaidTex ?? undefined : undefined}
                roughness={0.78}
              />
            </mesh>
            <mesh position={[0, -0.09, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.029, 0.026, 0.17, 10]} />
              <meshStandardMaterial
                color={isPlaid ? topColor : isShort || isSrishti ? skinTone : topColor}
                map={isPlaid ? plaidTex ?? undefined : undefined}
                roughness={0.76}
              />
            </mesh>
          </group>
        );
      })}

      {/* Head & protective helmet (+ flowing wavy black hair for Srishti) */}
      <group position={[0, 0.615, -0.05]}>
        <mesh castShadow={castShadow}>
          <sphereGeometry args={[isSrishti ? 0.126 : 0.136, 16, 14]} />
          <meshStandardMaterial color={helmetColor} roughness={0.3} metalness={0.18} />
        </mesh>
        {/* Helmet chin/visor rim */}
        <mesh position={[0, -0.015, -0.088]}>
          <boxGeometry args={[0.175, 0.065, 0.095]} />
          <meshStandardMaterial color="#0f172a" roughness={0.18} metalness={0.55} />
        </mesh>
        {/* Subtle lower neck visible beneath open-face rim */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.042, 0.048, 0.08, 10]} />
          <meshStandardMaterial color={skinTone} roughness={0.76} />
        </mesh>
        {isIshaan && (
          <mesh position={[0, -0.075, 0.088]} scale={[1.05, 0.78, 0.65]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#18181b" roughness={0.88} />
          </mesh>
        )}
        {isSrishti && (
          <group position={[0, -0.09, 0.115]} rotation={[0.2, 0, 0]}>
            <mesh scale={[1.35, 1, 0.52]} castShadow={castShadow}>
              <cylinderGeometry args={[0.064, 0.072, 0.25, 10]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} />
            </mesh>
            <mesh
              position={[-0.02, -0.18, 0.02]}
              rotation={[0.12, 0, -0.05]}
              scale={[1.45, 1, 0.45]}
              castShadow={castShadow}
            >
              <cylinderGeometry args={[0.068, 0.044, 0.21, 10]} />
              <meshStandardMaterial color="#121215" roughness={0.88} />
            </mesh>
          </group>
        )}
      </group>

      {hasBackpack && !isSrishti && (
        <mesh position={[0, 0.31, 0.145]} rotation={[-0.08, 0, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.24, 0.3, 0.13]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Stylized-realistic Indian commuter scooter (`Phase 2C`).
 * Local orientation: forward points along -Z, up along +Y, right along +X.
 * Named rider sockets retain normal disposal for their owned procedural meshes.
 */
export function PrototypeScooter({
  variant,
  groupRef,
  forkRef,
  frontWheelRef,
  rearWheelRef,
  castShadow = false,
  hideRiders = false,
  driverOnly = false,
  soloRiderVariant,
  outfitMode = 'default',
}: PrototypeScooterProps) {
  const isLead = variant === 'lead';
  const bodyColor = isLead ? '#cc5433' : '#1b7a72';
  const accentColor = isLead ? '#fde68a' : '#a7f3d0';
  const bodyDarkTrim = '#1e293b';

  return (
    <group ref={groupRef}>
      {/* Ground contact shadow decal */}
      <mesh position={[0, 0.018, 0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.58, 1.48, 1]}>
        <circleGeometry args={[0.72, 22]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Main scooter sculpted chassis */}
      <group>
        {/* Floorboard & ribbed rubber foot mat */}
        <mesh position={[0, 0.25, -0.14]} castShadow={castShadow}>
          <boxGeometry args={[0.42, 0.07, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.288, -0.14]}>
          <boxGeometry args={[0.34, 0.012, 0.62]} />
          <meshStandardMaterial color="#0f172a" roughness={0.94} />
        </mesh>

        {/* Tapered underbelly skid keel */}
        <mesh position={[0, 0.19, 0.04]} castShadow={castShadow}>
          <boxGeometry args={[0.3, 0.075, 1.06]} />
          <meshStandardMaterial color={bodyDarkTrim} roughness={0.78} />
        </mesh>

        {/* Rounded sculptural rear side body cowl */}
        <mesh position={[0, 0.45, 0.39]} scale={[0.62, 0.48, 1]} castShadow={castShadow}>
          <cylinderGeometry args={[0.38, 0.36, 0.78, 18]} />
          <meshStandardMaterial color={bodyColor} roughness={0.32} metalness={0.22} />
        </mesh>
        {/* Side painted cowling trim fillets */}
        <mesh position={[0, 0.48, 0.41]} scale={[0.64, 0.12, 0.85]}>
          <cylinderGeometry args={[0.38, 0.38, 0.66, 16]} />
          <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.2} />
        </mesh>

        {/* Contoured dual seat with subtle rider/pillion bolsters */}
        <mesh position={[0, 0.655, 0.18]} scale={[0.92, 0.6, 1]} castShadow={castShadow}>
          <cylinderGeometry args={[0.18, 0.185, 0.34, 14]} />
          <meshStandardMaterial color="#1f2937" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.68, 0.5]} scale={[0.96, 0.65, 1]} castShadow={castShadow}>
          <cylinderGeometry args={[0.175, 0.18, 0.42, 14]} />
          <meshStandardMaterial color="#1c2431" roughness={0.82} />
        </mesh>

        {/* Tubular Chrome Rear Pillion Grab Rail */}
        <mesh position={[0, 0.695, 0.77]} castShadow={castShadow}>
          <boxGeometry args={[0.32, 0.036, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.22} metalness={0.85} />
        </mesh>
        <mesh position={[-0.15, 0.685, 0.7]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.14, 8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.85} />
        </mesh>
        <mesh position={[0.15, 0.685, 0.7]}>
          <cylinderGeometry args={[0.016, 0.016, 0.14, 8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Rear mudguard, license plate & indicator lights */}
        <mesh position={[0, 0.34, 0.77]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.12]} />
          <meshStandardMaterial color={bodyDarkTrim} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.37, 0.835]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.17, 0.08, 0.015]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.525, 0.795]}>
          <boxGeometry args={[0.19, 0.075, 0.035]} />
          <meshStandardMaterial
            color="#dc2626"
            emissive="#ef4444"
            emissiveIntensity={0.75}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[-0.14, 0.52, 0.78]}>
          <boxGeometry args={[0.055, 0.06, 0.03]} />
          <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0.14, 0.52, 0.78]}>
          <boxGeometry args={[0.055, 0.06, 0.03]} />
          <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={0.25} />
        </mesh>

        {/* Tapered sculpted front leg shield & inner glovebox pocket */}
        <mesh position={[0, 0.61, -0.49]} rotation={[-0.22, 0, 0]} scale={[1.25, 1, 0.48]} castShadow={castShadow}>
          <cylinderGeometry args={[0.18, 0.15, 0.62, 16]} />
          <meshStandardMaterial color={bodyColor} roughness={0.32} metalness={0.22} />
        </mesh>
        <mesh position={[0, 0.62, -0.43]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.3, 0.52, 0.05]} />
          <meshStandardMaterial color={bodyDarkTrim} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.7, -0.585]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.14, 0.24, 0.025]} />
          <meshStandardMaterial color={accentColor} roughness={0.35} metalness={0.2} />
        </mesh>

        {/* Sculpted chrome exhaust muffler & dark endcap (right side) */}
        <group position={[0.23, 0.24, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow={castShadow}>
            <cylinderGeometry args={[0.044, 0.052, 0.56, 12]} />
            <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.45} />
          </mesh>
          <mesh position={[0.025, 0.02, 0]}>
            <cylinderGeometry args={[0.042, 0.044, 0.44, 10]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.28} metalness={0.82} />
          </mesh>
        </group>

        {/* Rear Wheel w/ alloy hub */}
        <group ref={rearWheelRef} position={[0, 0.22, 0.6]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.22, 0.22, 0.135, 22]} />
            <meshStandardMaterial color="#111827" roughness={0.92} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.118, 0.118, 0.142, 14]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.28} metalness={0.78} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.15, 10]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>

        {/* Steerable telescopic front fork, visor cowl, LED headlamp & front wheel */}
        <group ref={forkRef} position={[0, 0, -0.56]}>
          <mesh position={[-0.08, 0.54, 0.03]} rotation={[-0.22, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.022, 0.026, 0.56, 10]} />
            <meshStandardMaterial color="#64748b" roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh position={[0.08, 0.54, 0.03]} rotation={[-0.22, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.022, 0.026, 0.56, 10]} />
            <meshStandardMaterial color="#64748b" roughness={0.35} metalness={0.75} />
          </mesh>

          {/* Curved front fender mudguard */}
          <mesh position={[0, 0.39, -0.02]} rotation={[-0.22, 0, 0]} scale={[0.85, 0.45, 1]} castShadow={castShadow}>
            <cylinderGeometry args={[0.12, 0.13, 0.32, 12]} />
            <meshStandardMaterial color={bodyColor} roughness={0.34} metalness={0.2} />
          </mesh>

          {/* Handlebar sculpted cowl & smoked mini flyscreen */}
          <mesh position={[0, 0.99, 0.08]} scale={[1.25, 0.65, 1]} castShadow={castShadow}>
            <sphereGeometry args={[0.135, 14, 12]} />
            <meshStandardMaterial color={bodyColor} roughness={0.32} metalness={0.22} />
          </mesh>
          <mesh position={[0, 1.09, 0.04]} rotation={[-0.38, 0, 0]}>
            <boxGeometry args={[0.2, 0.11, 0.018]} />
            <meshStandardMaterial color="#0f172a" roughness={0.18} metalness={0.35} transparent opacity={0.82} />
          </mesh>

          {/* Warm LED headlamp & speedometer gauge cluster glow */}
          <mesh position={[0, 0.99, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.068, 0.058, 0.04, 14]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.92} roughness={0.18} />
          </mesh>
          <mesh position={[0, 1.03, 0.14]} rotation={[-0.85, 0, 0]}>
            <boxGeometry args={[0.12, 0.06, 0.015]} />
            <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={0.5} />
          </mesh>

          {/* Handlebar + Rubber Grips + Twin Mirrors on Chrome Stems */}
          <mesh position={[0, 1.0, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.02, 0.02, 0.68, 10]} />
            <meshStandardMaterial color="#111827" roughness={0.65} />
          </mesh>
          {[-0.27, 0.27].map((mx, idx) => (
            <group key={idx} position={[mx, 1.05, 0.09]}>
              <mesh position={[0, 0.045, 0]} rotation={[0, 0, mx < 0 ? 0.25 : -0.25]}>
                <cylinderGeometry args={[0.008, 0.008, 0.11, 6]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[mx < 0 ? -0.02 : 0.02, 0.1, 0]}>
                <boxGeometry args={[0.1, 0.058, 0.024]} />
                <meshStandardMaterial color="#0f172a" roughness={0.28} metalness={0.55} />
              </mesh>
            </group>
          ))}

          {/* Front Wheel */}
          <group ref={frontWheelRef} position={[0, 0.22, -0.02]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
              <cylinderGeometry args={[0.22, 0.22, 0.135, 22]} />
              <meshStandardMaterial color="#111827" roughness={0.92} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.118, 0.118, 0.142, 14]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.28} metalness={0.78} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.15, 10]} />
              <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Named sockets preserved for future GLB rig swaps. */}
      <group name="attach_seat_driver" position={[0, 0.73, 0.13]}>
        {!hideRiders &&
          (soloRiderVariant === 'srishti' ? (
            <SeatedRider
              riderVariant="srishti"
              helmetColor="#f1f5f9"
              isFrontPose
              castShadow={castShadow}
              outfitMode={outfitMode}
            />
          ) : isLead ? (
            <SeatedRider
              riderVariant="ishaan"
              helmetColor="#334155"
              isFrontPose
              castShadow={castShadow}
              outfitMode={outfitMode}
            />
          ) : (
            <SeatedRider
              riderVariant="friend_black_tee"
              helmetColor="#1e293b"
              isFrontPose
              castShadow={castShadow}
              outfitMode={outfitMode}
            />
          ))}
      </group>

      <group name="attach_seat_pillion" position={[0, 0.76, 0.52]}>
        {!hideRiders &&
          !driverOnly &&
          !soloRiderVariant &&
          (isLead ? (
            <SeatedRider
              riderVariant="srishti"
              helmetColor="#f1f5f9"
              castShadow={castShadow}
              outfitMode={outfitMode}
            />
          ) : (
            <SeatedRider
              riderVariant="friend_plaid"
              helmetColor="#e2e8f0"
              hasBackpack
              castShadow={castShadow}
              outfitMode={outfitMode}
            />
          ))}
      </group>
    </group>
  );
}
