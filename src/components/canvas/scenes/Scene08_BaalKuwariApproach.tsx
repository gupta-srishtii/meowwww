'use client';

import type { RefObject } from 'react';
import {
  ScooterPrototypeScene,
  type TelemetryRefs,
} from '@/components/canvas/ScooterPrototypeScene';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import type { WalkHotspot, WalkInputState } from '@/hooks/useWalkController';
import type { BaalKuwariSubStage } from '@/lib/mountainSpline';
import type { QualityProfile } from '@/lib/qualityProfile';
import type { SceneId } from '@/lib/sceneConfig';

export interface Scene08BaalKuwariApproachProps {
  subStage?: BaalKuwariSubStage;
  drivingInputRef: RefObject<DrivingInputState>;
  walkInputRef?: RefObject<WalkInputState>;
  qualityProfile: QualityProfile;
  paused: boolean;
  resetNonce: number;
  startDistance: number;
  transitionToken: number;
  autoPlayMode?: boolean;
  simulateMountFailure?: boolean;
  ateMaggi?: boolean;
  eatingActive?: boolean;
  onEatMaggiComplete?: () => void;
  onArrivedChange: (arrived: boolean) => void;
  onAutoDowngradeQuality: () => void;
  onNearbyHotspotChange?: (hotspot: WalkHotspot | null) => void;
  onEnterStaircase?: () => void;
  onSceneReady: (token: number, sceneId: SceneId) => void;
  telemetryRefs: TelemetryRefs;
}

/**
 * Scene 8 — Direct Curved Rocky Off-Road Scooter Route from Neelkanth Market Exit
 * directly up to the Baal Kuwari Staircase Entrance Gate (~278m dirt-track approach).
 */
export function Scene08_BaalKuwariApproach(props: Scene08BaalKuwariApproachProps) {
  if (props.simulateMountFailure) {
    throw new Error('Simulated fault while mounting Baal Kuwari approach.');
  }

  return (
    <ScooterPrototypeScene
      inputRef={props.drivingInputRef}
      qualityProfile={props.qualityProfile}
      paused={props.paused}
      resetNonce={props.resetNonce}
      roadSegment="to_baalkuwari"
      startDistance={props.startDistance}
      transitionToken={props.transitionToken}
      autoPlayMode={props.autoPlayMode}
      onSceneReady={(_token, _sceneId) => props.onSceneReady(props.transitionToken, 8)}
      onArrivedChange={props.onArrivedChange}
      onAutoDowngradeQuality={props.onAutoDowngradeQuality}
      telemetryRefs={props.telemetryRefs}
    />
  );
}
