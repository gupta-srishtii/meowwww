'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ErrorInfo,
  type RefObject,
} from 'react';
import type { TelemetryRefs } from '@/components/canvas/ScooterPrototypeScene';
import { CameraDirector } from '@/components/canvas/managers/CameraDirector';
import { assetManager } from '@/components/canvas/managers/AssetManager';
import { SceneErrorBoundary } from '@/components/canvas/managers/SceneErrorBoundary';
import { Scene01_KitaabiDastaan } from '@/components/canvas/scenes/Scene01_KitaabiDastaan';
import {
  Scene02_RishikeshDay1,
  type Day1Phase,
} from '@/components/canvas/scenes/Scene02_RishikeshDay1';
import { Scene03_Day2Morning } from '@/components/canvas/scenes/Scene03_Day2Morning';
import { Scene04_ScooterDeparture } from '@/components/canvas/scenes/Scene04_ScooterDeparture';
import { Scene05_MountainRoad } from '@/components/canvas/scenes/Scene05_MountainRoad';
import {
  Scene05_ViewpointStop,
  type ViewpointPhotoMoment,
} from '@/components/canvas/scenes/Scene05_ViewpointStop';
import { Scene06_MaggiChai } from '@/components/canvas/scenes/Scene06_MaggiChai';
import { Scene07_NeelkanthTemple } from '@/components/canvas/scenes/Scene07_NeelkanthTemple';
import { Scene08_BaalKuwariApproach } from '@/components/canvas/scenes/Scene08_BaalKuwariApproach';
import {
  Scene09_BaalKuwariStairs,
  type StairTelemetryRefs,
} from '@/components/canvas/scenes/Scene09_BaalKuwariStairs';
import { Scene10_BaalKuwariTemple } from '@/components/canvas/scenes/Scene10_BaalKuwariTemple';
import { Scene11_SafeReturnRide } from '@/components/canvas/scenes/Scene11_SafeReturnRide';
import { Scene12_HotelReturn } from '@/components/canvas/scenes/Scene12_HotelReturn';
import {
  Scene13_BhaiDoojFinale,
  type BhaiDoojPhase,
} from '@/components/canvas/scenes/Scene13_BhaiDoojFinale';
import { Scene14_EndingGallery } from '@/components/canvas/scenes/Scene14_EndingGallery';
import { TempPhase1BTestScene } from '@/components/canvas/scenes/TempPhase1BTestScene';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import type { WalkHotspot, WalkInputState } from '@/hooks/useWalkController';
import type {
  BaalKuwariSubStage,
  MountainRoadSegmentId,
  MountainRoadSubStage,
} from '@/lib/mountainSpline';
import type { SceneId } from '@/lib/sceneConfig';
import {
  selectIsSimulationPaused,
  useProgressStore,
  type DevFailureMode,
} from '@/store/progressStore';

export const FADE_DURATION_MS = 260;

export interface RequestTransitionOptions {
  simulateFailureMode?: DevFailureMode;
  clearInputs?: () => void;
}

export interface RoadSubStageTransitionOptions {
  roadSegment?: MountainRoadSegmentId;
  resumeDistance?: number;
  clearInputs?: () => void;
}

export interface SceneManagerController {
  requestSceneTransition: (targetId: SceneId, options?: RequestTransitionOptions) => void;
  requestRoadSubStageTransition: (
    nextSubStage: MountainRoadSubStage,
    options?: RoadSubStageTransitionOptions
  ) => void;
  requestBaalKuwariSubStageTransition: (
    nextSubStage: BaalKuwariSubStage,
    options?: { resumeDistance?: number; clearInputs?: () => void }
  ) => void;
  retryTransition: () => void;
  revertToCommittedScene: () => void;
  onMountedSceneReady: (token: number, sceneId: SceneId) => void;
  onMountedSceneError: (error: Error, info?: ErrorInfo) => void;
  triggerStaleCallbackTest: () => void;
}

export function useSceneTransitionController(): SceneManagerController {
  const transitionTokenRef = useRef<number>(0);
  const fadeOutTimerRef = useRef<number | null>(null);
  const fadeInTimerRef = useRef<number | null>(null);
  const fadeInRafRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelPendingAsync = useCallback(() => {
    if (fadeOutTimerRef.current !== null) {
      window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    if (fadeInTimerRef.current !== null) {
      window.clearTimeout(fadeInTimerRef.current);
      fadeInTimerRef.current = null;
    }
    if (fadeInRafRef.current !== null) {
      window.cancelAnimationFrame(fadeInRafRef.current);
      fadeInRafRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingAsync();
    };
  }, [cancelPendingAsync]);

  const runLoadingPipeline = useCallback(
    async (targetId: SceneId, token: number, failureOverride?: DevFailureMode) => {
      const store = useProgressStore.getState();
      const failureMode = failureOverride ?? store.devFailureMode;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await assetManager.ensureSceneLoaded(targetId, {
          simulateFailure: failureMode === 'load',
          signal: controller.signal,
          timeoutMs: 10_000,
        });

        if (controller.signal.aborted || token !== transitionTokenRef.current) {
          return;
        }

        // Keep 'mount' failure mode intact if testing ErrorBoundary fault; otherwise clear.
        if (failureMode === 'load') {
          useProgressStore.getState().setDevFailureMode('none');
        }
        useProgressStore.getState().enterMountingPhase(token);
      } catch (error) {
        if (controller.signal.aborted || token !== transitionTokenRef.current) {
          return;
        }
        useProgressStore.getState().setDevFailureMode('none');
        const message =
          error instanceof Error ? error.message : 'Unable to load destination scene.';
        useProgressStore.getState().failTransition(token, message);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  const requestSceneTransition = useCallback(
    (targetId: SceneId, options?: RequestTransitionOptions) => {
      cancelPendingAsync();
      options?.clearInputs?.();

      const store = useProgressStore.getState();
      if (options?.simulateFailureMode !== undefined) {
        store.setDevFailureMode(options.simulateFailureMode);
      }

      const token = ++transitionTokenRef.current;
      assetManager.preloadScene(targetId);
      store.beginFadeOut(targetId, token, true);

      fadeOutTimerRef.current = window.setTimeout(() => {
        fadeOutTimerRef.current = null;
        if (token !== transitionTokenRef.current) return;

        useProgressStore.getState().enterLoadingPhase(targetId, token);
        void runLoadingPipeline(targetId, token, options?.simulateFailureMode);
      }, FADE_DURATION_MS);
    },
    [cancelPendingAsync, runLoadingPipeline]
  );

  const requestRoadSubStageTransition = useCallback(
    (nextSubStage: MountainRoadSubStage, options?: RoadSubStageTransitionOptions) => {
      cancelPendingAsync();
      options?.clearInputs?.();

      const token = ++transitionTokenRef.current;
      const store = useProgressStore.getState();
      store.beginFadeOut(5, token, true);

      fadeOutTimerRef.current = window.setTimeout(() => {
        fadeOutTimerRef.current = null;
        if (token !== transitionTokenRef.current) return;

        const nextStore = useProgressStore.getState();
        if (options?.roadSegment) {
          nextStore.setMountainRoadSegment(options.roadSegment);
        }
        if (options?.resumeDistance !== undefined) {
          nextStore.setRoadResumeDistance(options.resumeDistance);
        }
        nextStore.setRoadSubStage(nextSubStage);
        nextStore.enterLoadingPhase(5, token);
        nextStore.enterMountingPhase(token);
      }, FADE_DURATION_MS);
    },
    [cancelPendingAsync]
  );

  const requestBaalKuwariSubStageTransition = useCallback(
    (
      nextSubStage: BaalKuwariSubStage,
      options?: { resumeDistance?: number; clearInputs?: () => void }
    ) => {
      cancelPendingAsync();
      options?.clearInputs?.();

      const token = ++transitionTokenRef.current;
      const store = useProgressStore.getState();
      store.beginFadeOut(8, token, true);

      fadeOutTimerRef.current = window.setTimeout(() => {
        fadeOutTimerRef.current = null;
        if (token !== transitionTokenRef.current) return;

        const nextStore = useProgressStore.getState();
        nextStore.setMountainRoadSegment(
          nextSubStage === 'driving_to_stairs' ? 'to_baalkuwari_stairs' : 'to_baalkuwari'
        );
        if (options?.resumeDistance !== undefined) {
          nextStore.setRoadResumeDistance(options.resumeDistance);
        }
        nextStore.setBaalKuwariSubStage(nextSubStage);
        nextStore.enterLoadingPhase(8, token);
        nextStore.enterMountingPhase(token);
      }, FADE_DURATION_MS);
    },
    [cancelPendingAsync]
  );

  const onMountedSceneReady = useCallback((token: number, sceneId: SceneId) => {
    if (token !== transitionTokenRef.current) {
      useProgressStore.getState().recordStaleCallbackRejected();
      return;
    }

    const committed = useProgressStore.getState().commitSceneReady(token, sceneId);
    if (!committed) {
      return;
    }

    const { previousCommittedSceneId } = useProgressStore.getState();
    if (previousCommittedSceneId !== null && previousCommittedSceneId !== sceneId) {
      window.requestAnimationFrame(() => {
        assetManager.disposeSceneOwned(previousCommittedSceneId, sceneId);
      });
    }

    // Wait two render frames behind the curtain so WebGL geometry & procedural textures settle before fading in.
    fadeInRafRef.current = window.requestAnimationFrame(() => {
      if (token !== transitionTokenRef.current) return;
      fadeInRafRef.current = window.requestAnimationFrame(() => {
        fadeInRafRef.current = null;
        if (token !== transitionTokenRef.current) return;
        fadeInTimerRef.current = window.setTimeout(() => {
          fadeInTimerRef.current = null;
          if (token !== transitionTokenRef.current) return;
          useProgressStore.getState().finishFadeIn(token);
        }, FADE_DURATION_MS);
      });
    });
  }, []);

  const onMountedSceneError = useCallback(
    (error: Error) => {
      cancelPendingAsync();
      const token = transitionTokenRef.current;
      useProgressStore.getState().setDevFailureMode('none');
      useProgressStore
        .getState()
        .failTransition(token, error.message || 'Scene failed to mount cleanly.');
    },
    [cancelPendingAsync]
  );

  const retryTransition = useCallback(() => {
    cancelPendingAsync();
    const targetId = useProgressStore.getState().requestedSceneId;
    assetManager.clearFailedSceneAssets(targetId);

    const token = ++transitionTokenRef.current;
    useProgressStore.getState().prepareRetry(token);
    void runLoadingPipeline(targetId, token, 'none');
  }, [cancelPendingAsync, runLoadingPipeline]);

  const revertToCommittedScene = useCallback(() => {
    cancelPendingAsync();
    const token = ++transitionTokenRef.current;
    useProgressStore.getState().prepareReturnToCommitted(token);
  }, [cancelPendingAsync]);

  const triggerStaleCallbackTest = useCallback(() => {
    const staleToken = transitionTokenRef.current + 999;
    const wrongTarget = useProgressStore.getState().committedSceneId === 5 ? 0 : 5;
    onMountedSceneReady(staleToken, wrongTarget);
  }, [onMountedSceneReady]);

  return {
    requestSceneTransition,
    requestRoadSubStageTransition,
    requestBaalKuwariSubStageTransition,
    retryTransition,
    revertToCommittedScene,
    onMountedSceneReady,
    onMountedSceneError,
    triggerStaleCallbackTest,
  };
}

export interface SceneStageProps {
  controller: SceneManagerController;
  inputRef: RefObject<DrivingInputState>;
  walkInputRef: RefObject<WalkInputState>;
  day1Phase: Day1Phase;
  onAdvanceDay1Phase: (next: Day1Phase) => void;
  onDay1Complete: () => void;
  morningBreakfastActive: boolean;
  morningBreakfastDone: boolean;
  onMorningBreakfastComplete: () => void;
  onScooterDepartureComplete: () => void;
  resetNonce: number;
  viewpointPullOverNonce: number;
  telemetryRefs: TelemetryRefs;
  ateMaggi: boolean;
  sippedChai: boolean;
  capturedDhabaPolaroid: boolean;
  foodCinematicActive: boolean;
  onFoodCinematicComplete: () => void;
  capturedViewpointShree: boolean;
  capturedViewpointSolo: boolean;
  capturedViewpointGroup: boolean;
  viewpointPhotoMoment: ViewpointPhotoMoment;
  rangBell: boolean;
  bellSwingImpulseNonce: number;
  litDiya: boolean;
  hadDarshan: boolean;
  capturedNeelkanthFood: boolean;
  activeDarshanPan: boolean;
  ateTrailheadMaggi: boolean;
  trailheadEatingActive: boolean;
  onTrailheadMaggiComplete: () => void;
  stairTelemetryRefs: StairTelemetryRefs;
  onEnterStaircaseFromFootpath: () => void;
  onStairHalfwayMilestone: () => void;
  onStairAscentComplete: () => void;
  onStairDescentComplete: () => void;
  summitArrivalCinematicActive: boolean;
  onSummitArrivalCinematicComplete: () => void;
  rangBaalKuwariBell: boolean;
  baalKuwariBellNonce: number;
  capturedBaalKuwariPolaroid: boolean;
  capturedBookPolaroid: boolean;
  bookPhotoActive: boolean;
  hotelFarewellDone: boolean;
  bhaiDoojPhase: BhaiDoojPhase;
  bhaiDoojTilakApplied: boolean;
  onBhaiDoojTilakApplied: () => void;
  onBhaiDoojTilakComplete: () => void;
  onBhaiDoojEatingComplete: () => void;
  collectedPolaroids: readonly string[];
  onInspectMemory: (id: string) => void;
  onNearbyHotspotChange: (hotspot: WalkHotspot | null) => void;
  onArrivedChange: (arrived: boolean) => void;
  onInViewpointZoneChange: (inZone: boolean) => void;
  onViewpointArrivedChange: (arrived: boolean) => void;
  onTrafficBrush?: () => void;
}

/**
 * R3F scene switchboard wrapped by reset-keyed SceneErrorBoundary and CameraDirector.
 * Retains the outgoing scene (`committedSceneId`) throughout `'fading_out'` and `'loading'`.
 */
export function SceneStage({
  controller,
  inputRef,
  walkInputRef,
  day1Phase,
  onAdvanceDay1Phase,
  onDay1Complete,
  morningBreakfastActive,
  morningBreakfastDone,
  onMorningBreakfastComplete,
  onScooterDepartureComplete,
  resetNonce,
  viewpointPullOverNonce,
  telemetryRefs,
  ateMaggi,
  sippedChai,
  capturedDhabaPolaroid,
  foodCinematicActive,
  onFoodCinematicComplete,
  capturedViewpointShree,
  capturedViewpointSolo,
  capturedViewpointGroup,
  viewpointPhotoMoment,
  rangBell,
  bellSwingImpulseNonce,
  litDiya,
  hadDarshan,
  capturedNeelkanthFood,
  activeDarshanPan,
  ateTrailheadMaggi,
  trailheadEatingActive,
  onTrailheadMaggiComplete,
  stairTelemetryRefs,
  onEnterStaircaseFromFootpath,
  onStairHalfwayMilestone,
  onStairAscentComplete,
  onStairDescentComplete,
  summitArrivalCinematicActive,
  onSummitArrivalCinematicComplete,
  rangBaalKuwariBell,
  baalKuwariBellNonce,
  capturedBaalKuwariPolaroid,
  capturedBookPolaroid,
  bookPhotoActive,
  hotelFarewellDone,
  bhaiDoojPhase,
  bhaiDoojTilakApplied,
  onBhaiDoojTilakApplied,
  onBhaiDoojTilakComplete,
  onBhaiDoojEatingComplete,
  collectedPolaroids,
  onInspectMemory,
  onNearbyHotspotChange,
  onArrivedChange,
  onInViewpointZoneChange,
  onViewpointArrivedChange,
  onTrafficBrush,
}: SceneStageProps) {
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const requestedSceneId = useProgressStore((s) => s.requestedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  // Keep outgoing readiness callbacks unchanged until the new mount is expected.
  const transitionToken = useProgressStore((s) => s.sceneMountToken);
  const retryNonce = useProgressStore((s) => s.retryNonce);
  const mountAttemptedForTransition = useProgressStore((s) => s.mountAttemptedForTransition);
  const devFailureMode = useProgressStore((s) => s.devFailureMode);
  const qualityProfile = useProgressStore((s) => s.qualityProfile);
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const baalKuwariSubStage = useProgressStore((s) => s.baalKuwariSubStage);
  const baalKuwariStairDirection = useProgressStore((s) => s.baalKuwariStairDirection);
  const stairStepCount = useProgressStore((s) => s.stairStepCount);
  const roadResumeDistance = useProgressStore((s) => s.roadResumeDistance);
  const downgradeQualityProfile = useProgressStore((s) => s.downgradeQualityProfile);
  const isPaused = useProgressStore(selectIsSimulationPaused);

  // Warm upcoming scene textures/GLTF preloads silently during gameplay so switches feel instant.
  useEffect(() => {
    const nextMap: Partial<Record<SceneId, readonly SceneId[]>> = {
      1: [2],
      2: [3],
      3: [4, 5],
      4: [5],
      5: [6, 7],
      6: [5, 7],
      7: [8],
      8: [9],
      9: [10, 11],
      10: [9, 11],
      11: [12],
      12: [13],
      13: [14],
      14: [1],
    };
    const targets = nextMap[committedSceneId];
    if (!targets) return;
    targets.forEach((id) => assetManager.preloadScene(id));
  }, [committedSceneId]);

  // Outgoing committed scene remains mounted behind curtain while fading out, loading, or on load failure.
  const mountedSceneId: SceneId =
    transitionPhase === 'mounting' ||
    transitionPhase === 'fading_in' ||
    (transitionPhase === 'error' && mountAttemptedForTransition)
      ? requestedSceneId
      : committedSceneId;

  const scenePaused =
    isPaused ||
    transitionPhase === 'fading_out' ||
    transitionPhase === 'loading' ||
    transitionPhase === 'error';

  const simulateMountFailure =
    transitionPhase === 'mounting' && devFailureMode === 'mount';

  const boundaryResetKey = `${mountedSceneId}-${
    mountedSceneId === 5
      ? roadSubStage
      : mountedSceneId === 8
        ? baalKuwariSubStage
        : mountedSceneId === 9
          ? baalKuwariStairDirection
          : 'base'
  }-${retryNonce}`;

  return (
    <>
      <CameraDirector />
      <SceneErrorBoundary
        resetKey={boundaryResetKey}
        onSceneError={controller.onMountedSceneError}
      >
        <Suspense key={transitionToken} fallback={null}>
          {mountedSceneId === 1 ? (
            <Scene01_KitaabiDastaan
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 2 ? (
            <Scene02_RishikeshDay1
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              day1Phase={day1Phase}
              onAdvanceDay1Phase={onAdvanceDay1Phase}
              onDay1Complete={onDay1Complete}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
              simulateMountFailure={simulateMountFailure}
            />
          ) : mountedSceneId === 3 ? (
            <Scene03_Day2Morning
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              breakfastActive={morningBreakfastActive}
              breakfastDone={morningBreakfastDone}
              onBreakfastComplete={onMorningBreakfastComplete}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
              simulateMountFailure={simulateMountFailure}
            />
          ) : mountedSceneId === 4 ? (
            <Scene04_ScooterDeparture
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              onDepartureComplete={onScooterDepartureComplete}
              onSceneReady={controller.onMountedSceneReady}
              simulateMountFailure={simulateMountFailure}
            />
          ) : mountedSceneId === 5 ? (
            roadSubStage === 'viewpoint_walk' ? (
              <Scene05_ViewpointStop
                walkInputRef={walkInputRef}
                qualityProfile={qualityProfile}
                paused={scenePaused}
                transitionToken={transitionToken}
                capturedShree={capturedViewpointShree}
                capturedSolo={capturedViewpointSolo}
                capturedGroup={capturedViewpointGroup}
                activePhotoMoment={viewpointPhotoMoment}
                onNearbyHotspotChange={onNearbyHotspotChange}
                onSceneReady={controller.onMountedSceneReady}
              />
            ) : (
              <Scene05_MountainRoad
                inputRef={inputRef}
                qualityProfile={qualityProfile}
                paused={scenePaused}
                resetNonce={resetNonce}
                roadSegment={mountainRoadSegment}
                startDistance={roadResumeDistance}
                viewpointPullOverNonce={viewpointPullOverNonce}
                transitionToken={transitionToken}
                simulateMountFailure={simulateMountFailure}
                onSceneReady={transitionToken > 0 ? controller.onMountedSceneReady : undefined}
                onArrivedChange={onArrivedChange}
                onInViewpointZoneChange={onInViewpointZoneChange}
                onViewpointArrivedChange={onViewpointArrivedChange}
                onTrafficBrush={onTrafficBrush}
                onAutoDowngradeQuality={downgradeQualityProfile}
                telemetryRefs={telemetryRefs}
              />
            )
          ) : mountedSceneId === 6 ? (
            <Scene06_MaggiChai
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              ateMaggi={ateMaggi}
              sippedChai={sippedChai}
              capturedPolaroid={capturedDhabaPolaroid}
              foodCinematicActive={foodCinematicActive}
              onFoodCinematicComplete={onFoodCinematicComplete}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 7 ? (
            <Scene07_NeelkanthTemple
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              rangBell={rangBell}
              bellSwingImpulseNonce={bellSwingImpulseNonce}
              litDiya={litDiya}
              hadDarshan={hadDarshan}
              capturedFood={capturedNeelkanthFood}
              activeDarshanPan={activeDarshanPan}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 8 ? (
            <Scene08_BaalKuwariApproach
              subStage={baalKuwariSubStage}
              drivingInputRef={inputRef}
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              resetNonce={resetNonce}
              startDistance={roadResumeDistance}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              ateMaggi={ateTrailheadMaggi}
              eatingActive={trailheadEatingActive}
              onEatMaggiComplete={onTrailheadMaggiComplete}
              onArrivedChange={onArrivedChange}
              onAutoDowngradeQuality={downgradeQualityProfile}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onEnterStaircase={onEnterStaircaseFromFootpath}
              onSceneReady={controller.onMountedSceneReady}
              telemetryRefs={telemetryRefs}
            />
          ) : mountedSceneId === 9 ? (
            <Scene09_BaalKuwariStairs
              direction={baalKuwariStairDirection}
              initialStepCount={stairStepCount}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              stairTelemetryRefs={stairTelemetryRefs}
              onReachHalfwayMilestone={onStairHalfwayMilestone}
              onAscentComplete={onStairAscentComplete}
              onDescentComplete={onStairDescentComplete}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 10 ? (
            <Scene10_BaalKuwariTemple
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              arrivalCinematicActive={summitArrivalCinematicActive}
              onArrivalCinematicComplete={onSummitArrivalCinematicComplete}
              rangBell={rangBaalKuwariBell}
              bellImpulseNonce={baalKuwariBellNonce}
              capturedPolaroid={capturedBaalKuwariPolaroid}
              capturedBookPolaroid={capturedBookPolaroid}
              bookPhotoActive={bookPhotoActive}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 11 ? (
            <Scene11_SafeReturnRide
              inputRef={inputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              resetNonce={resetNonce}
              startDistance={roadResumeDistance}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              onSceneReady={controller.onMountedSceneReady}
              onArrivedChange={onArrivedChange}
              onTrafficBrush={onTrafficBrush}
              onAutoDowngradeQuality={downgradeQualityProfile}
              telemetryRefs={telemetryRefs}
            />
          ) : mountedSceneId === 12 ? (
            <Scene12_HotelReturn
              walkInputRef={walkInputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              farewellDone={hotelFarewellDone}
              onNearbyHotspotChange={onNearbyHotspotChange}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 13 ? (
            <Scene13_BhaiDoojFinale
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              phase={bhaiDoojPhase}
              tilakApplied={bhaiDoojTilakApplied}
              onTilakApplied={onBhaiDoojTilakApplied}
              onTilakComplete={onBhaiDoojTilakComplete}
              onEatingComplete={onBhaiDoojEatingComplete}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : mountedSceneId === 14 ? (
            <Scene14_EndingGallery
              qualityProfile={qualityProfile}
              paused={scenePaused}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              collectedPolaroids={collectedPolaroids}
              onInspectMemory={onInspectMemory}
              onSceneReady={controller.onMountedSceneReady}
            />
          ) : (
            <TempPhase1BTestScene
              sceneId={mountedSceneId}
              transitionToken={transitionToken}
              paused={scenePaused}
              qualityProfile={qualityProfile}
              simulateMountFailure={simulateMountFailure}
              onSceneReady={controller.onMountedSceneReady}
            />
          )}
        </Suspense>
      </SceneErrorBoundary>
    </>
  );
}
