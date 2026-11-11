'use client';

import type { RefObject } from 'react';
import {
  ScooterPrototypeScene,
  type TelemetryRefs,
} from '@/components/canvas/ScooterPrototypeScene';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import type { QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene11SafeReturnRideProps {
  inputRef: RefObject<DrivingInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  resetNonce: number;
  startDistance: number;
  transitionToken: number;
  autoPlayMode?: boolean;
  simulateMountFailure?: boolean;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  onArrivedChange: (arrived: boolean) => void;
  onTrafficBrush?: () => void;
  onAutoDowngradeQuality?: () => void;
  telemetryRefs: TelemetryRefs;
}

/**
 * Scene 11 — Time-Sensitive Yet Safe Evening Return Ride toward the shared Rishikesh hotel.
 * Reuses the verified two-scooter spline physics cleanly with zero reckless-driving mechanics.
 */
export function Scene11_SafeReturnRide({
  inputRef,
  qualityProfile,
  paused,
  resetNonce,
  startDistance,
  transitionToken,
  autoPlayMode = false,
  simulateMountFailure = false,
  onSceneReady,
  onArrivedChange,
  onTrafficBrush,
  onAutoDowngradeQuality,
  telemetryRefs,
}: Scene11SafeReturnRideProps) {
  if (simulateMountFailure) {
    throw new Error('Simulated fault while mounting evening return ride.');
  }

  return (
    <ScooterPrototypeScene
      inputRef={inputRef}
      qualityProfile={qualityProfile}
      paused={paused}
      resetNonce={resetNonce}
      roadSegment="to_hotel_return"
      startDistance={startDistance}
      transitionToken={transitionToken}
      autoPlayMode={autoPlayMode}
      onSceneReady={(_token, _sceneId) => onSceneReady(transitionToken, 11)}
      onArrivedChange={onArrivedChange}
      onTrafficBrush={onTrafficBrush}
      onAutoDowngradeQuality={onAutoDowngradeQuality}
      telemetryRefs={telemetryRefs}
    />
  );
}

