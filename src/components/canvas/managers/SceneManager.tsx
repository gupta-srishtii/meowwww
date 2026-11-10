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
import { ScooterPrototypeScene } from '@/components/canvas/ScooterPrototypeScene';
import { CameraDirector } from '@/components/canvas/managers/CameraDirector';
import { assetManager } from '@/components/canvas/managers/AssetManager';
import { SceneErrorBoundary } from '@/components/canvas/managers/SceneErrorBoundary';
import { TempPhase1BTestScene } from '@/components/canvas/scenes/TempPhase1BTestScene';
import type { DrivingInputState } from '@/hooks/useDrivingInput';
import type { SceneId } from '@/lib/sceneConfig';
import {
  selectIsSimulationPaused,
  useProgressStore,
  type DevFailureMode,
} from '@/store/progressStore';

export const FADE_DURATION_MS = 350;

export interface RequestTransitionOptions {
  simulateFailureMode?: DevFailureMode;
  clearInputs?: () => void;
}

export interface SceneManagerController {
  requestSceneTransition: (targetId: SceneId, options?: RequestTransitionOptions) => void;
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

    fadeInTimerRef.current = window.setTimeout(() => {
      fadeInTimerRef.current = null;
      if (token !== transitionTokenRef.current) return;
      useProgressStore.getState().finishFadeIn(token);
    }, FADE_DURATION_MS);
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
  resetNonce: number;
  telemetryRefs: TelemetryRefs;
  onArrivedChange: (arrived: boolean) => void;
}

/**
 * R3F scene switchboard wrapped by reset-keyed SceneErrorBoundary and CameraDirector.
 * Retains the outgoing scene (`committedSceneId`) throughout `'fading_out'` and `'loading'`.
 */
export function SceneStage({
  controller,
  inputRef,
  resetNonce,
  telemetryRefs,
  onArrivedChange,
}: SceneStageProps) {
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const requestedSceneId = useProgressStore((s) => s.requestedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const transitionToken = useProgressStore((s) => s.transitionToken);
  const retryNonce = useProgressStore((s) => s.retryNonce);
  const mountAttemptedForTransition = useProgressStore((s) => s.mountAttemptedForTransition);
  const devFailureMode = useProgressStore((s) => s.devFailureMode);
  const qualityProfile = useProgressStore((s) => s.qualityProfile);
  const downgradeQualityProfile = useProgressStore((s) => s.downgradeQualityProfile);
  const isPaused = useProgressStore(selectIsSimulationPaused);

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

  const boundaryResetKey = `${mountedSceneId}-${retryNonce}`;

  return (
    <>
      <CameraDirector />
      <SceneErrorBoundary
        resetKey={boundaryResetKey}
        onSceneError={controller.onMountedSceneError}
      >
        <Suspense fallback={null}>
          {mountedSceneId === 5 ? (
            <ScooterPrototypeScene
              inputRef={inputRef}
              qualityProfile={qualityProfile}
              paused={scenePaused}
              resetNonce={resetNonce}
              transitionToken={transitionToken}
              simulateMountFailure={simulateMountFailure}
              onSceneReady={transitionToken > 0 ? controller.onMountedSceneReady : undefined}
              onArrivedChange={onArrivedChange}
              onAutoDowngradeQuality={downgradeQualityProfile}
              telemetryRefs={telemetryRefs}
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
