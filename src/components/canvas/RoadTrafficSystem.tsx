'use client';

import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  if (segment === 'to_baalkuwari') {
    // Rugged dirt track: oncoming keeps its own left (+right), forward keeps hero left (-right)
    return [
      {
        id: 'offroad-onc-moto-1',
        kind: 'moto',
        vehicleStyle: 'commuter_bike',
        hasPillion: false,
        jacketColor: '#334155',
        helmetColor: '#dc2626',
        direction: -1,
        initialDist: 108,
        baseLateral: 1.8,
        speedMps: 6.8,
        color: '#b91c1c',
      },
      {
        id: 'offroad-onc-suv-1',
        kind: 'car',
        vehicleStyle: 'hill_suv',
        direction: -1,
        initialDist: 224,
        baseLateral: 1.95,
        speedMps: 6.2,
        color: '#d97706',
      },
      {
        id: 'offroad-fwd-moto-1',
        kind: 'moto',
        vehicleStyle: 'commuter_bike',
        hasPillion: true,
        jacketColor: '#78350f',
        helmetColor: '#0f172a',
        direction: 1,
        initialDist: 64,
        baseLateral: -1.65,
        speedMps: 6.6,
        color: '#0f766e',
      },
    ];
  }

  const seedShift =
    segment === 'to_dhaba'
      ? 0
      : segment === 'to_neelkanth'
        ? 12
        : 28;
  return [
    // India LHT: Oncoming traffic (`-tangent`) travels in ITS left lane (`+right` relative to hero)
    {
      id: 'onc-car-1',
      kind: 'car',
      vehicleStyle: 'sedan',
      direction: -1,
      initialDist: 78 + seedShift,
      baseLateral: 1.95,
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
      baseLateral: 1.75,
      speedMps: 9.4,
      color: '#b91c1c',
    },
    {
      id: 'onc-car-2',
      kind: 'car',
      vehicleStyle: 'hill_suv',
      direction: -1,
      initialDist: 218 + seedShift,
      baseLateral: 1.98,
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
      baseLateral: 1.72,
      speedMps: 9.8,
      color: '#1e293b',
    },
    {
      id: 'onc-car-3',
      kind: 'car',
      vehicleStyle: 'hatchback',
      direction: -1,
      initialDist: 356,
      baseLateral: 1.95,
      speedMps: 8.4,
      color: '#93c5fd',
    },
    // India LHT: Same-direction slower vehicles (`+tangent`) stay on LEFT (`-right`), hero overtakes on right
    {
      id: 'fwd-moto-1',
      kind: 'moto',
      vehicleStyle: 'scooter',
      hasPillion: false,
      jacketColor: '#475569',
      helmetColor: '#f8fafc',
      direction: 1,
      initialDist: 44,
      baseLateral: -1.65,
      speedMps: 7.4,
      color: '#334155',
    },
    {
      id: 'fwd-car-1',
      kind: 'car',
      vehicleStyle: 'hill_suv',
      direction: 1,
      initialDist: 164 + seedShift,
      baseLateral: -1.85,
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
      baseLateral: -1.72,
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
      vehicleStyle: segment === 'to_baalkuwari' ? 'hill_suv' : 'hatchback',
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

    // Keep vehicles politely away from pull-off turnouts along `+X` apron and left stalls
    const nearStop = Math.abs(v.dist - stopDist) < ARRIVAL_ZONE_DISTANCE;
    const nearViewpoint =
      v.dist >= VIEWPOINT_TURNOUT_START - 6 && v.dist <= VIEWPOINT_TURNOUT_END + 6;
    const targetLat =
      nearStop || nearViewpoint
        ? v.spec.direction === 1
          ? Math.min(v.spec.baseLateral, -1.65)
          : Math.min(v.spec.baseLateral, 1.35)
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

function bakePartGeometry(
  source: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  hexColor?: string
): THREE.BufferGeometry {
  const nonIndexed = source.index ? source.toNonIndexed() : source.clone();
  if (nonIndexed.getAttribute('uv')) {
    nonIndexed.deleteAttribute('uv');
  }
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const mat = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    quat,
    new THREE.Vector3(scale[0], scale[1], scale[2])
  );
  nonIndexed.applyMatrix4(mat);
  source.dispose();

  if (hexColor !== undefined) {
    const count = nonIndexed.getAttribute('position').count;
    const c = new THREE.Color(hexColor);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  return nonIndexed;
}

function mergeAndDispose(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i += 1) {
    parts[i].dispose();
  }
  return merged ?? new THREE.BufferGeometry();
}

const _sharedDetailMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.14,
});

const _sharedWheelMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.68,
  metalness: 0.35,
});

const _sharedGlassMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.45,
  roughness: 0.15,
  metalness: 0.45,
});

const _sharedShadowMat = new THREE.MeshBasicMaterial({
  color: '#090d16',
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
});

const _paintMaterials = new Map<string, THREE.MeshStandardMaterial>();
function getTrafficPaintMaterial(hexColor: string): THREE.MeshStandardMaterial {
  let mat = _paintMaterials.get(hexColor);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.38,
      metalness: 0.22,
    });
    _paintMaterials.set(hexColor, mat);
  }
  return mat;
}

let _cachedCarWheelGeom: THREE.BufferGeometry | null = null;
function getCarWheelGeometry(): THREE.BufferGeometry {
  if (!_cachedCarWheelGeom) {
    _cachedCarWheelGeom = mergeAndDispose([
      bakePartGeometry(
        new THREE.CylinderGeometry(0.28, 0.28, 0.17, 16),
        [0, 0, 0],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        '#111827'
      ),
      bakePartGeometry(
        new THREE.CylinderGeometry(0.16, 0.16, 0.18, 10),
        [0, 0, 0],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        '#cbd5e1'
      ),
      bakePartGeometry(
        new THREE.BoxGeometry(0.19, 0.26, 0.05),
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 1],
        '#64748b'
      ),
    ]);
  }
  return _cachedCarWheelGeom;
}

let _cachedMotoWheelGeom: THREE.BufferGeometry | null = null;
function getMotoWheelGeometry(): THREE.BufferGeometry {
  if (!_cachedMotoWheelGeom) {
    _cachedMotoWheelGeom = mergeAndDispose([
      bakePartGeometry(
        new THREE.CylinderGeometry(0.23, 0.23, 0.12, 16),
        [0, 0, 0],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        '#111827'
      ),
      bakePartGeometry(
        new THREE.CylinderGeometry(0.13, 0.13, 0.13, 10),
        [0, 0, 0],
        [0, 0, Math.PI / 2],
        [1, 1, 1],
        '#94a3b8'
      ),
      bakePartGeometry(
        new THREE.BoxGeometry(0.14, 0.22, 0.035),
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 1],
        '#64748b'
      ),
    ]);
  }
  return _cachedMotoWheelGeom;
}

interface CarGeometrySet {
  shadowGeom: THREE.BufferGeometry;
  bodyGeom: THREE.BufferGeometry;
  detailGeom: THREE.BufferGeometry;
  glassGeom: THREE.BufferGeometry;
}

const _carGeoCache = new Map<string, CarGeometrySet>();
function getCarGeometrySet(style: TrafficVehicleStyle, withDriver: boolean): CarGeometrySet {
  const normalizedStyle: TrafficVehicleStyle =
    style === 'hill_suv' || style === 'sedan' ? style : 'hatchback';
  const key = `${normalizedStyle}_${withDriver ? 'drv' : 'parked'}`;
  const cached = _carGeoCache.get(key);
  if (cached) return cached;

  const isSuv = normalizedStyle === 'hill_suv';
  const isSedan = normalizedStyle === 'sedan';
  const bodyLen = isSedan ? 3.55 : isSuv ? 3.45 : 3.2;
  const cabinHeight = isSuv ? 0.54 : 0.43;
  const cabinZ = isSuv ? 0.24 : isSedan ? 0.14 : 0.2;

  const shadowGeom = bakePartGeometry(
    new THREE.PlaneGeometry(1.68, bodyLen + 0.25),
    [0, 0.02, 0],
    [-Math.PI / 2, 0, 0]
  );

  const bodyParts: THREE.BufferGeometry[] = [
    bakePartGeometry(
      new THREE.BoxGeometry(1.56, isSuv ? 0.62 : 0.54, bodyLen),
      [0, 0.48, 0]
    ),
    bakePartGeometry(
      new THREE.BoxGeometry(1.3, 0.07, isSuv ? 2.1 : 1.75),
      [0, 0.78 + cabinHeight, cabinZ]
    ),
  ];
  const pillarOffsets: Array<[number, number]> = [
    [-0.58, cabinZ - 0.75],
    [0.58, cabinZ - 0.75],
    [-0.58, cabinZ + 0.05],
    [0.58, cabinZ + 0.05],
    [-0.58, cabinZ + 0.82],
    [0.58, cabinZ + 0.82],
  ];
  for (let i = 0; i < pillarOffsets.length; i += 1) {
    const [px, pz] = pillarOffsets[i];
    bodyParts.push(
      bakePartGeometry(
        new THREE.BoxGeometry(0.08, cabinHeight, 0.09),
        [px, 0.76 + cabinHeight * 0.45, pz]
      )
    );
  }
  const bodyGeom = mergeAndDispose(bodyParts);

  const detailParts: THREE.BufferGeometry[] = [
    // Front & rear bumpers
    bakePartGeometry(new THREE.BoxGeometry(1.54, 0.14, 0.08), [0, 0.26, -bodyLen * 0.5], [0, 0, 0], [1, 1, 1], '#1f2937'),
    bakePartGeometry(new THREE.BoxGeometry(1.54, 0.14, 0.08), [0, 0.26, bodyLen * 0.5], [0, 0, 0], [1, 1, 1], '#1f2937'),
    // Interior upholstery
    bakePartGeometry(new THREE.BoxGeometry(1.18, 0.3, 1.55), [0, 0.84, cabinZ], [0, 0, 0], [1, 1, 1], '#1e293b'),
    // Daytime LED headlights (`-Z`) & red taillights (`+Z`)
    bakePartGeometry(new THREE.BoxGeometry(0.26, 0.14, 0.04), [-0.52, 0.48, -bodyLen * 0.5 - 0.01], [0, 0, 0], [1, 1, 1], '#fef08a'),
    bakePartGeometry(new THREE.BoxGeometry(0.26, 0.14, 0.04), [0.52, 0.48, -bodyLen * 0.5 - 0.01], [0, 0, 0], [1, 1, 1], '#fef08a'),
    bakePartGeometry(new THREE.BoxGeometry(0.26, 0.14, 0.04), [-0.52, 0.5, bodyLen * 0.5 + 0.01], [0, 0, 0], [1, 1, 1], '#ef4444'),
    bakePartGeometry(new THREE.BoxGeometry(0.26, 0.14, 0.04), [0.52, 0.5, bodyLen * 0.5 + 0.01], [0, 0, 0], [1, 1, 1], '#ef4444'),
  ];

  if (withDriver) {
    detailParts.push(
      bakePartGeometry(
        new THREE.CylinderGeometry(0.14, 0.16, 0.3, 10),
        [0.3, 0.78 + 0.08, cabinZ - 0.24],
        [0, 0, 0],
        [1, 1, 1],
        '#e2e8f0'
      ),
      bakePartGeometry(
        new THREE.SphereGeometry(0.105, 10, 10),
        [0.3, 0.78 + 0.29, cabinZ - 0.26],
        [0, 0, 0],
        [1, 1, 1],
        '#c9936d'
      ),
      bakePartGeometry(
        new THREE.SphereGeometry(0.108, 10, 8),
        [0.3, 0.78 + 0.34, cabinZ - 0.23],
        [0, 0, 0],
        [1, 1, 1],
        '#18181b'
      )
    );
  }

  if (isSuv) {
    detailParts.push(
      bakePartGeometry(
        new THREE.BoxGeometry(1.15, 0.08, 1.45),
        [0, 0.86 + cabinHeight, cabinZ + 0.05],
        [0, 0, 0],
        [1, 1, 1],
        '#18181b'
      ),
      bakePartGeometry(
        new THREE.CylinderGeometry(0.25, 0.25, 0.14, 14),
        [0, 0.58, bodyLen * 0.5 + 0.08],
        [Math.PI / 2, 0, 0],
        [1, 1, 1],
        '#111827'
      )
    );
  }

  const detailGeom = mergeAndDispose(detailParts);

  const glassGeom = mergeAndDispose([
    bakePartGeometry(
      new THREE.BoxGeometry(1.22, cabinHeight * 0.9, 0.05),
      [0, 0.77 + cabinHeight * 0.46, cabinZ - 0.86],
      [-0.36, 0, 0],
      [1, 1, 1],
      '#93c5fd'
    ),
    bakePartGeometry(
      new THREE.BoxGeometry(1.28, cabinHeight * 0.76, 1.5),
      [0, 0.77 + cabinHeight * 0.44, cabinZ + 0.04],
      [0, 0, 0],
      [1, 1, 1],
      '#475569'
    ),
  ]);

  const set: CarGeometrySet = { shadowGeom, bodyGeom, detailGeom, glassGeom };
  _carGeoCache.set(key, set);
  return set;
}

interface MotoGeometrySet {
  shadowGeom: THREE.BufferGeometry;
  bodyGeom: THREE.BufferGeometry;
  detailGeom: THREE.BufferGeometry;
}

const _motoGeoCache = new Map<string, MotoGeometrySet>();
function getMotoGeometrySet(
  style: TrafficVehicleStyle,
  withRider: boolean,
  hasPillion: boolean,
  jacketColor: string,
  helmetColor: string
): MotoGeometrySet {
  const isScooter = style === 'scooter';
  const key = `${isScooter ? 'sct' : 'bike'}_${withRider ? 'rdr' : 'parked'}_${
    withRider && hasPillion ? 'pil' : 'solo'
  }_${jacketColor}_${helmetColor}`;
  const cached = _motoGeoCache.get(key);
  if (cached) return cached;

  const shadowGeom = bakePartGeometry(
    new THREE.CircleGeometry(0.68, 14),
    [0, 0.02, 0],
    [-Math.PI / 2, 0, 0],
    [0.55, 1.35, 1]
  );

  const bodyParts: THREE.BufferGeometry[] = isScooter
    ? [
        bakePartGeometry(new THREE.BoxGeometry(0.36, 0.58, 0.24), [0, 0.56, -0.34], [-0.22, 0, 0]),
        bakePartGeometry(new THREE.BoxGeometry(0.34, 0.28, 0.72), [0, 0.48, 0.24]),
      ]
    : [bakePartGeometry(new THREE.BoxGeometry(0.32, 0.22, 0.46), [0, 0.65, -0.22])];
  const bodyGeom = mergeAndDispose(bodyParts);

  const detailParts: THREE.BufferGeometry[] = isScooter
    ? [
        bakePartGeometry(
          new THREE.BoxGeometry(0.34, 0.08, 0.45),
          [0, 0.26, -0.05],
          [0, 0, 0],
          [1, 1, 1],
          '#1f2937'
        ),
      ]
    : [
        bakePartGeometry(
          new THREE.BoxGeometry(0.26, 0.24, 0.96),
          [0, 0.42, 0.04],
          [0, 0, 0],
          [1, 1, 1],
          '#1e293b'
        ),
        bakePartGeometry(
          new THREE.CylinderGeometry(0.045, 0.055, 0.68, 10),
          [0.17, 0.3, 0.28],
          [Math.PI / 2, 0, 0],
          [1, 1, 1],
          '#94a3b8'
        ),
      ];

  detailParts.push(
    // Dual seat
    bakePartGeometry(
      new THREE.BoxGeometry(0.28, 0.11, 0.72),
      [0, isScooter ? 0.65 : 0.62, 0.22],
      [0, 0, 0],
      [1, 1, 1],
      '#18181b'
    ),
    // Headlight & taillight
    bakePartGeometry(
      new THREE.SphereGeometry(0.09, 10, 8),
      [0, 0.88, -0.52],
      [0, 0, 0],
      [1, 1, 1],
      '#fef08a'
    ),
    bakePartGeometry(
      new THREE.BoxGeometry(0.16, 0.07, 0.04),
      [0, 0.63, 0.6],
      [0, 0, 0],
      [1, 1, 1],
      '#ef4444'
    ),
    // Front fork & handlebars
    bakePartGeometry(
      new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8),
      [0, 0.92, -0.38],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      '#1e293b'
    ),
    bakePartGeometry(
      new THREE.CylinderGeometry(0.022, 0.02, 0.62, 8),
      [-0.1, 0.62, -0.45],
      [0.25, 0, 0],
      [1, 1, 1],
      '#94a3b8'
    ),
    bakePartGeometry(
      new THREE.CylinderGeometry(0.022, 0.02, 0.62, 8),
      [0.1, 0.62, -0.45],
      [0.25, 0, 0],
      [1, 1, 1],
      '#94a3b8'
    )
  );

  if (withRider) {
    // Rider legs (group offset [0, 0.69, 0.04])
    for (const lx of [-0.14, 0.14]) {
      detailParts.push(
        bakePartGeometry(
          new THREE.CylinderGeometry(0.054, 0.046, 0.3, 8),
          [lx, 0.69 - 0.02 - 0.08, 0.04 - 0.02 - 0.11],
          [0.88, 0, 0],
          [1, 1, 1],
          '#1e293b'
        ),
        bakePartGeometry(
          new THREE.CylinderGeometry(0.044, 0.038, 0.28, 8),
          [lx, 0.69 - 0.02 - 0.24, 0.04 - 0.02 - 0.2],
          [-0.25, 0, 0],
          [1, 1, 1],
          '#1e293b'
        )
      );
    }
    // Jacket torso & arms
    detailParts.push(
      bakePartGeometry(
        new THREE.CylinderGeometry(0.145, 0.125, 0.44, 10),
        [0, 0.69 + 0.22, 0.04 - 0.04],
        [-0.22, 0, 0],
        [1, 1, 1],
        jacketColor
      ),
      bakePartGeometry(
        new THREE.CylinderGeometry(0.038, 0.032, 0.42, 8),
        [-0.17, 0.69 + 0.26, 0.04 - 0.22],
        [1.05, 0, 0.15],
        [1, 1, 1],
        jacketColor
      ),
      bakePartGeometry(
        new THREE.CylinderGeometry(0.038, 0.032, 0.42, 8),
        [0.17, 0.69 + 0.26, 0.04 - 0.22],
        [1.05, 0, -0.15],
        [1, 1, 1],
        jacketColor
      ),
      // Helmet + visor
      bakePartGeometry(
        new THREE.SphereGeometry(0.135, 12, 10),
        [0, 0.69 + 0.52, 0.04 - 0.1],
        [0, 0, 0],
        [1, 1, 1],
        helmetColor
      ),
      bakePartGeometry(
        new THREE.BoxGeometry(0.17, 0.065, 0.08),
        [0, 0.69 + 0.51, 0.04 - 0.205],
        [0, 0, 0],
        [1, 1, 1],
        '#090d16'
      )
    );

    if (hasPillion) {
      for (const lx of [-0.13, 0.13]) {
        detailParts.push(
          bakePartGeometry(
            new THREE.CylinderGeometry(0.05, 0.044, 0.28, 8),
            [lx, 0.72 - 0.04 - 0.12, 0.39 - 0.02 - 0.08],
            [0.65, 0, 0],
            [1, 1, 1],
            '#334155'
          ),
          bakePartGeometry(
            new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8),
            [lx, 0.72 - 0.04 - 0.27, 0.39 - 0.02 - 0.14],
            [0, 0, 0],
            [1, 1, 1],
            '#334155'
          )
        );
      }
      detailParts.push(
        bakePartGeometry(
          new THREE.CylinderGeometry(0.135, 0.12, 0.4, 10),
          [0, 0.72 + 0.21, 0.39],
          [-0.1, 0, 0],
          [1, 1, 1],
          '#b45309'
        ),
        bakePartGeometry(
          new THREE.CylinderGeometry(0.034, 0.03, 0.34, 8),
          [-0.15, 0.72 + 0.22, 0.39 - 0.14],
          [0.75, 0, 0],
          [1, 1, 1],
          '#b45309'
        ),
        bakePartGeometry(
          new THREE.CylinderGeometry(0.034, 0.03, 0.34, 8),
          [0.15, 0.72 + 0.22, 0.39 - 0.14],
          [0.75, 0, 0],
          [1, 1, 1],
          '#b45309'
        ),
        bakePartGeometry(
          new THREE.SphereGeometry(0.128, 12, 10),
          [0, 0.72 + 0.5, 0.39 - 0.02],
          [0, 0, 0],
          [1, 1, 1],
          '#f59e0b'
        ),
        bakePartGeometry(
          new THREE.BoxGeometry(0.155, 0.058, 0.075),
          [0, 0.72 + 0.49, 0.39 - 0.118],
          [0, 0, 0],
          [1, 1, 1],
          '#090d16'
        )
      );
    }
  }

  const detailGeom = mergeAndDispose(detailParts);
  const set: MotoGeometrySet = { shadowGeom, bodyGeom, detailGeom };
  _motoGeoCache.set(key, set);
  return set;
}

const CAR_WHEEL_POSITIONS: ReadonlyArray<[number, number, number]> = [
  [-0.78, 0.28, -1.04],
  [0.78, 0.28, -1.04],
  [-0.78, 0.28, 1.04],
  [0.78, 0.28, 1.04],
];

const MOTO_WHEEL_Z: readonly number[] = [-0.55, 0.56];

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
  const { shadowGeom, bodyGeom, detailGeom, glassGeom } = useMemo(
    () => getCarGeometrySet(style, withDriver),
    [style, withDriver]
  );
  const wheelGeom = useMemo(() => getCarWheelGeometry(), []);
  const paintMat = useMemo(() => getTrafficPaintMaterial(color), [color]);

  return (
    <group>
      <mesh geometry={shadowGeom} material={_sharedShadowMat} />
      <mesh geometry={bodyGeom} material={paintMat} castShadow={castShadow} />
      <mesh geometry={detailGeom} material={_sharedDetailMat} />
      <mesh geometry={glassGeom} material={_sharedGlassMat} />
      {CAR_WHEEL_POSITIONS.map((pos, idx) => (
        <mesh
          key={idx}
          name="traffic-wheel"
          position={pos}
          geometry={wheelGeom}
          material={_sharedWheelMat}
          castShadow={castShadow}
        />
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
  const { shadowGeom, bodyGeom, detailGeom } = useMemo(
    () => getMotoGeometrySet(style, withRider, hasPillion, jacketColor, helmetColor),
    [style, withRider, hasPillion, jacketColor, helmetColor]
  );
  const wheelGeom = useMemo(() => getMotoWheelGeometry(), []);
  const paintMat = useMemo(() => getTrafficPaintMaterial(color), [color]);

  return (
    <group>
      <mesh geometry={shadowGeom} material={_sharedShadowMat} />
      <mesh geometry={bodyGeom} material={paintMat} castShadow={castShadow} />
      <mesh geometry={detailGeom} material={_sharedDetailMat} castShadow={castShadow} />
      {MOTO_WHEEL_Z.map((wz, idx) => (
        <mesh
          key={idx}
          name="traffic-wheel"
          position={[0, 0.23, wz]}
          geometry={wheelGeom}
          material={_sharedWheelMat}
          castShadow={castShadow}
        />
      ))}
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
