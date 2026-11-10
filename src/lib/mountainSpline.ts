import * as THREE from 'three';

export const ROAD_WIDTH = 7.0;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 3.5m
export const SCOOTER_HALF_WIDTH = 0.4; // 0.8m full body width
export const SOFT_BOUNDARY_THRESHOLD = 2.3; // meters from centerline
export const HARD_CENTER_CLAMP = 2.9; // 2.9m + 0.4m = 3.3m (< 3.5m edge)
export const BOUNDARY_SPRING_K = 18.0;

export const SCOOTER_MAX_SPEED = 12.0; // m/s
export const SCOOTER_ACCEL = 7.5; // m/s^2
export const SCOOTER_BRAKE_DECEL = 12.0; // m/s^2 (~6m stop from 12 m/s)
export const SCOOTER_COAST_DRAG = 0.28; // /s
export const SCOOTER_STEER_SPEED = 4.2; // m/s max lateral response

export const LEAD_START_DISTANCE = 6.0;
export const LEAD_START_LATERAL = 1.1;
export const COMPANION_START_DISTANCE = 1.5;
export const COMPANION_LANE_LATERAL = -1.2;

export const FOLLOW_TARGET_GAP = 4.5;
export const FOLLOW_MIN_GAP = 3.0;
export const FOLLOW_MAX_GAP = 7.0;
export const FOLLOW_DAMP_LAMBDA = 4.5;

export const ARRIVAL_ZONE_DISTANCE = 18.0; // meters before spline end
export const ROUTE_STOP_OFFSET = 3.0; // stops 3m before final point
export const LEAD_PARK_LATERAL = 1.3;
export const COMPANION_PARK_LATERAL = -1.3;

export interface RoadFrame {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
}

const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Creates a smooth ~260m Himalayan mountain-road spline with gentle S-curves
 * and gradual elevation gain.
 */
export function createMountainRoadCurve(): THREE.CatmullRomCurve3 {
  const controlPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(4, 0.8, -32),
    new THREE.Vector3(-12, 2.2, -68),
    new THREE.Vector3(-28, 4.0, -104),
    new THREE.Vector3(-10, 6.2, -142),
    new THREE.Vector3(18, 8.5, -178),
    new THREE.Vector3(24, 10.6, -214),
    new THREE.Vector3(6, 12.2, -248),
    new THREE.Vector3(0, 12.8, -272),
  ];

  return new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
}

/**
 * Samples a twist-free road frame at arc-length distance `d` along `curve`.
 */
export function sampleRoadFrame(
  curve: THREE.CatmullRomCurve3,
  distance: number,
  totalLength: number,
  outPoint: THREE.Vector3,
  outTangent: THREE.Vector3,
  outRight: THREE.Vector3,
  outUp: THREE.Vector3
): void {
  const u = THREE.MathUtils.clamp(distance / totalLength, 0, 1);
  curve.getPointAt(u, outPoint);
  curve.getTangentAt(u, outTangent).normalize();

  // Cross(tangent, worldUp) points to the rider's right in Three.js (-Z forward => +X right).
  outRight.crossVectors(outTangent, _worldUp);
  if (outRight.lengthSq() < 1e-6) {
    outRight.set(1, 0, 0);
  } else {
    outRight.normalize();
  }

  // Cross(right, tangent) points perpendicular upward from the sloped road surface.
  outUp.crossVectors(outRight, outTangent).normalize();
}

