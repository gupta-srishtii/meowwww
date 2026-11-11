'use client';

import type { RefObject } from 'react';
import * as THREE from 'three';
import { FabricGeometry, SoftBoxGeometry, DrapedFabricGeometry } from './FabricGeometry';

export interface StallCookCharacterProps {
  variant?: 'owner' | 'helper';
  groupRef?: RefObject<THREE.Group | null>;
  position?: [number, number, number];
  rotationY?: number;
  torsoRef?: RefObject<THREE.Group | null>;
  headRef?: RefObject<THREE.Group | null>;
  leftArmRef?: RefObject<THREE.Group | null>;
  rightArmRef?: RefObject<THREE.Group | null>;
  rightForearmRef?: RefObject<THREE.Group | null>;
  carryingServingTray?: boolean;
  castShadow?: boolean;
}

/**
 * Fictional background stall owner and helper for the roadside Maggi & Chai tapri.
 * Forward faces local -Z; feet rest cleanly at local y = 0.
 */
export function StallCookCharacter({
  variant = 'owner',
  groupRef,
  position = [0, 0, 0],
  rotationY = 0,
  torsoRef,
  headRef,
  leftArmRef,
  rightArmRef,
  rightForearmRef,
  carryingServingTray = false,
  castShadow = false,
}: StallCookCharacterProps) {
  const isOwner = variant === 'owner';
  const shirtColor = isOwner ? '#e7dcc8' : '#7ea8be';
  const pantsColor = isOwner ? '#2b313a' : '#262b34';
  const apronColor = isOwner ? '#574237' : '#3d4f5c';
  const hairColor = isOwner ? '#27272a' : '#18181b';
  const skinColor = '#dca57c';

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Contact shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* Pelvis & legs */}
      <mesh position={[0, 0.77, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.14, 0.145, 0.14, 10]} />
        <meshStandardMaterial color={pantsColor} roughness={0.86} />
      </mesh>
      <mesh position={[-0.095, 0.39, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.06, 0.048, 0.72, 10]} />
        <meshStandardMaterial color={pantsColor} roughness={0.86} />
      </mesh>
      <mesh position={[0.095, 0.39, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.06, 0.048, 0.72, 10]} />
        <meshStandardMaterial color={pantsColor} roughness={0.86} />
      </mesh>
      <mesh position={[-0.095, 0.036, -0.025]} castShadow={castShadow}>
        <SoftBoxGeometry size={[0.09, 0.07, 0.17]} />
        <meshStandardMaterial color="#18181b" roughness={0.9} />
      </mesh>
      <mesh position={[0.095, 0.036, -0.025]} castShadow={castShadow}>
        <SoftBoxGeometry size={[0.09, 0.07, 0.17]} />
        <meshStandardMaterial color="#18181b" roughness={0.9} />
      </mesh>

      {/* Torso + Apron + Gamcha (owner) + Articulated Cooking Arms */}
      <group ref={torsoRef} position={[0, 0.82, 0]}>
        <mesh position={[0, 0.25, 0]} scale={[1.15, 1, 0.78]} castShadow={castShadow}>
          <FabricGeometry top={0.158} bottom={0.135} height={0.5} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>

        {/* Modest cloth work apron */}
        <mesh position={[0, 0.12, -0.118]} castShadow={castShadow}>
          <DrapedFabricGeometry width={0.25} height={0.52} depth={0.008} />
          <meshStandardMaterial color={apronColor} side={THREE.DoubleSide} roughness={0.88} />
        </mesh>

        {/* Owner shoulder gamcha / kitchen towel */}
        {isOwner && (
          <mesh position={[-0.12, 0.39, 0.01]} rotation={[0.08, 0, -0.1]} castShadow={castShadow}>
            <DrapedFabricGeometry width={0.085} height={0.28} depth={0.014} />
            <meshStandardMaterial color="#9f3e34" side={THREE.DoubleSide} roughness={0.86} />
          </mesh>
        )}

        {/* Neck */}
        <mesh position={[0, 0.53, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.1, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.78} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.21, 0.44, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.044, 0.04, 0.18, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.27, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.036, 0.03, 0.2, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.78} />
          </mesh>
          <mesh position={[0, -0.39, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.78} />
          </mesh>
        </group>

        {/* Right Arm + Forearm + Cooking Utensil */}
        <group ref={rightArmRef} position={[0.21, 0.44, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.044, 0.04, 0.18, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <group ref={rightForearmRef} position={[0, -0.18, 0]}>
            <mesh position={[0, -0.1, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.036, 0.03, 0.2, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.21, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.78} />
            </mesh>

            {isOwner ? (
              /* Steel stirring spoon / spatula extending forward into Maggi kadhai */
              <group position={[0, -0.21, -0.14]} rotation={[Math.PI / 2.25, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.011, 0.011, 0.34, 8]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.17, 0]}>
                  <boxGeometry args={[0.06, 0.012, 0.075]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} />
                </mesh>
              </group>
            ) : carryingServingTray ? (
              /* Steel tray carrying Maggi plates & terracotta kulhads while serving table */
              <group position={[-0.2, -0.16, -0.18]}>
                <mesh castShadow={castShadow}>
                  <cylinderGeometry args={[0.25, 0.22, 0.025, 14]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.72} roughness={0.28} />
                </mesh>
                <mesh position={[-0.08, 0.04, -0.04]}>
                  <cylinderGeometry args={[0.09, 0.07, 0.04, 10]} />
                  <meshStandardMaterial color="#eab308" roughness={0.78} />
                </mesh>
                <mesh position={[0.09, 0.05, 0.05]}>
                  <cylinderGeometry args={[0.038, 0.028, 0.075, 8]} />
                  <meshStandardMaterial color="#b45309" roughness={0.85} />
                </mesh>
              </group>
            ) : (
              /* Small steel chai strainer / cup helper tool */
              <group position={[0, -0.21, -0.11]} rotation={[Math.PI / 2.3, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.009, 0.009, 0.22, 8]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.35} />
                </mesh>
                <mesh position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[0.045, 0.025, 0.04, 10]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.4} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* Head & Hair (plus subtle mustache for stall owner) */}
        <group ref={headRef} position={[0, 0.67, -0.01]}>
          <mesh scale={[0.96, 1.04, 0.98]} castShadow={castShadow}>
            <sphereGeometry args={[0.132, 14, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.76} />
          </mesh>
          <mesh position={[0, 0.045, 0.015]} scale={[1.02, 0.94, 1.02]} castShadow={castShadow}>
            <sphereGeometry args={[0.135, 12, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.88} />
          </mesh>
          {isOwner && (
            <mesh position={[0, -0.032, -0.125]}>
              <boxGeometry args={[0.068, 0.018, 0.022]} />
              <meshStandardMaterial color="#1f1f23" roughness={0.9} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

