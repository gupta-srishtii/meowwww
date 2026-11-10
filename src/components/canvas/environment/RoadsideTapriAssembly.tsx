'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';

export type RoadsideStallVariant =
  | 'chai_tapri'
  | 'maggi_snacks'
  | 'fruit_coconut'
  | 'flower_puja'
  | 'refreshments_kiosk';

export interface RoadsideTapriAssemblyProps {
  /** Which side of the road centerline (`-X` left hillside or `+X` right turnout bay) this stall sits on. */
  sideOfRoad: 'left' | 'right';
  stallVariant?: RoadsideStallVariant;
  roofColor?: string;
  keeperShirtColor?: string;
  customerAColor?: string;
  customerBColor?: string;
  showSecondCustomer?: boolean;
  /** Optional local parked scooter/motorcycle safely outside driving lanes on berm. */
  showParkedScooter?: boolean;
  /** Optional level stone/earth retaining deck underneath for sloping hillside berms. */
  includeRetainingPlinth?: boolean;
  shadowsEnabled?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
  phaseOffset?: number;
}

const SNACK_PACKET_COLORS = ['#ef4444', '#facc15', '#22c55e', '#38bdf8'] as const;

/**
 * Shared living roadside vendor stall with 5 visually distinct regional archetypes:
 * 1. `chai_tapri` — terracotta pitched-tin tea stall w/ brass kettle & steam
 * 2. `maggi_snacks` — striped awning Maggi & snacks shack w/ stove, kadhai & snack strips
 * 3. `fruit_coconut` — green bamboo sun-umbrella fruit & tender-coconut stand
 * 4. `flower_puja` — saffron festival canopy w/ hanging marigold garlands & prasad baskets
 * 5. `refreshments_kiosk` — painted blue-and-cream hill kiosk booth w/ cold-drink crates & cooler
 *
 * Built in canonical `+X = road-facing front` space and rotated `PI` when mounted on the right shoulder.
 */
export function RoadsideTapriAssembly({
  sideOfRoad,
  stallVariant = 'chai_tapri',
  roofColor,
  keeperShirtColor = '#f59e0b',
  customerAColor = '#475569',
  customerBColor = '#0f766e',
  showSecondCustomer = true,
  showParkedScooter = false,
  includeRetainingPlinth = false,
  shadowsEnabled = false,
  paused = false,
  reducedMotion = false,
  phaseOffset = 0,
}: RoadsideTapriAssemblyProps) {
  const animTimeRef = useRef(phaseOffset);

  const keeperTorsoRef = useRef<THREE.Group>(null);
  const keeperHeadRef = useRef<THREE.Group>(null);
  const keeperRightArmRef = useRef<THREE.Group>(null);
  const keeperRightForearmRef = useRef<THREE.Group>(null);

  const custATorsoRef = useRef<THREE.Group>(null);
  const custAHeadRef = useRef<THREE.Group>(null);
  const custARightArmRef = useRef<THREE.Group>(null);
  const custARightForearmRef = useRef<THREE.Group>(null);

  const custBTorsoRef = useRef<THREE.Group>(null);
  const custBHeadRef = useRef<THREE.Group>(null);

  const panSteamRef = useRef<THREE.Group>(null);
  const kettleSteamRef = useRef<THREE.Group>(null);

  const isChai = stallVariant === 'chai_tapri';
  const isMaggi = stallVariant === 'maggi_snacks';
  const isFruit = stallVariant === 'fruit_coconut';
  const isPuja = stallVariant === 'flower_puja';
  const isKiosk = stallVariant === 'refreshments_kiosk';

  const resolvedRoofColor =
    roofColor ??
    (isFruit
      ? '#15803d'
      : isPuja
        ? '#ea580c'
        : isKiosk
          ? '#0369a1'
          : isMaggi
            ? '#d97706'
            : '#b45309');

  useFrame((_, rawDelta) => {
    if (paused || reducedMotion || (typeof document !== 'undefined' && document.hidden)) return;
    const delta = Math.min(rawDelta, 0.05);
    animTimeRef.current += delta;
    const t = animTimeRef.current;

    // 1. Vendor working/cooking animation tailored to stall type
    if (keeperRightArmRef.current && keeperRightForearmRef.current) {
      if (isMaggi || isChai) {
        keeperRightArmRef.current.rotation.x = 0.66 + Math.cos(t * 3.1) * 0.09;
        keeperRightArmRef.current.rotation.y = Math.sin(t * 3.1) * 0.16;
        keeperRightForearmRef.current.rotation.x = 0.45 + Math.cos(t * 3.1) * 0.08;
      } else if (isFruit || isPuja) {
        keeperRightArmRef.current.rotation.x = 0.52 + Math.sin(t * 2.4) * 0.14;
        keeperRightArmRef.current.rotation.y = Math.cos(t * 1.9) * 0.12;
        keeperRightForearmRef.current.rotation.x = 0.62 + Math.sin(t * 2.4) * 0.1;
      } else {
        // Kiosk vendor greeting & leaning near counter window
        keeperRightArmRef.current.rotation.x = 0.35 + Math.max(0, Math.sin(t * 1.6)) * 0.25;
        keeperRightForearmRef.current.rotation.x = 0.45 + Math.sin(t * 1.6) * 0.12;
      }
    }
    if (keeperTorsoRef.current) {
      keeperTorsoRef.current.position.y = 0.82 + Math.sin(t * 2.1) * 0.008;
      keeperTorsoRef.current.rotation.y = Math.sin(t * 1.1) * 0.05;
    }
    if (keeperHeadRef.current) {
      keeperHeadRef.current.rotation.x = -0.06 + Math.sin(t * 1.3) * 0.04;
      keeperHeadRef.current.rotation.y = Math.sin(t * 0.68) * 0.18;
    }

    // 2. Customer 1 sipping / holding snack / inspecting prasad
    if (custARightArmRef.current && custARightForearmRef.current) {
      const sipWave = Math.max(0, Math.sin(t * 0.9 + 0.6));
      custARightArmRef.current.rotation.x = 0.28 + sipWave * 0.16;
      custARightForearmRef.current.rotation.x = 0.66 + sipWave * 0.3;
    }
    if (custATorsoRef.current) {
      custATorsoRef.current.position.y = 0.82 + Math.sin(t * 1.7 + 1.0) * 0.007;
    }
    if (custAHeadRef.current) {
      custAHeadRef.current.rotation.y = Math.sin(t * 0.7 + 0.5) * 0.16;
    }
    if (custBTorsoRef.current && custBHeadRef.current) {
      custBTorsoRef.current.position.y = 0.82 + Math.sin(t * 1.6 + 2.2) * 0.007;
      custBHeadRef.current.rotation.y = Math.sin(t * 0.65 + 1.9) * 0.18;
    }

    // 3. Visible rising cooking steam plumes (Maggi & Chai stalls)
    const animateSteamPlume = (group: THREE.Group | null, speed: number, swayAmp: number) => {
      if (!group) return;
      for (let i = 0; i < group.children.length; i += 1) {
        const puff = group.children[i];
        const phase = (t * speed + i * 0.28) % 1;
        puff.position.y = phase * 0.74;
        puff.position.x = Math.sin(t * 2.0 + i * 1.4) * swayAmp;
        puff.scale.setScalar(0.6 + phase * 0.75);
      }
    };
    animateSteamPlume(panSteamRef.current, 0.72, 0.045);
    animateSteamPlume(kettleSteamRef.current, 0.82, 0.035);
  });

  const counterHeight = isFruit ? 0.84 : 0.92;
  const counterColor = isFruit ? '#a16207' : isKiosk ? '#0284c7' : isPuja ? '#9a3412' : '#78513c';

  return (
    <group rotation={[0, sideOfRoad === 'right' ? Math.PI : 0, 0]}>
      {/* Retaining Terrace Deck & Steps (deeply anchored for hillside shoulder stalls) */}
      {includeRetainingPlinth && (
        <group>
          <mesh position={[-0.1, -0.7, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[3.25, 1.4, 4.45]} />
            <meshStandardMaterial color="#736652" roughness={0.95} />
          </mesh>
          <mesh position={[1.48, -0.68, 0]} receiveShadow={shadowsEnabled}>
            <boxGeometry args={[0.48, 0.88, 2.35]} />
            <meshStandardMaterial color="#685d4b" roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* --- VARIANT-SPECIFIC SHELTER & ROOF GEOMETRY --- */}
      {isFruit ? (
        /* Umbrella Canopy + Open Bamboo Stand */
        <group>
          <mesh position={[-0.55, 1.38, 0]} castShadow={shadowsEnabled}>
            <cylinderGeometry args={[0.06, 0.075, 2.75, 8]} />
            <meshStandardMaterial color="#854d27" roughness={0.88} />
          </mesh>
          <mesh position={[0.25, 2.75, 0]} castShadow={shadowsEnabled}>
            <coneGeometry args={[1.95, 0.62, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          <mesh position={[0.25, 2.77, 0]} rotation={[0, Math.PI / 8, 0]}>
            <coneGeometry args={[1.92, 0.6, 8]} />
            <meshStandardMaterial color="#fef08a" roughness={0.82} />
          </mesh>
          <mesh position={[0.85, 2.2, 0]}>
            <boxGeometry args={[0.07, 0.22, 1.35]} />
            <meshStandardMaterial color="#fde047" roughness={0.65} />
          </mesh>
        </group>
      ) : isKiosk ? (
        /* Painted Blue & Cream Refreshments Booth w/ Open Front Window & Striped Visor */
        <group>
          {/* Rear wall, lower side walls, and roof cap enclosing booth cleanly around open front */}
          <mesh position={[-0.92, 1.26, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.1, 2.52, 3.25]} />
            <meshStandardMaterial color="#0369a1" roughness={0.78} />
          </mesh>
          {[-1.58, 1.58].map((sz, idx) => (
            <mesh key={idx} position={[0, 1.24, sz]} castShadow={shadowsEnabled}>
              <boxGeometry args={[1.82, 2.48, 0.1]} />
              <meshStandardMaterial color="#0284c7" roughness={0.78} />
            </mesh>
          ))}
          <mesh position={[0.02, 2.52, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[2.15, 0.14, 3.55]} />
            <meshStandardMaterial color="#e0f2fe" roughness={0.7} />
          </mesh>
          {/* Striped front window visor overhang */}
          <mesh position={[1.05, 2.26, 0]} rotation={[0, 0, -0.32]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.68, 0.08, 3.35]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.68} />
          </mesh>
          <mesh position={[0.94, 2.38, 0]}>
            <boxGeometry args={[0.08, 0.26, 1.9]} />
            <meshStandardMaterial color="#fef08a" roughness={0.62} />
          </mesh>
        </group>
      ) : (
        /* Classic Open Timber Posts + Sloped Roof / Temple Tent (`chai_tapri`, `maggi_snacks`, `flower_puja`) */
        <group>
          {[
            [-0.85, -1.65],
            [0.85, -1.65],
            [-0.85, 1.65],
            [0.85, 1.65],
          ].map(([px, pz], idx) => (
            <mesh key={idx} position={[px, 1.25, pz]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.055, 0.068, 2.5, 8]} />
              <meshStandardMaterial color="#5c4033" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[-0.92, 0.56, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.08, 1.12, 3.25]} />
            <meshStandardMaterial color="#6b4835" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.52, 0]} rotation={[0, 0, -0.09]} castShadow={shadowsEnabled}>
            <boxGeometry args={[2.35, 0.1, 3.85]} />
            <meshStandardMaterial color={resolvedRoofColor} roughness={0.78} />
          </mesh>
          {(isMaggi || isPuja) && (
            /* Accent roof stripe for visual variety */
            <mesh position={[0.42, 2.55, 0]} rotation={[0, 0, -0.09]}>
              <boxGeometry args={[0.9, 0.11, 3.87]} />
              <meshStandardMaterial
                color={isPuja ? '#facc15' : '#0369a1'}
                roughness={0.74}
              />
            </mesh>
          )}
          <mesh position={[0.94, 2.26, 0]}>
            <boxGeometry args={[0.08, 0.26, 1.82]} />
            <meshStandardMaterial color={isPuja ? '#fde047' : '#fef08a'} roughness={0.68} />
          </mesh>
          {[-1.2, -0.4, 0.4, 1.2].map((bz, idx) => (
            <mesh key={idx} position={[0.93, 2.09, bz]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color={isPuja ? '#fb923c' : '#fef08a'} />
            </mesh>
          ))}
        </group>
      )}

      {/* Interior warm fill so vendor face & props never fall into dark shadow */}
      <pointLight position={[0.25, 2.1, 0]} intensity={1.15} color="#fbbf24" distance={8.5} />

      {/* --- COUNTER BASE (`x = +0.24`, waist-high) --- */}
      <mesh
        position={[0.24, counterHeight * 0.5, 0]}
        castShadow={shadowsEnabled}
        receiveShadow={shadowsEnabled}
      >
        <boxGeometry args={[0.64, counterHeight, 2.58]} />
        <meshStandardMaterial color={counterColor} roughness={0.86} />
      </mesh>
      <mesh position={[0.24, counterHeight + 0.02, 0]} castShadow={shadowsEnabled}>
        <boxGeometry args={[0.7, 0.04, 2.64]} />
        <meshStandardMaterial color="#a67c52" roughness={0.8} />
      </mesh>

      {/* --- VARIANT-SPECIFIC PROPS & MERCHANDISE --- */}
      {(isChai || isMaggi) && (
        <>
          {/* Hanging snack strips along front eave posts */}
          {[-1.5, 1.5].map((stripZ, sIdx) => (
            <group key={sIdx} position={[0.82, 1.98, stripZ]}>
              {SNACK_PACKET_COLORS.map((pktColor, pIdx) => (
                <mesh key={pktColor} position={[0, -pIdx * 0.18, 0]}>
                  <boxGeometry args={[0.05, 0.14, 0.13]} />
                  <meshStandardMaterial color={pktColor} roughness={0.62} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Burner stove + hot pan w/ Maggi & ladle */}
          <group position={[0.2, counterHeight + 0.04, -0.36]}>
            <mesh position={[0, 0.025, 0]}>
              <boxGeometry args={[0.42, 0.05, 0.44]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.55} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.07, 0.12, 14]} />
              <meshBasicMaterial color="#fb923c" />
            </mesh>
            <mesh position={[0, 0.1, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.19, 0.14, 0.1, 14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.145, 0]}>
              <cylinderGeometry args={[0.155, 0.14, 0.04, 12]} />
              <meshStandardMaterial color="#facc15" roughness={0.82} />
            </mesh>
            <group ref={panSteamRef} position={[0, 0.22, 0]}>
              {[0, 1, 2, 3].map((idx) => (
                <mesh key={idx} position={[0, idx * 0.16, 0]}>
                  <sphereGeometry args={[0.075 + idx * 0.012, 8, 8]} />
                  <meshBasicMaterial color="#f8fafc" transparent opacity={0.45} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>

          {/* Steel chai kettle + rising steam */}
          <group position={[0.24, counterHeight + 0.04, 0.28]}>
            <mesh position={[0, 0.1, 0]} castShadow={shadowsEnabled}>
              <cylinderGeometry args={[0.12, 0.15, 0.2, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.72} roughness={0.28} />
            </mesh>
            <mesh position={[0.14, 0.13, 0]} rotation={[0, 0, -0.65]}>
              <cylinderGeometry args={[0.018, 0.026, 0.14, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
            </mesh>
            <group ref={kettleSteamRef} position={[0, 0.25, 0]}>
              {[0, 1, 2].map((idx) => (
                <mesh key={idx} position={[0, idx * 0.18, 0]}>
                  <sphereGeometry args={[0.065 + idx * 0.01, 8, 8]} />
                  <meshBasicMaterial color="#f8fafc" transparent opacity={0.42} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>

          {/* Kulhads & snack jar */}
          {[
            [0.34, counterHeight + 0.08, 0.72],
            [0.4, counterHeight + 0.08, 0.84],
            [0.36, counterHeight + 0.145, 0.78],
          ].map(([cx, cy, cz], idx) => (
            <mesh key={idx} position={[cx, cy, cz]}>
              <cylinderGeometry args={[0.04, 0.028, 0.08, 9]} />
              <meshStandardMaterial color="#b45309" roughness={0.85} />
            </mesh>
          ))}
        </>
      )}

      {isFruit && (
        /* Tender green coconut pyramids, banana bunches, oranges & blue icebox */
        <group position={[0.24, counterHeight + 0.04, 0]}>
          {/* Mound of green coconuts */}
          {[
            [0, 0.08, -0.68],
            [0.14, 0.08, -0.56],
            [-0.12, 0.08, -0.54],
            [0.02, 0.21, -0.6],
          ].map(([fx, fy, fz], idx) => (
            <mesh key={idx} position={[fx, fy, fz]} castShadow={shadowsEnabled}>
              <sphereGeometry args={[0.095, 10, 10]} />
              <meshStandardMaterial color="#4d7c0f" roughness={0.72} />
            </mesh>
          ))}
          {/* Hanging golden banana bunches */}
          {[-0.18, 0.15].map((bz, idx) => (
            <mesh key={idx} position={[0.42, 1.05, bz]} rotation={[0.2, 0, 0.35]}>
              <cylinderGeometry args={[0.08, 0.05, 0.26, 8]} />
              <meshStandardMaterial color="#facc15" roughness={0.65} />
            </mesh>
          ))}
          {/* Baskets of oranges & apples */}
          <mesh position={[0.05, 0.05, 0.22]}>
            <cylinderGeometry args={[0.22, 0.16, 0.1, 10]} />
            <meshStandardMaterial color="#92400e" roughness={0.88} />
          </mesh>
          {[
            [0.02, 0.11, 0.16],
            [0.12, 0.11, 0.25],
            [-0.04, 0.11, 0.27],
            [0.05, 0.18, 0.22],
          ].map(([ox, oy, oz], idx) => (
            <mesh key={idx} position={[ox, oy, oz]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#f97316" roughness={0.65} />
            </mesh>
          ))}
          {/* Timber chopping block & chilled ice cooler */}
          <mesh position={[0.05, 0.07, 0.85]}>
            <cylinderGeometry args={[0.16, 0.16, 0.14, 12]} />
            <meshStandardMaterial color="#78513c" roughness={0.9} />
          </mesh>
        </group>
      )}

      {isPuja && (
        /* Hanging marigold/jasmine flower garlands & prasad/bel-leaf wicker baskets */
        <group>
          {[-1.25, -0.75, -0.25, 0.25, 0.75, 1.25].map((gz, idx) => (
            <mesh key={idx} position={[0.85, 1.92, gz]}>
              <cylinderGeometry args={[0.045, 0.045, 0.78, 8]} />
              <meshStandardMaterial
                color={idx % 3 === 0 ? '#facc15' : idx % 3 === 1 ? '#fb923c' : '#f8fafc'}
                roughness={0.8}
              />
            </mesh>
          ))}
          {/* Three prasad wicker baskets resting along counter */}
          {[-0.78, 0.0, 0.78].map((bz, idx) => (
            <group key={idx} position={[0.28, counterHeight + 0.04, bz]}>
              <mesh position={[0, 0.055, 0]}>
                <cylinderGeometry args={[0.24, 0.17, 0.11, 10]} />
                <meshStandardMaterial color="#a16207" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                <meshStandardMaterial
                  color={idx === 0 ? '#fb923c' : idx === 1 ? '#15803d' : '#facc15'}
                  roughness={0.82}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {isKiosk && (
        /* Chilled beverage bottle rack on window shelf & red/white cooler chest beside kiosk */
        <>
          <group position={[0.26, counterHeight + 0.04, 0]}>
            {[-0.72, -0.52, -0.32, -0.12, 0.56, 0.74].map((bz, idx) => (
              <mesh key={idx} position={[0.06, 0.13, bz]}>
                <cylinderGeometry args={[0.04, 0.042, 0.24, 8]} />
                <meshStandardMaterial
                  color={idx % 3 === 0 ? '#38bdf8' : idx % 3 === 1 ? '#16a34a' : '#dc2626'}
                  roughness={0.28}
                  metalness={0.15}
                />
              </mesh>
            ))}
          </group>
          {/* Red cold-drinks icebox beside counter */}
          <group position={[0.92, 0.26, -0.82]}>
            <mesh castShadow={shadowsEnabled}>
              <boxGeometry args={[0.45, 0.52, 0.65]} />
              <meshStandardMaterial color="#dc2626" roughness={0.48} />
            </mesh>
            <mesh position={[0, 0.27, 0]}>
              <boxGeometry args={[0.48, 0.06, 0.68]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.5} />
            </mesh>
          </group>
        </>
      )}

      {/* --- ANIMATED VENDOR BEHIND COUNTER (`x = -0.38`, facing road `+X`) --- */}
      <StylizedPlaceholderCharacter
        characterVariant="traveler"
        torsoRef={keeperTorsoRef}
        headRef={keeperHeadRef}
        rightArmRef={keeperRightArmRef}
        rightForearmRef={keeperRightForearmRef}
        position={[-0.38, 0, -0.05]}
        rotationY={-Math.PI / 2}
        jacketColor={keeperShirtColor}
        pantsColor="#1e293b"
        hairColor="#18181b"
        scale={1.03}
        castShadow={shadowsEnabled}
      />

      {/* --- DISTINCT CUSTOMER ARRANGEMENTS --- */}
      {isChai && (
        <>
          <mesh position={[1.15, 0.21, 1.06]}>
            <cylinderGeometry args={[0.17, 0.15, 0.42, 10]} />
            <meshStandardMaterial color="#dc2626" roughness={0.72} />
          </mesh>
          <mesh position={[1.18, 0.21, -1.04]}>
            <cylinderGeometry args={[0.17, 0.15, 0.42, 10]} />
            <meshStandardMaterial color="#0284c7" roughness={0.72} />
          </mesh>
        </>
      )}

      <StylizedPlaceholderCharacter
        characterVariant="traveler"
        torsoRef={custATorsoRef}
        headRef={custAHeadRef}
        rightArmRef={custARightArmRef}
        rightForearmRef={custARightForearmRef}
        position={[0.98, 0, 0.82]}
        rotationY={Math.PI * 0.62}
        jacketColor={customerAColor}
        pantsColor="#334155"
        holdingChaiCup={isChai || isMaggi || isFruit}
        scale={0.98}
        castShadow={shadowsEnabled}
      />

      {showSecondCustomer && (
        <StylizedPlaceholderCharacter
          characterVariant="traveler"
          torsoRef={custBTorsoRef}
          headRef={custBHeadRef}
          position={[1.04, 0, isKiosk ? -0.22 : -0.84]}
          rotationY={Math.PI * 0.38}
          jacketColor={customerBColor}
          pantsColor="#1f2937"
          holdingChaiCup={isChai}
          scale={0.99}
          castShadow={shadowsEnabled}
        />
      )}

      {/* Optional Parked Local Scooter Safely Tucked Beside Berm Shoulder (clear of road lanes) */}
      {showParkedScooter && (
        <group position={[0.92, includeRetainingPlinth ? -0.52 : 0.0, 2.55]} rotation={[0, 0.32, 0]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.55, 1.35, 1]}>
            <circleGeometry args={[0.66, 12]} />
            <meshBasicMaterial color="#090d16" transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.46, 0.18]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.34, 0.28, 0.72]} />
            <meshStandardMaterial color={isPuja ? '#0f766e' : '#b91c1c'} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.54, -0.34]} rotation={[-0.2, 0, 0]} castShadow={shadowsEnabled}>
            <boxGeometry args={[0.34, 0.54, 0.22]} />
            <meshStandardMaterial color={isPuja ? '#0f766e' : '#b91c1c'} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.63, 0.22]}>
            <boxGeometry args={[0.26, 0.1, 0.68]} />
            <meshStandardMaterial color="#18181b" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.88, -0.36]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.62, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          {[-0.52, 0.54].map((wz, idx) => (
            <mesh key={idx} position={[0, 0.22, wz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.11, 14]} />
              <meshStandardMaterial color="#111827" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
