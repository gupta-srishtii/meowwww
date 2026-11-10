'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MountainRoadEnvironment } from '@/components/canvas/MountainRoadEnvironment';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import {
  RoadTrafficVisuals,
  buildParkedShoulderVehicles,
  buildRoadTrafficFleet,
  createTrafficRuntime,
  stepTrafficSimulation,
  type TrafficVehicleRuntime,
} from '@/components/canvas/RoadTrafficSystem';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import { ambientAudio } from '@/lib/ambientAudio';
import {
  ARRIVAL_ZONE_DISTANCE,
  BOUNDARY_SPRING_K,
  COMPANION_LANE_LATERAL,
  COMPANION_PARK_LATERAL,
  COMPANION_START_DISTANCE,
  FOLLOW_DAMP_LAMBDA,
  FOLLOW_MAX_GAP,
  FOLLOW_MIN_GAP,
  FOLLOW_TARGET_GAP,
  HARD_CENTER_CLAMP,
  LEAD_PARK_LATERAL,
  LEAD_START_DISTANCE,
  LEAD_START_LATERAL,
  SCOOTER_ACCEL,
  SCOOTER_BRAKE_DECEL,
  SCOOTER_COAST_DRAG,
  SCOOTER_MAX_SPEED,
  SCOOTER_STEER_SPEED,
  SOFT_BOUNDARY_THRESHOLD,
  VIEWPOINT_APPROACH_START,
  VIEWPOINT_PARK_COMP_LATERAL,
  VIEWPOINT_PARK_LEAD_LATERAL,
  VIEWPOINT_STOP_DISTANCE,
  VIEWPOINT_TURNOUT_END,
  VIEWPOINT_TURNOUT_START,
  createMountainRoadCurve,
  getSegmentStopDistance,
  sampleOffroadTrackBump,
  sampleRoadFrame,
  type MountainRoadSegmentId,
} from '@/lib/mountainSpline';
import { QUALITY_PRESETS, type QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface TelemetryRefs {
  speedEl: RefObject<HTMLSpanElement | null>;
  distanceEl: RefObject<HTMLSpanElement | null>;
  gapEl: RefObject<HTMLSpanElement | null>;
  boundaryEl: RefObject<HTMLSpanElement | null>;
}

export interface ScooterPrototypeSceneProps {
  inputRef: RefObject<DrivingInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  resetNonce: number;
  roadSegment?: MountainRoadSegmentId;
  startDistance?: number;
  viewpointPullOverNonce?: number;
  transitionToken?: number;
  simulateMountFailure?: boolean;
  onSceneReady?: (token: number, sceneId: SceneId) => void;
  onArrivedChange: (arrived: boolean) => void;
  onInViewpointZoneChange?: (inZone: boolean) => void;
  onViewpointArrivedChange?: (arrived: boolean) => void;
  onTrafficBrush?: () => void;
  onAutoDowngradeQuality?: () => void;
  telemetryRefs: TelemetryRefs;
}

const WHEEL_RADIUS = 0.22;
const CAM_BACK_DISTANCE = 8.4;
const CAM_HEIGHT_OFFSET = 2.65;
const CAM_LOOK_AHEAD = 2.6;
const CAM_LOOK_HEIGHT = 0.92;

interface SimulationState {
  leadDist: number;
  leadSpeed: number;
  leadLateral: number;
  leadSteerSmoothed: number;
  compDist: number;
  compLateral: number;
  compSteerSmoothed: number;
  arrived: boolean;
  inViewpointZone: boolean;
  pullingToViewpoint: boolean;
  viewpointArrived: boolean;
  viewStopTargetDist: number;
  pullOffWaitSec: number;
  collisionCooldown: number;
  companionAvoidShift: number;
  cameraInitialized: boolean;
  telemetryTimer: number;
  boundaryWarnActive: boolean;
}

function hasCrossTrafficConflict(
  vehicles: readonly TrafficVehicleRuntime[],
  leadDist: number
): boolean {
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    const inWindow =
      v.spec.direction === -1
        ? v.dist >= leadDist - 6 && v.dist <= leadDist + 26
        : v.dist >= leadDist - 6 && v.dist <= leadDist + 20 && v.lateral > -0.25;
    if (inWindow && v.lateral > -0.4) {
      return true;
    }
  }
  return false;
}

function createInitialSimState(initialLeadDist = LEAD_START_DISTANCE): SimulationState {
  const safeLead = Math.max(LEAD_START_DISTANCE, initialLeadDist);
  const safeComp = Math.max(COMPANION_START_DISTANCE, safeLead - FOLLOW_TARGET_GAP);
  return {
    leadDist: safeLead,
    leadSpeed: 0,
    leadLateral: LEAD_START_LATERAL,
    leadSteerSmoothed: 0,
    compDist: safeComp,
    compLateral: COMPANION_LANE_LATERAL,
    compSteerSmoothed: 0,
    arrived: false,
    inViewpointZone: false,
    pullingToViewpoint: false,
    viewpointArrived: false,
    viewStopTargetDist: VIEWPOINT_STOP_DISTANCE,
    pullOffWaitSec: 0,
    collisionCooldown: 0,
    companionAvoidShift: 0,
    cameraInitialized: false,
    telemetryTimer: 0.08,
    boundaryWarnActive: false,
  };
}

export function ScooterPrototypeScene({
  inputRef,
  qualityProfile,
  paused,
  resetNonce,
  roadSegment = 'to_dhaba',
  startDistance = LEAD_START_DISTANCE,
  viewpointPullOverNonce = 0,
  transitionToken = 0,
  simulateMountFailure = false,
  onSceneReady,
  onArrivedChange,
  onInViewpointZoneChange,
  onViewpointArrivedChange,
  onTrafficBrush,
  telemetryRefs,
}: ScooterPrototypeSceneProps) {
  if (simulateMountFailure) {
    throw new Error(
      'Simulated Phase 1B ErrorBoundary fault while mounting Scene 5 (Mountain Road).'
    );
  }

  const { camera, size, clock } = useThree();
  const shadowsEnabled = QUALITY_PRESETS[qualityProfile].shadows;

  useEffect(() => {
    onSceneReady?.(transitionToken, 5);
  }, [onSceneReady, transitionToken]);

  useEffect(() => {
    if (!paused) {
      clock.getDelta();
    }
  }, [paused, clock]);

  const { curve, totalLength, stopDist } = useMemo(() => {
    const roadCurve = createMountainRoadCurve(roadSegment);
    const length = roadCurve.getLength();
    const stop = getSegmentStopDistance(roadSegment, length);
    return { curve: roadCurve, totalLength: length, stopDist: stop };
  }, [roadSegment]);

  const leadGroupRef = useRef<THREE.Group>(null);
  const leadForkRef = useRef<THREE.Group>(null);
  const leadFrontWheelRef = useRef<THREE.Group>(null);
  const leadRearWheelRef = useRef<THREE.Group>(null);

  const compGroupRef = useRef<THREE.Group>(null);
  const compForkRef = useRef<THREE.Group>(null);
  const compFrontWheelRef = useRef<THREE.Group>(null);
  const compRearWheelRef = useRef<THREE.Group>(null);

  const simRef = useRef<SimulationState>(createInitialSimState());
  const leadDistRef = useRef<number>(startDistance);

  const trafficFleet = useMemo(() => buildRoadTrafficFleet(roadSegment), [roadSegment]);
  const parkedVehicles = useMemo(() => buildParkedShoulderVehicles(roadSegment), [roadSegment]);
  const trafficRuntimeRef = useRef<TrafficVehicleRuntime[]>(
    createTrafficRuntime(trafficFleet, LEAD_START_DISTANCE)
  );
  const trafficMeshRefs = useRef<(THREE.Group | null)[]>([]);

  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      negTangent: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      roadQuat: new THREE.Quaternion(),
      leanEuler: new THREE.Euler(0, 0, 0, 'XYZ'),
      leanQuat: new THREE.Quaternion(),
      camPoint: new THREE.Vector3(),
      camTan: new THREE.Vector3(),
      camRight: new THREE.Vector3(),
      camUp: new THREE.Vector3(),
      desiredCamPos: new THREE.Vector3(),
      desiredLookAt: new THREE.Vector3(),
      smoothedLookAt: new THREE.Vector3(),
    }),
    []
  );

  // Dynamically adapt FOV on narrow portrait screens so both scooters stay in frame
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / Math.max(1, size.height);
      const nextFov = aspect < 0.8 ? 64 : aspect < 1.15 ? 58 : 53;
      if (Math.abs(camera.fov - nextFov) > 0.1) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, size.width, size.height]);

  // Reset ride cleanly whenever resetNonce, active roadSegment, or startDistance changes
  const lastViewpointPullNonceRef = useRef(viewpointPullOverNonce);

  useEffect(() => {
    const resolvedStart =
      roadSegment === 'to_dhaba'
        ? Math.min(Math.max(LEAD_START_DISTANCE, startDistance), stopDist - 4)
        : LEAD_START_DISTANCE;
    simRef.current = createInitialSimState(resolvedStart);
    trafficRuntimeRef.current = createTrafficRuntime(trafficFleet, resolvedStart);
    if (leadFrontWheelRef.current) leadFrontWheelRef.current.rotation.x = 0;
    if (leadRearWheelRef.current) leadRearWheelRef.current.rotation.x = 0;
    if (compFrontWheelRef.current) compFrontWheelRef.current.rotation.x = 0;
    if (compRearWheelRef.current) compRearWheelRef.current.rotation.x = 0;

    const initialProgressed = Math.max(0, Math.round(resolvedStart - LEAD_START_DISTANCE));
    const maxRoute = Math.max(1, Math.round(stopDist - LEAD_START_DISTANCE));
    if (telemetryRefs.speedEl.current) telemetryRefs.speedEl.current.textContent = '0 km/h';
    if (telemetryRefs.distanceEl.current) {
      telemetryRefs.distanceEl.current.textContent = `${initialProgressed} / ${maxRoute} m`;
    }
    if (telemetryRefs.gapEl.current) telemetryRefs.gapEl.current.textContent = '4.5 m behind';
    if (telemetryRefs.boundaryEl.current) telemetryRefs.boundaryEl.current.style.opacity = '0';

    onArrivedChange(false);
    onInViewpointZoneChange?.(false);
    onViewpointArrivedChange?.(false);
  }, [
    resetNonce,
    roadSegment,
    startDistance,
    stopDist,
    onArrivedChange,
    onInViewpointZoneChange,
    onViewpointArrivedChange,
    telemetryRefs,
  ]);

  // Trigger Viewpoint pull-over when requested by HUD / `E` key while in Viewpoint zone
  useEffect(() => {
    if (viewpointPullOverNonce === lastViewpointPullNonceRef.current) return;
    lastViewpointPullNonceRef.current = viewpointPullOverNonce;
    const sim = simRef.current;
    if (
      roadSegment === 'to_dhaba' &&
      !sim.arrived &&
      !sim.viewpointArrived &&
      !sim.pullingToViewpoint &&
      sim.leadDist >= VIEWPOINT_APPROACH_START - 6 &&
      sim.leadDist <= VIEWPOINT_TURNOUT_END + 6
    ) {
      sim.pullingToViewpoint = true;
      sim.viewStopTargetDist = THREE.MathUtils.clamp(
        sim.leadDist + 6.0,
        VIEWPOINT_STOP_DISTANCE,
        VIEWPOINT_TURNOUT_END - 1.5
      );
      if (sim.inViewpointZone) {
        sim.inViewpointZone = false;
        onInViewpointZoneChange?.(false);
      }
    }
  }, [viewpointPullOverNonce, roadSegment, onInViewpointZoneChange]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) {
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;

    const input = inputRef.current;
    const prevLeadDist = sim.leadDist;
    const prevLeadLateral = sim.leadLateral;
    const prevCompDist = sim.compDist;
    const prevCompLateral = sim.compLateral;
    const remainingDist = Math.max(0, stopDist - sim.leadDist);

    // Check discrete scenic Viewpoint approach/turnout window along `to_dhaba`
    const inViewZoneNow =
      roadSegment === 'to_dhaba' &&
      !sim.arrived &&
      !sim.viewpointArrived &&
      !sim.pullingToViewpoint &&
      sim.leadDist >= VIEWPOINT_APPROACH_START &&
      sim.leadDist <= VIEWPOINT_TURNOUT_END;

    if (inViewZoneNow !== sim.inViewpointZone) {
      sim.inViewpointZone = inViewZoneNow;
      onInViewpointZoneChange?.(inViewZoneNow);
    }

    // Braking slowly inside the Viewpoint turnout voluntarily pulls over cleanly
    if (
      roadSegment === 'to_dhaba' &&
      !sim.arrived &&
      !sim.viewpointArrived &&
      !sim.pullingToViewpoint &&
      sim.leadDist >= VIEWPOINT_TURNOUT_START - 4 &&
      sim.leadDist <= VIEWPOINT_TURNOUT_END &&
      input.brake > 0 &&
      sim.leadSpeed <= 4.0
    ) {
      sim.pullingToViewpoint = true;
      sim.viewStopTargetDist = THREE.MathUtils.clamp(
        sim.leadDist + 4.5,
        VIEWPOINT_STOP_DISTANCE,
        VIEWPOINT_TURNOUT_END - 1.5
      );
      if (sim.inViewpointZone) {
        sim.inViewpointZone = false;
        onInViewpointZoneChange?.(false);
      }
    }

    // 1. Lead scooter (Scooter 1: Ishaan & Srishti) longitudinal + pull-off dynamics
    if (sim.viewpointArrived) {
      sim.leadSpeed = 0;
      sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, VIEWPOINT_PARK_LEAD_LATERAL, 6.0, delta);
      sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, 0, 8.0, delta);
    } else if (sim.pullingToViewpoint) {
      const remViewDist = Math.max(0, sim.viewStopTargetDist - sim.leadDist);
      const viewProgress = THREE.MathUtils.clamp(remViewDist / 18.0, 0, 1);
      const needsCross = sim.leadLateral < -0.35;
      const waitingTraffic =
        needsCross &&
        hasCrossTrafficConflict(trafficRuntimeRef.current, sim.leadDist) &&
        sim.pullOffWaitSec < 2.6;

      if (waitingTraffic) {
        sim.pullOffWaitSec += delta;
      } else if (!needsCross || sim.pullOffWaitSec >= 2.6) {
        sim.pullOffWaitSec = 0;
      }

      const baseTargetSpeed =
        remViewDist <= 0.25 ? 0 : Math.max(0.9, SCOOTER_MAX_SPEED * 0.65 * Math.pow(viewProgress, 0.72));
      const targetSpeed = waitingTraffic
        ? Math.min(baseTargetSpeed, remViewDist <= 3.5 ? 0.25 : 2.1)
        : baseTargetSpeed;
      const targetLat = waitingTraffic ? Math.min(-0.45, sim.leadLateral) : VIEWPOINT_PARK_LEAD_LATERAL;
      const latLambda = waitingTraffic ? 5.0 : 3.0 + (1 - viewProgress) * 4.5;

      sim.leadSpeed = THREE.MathUtils.damp(sim.leadSpeed, targetSpeed, 4.6, delta);
      sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, targetLat, latLambda, delta);
      const latSlopeRatio = THREE.MathUtils.clamp(
        (sim.leadLateral - prevLeadLateral) / delta / SCOOTER_STEER_SPEED,
        -0.6,
        0.6
      );
      sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, latSlopeRatio, 8.0, delta);
      const maxStopCap = waitingTraffic
        ? Math.max(sim.leadDist, sim.viewStopTargetDist - 3.0)
        : sim.viewStopTargetDist;
      sim.leadDist = Math.min(maxStopCap, sim.leadDist + sim.leadSpeed * delta);
      if (!waitingTraffic && sim.viewStopTargetDist - sim.leadDist <= 0.18) {
        sim.leadDist = sim.viewStopTargetDist;
        sim.leadSpeed = 0;
        sim.pullingToViewpoint = false;
        sim.pullOffWaitSec = 0;
        sim.viewpointArrived = true;
        onViewpointArrivedChange?.(true);
      }
    } else if (!sim.arrived) {
      if (remainingDist <= ARRIVAL_ZONE_DISTANCE) {
        const progressRatio = THREE.MathUtils.clamp(remainingDist / ARRIVAL_ZONE_DISTANCE, 0, 1);
        const speedEnvelope =
          remainingDist <= 0.25
            ? 0
            : Math.max(0.65, SCOOTER_MAX_SPEED * Math.pow(progressRatio, 0.72));

        const needsCross = sim.leadLateral < -0.35;
        const waitingTraffic =
          needsCross &&
          hasCrossTrafficConflict(trafficRuntimeRef.current, sim.leadDist) &&
          sim.pullOffWaitSec < 2.6;

        if (waitingTraffic) {
          sim.pullOffWaitSec += delta;
        } else if (!needsCross) {
          sim.pullOffWaitSec = 0;
        }

        if (input.brake > 0) {
          sim.leadSpeed = Math.max(0, sim.leadSpeed - SCOOTER_BRAKE_DECEL * input.brake * delta);
        } else {
          let targetSpeed =
            input.throttle > 0 ? speedEnvelope : Math.min(speedEnvelope, Math.max(sim.leadSpeed, 1.8));
          if (waitingTraffic) {
            targetSpeed = Math.min(targetSpeed, remainingDist <= 3.6 ? 0.25 : 2.2);
          }
          sim.leadSpeed = THREE.MathUtils.damp(sim.leadSpeed, targetSpeed, 4.4, delta);
        }

        // Pull cleanly across to right-side turnout apron (+5.4m) once lane crossing is clear (or timeout)
        const targetLat = waitingTraffic ? Math.min(-0.45, sim.leadLateral) : LEAD_PARK_LATERAL;
        const parkLambda = waitingTraffic ? 5.0 : 2.4 + (1 - progressRatio) * 5.2;
        sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, targetLat, parkLambda, delta);

        const lateralSlopeRatio = THREE.MathUtils.clamp(
          (sim.leadLateral - prevLeadLateral) / delta / SCOOTER_STEER_SPEED,
          -0.6,
          0.6
        );
        sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, lateralSlopeRatio, 8.0, delta);

        const maxStopCap = waitingTraffic ? Math.max(sim.leadDist, stopDist - 3.2) : stopDist;
        sim.leadDist = Math.min(maxStopCap, sim.leadDist + sim.leadSpeed * delta);
        if (!waitingTraffic && stopDist - sim.leadDist <= 0.18) {
          sim.leadDist = stopDist;
          sim.leadSpeed = 0;
          sim.pullOffWaitSec = 0;
          sim.arrived = true;
          onArrivedChange(true);
        }
      } else {
        // Normal manual cruise driving along mountain highway
        const segmentMaxSpeed =
          roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs'
            ? SCOOTER_MAX_SPEED * 0.88
            : SCOOTER_MAX_SPEED;
        if (input.throttle > 0) {
          sim.leadSpeed += SCOOTER_ACCEL * input.throttle * delta;
        }
        if (input.brake > 0) {
          sim.leadSpeed -= SCOOTER_BRAKE_DECEL * input.brake * delta;
        } else if (input.throttle === 0) {
          sim.leadSpeed -= sim.leadSpeed * SCOOTER_COAST_DRAG * delta;
          if (sim.leadSpeed < 0.03) {
            sim.leadSpeed = 0;
          }
        }
        sim.leadSpeed = THREE.MathUtils.clamp(sim.leadSpeed, 0, segmentMaxSpeed);

        const steerAuthority = THREE.MathUtils.clamp(sim.leadSpeed / 4.0, 0.25, 1.0);
        sim.leadLateral += input.steer * SCOOTER_STEER_SPEED * steerAuthority * delta;

        if (sim.leadLateral > SOFT_BOUNDARY_THRESHOLD) {
          sim.leadLateral = THREE.MathUtils.damp(
            sim.leadLateral,
            SOFT_BOUNDARY_THRESHOLD,
            BOUNDARY_SPRING_K,
            delta
          );
        } else if (sim.leadLateral < -SOFT_BOUNDARY_THRESHOLD) {
          sim.leadLateral = THREE.MathUtils.damp(
            sim.leadLateral,
            -SOFT_BOUNDARY_THRESHOLD,
            BOUNDARY_SPRING_K,
            delta
          );
        }
        sim.leadLateral = THREE.MathUtils.clamp(
          sim.leadLateral,
          -HARD_CENTER_CLAMP,
          HARD_CENTER_CLAMP
        );

        sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, input.steer, 10.0, delta);
        sim.leadDist = Math.min(stopDist, sim.leadDist + sim.leadSpeed * delta);
      }
    } else {
      // Parked cleanly at turnout bay (forced 0 km/h)
      sim.leadSpeed = 0;
      sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, LEAD_PARK_LATERAL, 6.0, delta);
      sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, 0, 8.0, delta);
    }

    leadDistRef.current = sim.leadDist;

    // 2. Companion scooter (Scooter 2: Manish & Yash) constrained follow + traffic avoidance
    if (sim.collisionCooldown > 0) {
      sim.collisionCooldown = Math.max(0, sim.collisionCooldown - delta);
    }

    const nextRemainingDist = Math.max(0, stopDist - sim.leadDist);
    const companionParkZone = 11.0;

    if (sim.pullingToViewpoint || sim.viewpointArrived) {
      const remView = Math.max(0, sim.viewStopTargetDist - sim.leadDist);
      const viewBlend = THREE.MathUtils.clamp(1 - remView / 14.0, 0, 1);
      const targetGap = THREE.MathUtils.lerp(FOLLOW_TARGET_GAP, 0, viewBlend);
      const targetCompDist = Math.min(sim.viewStopTargetDist, Math.max(0, sim.leadDist - targetGap));
      sim.compDist = THREE.MathUtils.damp(sim.compDist, targetCompDist, 4.2, delta);
      if (sim.viewpointArrived && Math.abs(sim.viewStopTargetDist - sim.compDist) < 0.06) {
        sim.compDist = sim.viewStopTargetDist;
      }
      sim.compLateral = THREE.MathUtils.damp(
        sim.compLateral,
        VIEWPOINT_PARK_COMP_LATERAL,
        4.4,
        delta
      );
    } else if (!sim.arrived && nextRemainingDist > companionParkZone) {
      const desiredCompDist = Math.max(0, sim.leadDist - FOLLOW_TARGET_GAP);
      sim.compDist = THREE.MathUtils.damp(sim.compDist, desiredCompDist, FOLLOW_DAMP_LAMBDA, delta);

      const minFollowerDist = Math.max(0, sim.leadDist - FOLLOW_MAX_GAP);
      const maxFollowerDist = Math.max(0, sim.leadDist - FOLLOW_MIN_GAP);
      sim.compDist = THREE.MathUtils.clamp(sim.compDist, minFollowerDist, maxFollowerDist);

      const baseTarget =
        nextRemainingDist <= ARRIVAL_ZONE_DISTANCE ? -0.3 : COMPANION_LANE_LATERAL;
      const lateralTarget = THREE.MathUtils.clamp(
        baseTarget + sim.companionAvoidShift,
        -2.55,
        2.55
      );
      sim.compLateral = THREE.MathUtils.damp(sim.compLateral, lateralTarget, 3.6, delta);
    } else {
      const parkBlend = THREE.MathUtils.clamp(1 - nextRemainingDist / companionParkZone, 0, 1);
      const targetGap = THREE.MathUtils.lerp(FOLLOW_TARGET_GAP, 0, parkBlend);
      const targetDist = Math.min(stopDist, Math.max(0, sim.leadDist - targetGap));
      sim.compDist = THREE.MathUtils.damp(sim.compDist, targetDist, 4.0, delta);
      if (sim.arrived && Math.abs(stopDist - sim.compDist) < 0.05) {
        sim.compDist = stopDist;
      }
      sim.compLateral = THREE.MathUtils.damp(sim.compLateral, COMPANION_PARK_LATERAL, 4.4, delta);
    }

    // Step oncoming, same-direction & parked road traffic safely
    const heroInPullOff =
      sim.arrived ||
      sim.viewpointArrived ||
      sim.pullingToViewpoint ||
      nextRemainingDist <= ARRIVAL_ZONE_DISTANCE;

    const trafficResult = stepTrafficSimulation({
      vehicles: trafficRuntimeRef.current,
      curve,
      totalLength,
      stopDist,
      delta,
      leadDist: sim.leadDist,
      leadLateral: sim.leadLateral,
      compDist: sim.compDist,
      compLateral: sim.compLateral,
      heroInPullOff,
      meshRefs: trafficMeshRefs.current,
      onPassWhoosh: () => ambientAudio.playTrafficPassWhoosh(),
      canCollide: sim.collisionCooldown <= 0 && sim.leadSpeed > 0.4,
      onMinorBrush: (nudgeDirection) => {
        sim.collisionCooldown = 1.4;
        sim.leadLateral = THREE.MathUtils.clamp(
          sim.leadLateral + nudgeDirection * 0.72,
          -2.65,
          2.65
        );
        sim.leadSpeed = Math.max(1.8, sim.leadSpeed * 0.62);
        ambientAudio.playTrafficHornWarn();
        onTrafficBrush?.();
      },
    });
    sim.companionAvoidShift = trafficResult.companionAvoidLateralShift;

    const compLateralRate = (sim.compLateral - prevCompLateral) / delta;
    sim.compSteerSmoothed = THREE.MathUtils.damp(
      sim.compSteerSmoothed,
      THREE.MathUtils.clamp(compLateralRate / SCOOTER_STEER_SPEED, -0.7, 0.7),
      8.0,
      delta
    );

    const isOffroadSegment =
      roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs';
    const leadBump = isOffroadSegment
      ? sampleOffroadTrackBump(sim.leadDist, sim.leadLateral, stopDist)
      : { heaveY: 0, pitchRad: 0, rollRad: 0 };
    const leadMotionScale = THREE.MathUtils.clamp(sim.leadSpeed / 3.0, 0, 1);

    // 3. Apply spline frame transform + lean/wheel/fork motion to Scooter 1
    if (leadGroupRef.current) {
      sampleRoadFrame(
        curve,
        sim.leadDist,
        totalLength,
        scratch.point,
        scratch.tangent,
        scratch.right,
        scratch.up
      );
      scratch.negTangent.copy(scratch.tangent).negate();
      scratch.basis.makeBasis(scratch.right, scratch.up, scratch.negTangent);
      scratch.roadQuat.setFromRotationMatrix(scratch.basis);

      const leadSpeedRatio = sim.leadSpeed / SCOOTER_MAX_SPEED;
      const leanAngle = -sim.leadSteerSmoothed * 0.14 * leadSpeedRatio;
      scratch.leanEuler.set(
        leadBump.pitchRad * leadMotionScale,
        -sim.leadSteerSmoothed * 0.08 * leadSpeedRatio,
        leanAngle + leadBump.rollRad * leadMotionScale
      );
      scratch.leanQuat.setFromEuler(scratch.leanEuler);

      leadGroupRef.current.position
        .copy(scratch.point)
        .addScaledVector(scratch.right, sim.leadLateral)
        .addScaledVector(scratch.up, leadBump.heaveY * leadMotionScale);
      leadGroupRef.current.quaternion.multiplyQuaternions(scratch.roadQuat, scratch.leanQuat);

      if (leadForkRef.current) {
        leadForkRef.current.rotation.y = -sim.leadSteerSmoothed * 0.24;
      }
      const leadMoveDelta = sim.leadDist - prevLeadDist;
      const leadWheelSpin = leadMoveDelta / WHEEL_RADIUS;
      if (leadFrontWheelRef.current) leadFrontWheelRef.current.rotation.x -= leadWheelSpin;
      if (leadRearWheelRef.current) leadRearWheelRef.current.rotation.x -= leadWheelSpin;
    }

    // 4. Apply spline frame transform + lean/wheel/fork motion to Scooter 2
    if (compGroupRef.current) {
      sampleRoadFrame(
        curve,
        sim.compDist,
        totalLength,
        scratch.point,
        scratch.tangent,
        scratch.right,
        scratch.up
      );
      scratch.negTangent.copy(scratch.tangent).negate();
      scratch.basis.makeBasis(scratch.right, scratch.up, scratch.negTangent);
      scratch.roadQuat.setFromRotationMatrix(scratch.basis);

      const compMoveDelta = sim.compDist - prevCompDist;
      const compSpeedRatio = THREE.MathUtils.clamp(compMoveDelta / delta / SCOOTER_MAX_SPEED, 0, 1);
      const compBump = isOffroadSegment
        ? sampleOffroadTrackBump(sim.compDist, sim.compLateral, stopDist)
        : { heaveY: 0, pitchRad: 0, rollRad: 0 };
      const compMotionScale = THREE.MathUtils.clamp(compSpeedRatio * 3.5, 0, 1);
      const compLeanAngle = -sim.compSteerSmoothed * 0.1 * compSpeedRatio;
      scratch.leanEuler.set(
        compBump.pitchRad * compMotionScale,
        -sim.compSteerSmoothed * 0.05 * compSpeedRatio,
        compLeanAngle + compBump.rollRad * compMotionScale
      );
      scratch.leanQuat.setFromEuler(scratch.leanEuler);

      compGroupRef.current.position
        .copy(scratch.point)
        .addScaledVector(scratch.right, sim.compLateral)
        .addScaledVector(scratch.up, compBump.heaveY * compMotionScale);
      compGroupRef.current.quaternion.multiplyQuaternions(scratch.roadQuat, scratch.leanQuat);

      if (compForkRef.current) {
        compForkRef.current.rotation.y = -sim.compSteerSmoothed * 0.2;
      }
      const compWheelSpin = compMoveDelta / WHEEL_RADIUS;
      if (compFrontWheelRef.current) compFrontWheelRef.current.rotation.x -= compWheelSpin;
      if (compRearWheelRef.current) compRearWheelRef.current.rotation.x -= compWheelSpin;
    }

    // 5. Smooth third-person follow camera looking cleanly down the continuing road ahead
    const rawCamDist = sim.leadDist - CAM_BACK_DISTANCE;
    sampleRoadFrame(
      curve,
      Math.max(0, rawCamDist),
      totalLength,
      scratch.camPoint,
      scratch.camTan,
      scratch.camRight,
      scratch.camUp
    );
    if (rawCamDist < 0) {
      scratch.camPoint.addScaledVector(scratch.camTan, rawCamDist);
    }

    const followLateralMix = sim.leadLateral * 0.42;
    const camTrackHeave = leadBump.heaveY * leadMotionScale;
    scratch.desiredCamPos
      .copy(scratch.camPoint)
      .addScaledVector(scratch.camRight, followLateralMix)
      .addScaledVector(scratch.camUp, CAM_HEIGHT_OFFSET + camTrackHeave * 0.45);

    const lookDist = Math.min(totalLength - 1, sim.leadDist + CAM_LOOK_AHEAD);
    sampleRoadFrame(
      curve,
      lookDist,
      totalLength,
      scratch.point,
      scratch.tangent,
      scratch.right,
      scratch.up
    );
    scratch.desiredLookAt
      .copy(scratch.point)
      .addScaledVector(scratch.right, sim.leadLateral * 0.52)
      .addScaledVector(scratch.up, CAM_LOOK_HEIGHT + camTrackHeave * 0.25);

    if (!sim.cameraInitialized) {
      camera.position.copy(scratch.desiredCamPos);
      scratch.smoothedLookAt.copy(scratch.desiredLookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.desiredCamPos.x, 7.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.desiredCamPos.y, 7.2, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.desiredCamPos.z, 7.2, delta);

      scratch.smoothedLookAt.x = THREE.MathUtils.damp(
        scratch.smoothedLookAt.x,
        scratch.desiredLookAt.x,
        9.5,
        delta
      );
      scratch.smoothedLookAt.y = THREE.MathUtils.damp(
        scratch.smoothedLookAt.y,
        scratch.desiredLookAt.y,
        9.5,
        delta
      );
      scratch.smoothedLookAt.z = THREE.MathUtils.damp(
        scratch.smoothedLookAt.z,
        scratch.desiredLookAt.z,
        9.5,
        delta
      );
    }
    camera.lookAt(scratch.smoothedLookAt);

    // 6. Direct DOM telemetry updates (~12Hz)
    sim.telemetryTimer += delta;
    if (sim.telemetryTimer >= 0.08) {
      sim.telemetryTimer = 0;

      const kmh = sim.arrived || sim.viewpointArrived ? 0 : Math.round(sim.leadSpeed * 3.6);
      const progressed = Math.max(0, Math.round(sim.leadDist - LEAD_START_DISTANCE));
      const maxRoute = Math.max(1, Math.round(stopDist - LEAD_START_DISTANCE));
      const gapMeters = Math.max(0, sim.leadDist - sim.compDist);

      if (telemetryRefs.speedEl.current) {
        telemetryRefs.speedEl.current.textContent = `${kmh} km/h`;
      }
      if (telemetryRefs.distanceEl.current) {
        telemetryRefs.distanceEl.current.textContent = `${progressed} / ${maxRoute} m`;
      }
      if (telemetryRefs.gapEl.current) {
        telemetryRefs.gapEl.current.textContent = sim.viewpointArrived
          ? 'Parked at Viewpoint'
          : sim.arrived
            ? 'Parked nearby'
            : `${gapMeters.toFixed(1)} m behind`;
      }

      const inPullOff =
        nextRemainingDist <= ARRIVAL_ZONE_DISTANCE || sim.pullingToViewpoint || sim.viewpointArrived;
      const nearBoundary =
        !inPullOff && !sim.arrived && Math.abs(sim.leadLateral) > SOFT_BOUNDARY_THRESHOLD + 0.08;
      if (nearBoundary !== sim.boundaryWarnActive && telemetryRefs.boundaryEl.current) {
        sim.boundaryWarnActive = nearBoundary;
        telemetryRefs.boundaryEl.current.style.opacity = nearBoundary ? '1' : '0';
      }
    }
  });

  return (
    <>
      <MountainRoadEnvironment
        curve={curve}
        totalLength={totalLength}
        stopDist={stopDist}
        roadSegment={roadSegment}
        qualityProfile={qualityProfile}
        leadDistRef={leadDistRef}
        paused={paused}
      />

      {/* Scooter 1 (Terracotta): Ishaan & Srishti */}
      <PrototypeScooter
        variant="lead"
        groupRef={leadGroupRef}
        forkRef={leadForkRef}
        frontWheelRef={leadFrontWheelRef}
        rearWheelRef={leadRearWheelRef}
        castShadow={shadowsEnabled}
      />

      {/* Scooter 2 (Himalayan Teal): Manish & Yash (driver/pillion unassigned) */}
      <PrototypeScooter
        variant="companion"
        groupRef={compGroupRef}
        forkRef={compForkRef}
        frontWheelRef={compFrontWheelRef}
        rearWheelRef={compRearWheelRef}
        castShadow={shadowsEnabled}
      />

      <RoadTrafficVisuals
        fleet={trafficFleet}
        parkedVehicles={parkedVehicles}
        curve={curve}
        totalLength={totalLength}
        meshRefs={trafficMeshRefs}
        castShadow={shadowsEnabled}
      />
    </>
  );
}
