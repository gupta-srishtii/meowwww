'use client';

import {
  ScooterPrototypeScene,
  type ScooterPrototypeSceneProps,
} from '@/components/canvas/ScooterPrototypeScene';

/**
 * Scene 5 — Mountain Road Ride (Act 1).
 * Preserves Milestone 0's verified delta-time scooter prototype and companion constraints.
 * Optional road flourishes (honk/wave, prayer flags, cow encounter) are deferred to Phase 2B.
 */
export function Scene05_MountainRoad(props: ScooterPrototypeSceneProps) {
  return <ScooterPrototypeScene {...props} />;
}

