import * as THREE from 'three';

export type MountainRoadSegmentId =
  | 'to_dhaba'
  | 'to_neelkanth'
  | 'to_baalkuwari'
  | 'to_hotel_return';
export type MountainRoadSubStage = 'driving' | 'viewpoint_walk';
export type BaalKuwariSubStage = 'driving' | 'maggi_stop';

export const ROAD_WIDTH = 7.0;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 3.5m
export const SCOOTER_HALF_WIDTH = 0.4; // 0.8m full body width
export const SOFT_BOUNDARY_THRESHOLD = 2.3; // meters from centerline during cruise
export const HARD_CENTER_CLAMP = 2.9; // 2.9m + 0.4m = 3.3m (< 3.5m road edge)
export const BOUNDARY_SPRING_K = 18.0;

export const SCOOTER_MAX_SPEED = 12.5; // m/s (~45 km/h cruising feel)
export const SCOOTER_ACCEL = 7.8; // m/s^2
export const SCOOTER_BRAKE_DECEL = 12.5; // m/s^2
export const SCOOTER_COAST_DRAG = 0.34; // /s smooth deceleration
export const SCOOTER_STEER_SPEED = 4.2; // m/s max lateral response

export const LEAD_START_DISTANCE = 8.0;
export const LEAD_START_LATERAL = 1.1;
export const COMPANION_START_DISTANCE = 3.5;
export const COMPANION_LANE_LATERAL = -1.2;

export const FOLLOW_TARGET_GAP = 4.5;
export const FOLLOW_MIN_GAP = 3.0;
export const FOLLOW_MAX_GAP = 7.0;
export const FOLLOW_DAMP_LAMBDA = 4.5;

export const ARRIVAL_ZONE_DISTANCE = 22.0; // smooth braking zone before pull-off bay
export const LEAD_PARK_LATERAL = 5.4; // widened right-side dhaba / turnout pull-off bay
export const COMPANION_PARK_LATERAL = 3.2;

export const DHABA_TURNOUT_START = 244.0;
export const DHABA_STOP_DISTANCE = 266.0;
export const DHABA_TURNOUT_END = 288.0;

export const VIEWPOINT_APPROACH_START = 96.0;
export const VIEWPOINT_TURNOUT_START = 114.0;
export const VIEWPOINT_STOP_DISTANCE = 126.0;
export const VIEWPOINT_TURNOUT_END = 138.0;
export const VIEWPOINT_RESUME_DISTANCE = 138.0;
export const VIEWPOINT_PARK_LEAD_LATERAL = 5.0;
export const VIEWPOINT_PARK_COMP_LATERAL = 2.9;

export const NEELKANTH_APPROACH_STOP_DISTANCE = 324.0;
export const BAAL_KUWARI_STOP_DISTANCE = 278.0;
export const HOTEL_RETURN_STOP_DISTANCE = 266.0;

export interface RoadFrame {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
}

const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Creates a smooth ~435m–475m Himalayan mountain-road spline with fine arc-length
 * subdivision so the road continues past pull-offs into distant bends and temple approaches.
 */
export function createMountainRoadCurve(
  segment: MountainRoadSegmentId = 'to_dhaba'
): THREE.CatmullRomCurve3 {
  const controlPoints =
    segment === 'to_dhaba'
      ? [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(5, 1.0, -38),
          new THREE.Vector3(-12, 2.5, -78),
          new THREE.Vector3(-26, 4.2, -120),
          new THREE.Vector3(-14, 6.0, -165),
          new THREE.Vector3(10, 8.0, -210),
          new THREE.Vector3(24, 9.6, -252), // sweeps smoothly past roadside dhaba pull-off
          new THREE.Vector3(28, 10.6, -296), // road continues around valley bend
          new THREE.Vector3(10, 11.8, -342),
          new THREE.Vector3(-24, 13.0, -386),
          new THREE.Vector3(-64, 14.2, -418),
        ]
      : segment === 'to_neelkanth'
        ? [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-10, 1.5, -42),
            new THREE.Vector3(-30, 3.6, -86),
            new THREE.Vector3(-18, 5.8, -134),
            new THREE.Vector3(14, 8.0, -182),
            new THREE.Vector3(34, 10.2, -230),
            new THREE.Vector3(22, 12.2, -278),
            new THREE.Vector3(-4, 13.8, -328), // Neelkanth Mahadev gateway plaza ~324m
            new THREE.Vector3(-34, 15.2, -374), // road curves past temple toward future Baal Kuwari forest route
            new THREE.Vector3(-72, 16.4, -416),
            new THREE.Vector3(-112, 17.6, -448),
          ]
        : segment === 'to_baalkuwari'
          ? [
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(12, 1.8, -40),
              new THREE.Vector3(32, 4.2, -84),
              new THREE.Vector3(18, 6.8, -132),
              new THREE.Vector3(-16, 9.4, -178),
              new THREE.Vector3(-28, 12.0, -226),
              new THREE.Vector3(-12, 14.5, -274), // Baal Kuwari base trailhead & Maggi stop ~278m
              new THREE.Vector3(16, 16.2, -322), // mountain ridge road bends past the stairhead
              new THREE.Vector3(52, 17.8, -368),
              new THREE.Vector3(92, 19.2, -406),
            ]
          : [
              // Evening Safe Return Descent toward Rishikesh Hotel Courtyard (~266m stop bay)
              new THREE.Vector3(0, 15.6, 0),
              new THREE.Vector3(-10, 13.8, -42),
              new THREE.Vector3(-26, 11.4, -86),
              new THREE.Vector3(-14, 9.0, -132),
              new THREE.Vector3(14, 6.4, -178),
              new THREE.Vector3(24, 3.8, -224),
              new THREE.Vector3(8, 1.4, -268), // Rishikesh hotel arrival pull-off ~266m
              new THREE.Vector3(-16, 0.4, -314),
              new THREE.Vector3(-48, 0.0, -356),
            ];

  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
  // Fine arc-length lookup eliminates piecewise tangent micro-jitter along S-curves.
  curve.arcLengthDivisions = 1200;
  curve.updateArcLengths();
  return curve;
}

export function getSegmentStopDistance(segment: MountainRoadSegmentId, totalLength: number): number {
  if (segment === 'to_dhaba') {
    return Math.min(DHABA_STOP_DISTANCE, totalLength - 60);
  }
  if (segment === 'to_baalkuwari') {
    return Math.min(BAAL_KUWARI_STOP_DISTANCE, totalLength - 60);
  }
  if (segment === 'to_hotel_return') {
    return Math.min(HOTEL_RETURN_STOP_DISTANCE, totalLength - 60);
  }
  return Math.min(NEELKANTH_APPROACH_STOP_DISTANCE, totalLength - 60);
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
