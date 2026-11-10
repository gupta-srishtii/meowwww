'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MountainRoadEnvironment } from '@/components/canvas/MountainRoadEnvironment';
import { PrototypeScooter } from '@/components/canvas/PrototypeScooter';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
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
  ROUTE_STOP_OFFSET,
  SCOOTER_ACCEL,
  SCOOTER_BRAKE_DECEL,
  SCOOTER_COAST_DRAG,
  SCOOTER_MAX_SPEED,
  SCOOTER_STEER_SPEED,
  SOFT_BOUNDARY_THRESHOLD,
  createMountainRoadCurve,
  sampleRoadFrame,
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
  transitionToken?: number;
  simulateMountFailure?: boolean;
  onSceneReady?: (token: number, sceneId: SceneId) => void;
  onArrivedChange: (arrived: boolean) => void;
  onAutoDowngradeQuality?: () => void;
  telemetryRefs: TelemetryRefs;
}

const WHEEL_RADIUS = 0.22;
const CAM_BACK_DISTANCE = 8.4;
const CAM_HEIGHT_OFFSET = 2.65;
const CAM_LOOK_AHEAD = 2.4;
const CAM_LOOK_HEIGHT = 0.9;

interface SimulationState {
  leadDist: number;
  leadSpeed: number;
  leadLateral: number;
  leadSteerSmoothed: number;
  compDist: number;
  compLateral: number;
  compSteerSmoothed: number;
  arrived: boolean;
  cameraInitialized: boolean;
  telemetryTimer: number;
  boundaryWarnActive: boolean;
  fpsFrames: number;
  fpsElapsed: number;
  lowFpsDuration: number;
  autoDowngraded: boolean;
}

function createInitialSimState(): SimulationState {
  return {
    leadDist: LEAD_START_DISTANCE,
    leadSpeed: 0,
    leadLateral: LEAD_START_LATERAL,
    leadSteerSmoothed: 0,
    compDist: COMPANION_START_DISTANCE,
    compLateral: COMPANION_LANE_LATERAL,
    compSteerSmoothed: 0,
    arrived: false,
    cameraInitialized: false,
    telemetryTimer: 0,
    boundaryWarnActive: false,
    fpsFrames: 0,
    fpsElapsed: 0,
    lowFpsDuration: 0,
    autoDowngraded: false,
  };
}

export function ScooterPrototypeScene({
  inputRef,
  qualityProfile,
  paused,
  resetNonce,
  transitionToken = 0,
  simulateMountFailure = false,
  onSceneReady,
  onArrivedChange,
  onAutoDowngradeQuality,
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
    const roadCurve = createMountainRoadCurve();
    const length = roadCurve.getLength();
    const stop = Math.max(LEAD_START_DISTANCE + 10, length - ROUTE_STOP_OFFSET);
    return { curve: roadCurve, totalLength: length, stopDist: stop };
  }, []);

  const leadGroupRef = useRef<THREE.Group>(null);
  const leadForkRef = useRef<THREE.Group>(null);
  const leadFrontWheelRef = useRef<THREE.Group>(null);
  const leadRearWheelRef = useRef<THREE.Group>(null);

  const compGroupRef = useRef<THREE.Group>(null);
  const compForkRef = useRef<THREE.Group>(null);
  const compFrontWheelRef = useRef<THREE.Group>(null);
  const compRearWheelRef = useRef<THREE.Group>(null);

  const simRef = useRef<SimulationState>(createInitialSimState());

  // Pre-allocated scratch math objects so useFrame never allocates GC objects
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

  // Dynamically adapt FOV slightly on narrow portrait screens so both scooters stay in frame
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

  // Reset ride back to spline start when resetNonce increments
  useEffect(() => {
    const prevDowngraded = simRef.current.autoDowngraded;
    simRef.current = createInitialSimState();
    simRef.current.autoDowngraded = prevDowngraded;
    if (leadFrontWheelRef.current) leadFrontWheelRef.current.rotation.x = 0;
    if (leadRearWheelRef.current) leadRearWheelRef.current.rotation.x = 0;
    if (compFrontWheelRef.current) compFrontWheelRef.current.rotation.x = 0;
    if (compRearWheelRef.current) compRearWheelRef.current.rotation.x = 0;
    onArrivedChange(false);
  }, [resetNonce, onArrivedChange]);

  useFrame((_, rawDelta) => {
    if (paused || (typeof document !== 'undefined' && document.hidden)) {
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    if (delta <= 0) return;

    const sim = simRef.current;

    // Sustained low-FPS runtime auto-scaling check (§9 protocol)
    if (rawDelta < 0.25 && qualityProfile !== 'low' && !sim.autoDowngraded) {
      sim.fpsFrames += 1;
      sim.fpsElapsed += rawDelta;
      if (sim.fpsElapsed >= 0.5) {
        const currentFps = sim.fpsFrames / sim.fpsElapsed;
        if (currentFps < 28) {
          sim.lowFpsDuration += sim.fpsElapsed;
          if (sim.lowFpsDuration >= 3.0) {
            sim.autoDowngraded = true;
            onAutoDowngradeQuality?.();
          }
        } else {
          sim.lowFpsDuration = 0;
        }
        sim.fpsFrames = 0;
        sim.fpsElapsed = 0;
      }
    }

    const input = inputRef.current;
    const prevLeadDist = sim.leadDist;
    const prevCompDist = sim.compDist;
    const prevCompLateral = sim.compLateral;
    const remainingDist = Math.max(0, stopDist - sim.leadDist);

    // 1. Lead scooter (Scooter 1: Ishaan & Srishti) longitudinal + lateral dynamics
    if (!sim.arrived) {
      if (remainingDist <= ARRIVAL_ZONE_DISTANCE) {
        // Soft arrival envelope decelerating forward speed to 0 at stopDist without overshoot
        const arriveProgress = 1 - remainingDist / ARRIVAL_ZONE_DISTANCE;
        const speedEnvelope =
          remainingDist <= 0.2
            ? 0
            : Math.max(1.4, SCOOTER_MAX_SPEED * Math.sqrt(remainingDist / ARRIVAL_ZONE_DISTANCE));

        if (input.brake > 0) {
          sim.leadSpeed = Math.max(0, sim.leadSpeed - SCOOTER_BRAKE_DECEL * input.brake * delta);
        } else {
          const targetArrivalSpeed =
            input.throttle > 0 ? speedEnvelope : Math.min(speedEnvelope, Math.max(sim.leadSpeed, 2.1));
          sim.leadSpeed = THREE.MathUtils.damp(sim.leadSpeed, targetArrivalSpeed, 3.6, delta);
        }

        // Gently guide lateral offset toward parked lane (x1 = +1.3m)
        const parkLambda = 2.0 + arriveProgress * 5.0;
        sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, LEAD_PARK_LATERAL, parkLambda, delta);
        sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, 0, 8.0, delta);

        sim.leadDist = Math.min(stopDist, sim.leadDist + sim.leadSpeed * delta);
        if (stopDist - sim.leadDist <= 0.15) {
          sim.leadDist = stopDist;
          sim.leadSpeed = 0;
          sim.arrived = true;
          onArrivedChange(true);
        }
      } else {
        // Normal manual cruise driving
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
        sim.leadSpeed = THREE.MathUtils.clamp(sim.leadSpeed, 0, SCOOTER_MAX_SPEED);

        // Lateral steering scaled cleanly with speed + minimum authority at idle
        const steerAuthority = THREE.MathUtils.clamp(sim.leadSpeed / 4.0, 0.25, 1.0);
        sim.leadLateral += input.steer * SCOOTER_STEER_SPEED * steerAuthority * delta;

        // Soft restoring boundary spring past +/-2.3m & hard clamp inside +/-2.9m
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
      // Settled at terminus stop pad
      sim.leadSpeed = 0;
      sim.leadLateral = THREE.MathUtils.damp(sim.leadLateral, LEAD_PARK_LATERAL, 5.5, delta);
      sim.leadSteerSmoothed = THREE.MathUtils.damp(sim.leadSteerSmoothed, 0, 8.0, delta);
    }

    // 2. Companion scooter (Scooter 2: Manish & Yash) constrained follow controller
    const nextRemainingDist = Math.max(0, stopDist - sim.leadDist);
    if (!sim.arrived && nextRemainingDist > ARRIVAL_ZONE_DISTANCE) {
      const desiredCompDist = Math.max(0, sim.leadDist - FOLLOW_TARGET_GAP);
      sim.compDist = THREE.MathUtils.damp(sim.compDist, desiredCompDist, FOLLOW_DAMP_LAMBDA, delta);

      // Strict cruise gap clamp: [3.0m, 7.0m] behind lead scooter
      const minFollowerDist = Math.max(0, sim.leadDist - FOLLOW_MAX_GAP);
      const maxFollowerDist = Math.max(0, sim.leadDist - FOLLOW_MIN_GAP);
      sim.compDist = THREE.MathUtils.clamp(sim.compDist, minFollowerDist, maxFollowerDist);
      sim.compLateral = THREE.MathUtils.damp(sim.compLateral, COMPANION_LANE_LATERAL, 4.0, delta);
    } else {
      // Glide gracefully alongside Scooter 1 into companion parking lane (x2 = -1.3m)
      const parkBlend = THREE.MathUtils.clamp(1 - nextRemainingDist / ARRIVAL_ZONE_DISTANCE, 0, 1);
      const targetGap = THREE.MathUtils.lerp(FOLLOW_TARGET_GAP, 0, parkBlend);
      const targetDist = Math.min(stopDist, Math.max(0, sim.leadDist - targetGap));
      sim.compDist = THREE.MathUtils.damp(sim.compDist, targetDist, 3.8, delta);
      if (sim.arrived && Math.abs(stopDist - sim.compDist) < 0.05) {
        sim.compDist = stopDist;
      }
      sim.compLateral = THREE.MathUtils.damp(sim.compLateral, COMPANION_PARK_LATERAL, 4.2, delta);
    }

    const compLateralRate = (sim.compLateral - prevCompLateral) / delta;
    sim.compSteerSmoothed = THREE.MathUtils.damp(
      sim.compSteerSmoothed,
      THREE.MathUtils.clamp(compLateralRate / SCOOTER_STEER_SPEED, -0.8, 0.8),
      8.0,
      delta
    );

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
      scratch.leanEuler.set(0, -sim.leadSteerSmoothed * 0.08 * leadSpeedRatio, leanAngle);
      scratch.leanQuat.setFromEuler(scratch.leanEuler);

      leadGroupRef.current.position
        .copy(scratch.point)
        .addScaledVector(scratch.right, sim.leadLateral);
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
      const compLeanAngle = -sim.compSteerSmoothed * 0.1 * compSpeedRatio;
      scratch.leanEuler.set(0, -sim.compSteerSmoothed * 0.05 * compSpeedRatio, compLeanAngle);
      scratch.leanQuat.setFromEuler(scratch.leanEuler);

      compGroupRef.current.position
        .copy(scratch.point)
        .addScaledVector(scratch.right, sim.compLateral);
      compGroupRef.current.quaternion.multiplyQuaternions(scratch.roadQuat, scratch.leanQuat);

      if (compForkRef.current) {
        compForkRef.current.rotation.y = -sim.compSteerSmoothed * 0.2;
      }
      const compWheelSpin = compMoveDelta / WHEEL_RADIUS;
      if (compFrontWheelRef.current) compFrontWheelRef.current.rotation.x -= compWheelSpin;
      if (compRearWheelRef.current) compRearWheelRef.current.rotation.x -= compWheelSpin;
    }

    // 5. Smooth third-person follow camera (damped with delta time, safe behind u=0)
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

    const followLateralMix = sim.leadLateral * 0.35;
    scratch.desiredCamPos
      .copy(scratch.camPoint)
      .addScaledVector(scratch.camRight, followLateralMix)
      .addScaledVector(scratch.camUp, CAM_HEIGHT_OFFSET);

    const lookDist = Math.min(totalLength, sim.leadDist + CAM_LOOK_AHEAD);
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
      .addScaledVector(scratch.right, sim.leadLateral * 0.5)
      .addScaledVector(scratch.up, CAM_LOOK_HEIGHT);

    if (!sim.cameraInitialized) {
      camera.position.copy(scratch.desiredCamPos);
      scratch.smoothedLookAt.copy(scratch.desiredLookAt);
      sim.cameraInitialized = true;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, scratch.desiredCamPos.x, 6.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, scratch.desiredCamPos.y, 6.2, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, scratch.desiredCamPos.z, 6.2, delta);

      scratch.smoothedLookAt.x = THREE.MathUtils.damp(
        scratch.smoothedLookAt.x,
        scratch.desiredLookAt.x,
        7.5,
        delta
      );
      scratch.smoothedLookAt.y = THREE.MathUtils.damp(
        scratch.smoothedLookAt.y,
        scratch.desiredLookAt.y,
        7.5,
        delta
      );
      scratch.smoothedLookAt.z = THREE.MathUtils.damp(
        scratch.smoothedLookAt.z,
        scratch.desiredLookAt.z,
        7.5,
        delta
      );
    }
    camera.lookAt(scratch.smoothedLookAt);

    // 6. Direct DOM telemetry updates (~12Hz) so React never re-renders during driving
    sim.telemetryTimer += delta;
    if (sim.telemetryTimer >= 0.08) {
      sim.telemetryTimer = 0;

      const kmh = Math.round(sim.leadSpeed * 3.6);
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
        telemetryRefs.gapEl.current.textContent = sim.arrived
          ? 'Side by side'
          : `${gapMeters.toFixed(1)} m behind`;
      }

      const nearBoundary = Math.abs(sim.leadLateral) > SOFT_BOUNDARY_THRESHOLD + 0.08 && !sim.arrived;
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
        qualityProfile={qualityProfile}
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
    </>
  );
}

