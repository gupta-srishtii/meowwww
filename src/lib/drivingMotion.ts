import * as THREE from 'three';

export const MAX_INDICATED_KMH = 75;
export const MAX_RIDE_SPEED = MAX_INDICATED_KMH / 3.6;
const before = new THREE.Vector3(), after = new THREE.Vector3();

export function roadCurvature(curve: THREE.CatmullRomCurve3, distance: number, length: number): number {
  curve.getTangentAt(Math.max(0, distance - 4) / length, before);
  curve.getTangentAt(Math.min(length, distance + 4) / length, after);
  return Math.atan2(before.x * after.z - before.z * after.x, before.x * after.x + before.z * after.z) / 8;
}

export function safeRideSpeed(curvature: number, stopDistance: number, offroad = false): number {
  const corner = Math.sqrt(3.8 / Math.max(0.0001, Math.abs(curvature)));
  const stop = Math.sqrt(2 * 4.5 * Math.max(0, stopDistance - 0.3));
  return Math.min(MAX_RIDE_SPEED, offroad ? 8 : MAX_RIDE_SPEED, corner, stop);
}

export function stepRideSpeed(speed: number, throttle: number, brake: number, limit: number, delta: number): number {
  const dt = Math.max(0, Math.min(delta, 0.1));
  let next = speed;
  if (brake > 0) next -= 8.5 * brake * dt;
  else if (throttle > 0) next += 3.2 * throttle * dt;
  else next -= Math.max(0.3, speed * 0.18) * dt;
  if (next > limit) next = Math.max(limit, speed - 7 * dt);
  return Math.max(0, Math.min(MAX_RIDE_SPEED, next));
}

export function indicatedKmh(speed: number): number {
  return Math.round(Math.max(0, Math.min(MAX_INDICATED_KMH, speed * 3.6)));
}
