'use client';

import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { HumanRigRefs } from '@/components/canvas/characters/animateCharacterRig';
import {
  StylizedPlaceholderCharacter,
  type CharacterVariant,
} from '@/components/canvas/characters/StylizedPlaceholderCharacter';

export type FriendCompanionId = 'srishti' | 'friend_black_tee' | 'friend_plaid';

export type CompanionRigMap = Record<FriendCompanionId, HumanRigRefs>;

interface SingleFriendProps {
  variant: CharacterVariant;
  hairColor: string;
  scale: number;
  initialPosition: [number, number, number];
  initialYaw: number;
  holdingChaiCup?: boolean;
  holdingFork?: boolean;
  onRegisterRefs: (id: FriendCompanionId, refs: HumanRigRefs) => void;
  id: FriendCompanionId;
}

function FriendRigInstance({
  id,
  variant,
  hairColor,
  scale,
  initialPosition,
  initialYaw,
  holdingChaiCup = false,
  holdingFork = false,
  onRegisterRefs,
}: SingleFriendProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const torsoRef = useRef<THREE.Group | null>(null);
  const headRef = useRef<THREE.Group | null>(null);
  const hairTailRef = useRef<THREE.Group | null>(null);
  const bagRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const leftKneeRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const rightKneeRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const rightForearmRef = useRef<THREE.Group | null>(null);

  useMemo(() => {
    onRegisterRefs(id, {
      get group() {
        return groupRef.current;
      },
      get torso() {
        return torsoRef.current;
      },
      get head() {
        return headRef.current;
      },
      get hairTail() {
        return hairTailRef.current;
      },
      get bag() {
        return bagRef.current;
      },
      get leftLeg() {
        return leftLegRef.current;
      },
      get leftKnee() {
        return leftKneeRef.current;
      },
      get rightLeg() {
        return rightLegRef.current;
      },
      get rightKnee() {
        return rightKneeRef.current;
      },
      get leftArm() {
        return leftArmRef.current;
      },
      get rightArm() {
        return rightArmRef.current;
      },
      get rightForearm() {
        return rightForearmRef.current;
      },
    });
  }, [id, onRegisterRefs]);

  return (
    <StylizedPlaceholderCharacter
      characterVariant={variant}
      groupRef={groupRef}
      torsoRef={torsoRef}
      headRef={headRef}
      hairTailRef={id === 'srishti' ? hairTailRef : undefined}
      bagRef={id === 'srishti' ? bagRef : undefined}
      leftLegRef={leftLegRef}
      leftKneeRef={leftKneeRef}
      rightLegRef={rightLegRef}
      rightKneeRef={rightKneeRef}
      leftArmRef={leftArmRef}
      rightArmRef={rightArmRef}
      rightForearmRef={rightForearmRef}
      position={initialPosition}
      rotationY={initialYaw}
      hairColor={hairColor}
      scale={scale}
      holdingChaiCup={holdingChaiCup}
      holdingFork={holdingFork}
    />
  );
}

export interface CompanionGroupProps {
  initialPositions: Record<
    FriendCompanionId,
    { x: number; y?: number; z: number; yaw: number }
  >;
  holdingChaiCup?: boolean;
  holdingFork?: boolean;
  onRigsReady: (rigs: CompanionRigMap) => void;
}

/**
 * Shared articulated group of Ishaan's three companions:
 * Srishti (verified floral peplum outfit, denim, hair clip & crossbody sling bag) plus
 * the two verified Scooter 2 friends (`friend_black_tee` and `friend_plaid`).
 */
export function CompanionGroup({
  initialPositions,
  holdingChaiCup = false,
  holdingFork = false,
  onRigsReady,
}: CompanionGroupProps) {
  const rigMapRef = useRef<Partial<CompanionRigMap>>({});

  const handleRegister = useMemo(
    () => (id: FriendCompanionId, refs: HumanRigRefs) => {
      rigMapRef.current[id] = refs;
      if (
        rigMapRef.current.srishti &&
        rigMapRef.current.friend_black_tee &&
        rigMapRef.current.friend_plaid
      ) {
        onRigsReady(rigMapRef.current as CompanionRigMap);
      }
    },
    [onRigsReady]
  );

  return (
    <>
      <FriendRigInstance
        id="srishti"
        variant="srishti"
        hairColor="#18181b"
        scale={1.0}
        initialPosition={[
          initialPositions.srishti.x,
          initialPositions.srishti.y ?? 0,
          initialPositions.srishti.z,
        ]}
        initialYaw={initialPositions.srishti.yaw}
        holdingChaiCup={holdingChaiCup}
        holdingFork={holdingFork}
        onRegisterRefs={handleRegister}
      />
      <FriendRigInstance
        id="friend_black_tee"
        variant="friend_black_tee"
        hairColor="#1c1917"
        scale={1.01}
        initialPosition={[
          initialPositions.friend_black_tee.x,
          initialPositions.friend_black_tee.y ?? 0,
          initialPositions.friend_black_tee.z,
        ]}
        initialYaw={initialPositions.friend_black_tee.yaw}
        holdingChaiCup={holdingChaiCup}
        holdingFork={holdingFork}
        onRegisterRefs={handleRegister}
      />
      <FriendRigInstance
        id="friend_plaid"
        variant="friend_plaid"
        hairColor="#111827"
        scale={0.99}
        initialPosition={[
          initialPositions.friend_plaid.x,
          initialPositions.friend_plaid.y ?? 0,
          initialPositions.friend_plaid.z,
        ]}
        initialYaw={initialPositions.friend_plaid.yaw}
        holdingChaiCup={holdingChaiCup}
        holdingFork={holdingFork}
        onRegisterRefs={handleRegister}
      />
    </>
  );
}
