'use client';

import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { animateCharacterRig } from '@/components/canvas/characters/animateCharacterRig';
import { StylizedPlaceholderCharacter } from '@/components/canvas/characters/StylizedPlaceholderCharacter';
import {
  RoadsideTapriAssembly,
  type RoadsideStallVariant,
} from '@/components/canvas/environment/RoadsideTapriAssembly';
import { sampleRoadFrame, type MountainRoadSegmentId } from '@/lib/mountainSpline';

export interface RoadsideRoadLifeProps {
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  roadSegment: MountainRoadSegmentId;
  shadowsEnabled: boolean;
  leadDistRef?: RefObject<number>;
  paused?: boolean;
  reducedMotion?: boolean;
}

interface ShackSpec {
  id: string;
  dist: number;
  variant: RoadsideStallVariant;
  keeperShirt: string;
  guestAColor: string;
  guestBColor: string;
  showSecondCustomer?: boolean;
  showParkedScooter?: boolean;
}

interface WalkerSpec {
  id: string;
  centerDist: number;
  lateral: number;
  spanMeters: number;
  speedMps: number;
  phaseOffset: number;
  shirtColor: string;
  pantsColor: string;
}

const SHACKS_BY_SEGMENT: Record<MountainRoadSegmentId, readonly ShackSpec[]> = {
  to_dhaba: [
    {
      id: 'road-chai-1',
      dist: 48,
      variant: 'chai_tapri',
      keeperShirt: '#f59e0b',
      guestAColor: '#64748b',
      guestBColor: '#0f766e',
      showSecondCustomer: true,
      showParkedScooter: true,
    },
    {
      id: 'road-fruit-2',
      dist: 96,
      variant: 'fruit_coconut',
      keeperShirt: '#facc15',
      guestAColor: '#334155',
      guestBColor: '#475569',
      showSecondCustomer: false,
      showParkedScooter: false,
    },
    {
      id: 'road-kiosk-3',
      dist: 214,
      variant: 'refreshments_kiosk',
      keeperShirt: '#f8fafc',
      guestAColor: '#475569',
      guestBColor: '#c2410c',
      showSecondCustomer: true,
      showParkedScooter: true,
    },
  ],
  to_neelkanth: [
    {
      id: 'road-maggi-nk-1',
      dist: 96,
      variant: 'maggi_snacks',
      keeperShirt: '#ca8a04',
      guestAColor: '#334155',
      guestBColor: '#0f766e',
      showSecondCustomer: true,
      showParkedScooter: true,
    },
    {
      id: 'road-puja-nk-2',
      dist: 242,
      variant: 'flower_puja',
      keeperShirt: '#f97316',
      guestAColor: '#475569',
      guestBColor: '#9a3412',
      showSecondCustomer: true,
      showParkedScooter: false,
    },
  ],
  to_baalkuwari: [
    {
      id: 'road-chai-bk-1',
      dist: 76,
      variant: 'chai_tapri',
      keeperShirt: '#f59e0b',
      guestAColor: '#334155',
      guestBColor: '#0f766e',
      showSecondCustomer: true,
      showParkedScooter: true,
    },
    {
      id: 'road-fruit-bk-2',
      dist: 178,
      variant: 'fruit_coconut',
      keeperShirt: '#ca8a04',
      guestAColor: '#475569',
      guestBColor: '#334155',
      showSecondCustomer: false,
      showParkedScooter: true,
    },
  ],
  to_hotel_return: [
    {
      id: 'road-chai-ret-1',
      dist: 88,
      variant: 'refreshments_kiosk',
      keeperShirt: '#e2e8f0',
      guestAColor: '#475569',
      guestBColor: '#334155',
      showSecondCustomer: true,
      showParkedScooter: true,
    },
    {
      id: 'road-chai-ret-2',
      dist: 196,
      variant: 'chai_tapri',
      keeperShirt: '#f59e0b',
      guestAColor: '#0f766e',
      guestBColor: '#64748b',
      showSecondCustomer: false,
      showParkedScooter: false,
    },
  ],
};

// Strictly positioned on outer hillside berm (`lateral <= -4.18m`), clear of all traffic lanes and stalls
const WALKERS_BY_SEGMENT: Record<MountainRoadSegmentId, readonly WalkerSpec[]> = {
  to_dhaba: [
    {
      id: 'walker-1',
      centerDist: 24,
      lateral: -4.18,
      spanMeters: 6.5,
      speedMps: 1.05,
      phaseOffset: 0.4,
      shirtColor: '#475569',
      pantsColor: '#1e293b',
    },
    {
      id: 'walker-2',
      centerDist: 162,
      lateral: -4.18,
      spanMeters: 7.5,
      speedMps: 1.15,
      phaseOffset: 2.1,
      shirtColor: '#b45309',
      pantsColor: '#334155',
    },
    {
      id: 'walker-3',
      centerDist: 232,
      lateral: -4.18,
      spanMeters: 5.5,
      speedMps: 1.0,
      phaseOffset: 4.3,
      shirtColor: '#0f766e',
      pantsColor: '#1f2937',
    },
  ],
  to_neelkanth: [
    {
      id: 'walker-nk-1',
      centerDist: 42,
      lateral: -4.18,
      spanMeters: 7.5,
      speedMps: 1.1,
      phaseOffset: 1.0,
      shirtColor: '#c2410c',
      pantsColor: '#1e293b',
    },
    {
      id: 'walker-nk-2',
      centerDist: 172,
      lateral: -4.18,
      spanMeters: 8.0,
      speedMps: 1.05,
      phaseOffset: 3.1,
      shirtColor: '#475569',
      pantsColor: '#0f172a',
    },
    {
      id: 'walker-nk-3',
      centerDist: 276,
      lateral: -4.18,
      spanMeters: 6.5,
      speedMps: 1.15,
      phaseOffset: 0.8,
      shirtColor: '#a16207',
      pantsColor: '#1e293b',
    },
  ],
  to_baalkuwari: [
    {
      id: 'walker-bk-1',
      centerDist: 52,
      lateral: -4.18,
      spanMeters: 7.0,
      speedMps: 1.05,
      phaseOffset: 0.7,
      shirtColor: '#0f766e',
      pantsColor: '#1e293b',
    },
    {
      id: 'walker-bk-2',
      centerDist: 198,
      lateral: -4.18,
      spanMeters: 7.5,
      speedMps: 1.1,
      phaseOffset: 2.4,
      shirtColor: '#c2410c',
      pantsColor: '#334155',
    },
  ],
  to_hotel_return: [
    {
      id: 'walker-ret-1',
      centerDist: 136,
      lateral: -4.18,
      spanMeters: 7.0,
      speedMps: 1.0,
      phaseOffset: 1.3,
      shirtColor: '#475569',
      pantsColor: '#1e293b',
    },
  ],
};

const CURVE_CHEVRON_DISTS = [56, 118, 178, 248, 304];

function DistanceCulledStallGroup({
  dist,
  position,
  quaternion,
  leadDistRef,
  children,
}: {
  dist: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  leadDistRef?: RefObject<number>;
  children: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !leadDistRef) return;
    groupRef.current.visible = Math.abs(dist - leadDistRef.current) <= 145;
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      {children}
    </group>
  );
}

function BermWalkerInstance({
  spec,
  curve,
  totalLength,
  shadowsEnabled,
  paused,
  reducedMotion,
}: {
  spec: WalkerSpec;
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  shadowsEnabled: boolean;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const torsoRef = useRef<THREE.Group | null>(null);
  const headRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const leftKneeRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const rightKneeRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);

  const stateRef = useRef({
    phase: spec.phaseOffset,
    stridePhase: 0,
    prevX: 0,
    prevZ: 0,
    initialized: false,
  });

  const frameVecs = useMemo(
    () => ({
      pt: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
    }),
    []
  );

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const delta = Math.min(rawDelta, 0.05);
    const st = stateRef.current;
    if (!paused && !reducedMotion) {
      st.phase += (spec.speedMps / spec.spanMeters) * delta;
    }

    const offsetDist = Math.sin(st.phase) * spec.spanMeters;
    const travelSign = Math.cos(st.phase) >= 0 ? 1 : -1;
    const dist = THREE.MathUtils.clamp(spec.centerDist + offsetDist, 10, totalLength - 10);

    const { pt, tan, right, up } = frameVecs;
    sampleRoadFrame(curve, dist, totalLength, pt, tan, right, up);
    pt.addScaledVector(right, spec.lateral).addScaledVector(up, -0.02);

    const facingYaw = Math.atan2(-(tan.x * travelSign), -(tan.z * travelSign));
    if (!st.initialized) {
      st.prevX = pt.x;
      st.prevZ = pt.z;
      st.initialized = true;
    }

    const stepDist = Math.hypot(pt.x - st.prevX, pt.z - st.prevZ);
    st.prevX = pt.x;
    st.prevZ = pt.z;
    st.stridePhase += stepDist * 3.15;

    group.position.y = pt.y;
    animateCharacterRig({
      refs: {
        group,
        torso: torsoRef.current,
        head: headRef.current,
        leftLeg: leftLegRef.current,
        leftKnee: leftKneeRef.current,
        rightLeg: rightLegRef.current,
        rightKnee: rightKneeRef.current,
        leftArm: leftArmRef.current,
        rightArm: rightArmRef.current,
      },
      posX: pt.x,
      posZ: pt.z,
      facingYaw,
      strideRatio: paused || reducedMotion ? 0 : 0.72,
      stridePhase: st.stridePhase,
      elapsed: st.phase,
      delta,
      torsoBaseY: 0.82,
      idlePose: 'look_around',
      reducedMotion,
    });
    group.position.y =
      pt.y + (paused || reducedMotion ? 0 : Math.abs(Math.sin(st.stridePhase)) * 0.02);
  });

  return (
    <StylizedPlaceholderCharacter
      characterVariant="traveler"
      groupRef={groupRef}
      torsoRef={torsoRef}
      headRef={headRef}
      leftLegRef={leftLegRef}
      leftKneeRef={leftKneeRef}
      rightLegRef={rightLegRef}
      rightKneeRef={rightKneeRef}
      leftArmRef={leftArmRef}
      rightArmRef={rightArmRef}
      jacketColor={spec.shirtColor}
      pantsColor={spec.pantsColor}
      scale={0.97}
      castShadow={shadowsEnabled}
    />
  );
}

/**
 * Populates safe outer road berms (`lateral <= -4.18m`) with 5 visually distinct
 * vendor stalls (with atomic distance culling), berm pedestrians, and curve chevrons.
 */
export function RoadsideRoadLife({
  curve,
  totalLength,
  roadSegment,
  shadowsEnabled,
  leadDistRef,
  paused = false,
  reducedMotion = false,
}: RoadsideRoadLifeProps) {
  const shacks = SHACKS_BY_SEGMENT[roadSegment];
  const walkers = WALKERS_BY_SEGMENT[roadSegment];

  const shackTransforms = useMemo(() => {
    const pt = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basis = new THREE.Matrix4();

    return shacks.map((shack) => {
      sampleRoadFrame(curve, shack.dist, totalLength, pt, tan, right, up);
      const pos = pt.clone().addScaledVector(right, -5.15).addScaledVector(up, 0.54);
      basis.makeBasis(right, up, tan.clone().negate());
      const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
      return { shack, pos, quat };
    });
  }, [curve, totalLength, shacks]);

  const chevronTransforms = useMemo(() => {
    const pt = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basis = new THREE.Matrix4();

    return CURVE_CHEVRON_DISTS.map((dist, idx) => {
      const clampedDist = Math.min(dist, totalLength - 18);
      sampleRoadFrame(curve, clampedDist, totalLength, pt, tan, right, up);
      const side = idx % 2 === 0 ? -3.9 : 3.95;
      const pos = pt.clone().addScaledVector(right, side).addScaledVector(up, -0.02);
      basis.makeBasis(right, up, tan.clone().negate());
      const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
      return { id: `chev-${dist}`, pos, quat };
    });
  }, [curve, totalLength]);

  return (
    <>
      {shackTransforms.map(({ shack, pos, quat }, idx) => (
        <DistanceCulledStallGroup
          key={shack.id}
          dist={shack.dist}
          position={pos}
          quaternion={quat}
          leadDistRef={leadDistRef}
        >
          <RoadsideTapriAssembly
            sideOfRoad="left"
            stallVariant={shack.variant}
            keeperShirtColor={shack.keeperShirt}
            customerAColor={shack.guestAColor}
            customerBColor={shack.guestBColor}
            showSecondCustomer={shack.showSecondCustomer}
            showParkedScooter={shack.showParkedScooter}
            includeRetainingPlinth
            shadowsEnabled={shadowsEnabled}
            paused={paused}
            reducedMotion={reducedMotion}
            phaseOffset={idx * 1.9 + 0.5}
          />
        </DistanceCulledStallGroup>
      ))}

      {walkers.map((spec) => (
        <BermWalkerInstance
          key={spec.id}
          spec={spec}
          curve={curve}
          totalLength={totalLength}
          shadowsEnabled={shadowsEnabled}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Yellow/Black hill road curve warning chevrons (highway/paved segments only) */}
      {roadSegment !== 'to_baalkuwari' &&
        chevronTransforms.map(({ id, pos, quat }) => (
        <group key={id} position={pos} quaternion={quat}>
          <mesh position={[0, 0.68, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 1.36, 6]} />
            <meshStandardMaterial color="#64748b" roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.24, 0.04]}>
            <boxGeometry args={[0.48, 0.36, 0.06]} />
            <meshStandardMaterial color="#facc15" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.24, 0.075]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.14, 0.14, 0.02]} />
            <meshStandardMaterial color="#18181b" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* close conditional */}
    </>
  );
}
