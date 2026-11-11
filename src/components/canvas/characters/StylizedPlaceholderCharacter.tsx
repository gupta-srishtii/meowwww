'use client';

import { useMemo, type RefObject } from 'react';
import type * as THREE from 'three';
import { CharacterHeadOverlay } from '@/components/canvas/characters/CharacterHeadOverlay';
import { SlingBagAccessory } from '@/components/canvas/characters/SlingBagAccessory';
import {
  getDenimTexture,
  getPlaidShirtTexture,
  getSrishtiFloralPeplumTexture,
} from '@/lib/proceduralTextures';

export type CharacterVariant =
  | 'srishti'
  | 'ishaan'
  | 'friend_black_tee'
  | 'friend_plaid'
  | 'traveler';

export interface StylizedPlaceholderCharacterProps {
  characterVariant?: CharacterVariant;
  groupRef?: RefObject<THREE.Group | null>;
  torsoRef?: RefObject<THREE.Group | null>;
  headRef?: RefObject<THREE.Group | null>;
  hairTailRef?: RefObject<THREE.Group | null>;
  bagRef?: RefObject<THREE.Group | null>;
  leftLegRef?: RefObject<THREE.Group | null>;
  leftKneeRef?: RefObject<THREE.Group | null>;
  rightLegRef?: RefObject<THREE.Group | null>;
  rightKneeRef?: RefObject<THREE.Group | null>;
  leftArmRef?: RefObject<THREE.Group | null>;
  rightArmRef?: RefObject<THREE.Group | null>;
  rightForearmRef?: RefObject<THREE.Group | null>;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  jacketColor?: string;
  pantsColor?: string;
  hairColor?: string;
  holdingChaiCup?: boolean;
  holdingFork?: boolean;
  holdingSweet?: boolean;
  tilakApplied?: boolean;
  castShadow?: boolean;
  showNameTag?: boolean;
}

/**
 * Stylized-realistic articulated characters (`Phase 2C`).
 * Forward faces local -Z; feet rest cleanly at local y = 0.
 * - Srishti, Ishaan, and Scooter 2 friends' outfits match verified local reference photos (`Photos-1-001/`)
 *   without inventing hidden details or assigning Scooter 2 identities/roles.
 */
export function StylizedPlaceholderCharacter({
  characterVariant = 'traveler',
  groupRef,
  torsoRef,
  headRef,
  hairTailRef,
  bagRef,
  leftLegRef,
  leftKneeRef,
  rightLegRef,
  rightKneeRef,
  leftArmRef,
  rightArmRef,
  rightForearmRef,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  jacketColor = '#475569',
  pantsColor = '#1e293b',
  hairColor = '#18181b',
  holdingChaiCup = false,
  holdingFork = false,
  holdingSweet = false,
  tilakApplied = false,
  castShadow = false,
  showNameTag = true,
}: StylizedPlaceholderCharacterProps) {
  const floralPeplumTex = useMemo(() => getSrishtiFloralPeplumTexture(), []);
  const denimTex = useMemo(() => getDenimTexture(), []);
  const plaidTex = useMemo(() => getPlaidShirtTexture(), []);

  if (characterVariant === 'srishti') {
    const skinTone = '#dfa980';
    const denimColor = '#1f497d';

    return (
      <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {/* Soft grounded contact decal */}
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.27, 20]} />
          <meshBasicMaterial color="#090d16" transparent opacity={0.28} depthWrite={false} />
        </mesh>

        {/* Contoured feminine pelvis in washed indigo denim */}
        <mesh position={[0, 0.75, 0]} scale={[1.08, 1, 0.85]} castShadow={castShadow}>
          <cylinderGeometry args={[0.118, 0.138, 0.14, 16]} />
          <meshStandardMaterial color={denimColor} map={denimTex ?? undefined} roughness={0.84} />
        </mesh>

        {/* Left articulated leg -> flared raw-hem indigo denim -> rounded dark sneaker */}
        <group ref={leftLegRef} position={[-0.08, 0.72, 0]}>
          <mesh position={[0, -0.175, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.052, 0.044, 0.36, 14]} />
            <meshStandardMaterial color={denimColor} map={denimTex ?? undefined} roughness={0.84} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.35, 0]}>
            <mesh position={[0, -0.155, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.043, 0.072, 0.31, 14]} />
              <meshStandardMaterial color="#1a3e6f" map={denimTex ?? undefined} roughness={0.85} />
            </mesh>
            {/* Frayed ankle cuff */}
            <mesh position={[0, -0.305, 0]}>
              <cylinderGeometry args={[0.073, 0.076, 0.022, 14]} />
              <meshStandardMaterial color="#93b4d8" roughness={0.95} />
            </mesh>
            {/* Dark sculpted low-top sneaker */}
            <mesh position={[0, -0.336, -0.026]} castShadow={castShadow}>
              <boxGeometry args={[0.076, 0.056, 0.155]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.358, -0.028]}>
              <boxGeometry args={[0.08, 0.018, 0.162]} />
              <meshStandardMaterial color="#27272a" roughness={0.92} />
            </mesh>
          </group>
        </group>

        {/* Right articulated leg */}
        <group ref={rightLegRef} position={[0.08, 0.72, 0]}>
          <mesh position={[0, -0.175, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.052, 0.044, 0.36, 14]} />
            <meshStandardMaterial color={denimColor} map={denimTex ?? undefined} roughness={0.84} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.35, 0]}>
            <mesh position={[0, -0.155, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.043, 0.072, 0.31, 14]} />
              <meshStandardMaterial color="#1a3e6f" map={denimTex ?? undefined} roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.305, 0]}>
              <cylinderGeometry args={[0.073, 0.076, 0.022, 14]} />
              <meshStandardMaterial color="#93b4d8" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.336, -0.026]} castShadow={castShadow}>
              <boxGeometry args={[0.076, 0.056, 0.155]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.358, -0.028]}>
              <boxGeometry args={[0.08, 0.018, 0.162]} />
              <meshStandardMaterial color="#27272a" roughness={0.92} />
            </mesh>
          </group>
        </group>

        {/* Feminine Upper Torso: Smocked Cream-Indigo Floral Peplum Top */}
        <group ref={torsoRef} position={[0, 0.78, 0]}>
          {/* Natural waist-to-ribcage smocked bodice */}
          <mesh position={[0, 0.24, 0]} scale={[1.05, 1, 0.78]} castShadow={castShadow}>
            <cylinderGeometry args={[0.118, 0.088, 0.28, 16]} />
            <meshStandardMaterial
              color="#ece7dc"
              map={floralPeplumTex ?? undefined}
              roughness={0.8}
            />
          </mesh>
          {/* Soft upper chest curve */}
          <mesh position={[0, 0.29, -0.028]} scale={[0.98, 0.85, 0.7]}>
            <sphereGeometry args={[0.11, 14, 12]} />
            <meshStandardMaterial
              color="#ece7dc"
              map={floralPeplumTex ?? undefined}
              roughness={0.8}
            />
          </mesh>
          {/* Smocked waist cinch ribbing */}
          <mesh position={[0, 0.125, 0]} scale={[1.06, 1, 0.82]}>
            <cylinderGeometry args={[0.092, 0.094, 0.06, 16]} />
            <meshStandardMaterial
              color="#c8d0db"
              map={floralPeplumTex ?? undefined}
              roughness={0.82}
            />
          </mesh>
          {/* Gathered ruffled peplum skirt flare falling past hips */}
          <mesh position={[0, -0.005, 0.006]} scale={[1.08, 1, 0.88]} castShadow={castShadow}>
            <cylinderGeometry args={[0.094, 0.19, 0.24, 18]} />
            <meshStandardMaterial
              color="#e7e1d5"
              map={floralPeplumTex ?? undefined}
              roughness={0.82}
            />
          </mesh>

          {/* Signature square open back cut + upper-back tie string bow (`ishaan and srishti.jpg`) */}
          <mesh position={[0, 0.34, 0.086]}>
            <boxGeometry args={[0.115, 0.068, 0.016]} />
            <meshStandardMaterial color={skinTone} roughness={0.76} />
          </mesh>
          <mesh position={[0, 0.365, 0.095]}>
            <boxGeometry args={[0.105, 0.012, 0.01]} />
            <meshStandardMaterial color="#d4ccc0" roughness={0.82} />
          </mesh>
          <mesh position={[-0.012, 0.335, 0.096]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.01, 0.05, 0.008]} />
            <meshStandardMaterial color="#d4ccc0" roughness={0.82} />
          </mesh>
          <mesh position={[0.012, 0.335, 0.096]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.01, 0.05, 0.008]} />
            <meshStandardMaterial color="#d4ccc0" roughness={0.82} />
          </mesh>

          {/* Curved crossbody olive-grey sling bag & cobalt strip (`IMG_20250614_215645.jpg`, `20250612_132915.jpg`) */}
          <SlingBagAccessory variant="standing" bagRef={bagRef} castShadow={castShadow} />

          {/* Slender neck */}
          <mesh position={[0, 0.43, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.04, 0.048, 0.1, 12]} />
            <meshStandardMaterial color={skinTone} roughness={0.76} />
          </mesh>

          {/* Left Arm: Rounded shoulder cap + Puffed floral 3/4 bell sleeve + slender forearm + delicate gold bangle */}
          <group ref={leftArmRef} position={[-0.152, 0.355, 0]}>
            <mesh position={[0.008, 0.0, 0]} scale={[0.92, 0.95, 0.92]} castShadow={castShadow}>
              <sphereGeometry args={[0.042, 12, 10]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, -0.085, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.036, 0.044, 0.18, 12]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.8}
              />
            </mesh>
            {/* Bell sleeve ruffle cuff */}
            <mesh position={[0, -0.175, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.042, 0.062, 0.055, 12]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.82}
              />
            </mesh>
            <mesh position={[0, -0.275, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.027, 0.024, 0.165, 10]} />
              <meshStandardMaterial color={skinTone} roughness={0.75} />
            </mesh>
            {/* Delicate gold-tan bracelet visible in photo */}
            <mesh position={[0, -0.335, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.026, 0.004, 6, 14]} />
              <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, -0.368, 0]}>
              <sphereGeometry args={[0.026, 8, 8]} />
              <meshStandardMaterial color={skinTone} roughness={0.75} />
            </mesh>
          </group>

          {/* Right Arm + Articulated Forearm for Dining / Cup */}
          <group ref={rightArmRef} position={[0.152, 0.355, 0]}>
            <mesh position={[-0.008, 0.0, 0]} scale={[0.92, 0.95, 0.92]} castShadow={castShadow}>
              <sphereGeometry args={[0.042, 12, 10]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, -0.085, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.036, 0.044, 0.18, 12]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, -0.175, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.042, 0.062, 0.055, 12]} />
              <meshStandardMaterial
                color="#ebe6da"
                map={floralPeplumTex ?? undefined}
                roughness={0.82}
              />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.19, 0]}>
              <mesh position={[0, -0.085, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.027, 0.024, 0.165, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.75} />
              </mesh>
              <mesh position={[0, -0.178, 0]}>
                <sphereGeometry args={[0.026, 8, 8]} />
                <meshStandardMaterial color={skinTone} roughness={0.75} />
              </mesh>
              {holdingChaiCup && (
                <mesh position={[0, -0.18, -0.05]} castShadow={castShadow}>
                  <cylinderGeometry args={[0.038, 0.027, 0.08, 10]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} />
                </mesh>
              )}
              {holdingFork && (
                <group position={[0, -0.2, -0.085]} rotation={[Math.PI / 2.2, 0, 0]}>
                  <mesh>
                    <cylinderGeometry args={[0.006, 0.006, 0.17, 6]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, -0.09, 0]}>
                    <sphereGeometry args={[0.022, 8, 6]} />
                    <meshStandardMaterial color="#eab308" roughness={0.78} />
                  </mesh>
                </group>
              )}
              {holdingSweet && (
                <group name="held-mithai" position={[0, -0.185, -0.045]}>
                  <mesh castShadow={castShadow}>
                    <sphereGeometry args={[0.032, 10, 10]} />
                    <meshStandardMaterial color="#f59e0b" roughness={0.65} />
                  </mesh>
                  <mesh position={[0, 0.028, 0]}>
                    <sphereGeometry args={[0.01, 6, 6]} />
                    <meshStandardMaterial color="#fef08a" roughness={0.5} />
                  </mesh>
                </group>
              )}
            </group>
          </group>

          {/* Head + Feminine Stylized Facial Detail + Long Wavy Half-Up Hair & Back Clip */}
          <group ref={headRef} position={[0, 0.565, -0.01]}>
            <mesh scale={[0.9, 1.02, 0.94]} castShadow={castShadow}>
              <sphereGeometry args={[0.125, 18, 16]} />
              <meshStandardMaterial color={skinTone} roughness={0.72} />
            </mesh>

            {/* Warm stylized eyes & soft brows (facing -Z) */}
            <mesh position={[-0.04, 0.012, -0.11]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#1e1b18" roughness={0.3} />
            </mesh>
            <mesh position={[0.04, 0.012, -0.11]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#1e1b18" roughness={0.3} />
            </mesh>
            <mesh position={[-0.04, 0.032, -0.108]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.028, 0.006, 0.008]} />
              <meshStandardMaterial color="#18181b" roughness={0.9} />
            </mesh>
            <mesh position={[0.04, 0.032, -0.108]} rotation={[0, 0, -0.08]}>
              <boxGeometry args={[0.028, 0.006, 0.008]} />
              <meshStandardMaterial color="#18181b" roughness={0.9} />
            </mesh>

            {/* Glossy dark crown hair */}
            <mesh position={[0, 0.032, 0.018]} scale={[0.96, 1.0, 1.0]} castShadow={castShadow}>
              <sphereGeometry args={[0.129, 16, 14]} />
              <meshStandardMaterial color={hairColor} roughness={0.82} />
            </mesh>
            {/* Soft sweeping parted temple waves framing cheek */}
            <mesh position={[-0.088, -0.028, -0.018]} rotation={[0.14, 0.08, 0.1]} castShadow={castShadow}>
              <cylinderGeometry args={[0.024, 0.018, 0.15, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0.088, -0.028, -0.018]} rotation={[0.14, -0.08, -0.1]} castShadow={castShadow}>
              <cylinderGeometry args={[0.024, 0.018, 0.15, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Back dark hair claw/clip holding half-up ponytail */}
            <mesh position={[0, 0.01, 0.136]} castShadow={castShadow}>
              <boxGeometry args={[0.068, 0.046, 0.034]} />
              <meshStandardMaterial color="#27272a" roughness={0.42} />
            </mesh>
            {/* Lush multi-tiered wavy dark ponytail flowing down clearly past upper-to-mid back */}
            <group ref={hairTailRef} position={[0, -0.008, 0.146]} rotation={[0.16, 0, 0]}>
              <mesh position={[0, -0.13, 0.012]} scale={[1.38, 1, 0.54]} castShadow={castShadow}>
                <cylinderGeometry args={[0.065, 0.075, 0.27, 10]} />
                <meshStandardMaterial color={hairColor} roughness={0.84} />
              </mesh>
              <mesh
                position={[-0.025, -0.3, 0.024]}
                rotation={[0.09, 0, -0.05]}
                scale={[1.45, 1, 0.45]}
                castShadow={castShadow}
              >
                <cylinderGeometry args={[0.07, 0.045, 0.22, 10]} />
                <meshStandardMaterial color="#121215" roughness={0.88} />
              </mesh>
            </group>
            <CharacterHeadOverlay variant="srishti" showTag={showNameTag} headY={0.28} />
          </group>
        </group>
      </group>
    );
  }

  // Male trip outfits strictly verified from local photos (`ishaan and srishti.jpg` & `all four togethere.jpg`):
  const isIshaan = characterVariant === 'ishaan';
  const isBlackTeeFriend = characterVariant === 'friend_black_tee';
  const isPlaidFriend = characterVariant === 'friend_plaid';

  const resolvedShirtColor = isIshaan
    ? '#f1f5f9'
    : isBlackTeeFriend
      ? '#18181b'
      : isPlaidFriend
        ? '#c7b8a8'
        : jacketColor;

  const resolvedPantsColor = isIshaan
    ? '#22262e'
    : isBlackTeeFriend
      ? '#8b929a'
      : isPlaidFriend
        ? '#eae4d7'
        : pantsColor;

  const isShortSleeve = isIshaan || isBlackTeeFriend;
  const skinColor = '#dca882';

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Contact shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.29, 18]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.77, 0]} scale={[1.05, 1, 0.85]} castShadow={castShadow}>
        <cylinderGeometry args={[0.135, 0.14, 0.14, 14]} />
        <meshStandardMaterial color={resolvedPantsColor} roughness={0.85} />
      </mesh>

      {/* Left articulated leg + optional twin white jogger stripe (`Ishaan`) + verified footwear */}
      <group ref={leftLegRef} position={[-0.092, 0.74, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.058, 0.051, 0.37, 12]} />
          <meshStandardMaterial color={resolvedPantsColor} roughness={0.85} />
        </mesh>
        {isIshaan && (
          <>
            <mesh position={[-0.056, -0.18, 0.008]}>
              <boxGeometry args={[0.008, 0.35, 0.012]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
            <mesh position={[-0.056, -0.18, -0.01]}>
              <boxGeometry args={[0.008, 0.35, 0.012]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
          </>
        )}
        <group ref={leftKneeRef} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.049, 0.044, 0.32, 12]} />
            <meshStandardMaterial color={resolvedPantsColor} roughness={0.85} />
          </mesh>
          {isIshaan && (
            <>
              <mesh position={[-0.048, -0.155, 0.008]}>
                <boxGeometry args={[0.008, 0.3, 0.012]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
              </mesh>
              <mesh position={[-0.048, -0.155, -0.01]}>
                <boxGeometry args={[0.008, 0.3, 0.012]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
              </mesh>
            </>
          )}
          {/* Footwear matched from photo reference */}
          {isIshaan ? (
            /* Grey & cream casual slide sandals (`ishaan and srishti.jpg`) */
            <group position={[0, -0.352, -0.026]}>
              <mesh castShadow={castShadow}>
                <boxGeometry args={[0.09, 0.025, 0.175]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.018, -0.018]}>
                <boxGeometry args={[0.092, 0.028, 0.068]} />
                <meshStandardMaterial color="#64748b" roughness={0.82} />
              </mesh>
            </group>
          ) : (
            <group position={[0, -0.345, -0.028]}>
              <mesh castShadow={castShadow}>
                <boxGeometry args={[0.09, 0.062, 0.178]} />
                <meshStandardMaterial
                  color={
                    isBlackTeeFriend ? '#f8fafc' : isPlaidFriend ? '#78513c' : '#0f172a'
                  }
                  roughness={0.82}
                />
              </mesh>
              <mesh position={[0, -0.025, 0]}>
                <boxGeometry args={[0.094, 0.02, 0.182]} />
                <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* Right articulated leg */}
      <group ref={rightLegRef} position={[0.092, 0.74, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.058, 0.051, 0.37, 12]} />
          <meshStandardMaterial color={resolvedPantsColor} roughness={0.85} />
        </mesh>
        {isIshaan && (
          <>
            <mesh position={[0.056, -0.18, 0.008]}>
              <boxGeometry args={[0.008, 0.35, 0.012]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
            <mesh position={[0.056, -0.18, -0.01]}>
              <boxGeometry args={[0.008, 0.35, 0.012]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
          </>
        )}
        <group ref={rightKneeRef} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.049, 0.044, 0.32, 12]} />
            <meshStandardMaterial color={resolvedPantsColor} roughness={0.85} />
          </mesh>
          {isIshaan && (
            <>
              <mesh position={[0.048, -0.155, 0.008]}>
                <boxGeometry args={[0.008, 0.3, 0.012]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
              </mesh>
              <mesh position={[0.048, -0.155, -0.01]}>
                <boxGeometry args={[0.008, 0.3, 0.012]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
              </mesh>
            </>
          )}
          {isIshaan ? (
            <group position={[0, -0.352, -0.026]}>
              <mesh castShadow={castShadow}>
                <boxGeometry args={[0.09, 0.025, 0.175]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.018, -0.018]}>
                <boxGeometry args={[0.092, 0.028, 0.068]} />
                <meshStandardMaterial color="#64748b" roughness={0.82} />
              </mesh>
            </group>
          ) : (
            <group position={[0, -0.345, -0.028]}>
              <mesh castShadow={castShadow}>
                <boxGeometry args={[0.09, 0.062, 0.178]} />
                <meshStandardMaterial
                  color={
                    isBlackTeeFriend ? '#f8fafc' : isPlaidFriend ? '#78513c' : '#0f172a'
                  }
                  roughness={0.82}
                />
              </mesh>
              <mesh position={[0, -0.025, 0]}>
                <boxGeometry args={[0.094, 0.02, 0.182]} />
                <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* Upper Torso + Sleeves + Articulated Forearm/Chai Cup */}
      <group ref={torsoRef} position={[0, 0.82, 0]}>
        <mesh position={[0, 0.25, 0]} scale={[1.14, 1, 0.78]} castShadow={castShadow}>
          <cylinderGeometry args={[0.155, 0.132, 0.5, 14]} />
          <meshStandardMaterial
            color={resolvedShirtColor}
            map={isPlaidFriend ? plaidTex ?? undefined : undefined}
            roughness={0.78}
          />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.53, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.048, 0.054, 0.1, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.76} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.205, 0.44, 0]}>
          {isShortSleeve ? (
            <>
              <mesh position={[0, -0.075, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.048, 0.045, 0.15, 10]} />
                <meshStandardMaterial color={resolvedShirtColor} roughness={0.78} />
              </mesh>
              <mesh position={[0, -0.255, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.036, 0.031, 0.24, 10]} />
                <meshStandardMaterial color={skinColor} roughness={0.76} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, -0.185, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.044, 0.036, 0.37, 10]} />
              <meshStandardMaterial
                color={resolvedShirtColor}
                map={isPlaidFriend ? plaidTex ?? undefined : undefined}
                roughness={0.8}
              />
            </mesh>
          )}
          <mesh position={[0, -0.39, 0]}>
            <sphereGeometry args={[0.034, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.75} />
          </mesh>
        </group>

        {/* Right Arm + Forearm + Optional Kulhad */}
        <group ref={rightArmRef} position={[0.205, 0.44, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.047, 0.043, 0.18, 10]} />
            <meshStandardMaterial
              color={resolvedShirtColor}
              map={isPlaidFriend ? plaidTex ?? undefined : undefined}
              roughness={0.78}
            />
          </mesh>
          <group ref={rightForearmRef} position={[0, -0.19, 0]}>
            <mesh position={[0, -0.095, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.036, 0.03, 0.19, 10]} />
              <meshStandardMaterial
                color={isPlaidFriend ? resolvedShirtColor : skinColor}
                map={isPlaidFriend ? plaidTex ?? undefined : undefined}
                roughness={0.76}
              />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <sphereGeometry args={[0.033, 8, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.76} />
            </mesh>
            {holdingSweet && (
              <group name="held-mithai" position={[0, -0.205, -0.045]}>
                <mesh castShadow={castShadow}>
                  <sphereGeometry args={[0.032, 10, 10]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.65} />
                </mesh>
                <mesh position={[0, 0.028, 0]}>
                  <sphereGeometry args={[0.01, 6, 6]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.5} />
                </mesh>
              </group>
            )}
            {holdingChaiCup && (
              <mesh position={[0, -0.2, -0.055]} castShadow={castShadow}>
                <cylinderGeometry args={[0.042, 0.03, 0.085, 10]} />
                <meshStandardMaterial color="#b45309" roughness={0.85} />
              </mesh>
            )}
            {holdingFork && (
              <group position={[0, -0.2, -0.095]} rotation={[Math.PI / 2.2, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.007, 0.007, 0.18, 6]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.095, 0]}>
                  <sphereGeometry args={[0.024, 8, 6]} />
                  <meshStandardMaterial color="#eab308" roughness={0.78} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* Head, Eyes & Layered Hair (`Ishaan` tousled medium-wavy vs neat short cuts) */}
        <group ref={headRef} position={[0, 0.665, -0.01]}>
          <mesh scale={[0.94, 1.04, 0.96]} castShadow={castShadow}>
            <sphereGeometry args={[0.132, 16, 14]} />
            <meshStandardMaterial color={skinColor} roughness={0.74} />
          </mesh>
          <mesh position={[-0.04, 0.01, -0.115]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#18181b" roughness={0.35} />
          </mesh>
          <mesh position={[0.04, 0.01, -0.115]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#18181b" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.045, 0.015]} scale={[1.02, 0.94, 1.02]} castShadow={castShadow}>
            <sphereGeometry args={[0.136, 14, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.86} />
          </mesh>
          {isIshaan && (
            /* Tousled waves covering nape/back of crown (`ishaan and srishti.jpg`) */
            <mesh position={[0, -0.01, 0.085]} scale={[1.1, 0.85, 0.65]} castShadow={castShadow}>
              <sphereGeometry args={[0.105, 12, 10]} />
              <meshStandardMaterial color={hairColor} roughness={0.88} />
            </mesh>
          )}
          {isIshaan && tilakApplied && (
            /* Luminous vermilion Bhai Dooj tilak & akshat centered cleanly on forehead */
            <group position={[0, 0.044, -0.128]}>
              <mesh>
                <boxGeometry args={[0.018, 0.042, 0.012]} />
                <meshStandardMaterial
                  color="#dc2626"
                  emissive="#ef4444"
                  emissiveIntensity={0.45}
                  roughness={0.5}
                />
              </mesh>
              <mesh position={[0, 0.01, -0.008]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#fbbf24"
                  emissiveIntensity={0.35}
                  roughness={0.45}
                />
              </mesh>
            </group>
          )}
          <CharacterHeadOverlay variant={characterVariant} showTag={showNameTag} headY={0.28} />
        </group>
      </group>
    </group>
  );
}
