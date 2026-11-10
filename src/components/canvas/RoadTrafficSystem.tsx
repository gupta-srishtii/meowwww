'use client';

import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import {
  ARRIVAL_ZONE_DISTANCE,
  VIEWPOINT_TURNOUT_END,
  VIEWPOINT_TURNOUT_START,
  sampleRoadFrame,
  type MountainRoadSegmentId,
} from '@/lib/mountainSpline';

export type TrafficVehicleStyle =
  | 'hatchback'
  | 'hill_suv'
  | 'sedan'
  | 'scooter'
  | 'commuter_bike';

export interface TrafficVehicleSpec {
  id: string;
  kind: 'car' | 'moto';
  direction: 1 | -1; // +1 same direction as hero scooters, -1 oncoming
  initialDist: number;
  baseLateral: number;
  speedMps: number;
  color: string;
  vehicleStyle?: TrafficVehicleStyle;
  hasPillion?: boolean;
  jacketColor?: string;
  helmetColor?: string;
}

export interface TrafficVehicleRuntime {
  spec: TrafficVehicleSpec;
  dist: number;
  lateral: number;
  passedLeadCooldown: number;
  wheelAngle: number;
  wheels?: THREE.Object3D[];
}

export interface ParkedShoulderVehicleSpec {
  id: string;
  kind: 'car' | 'moto';
  dist: number;
  lateral: number;
  facingSign: 1 | -1;
  color: string;
  vehicleStyle?: TrafficVehicleStyle;
}

export function buildRoadTrafficFleet(segment: MountainRoadSegmentId): TrafficVehicleSpec[] {
  const seedShift =
    segment === 'to_dhaba'
      ? 0
      : segment === 'to_neelkanth'
        ? 12
        : segment === 'to_baalkuwari'
          ? 20
          : 28;
  return [
    // Oncoming outer-left mountain traffic (`-Z` direction -> coming toward scooters)
    {
      id: 'onc-car-1',
      kind: 'car',
      vehicleStyle: 'sedan',
      direction: -1,
      initialDist: 78 + seedShift,
      baseLateral: -1.95,
      speedMps: 8.6,
      color: '#e2e8f0',
    },
    {
      id: 'onc-moto-1',
      kind: 'moto',
      vehicleStyle: 'commuter_bike',
      hasPillion: true,
      jacketColor: '#334155',
      helmetColor: '#dc2626',
      direction: -1,
      initialDist: 146 + seedShift,
      baseLateral: -1.75,
      speedMps: 9.4,
      color: '#b91c1c',
    },
    {
      id: 'onc-car-2',
      kind: 'car',
      vehicleStyle: 'hill_suv',
      direction: -1,
      initialDist: 218 + seedShift,
      baseLateral: -1.98,
      speedMps: 8.1,
      color: '#f59e0b',
    },
    {
      id: 'onc-moto-2',
      kind: 'moto',
      vehicleStyle: 'scooter',
      hasPillion: false,
      jacketColor: '#0f172a',
      helmetColor: '#e2e8f0',
      direction: -1,
      initialDist: 288 + seedShift,
      baseLateral: -1.72,
      speedMps: 9.8,
      color: '#1e293b',
    },
    {
      id: 'onc-car-3',
      kind: 'car',
      vehicleStyle: 'hatchback',
      direction: -1,
      initialDist: 356,
      baseLateral: -1.95,
      speedMps: 8.4,
      color: '#93c5fd',
    },
    // Same-direction slower local vehicles cruising ahead (overtake cleanly or follow)
    {
      id: 'fwd-moto-1',
      kind: 'moto',
      vehicleStyle: 'scooter',
      hasPillion: false,
      jacketColor: '#475569',
      helmetColor: '#f8fafc',
      direction: 1,
      initialDist: 44,
      baseLateral: 1.55,
      speedMps: 7.4,
      color: '#334155',
    },
    {
      id: 'fwd-car-1',
      kind: 'car',
      vehicleStyle: 'hill_suv',
      direction: 1,
      initialDist: 164 + seedShift,
      baseLateral: 1.5,
      speedMps: 6.8,
      color: '#cbd5e1',
    },
    {
      id: 'fwd-moto-2',
      kind: 'moto',
      vehicleStyle: 'commuter_bike',
      hasPillion: true,
      jacketColor: '#78350f',
      helmetColor: '#0f172a',
      direction: 1,
      initialDist: 238,
      baseLateral: 1.65,
      speedMps: 7.8,
      color: '#0f766e',
    },
  ];
}

export function buildParkedShoulderVehicles(
  segment: MountainRoadSegmentId
): ParkedShoulderVehicleSpec[] {
  return [
    {
      id: 'parked-1',
      kind: 'moto',
      vehicleStyle: 'commuter_bike',
      dist:
        segment === 'to_dhaba'
          ? 62
          : segment === 'to_neelkanth'
            ? 76
            : segment === 'to_baalkuwari'
              ? 94
              : 108,
      lateral: -4.15,
      facingSign: 1,
      color: '#475569',
    },
    {
      id: 'parked-2',
      kind: 'car',
      vehicleStyle: 'hatchback',
      dist:
        segment === 'to_dhaba'
          ? 196
          : segment === 'to_neelkanth'
            ? 212
            : segment === 'to_baalkuwari'
              ? 208
              : 184,
      lateral: -4.25,
      facingSign: -1,
      color: '#e5e7eb',
    },
  ];
}

export function createTrafficRuntime(
  fleet: TrafficVehicleSpec[],
  startLeadDist: number
): TrafficVehicleRuntime[] {
  return fleet.map((spec) => {
    let dist = spec.initialDist;
    // Guarantee clean initial gap so zero traffic starts overlapping scooters
    if (Math.abs(dist - startLeadDist) < 26) {
      dist = startLeadDist + (spec.direction === 1 ? 34 : 52);
    }
    return {
      spec,
      dist,
      lateral: spec.baseLateral,
      passedLeadCooldown: 0,
      wheelAngle: 0,
    };
  });
}

export interface StepTrafficParams {
  vehicles: TrafficVehicleRuntime[];
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  stopDist: number;
  delta: number;
  leadDist: number;
  leadLateral: number;
  compDist: number;
  compLateral: number;
  heroInPullOff: boolean;
  meshRefs: (THREE.Group | null)[];
  onPassWhoosh: () => void;
  onMinorBrush: (nudgeDirection: number) => void;
  canCollide: boolean;
}

export interface StepTrafficOutput {
  companionAvoidLateralShift: number;
}

const _pt = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _negTan = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

/**
 * Deterministic spline-following traffic update with spawn-safety guards,
 * smooth turnout clearance, wheel rolling rotation, passing whoosh trigger,
 * companion scooter avoidance, and forgiving soft-brush collision nudge.
 */
export function stepTrafficSimulation({
  vehicles,
  curve,
  totalLength,
  stopDist,
  delta,
  leadDist,
  leadLateral,
  compDist,
  compLateral,
  heroInPullOff,
  meshRefs,
  onPassWhoosh,
  onMinorBrush,
  canCollide,
}: StepTrafficParams): StepTrafficOutput {
  let companionAvoidLateralShift = 0;

  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.passedLeadCooldown > 0) {
      v.passedLeadCooldown = Math.max(0, v.passedLeadCooldown - delta);
    }

    // Move along spline
    v.dist += v.spec.direction * v.spec.speedMps * delta;

    // Recycle safely at route boundaries only far away from player and stop zones
    if (v.spec.direction === 1 && v.dist > totalLength - 24) {
      const candidate = 22;
      v.dist = Math.abs(candidate - leadDist) > 48 ? candidate : Math.max(18, leadDist - 62);
    } else if (v.spec.direction === -1 && v.dist < 16) {
      const candidate = totalLength - 24;
      v.dist =
        Math.abs(candidate - leadDist) > 48
          ? candidate
          : Math.min(totalLength - 18, leadDist + 66);
    }

    // Keep vehicles politely away from stationary pull-off bays along `+X` side
    const nearStop = Math.abs(v.dist - stopDist) < ARRIVAL_ZONE_DISTANCE;
    const nearViewpoint =
      v.dist >= VIEWPOINT_TURNOUT_START - 6 && v.dist <= VIEWPOINT_TURNOUT_END + 6;
    const targetLat =
      v.spec.direction === 1 && (nearStop || nearViewpoint)
        ? Math.min(v.spec.baseLateral, 0.9)
        : v.spec.baseLateral;
    const prevLat = v.lateral;
    v.lateral = THREE.MathUtils.damp(v.lateral, targetLat, 3.8, delta);

    const wheelRadius = v.spec.kind === 'car' ? 0.28 : 0.23;
    v.wheelAngle -= (v.spec.speedMps * delta) / wheelRadius;

    // Trigger soft passing breeze sound when sweeping past Scooter 1
    const longGapLead = v.dist - leadDist;
    const latGapLead = Math.abs(v.lateral - leadLateral);
    if (Math.abs(longGapLead) < 3.2 && v.passedLeadCooldown <= 0) {
      v.passedLeadCooldown = 2.0;
      if (latGapLead >= 0.7 && latGapLead < 4.5) {
        onPassWhoosh();
      }
    }

    // Forgiving soft-brush collision check against Scooter 1 (skipped while pulling off / parked)
    if (canCollide && !heroInPullOff) {
      const halfLength = v.spec.kind === 'car' ? 2.35 : 1.55;
      const halfWidthSum = v.spec.kind === 'car' ? 1.1 : 0.74;
      if (Math.abs(longGapLead) < halfLength && latGapLead < halfWidthSum) {
        const pushAway = leadLateral >= v.lateral ? 1 : -1;
        onMinorBrush(pushAway);
      }
    }

    // Compute gentle lateral avoidance for Companion Scooter 2 (`Manish & Yash`)
    const longGapComp = v.dist - compDist;
    if (Math.abs(longGapComp) < 13.0) {
      const latGapComp = v.lateral - compLateral;
      const minClearance = v.spec.kind === 'car' ? 1.55 : 1.15;
      if (Math.abs(latGapComp) < minClearance) {
        companionAvoidLateralShift = latGapComp < 0 ? 0.85 : -0.85;
      }
    }

    // Update 3D mesh matrix along curve + spinning wheels + subtle bike lean
    const group = meshRefs[i];
    if (group) {
      sampleRoadFrame(curve, v.dist, totalLength, _pt, _tan, _right, _up);
      group.position.copy(_pt).addScaledVector(_right, v.lateral).addScaledVector(_up, 0.02);
      _negTan.copy(_tan).negate();
      _basis.makeBasis(_right, _up, _negTan);
      group.quaternion.setFromRotationMatrix(_basis);
      if (v.spec.direction === -1) {
        group.quaternion.multiply(_flipQuat);
      }
      if (v.spec.kind === 'moto') {
        const latVel = (v.lateral - prevLat) / Math.max(delta, 0.008);
        group.rotateZ(THREE.MathUtils.clamp(-latVel * 0.06 * v.spec.direction, -0.14, 0.14));
      }

      if (!v.wheels) {
        const foundWheels: THREE.Object3D[] = [];
        group.traverse((child) => {
          if (child.name === 'traffic-wheel') foundWheels.push(child);
        });
        v.wheels = foundWheels;
      }
      for (let w = 0; w < v.wheels.length; w += 1) {
        v.wheels[w].rotation.x = v.wheelAngle;
      }
    }
  }

  return { companionAvoidLateralShift };
}

export function StylizedTrafficCar({
  color,
  style = 'hatchback',
  withDriver = true,
  castShadow,
}: {
  color: string;
  style?: TrafficVehicleStyle;
  withDriver?: boolean;
  castShadow: boolean;
}) {
  const isSuv = style === 'hill_suv';
  const isSedan = style === 'sedan';
  const bodyLen = isSedan ? 3.55 : isSuv ? 3.45 : 3.2;
  const cabinHeight = isSuv ? 0.54 : 0.43;
  const cabinZ = isSuv ? 0.24 : isSedan ? 0.14 : 0.2;

  return (
    <group>
      {/* Contact shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.68, bodyLen + 0.25]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {/* Lower body chassis */}
      <mesh position={[0, 0.48, 0]} castShadow={castShadow}>
        <boxGeometry args={[1.56, isSuv ? 0.62 : 0.54, bodyLen]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.22} />
      </mesh>
      {/* Front & rear bumpers */}
      <mesh position={[0, 0.26, -bodyLen * 0.5]}>
        <boxGeometry args={[1.54, 0.14, 0.08]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.26, bodyLen * 0.5]}>
        <boxGeometry args={[1.54, 0.14, 0.08]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>

      {/* Interior dark upholstery + seatbacks */}
      <mesh position={[0, 0.84, cabinZ]}>
        <boxGeometry args={[1.18, 0.3, 1.55]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Visible seated Indian hill driver silhouette on right seat (`+X`) */}
      {withDriver && (
        <group position={[0.3, 0.78, cabinZ - 0.24]}>
          {/* Seat headrest & torso */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.3, 10]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.29, -0.02]}>
            <sphereGeometry args={[0.105, 10, 10]} />
            <meshStandardMaterial color="#c9936d" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.34, 0.01]}>
            <sphereGeometry args={[0.108, 10, 8]} />
            <meshStandardMaterial color="#18181b" roughness={0.88} />
          </mesh>
        </group>
      )}

      {/* Roof pillars & roof panel */}
      <mesh position={[0, 0.78 + cabinHeight, cabinZ]} castShadow={castShadow}>
        <boxGeometry args={[1.3, 0.07, isSuv ? 2.1 : 1.75]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.22} />
      </mesh>
      {/* Subtle A/B/C pillars */}
      {[
        [-0.58, cabinZ - 0.75],
        [0.58, cabinZ - 0.75],
        [-0.58, cabinZ + 0.05],
        [0.58, cabinZ + 0.05],
        [-0.58, cabinZ + 0.82],
        [0.58, cabinZ + 0.82],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, 0.76 + cabinHeight * 0.45, pz]} castShadow={castShadow}>
          <boxGeometry args={[0.08, cabinHeight, 0.09]} />
          <meshStandardMaterial color={color} roughness={0.42} />
        </mesh>
      ))}

      {/* Translucent front windshield & rear/side glass revealing interior & driver */}
      <mesh position={[0, 0.77 + cabinHeight * 0.46, cabinZ - 0.86]} rotation={[-0.36, 0, 0]}>
        <boxGeometry args={[1.22, cabinHeight * 0.9, 0.05]} />
        <meshStandardMaterial
          color="#93c5fd"
          transparent
          opacity={0.44}
          roughness={0.14}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.77 + cabinHeight * 0.44, cabinZ + 0.04]}>
        <boxGeometry args={[1.28, cabinHeight * 0.76, 1.5]} />
        <meshStandardMaterial
          color="#475569"
          transparent
          opacity={0.48}
          roughness={0.16}
          metalness={0.4}
        />
      </mesh>

      {/* Hill SUV roof carrier rack & tailgate spare tire */}
      {isSuv && (
        <>
          <mesh position={[0, 0.86 + cabinHeight, cabinZ + 0.05]}>
            <boxGeometry args={[1.15, 0.08, 1.45]} />
            <meshStandardMaterial color="#18181b" roughness={0.75} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.58, bodyLen * 0.5 + 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.14, 14]} />
            <meshStandardMaterial color="#111827" roughness={0.88} />
          </mesh>
        </>
      )}

      {/* Daytime LED headlights (`-Z` forward) & red taillights (`+Z` rear) */}
      <mesh position={[-0.52, 0.48, -bodyLen * 0.5 - 0.01]}>
        <boxGeometry args={[0.26, 0.14, 0.04]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.52, 0.48, -bodyLen * 0.5 - 0.01]}>
        <boxGeometry args={[0.26, 0.14, 0.04]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.52, 0.5, bodyLen * 0.5 + 0.01]}>
        <boxGeometry args={[0.26, 0.14, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.52, 0.5, bodyLen * 0.5 + 0.01]}>
        <boxGeometry args={[0.26, 0.14, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>

      {/* Four spinning wheels with silver alloy hubs */}
      {[
        [-0.78, 0.28, -1.04],
        [0.78, 0.28, -1.04],
        [-0.78, 0.28, 1.04],
        [0.78, 0.28, 1.04],
      ].map(([wx, wy, wz], idx) => (
        <group key={idx} name="traffic-wheel" position={[wx, wy, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.28, 0.28, 0.17, 16]} />
            <meshStandardMaterial color="#111827" roughness={0.92} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.18, 10]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.75} />
          </mesh>
          {/* Hub lug spoke bar so rotation reads crisply */}
          <mesh>
            <boxGeometry args={[0.19, 0.26, 0.05]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StylizedTrafficMoto({
  color,
  style = 'commuter_bike',
  hasPillion = false,
  jacketColor = '#334155',
  helmetColor = '#1e293b',
  castShadow,
  withRider = true,
}: {
  color: string;
  style?: TrafficVehicleStyle;
  hasPillion?: boolean;
  jacketColor?: string;
  helmetColor?: string;
  castShadow: boolean;
  withRider?: boolean;
}) {
  const isScooter = style === 'scooter';

  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.55, 1.35, 1]}>
        <circleGeometry args={[0.68, 14]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {isScooter ? (
        <>
          {/* Step-through scooter cowl + deck */}
          <mesh position={[0, 0.56, -0.34]} rotation={[-0.22, 0, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.36, 0.58, 0.24]} />
            <meshStandardMaterial color={color} roughness={0.36} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.26, -0.05]}>
            <boxGeometry args={[0.34, 0.08, 0.45]} />
            <meshStandardMaterial color="#1f2937" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.48, 0.24]} castShadow={castShadow}>
            <boxGeometry args={[0.34, 0.28, 0.72]} />
            <meshStandardMaterial color={color} roughness={0.38} metalness={0.2} />
          </mesh>
        </>
      ) : (
        <>
          {/* Commuter motorcycle sculpted tank + chassis + exhaust */}
          <mesh position={[0, 0.42, 0.04]} castShadow={castShadow}>
            <boxGeometry args={[0.26, 0.24, 0.96]} />
            <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.65, -0.22]} castShadow={castShadow}>
            <boxGeometry args={[0.32, 0.22, 0.46]} />
            <meshStandardMaterial color={color} roughness={0.32} metalness={0.25} />
          </mesh>
          <mesh position={[0.17, 0.3, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.68, 10]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
          </mesh>
        </>
      )}

      {/* Dual seat */}
      <mesh position={[0, isScooter ? 0.65 : 0.62, 0.22]}>
        <boxGeometry args={[0.28, 0.11, 0.72]} />
        <meshStandardMaterial color="#18181b" roughness={0.88} />
      </mesh>
      {/* Headlight & Taillight */}
      <mesh position={[0, 0.88, -0.52]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[0, 0.63, 0.6]}>
        <boxGeometry args={[0.16, 0.07, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.65} />
      </mesh>
      {/* Front fork & handlebars */}
      <mesh position={[0, 0.92, -0.38]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.66, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[-0.1, 0.62, -0.45]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.02, 0.62, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0.1, 0.62, -0.45]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.02, 0.62, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Spinning front & rear spoked wheels */}
      {[-0.55, 0.56].map((wz, idx) => (
        <group key={idx} name="traffic-wheel" position={[0, 0.23, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow}>
            <cylinderGeometry args={[0.23, 0.23, 0.12, 16]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.13, 10]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 0.22, 0.035]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Full articulated seated rider on EVERY moving 2-wheeler (arms on bars + legs + visor helmet) */}
      {withRider && (
        <group position={[0, 0.69, 0.04]}>
          {/* Seated thighs & calves astride footpegs */}
          {[-0.14, 0.14].map((lx, idx) => (
            <group key={idx} position={[lx, -0.02, -0.02]}>
              <mesh position={[0, -0.08, -0.11]} rotation={[0.88, 0, 0]}>
                <cylinderGeometry args={[0.054, 0.046, 0.3, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.86} />
              </mesh>
              <mesh position={[0, -0.24, -0.2]} rotation={[-0.25, 0, 0]}>
                <cylinderGeometry args={[0.044, 0.038, 0.28, 8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.86} />
              </mesh>
            </group>
          ))}
          {/* Leaning riding jacket torso */}
          <mesh position={[0, 0.22, -0.04]} rotation={[-0.22, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.145, 0.125, 0.44, 10]} />
            <meshStandardMaterial color={jacketColor} roughness={0.8} />
          </mesh>
          {/* Rider arms gripping handlebars (`-Z` forward -> positive X tilt around shoulder) */}
          {[-0.17, 0.17].map((ax, idx) => (
            <mesh
              key={idx}
              position={[ax, 0.26, -0.22]}
              rotation={[1.05, 0, ax < 0 ? 0.15 : -0.15]}
            >
              <cylinderGeometry args={[0.038, 0.032, 0.42, 8]} />
              <meshStandardMaterial color={jacketColor} roughness={0.78} />
            </mesh>
          ))}
          {/* Helmet + dark glossy visor */}
          <group position={[0, 0.52, -0.1]}>
            <mesh castShadow={castShadow}>
              <sphereGeometry args={[0.135, 12, 10]} />
              <meshStandardMaterial color={helmetColor} roughness={0.32} metalness={0.2} />
            </mesh>
            <mesh position={[0, -0.01, -0.105]}>
              <boxGeometry args={[0.17, 0.065, 0.08]} />
              <meshStandardMaterial color="#090d16" roughness={0.18} metalness={0.65} />
            </mesh>
          </group>
        </group>
      )}

      {/* Optional pillion passenger behind rider */}
      {withRider && hasPillion && (
        <group position={[0, 0.72, 0.39]}>
          {[-0.13, 0.13].map((lx, idx) => (
            <group key={idx} position={[lx, -0.04, -0.02]}>
              <mesh position={[0, -0.12, -0.08]} rotation={[0.65, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.044, 0.28, 8]} />
                <meshStandardMaterial color="#334155" roughness={0.86} />
              </mesh>
              <mesh position={[0, -0.27, -0.14]}>
                <cylinderGeometry args={[0.04, 0.035, 0.24, 8]} />
                <meshStandardMaterial color="#334155" roughness={0.86} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.21, 0]} rotation={[-0.1, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.135, 0.12, 0.4, 10]} />
            <meshStandardMaterial color="#b45309" roughness={0.82} />
          </mesh>
          {[-0.15, 0.15].map((ax, idx) => (
            <mesh key={idx} position={[ax, 0.22, -0.14]} rotation={[0.75, 0, 0]}>
              <cylinderGeometry args={[0.034, 0.03, 0.34, 8]} />
              <meshStandardMaterial color="#b45309" roughness={0.82} />
            </mesh>
          ))}
          <group position={[0, 0.5, -0.02]}>
            <mesh castShadow={castShadow}>
              <sphereGeometry args={[0.128, 12, 10]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.38} />
            </mesh>
            <mesh position={[0, -0.01, -0.098]}>
              <boxGeometry args={[0.155, 0.058, 0.075]} />
              <meshStandardMaterial color="#090d16" roughness={0.2} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

export interface RoadTrafficVisualsProps {
  fleet: TrafficVehicleSpec[];
  parkedVehicles: ParkedShoulderVehicleSpec[];
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  meshRefs: RefObject<(THREE.Group | null)[]>;
  castShadow: boolean;
}

export function RoadTrafficVisuals({
  fleet,
  parkedVehicles,
  curve,
  totalLength,
  meshRefs,
  castShadow,
}: RoadTrafficVisualsProps) {
  const parkedTransforms = useMemo(
    () =>
      parkedVehicles.map((pv) => {
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        sampleRoadFrame(curve, pv.dist, totalLength, pt, tan, right, up);
        const pos = pt.clone().addScaledVector(right, pv.lateral).addScaledVector(up, -0.015);
        const basis = new THREE.Matrix4().makeBasis(right, up, tan.clone().negate());
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
        if (pv.facingSign === -1) {
          quat.multiply(_flipQuat);
        }
        return { pv, pos, quat };
      }),
    [parkedVehicles, curve, totalLength]
  );

  return (
    <>
      {fleet.map((spec, index) => (
        <group
          key={spec.id}
          ref={(el) => {
            if (meshRefs.current) {
              meshRefs.current[index] = el;
            }
          }}
        >
          {spec.kind === 'car' ? (
            <StylizedTrafficCar
              color={spec.color}
              style={spec.vehicleStyle}
              withDriver
              castShadow={castShadow}
            />
          ) : (
            <StylizedTrafficMoto
              color={spec.color}
              style={spec.vehicleStyle}
              hasPillion={spec.hasPillion}
              jacketColor={spec.jacketColor}
              helmetColor={spec.helmetColor}
              withRider
              castShadow={castShadow}
            />
          )}
        </group>
      ))}

      {parkedTransforms.map(({ pv, pos, quat }) => (
        <group key={pv.id} position={pos} quaternion={quat}>
          {pv.kind === 'car' ? (
            <StylizedTrafficCar
              color={pv.color}
              style={pv.vehicleStyle}
              withDriver={false}
              castShadow={castShadow}
            />
          ) : (
            <StylizedTrafficMoto
              color={pv.color}
              style={pv.vehicleStyle}
              withRider={false}
              castShadow={castShadow}
            />
          )}
        </group>
      ))}
    </>
  );
}
