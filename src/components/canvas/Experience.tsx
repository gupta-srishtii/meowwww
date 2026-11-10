'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  SceneStage,
  useSceneTransitionController,
} from '@/components/canvas/managers/SceneManager';
import { DevPhase1BPanel } from '@/components/ui/DevPhase1BPanel';
import { FallbackStorybookView } from '@/components/ui/FallbackStorybookView';
import { MobileTouchControls } from '@/components/ui/MobileTouchControls';
import { PrototypeHUD } from '@/components/ui/PrototypeHUD';
import { TransitionOverlay } from '@/components/ui/TransitionOverlay';
import { useCheckpoint } from '@/hooks/useCheckpoint';
import { useDrivingInput } from '@/hooks/useDrivingInput';
import {
  QUALITY_PRESETS,
  detectIsTouchDevice,
} from '@/lib/qualityProfile';
import { useProgressStore } from '@/store/progressStore';

// Configure local self-hosted Draco decoder path once at client entry.
useGLTF.setDecoderPath('/draco/');

export default function Experience() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [contextLossCount, setContextLossCount] = useState(0);
  const [contextRestoreTimedOut, setContextRestoreTimedOut] = useState(false);
  const [escalatedToFallback, setEscalatedToFallback] = useState(false);

  const [isTouchDevice] = useState<boolean>(() => detectIsTouchDevice());
  const [touchControlsVisible, setTouchControlsVisible] = useState<boolean>(() =>
    detectIsTouchDevice()
  );
  const [arrived, setArrived] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  const qualityProfile = useProgressStore((s) => s.qualityProfile);
  const setQualityProfile = useProgressStore((s) => s.setQualityProfile);
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const userPaused = useProgressStore((s) => s.userPaused);
  const setUserPaused = useProgressStore((s) => s.setUserPaused);
  const setTabHiddenPaused = useProgressStore((s) => s.setTabHiddenPaused);
  const setContextLostPaused = useProgressStore((s) => s.setContextLostPaused);

  // Preserve the initial GL antialias creation flag to avoid remounting the WebGL context.
  const [initialAntialias] = useState<boolean>(
    () => QUALITY_PRESETS[useProgressStore.getState().qualityProfile].antialias
  );

  const speedEl = useRef<HTMLSpanElement>(null);
  const distanceEl = useRef<HTMLSpanElement>(null);
  const gapEl = useRef<HTMLSpanElement>(null);
  const boundaryEl = useRef<HTMLSpanElement>(null);

  const telemetryRefs = useMemo(
    () => ({ speedEl, distanceEl, gapEl, boundaryEl }),
    []
  );

  const handleResetRide = useCallback(() => {
    setResetNonce((prev) => prev + 1);
    setArrived(false);
    if (boundaryEl.current) {
      boundaryEl.current.style.opacity = '0';
    }
  }, []);

  const { inputRef, clearAllInputs, setMoveZoneControl, setActionZoneControl } =
    useDrivingInput(handleResetRide);

  const sceneController = useSceneTransitionController();

  const requestCheckpointTransition = useCallback(
    (targetId: typeof committedSceneId) => {
      sceneController.requestSceneTransition(targetId, {
        clearInputs: clearAllInputs,
      });
    },
    [clearAllInputs, sceneController]
  );

  const {
    pendingResumeCheckpoint,
    continueFromCheckpoint,
    startFreshFromCheckpoint,
    dismissPendingResume,
    saveCheckpoint,
    clearCheckpoint,
  } = useCheckpoint(requestCheckpointTransition);

  // Clear ride arrival banner when switching scenes.
  useEffect(() => {
    setArrived(false);
  }, [committedSceneId]);

  // Independent pause listeners: Escape/P user pause + tab visibility pause.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        const state = useProgressStore.getState();
        if (state.transitionPhase !== 'idle') return;
        const nextPaused = !state.userPaused;
        if (nextPaused) {
          clearAllInputs();
        }
        setUserPaused(nextPaused);
      }
    };

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      if (hidden) {
        clearAllInputs();
      }
      setTabHiddenPaused(hidden);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearAllInputs, setTabHiddenPaused, setUserPaused]);

  // Freeze held inputs whenever user pause activates externally (e.g. Dev button).
  useEffect(() => {
    if (userPaused || transitionPhase !== 'idle') {
      clearAllInputs();
    }
  }, [clearAllInputs, transitionPhase, userPaused]);

  // WebGL2 context loss, timeout escalation, and restoration without overriding other pause flags.
  useEffect(() => {
    if (!canvasElement) return;
    let restoreTimer: number | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      clearAllInputs();
      setContextLost(true);
      setContextRestoreTimedOut(false);
      setContextLostPaused(true);
      setContextLossCount((count) => count + 1);

      restoreTimer = window.setTimeout(() => {
        setContextRestoreTimedOut(true);
      }, 8000);
    };

    const handleContextRestored = () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
        restoreTimer = null;
      }
      setContextLost(false);
      setContextRestoreTimedOut(false);
      // Only clears contextLostPaused; userPaused / tabHiddenPaused stay intact (§7).
      setContextLostPaused(false);
    };

    canvasElement.addEventListener('webglcontextlost', handleContextLost);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
      }
      canvasElement.removeEventListener('webglcontextlost', handleContextLost);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvasElement, clearAllInputs, setContextLostPaused]);

  if (escalatedToFallback || contextLossCount >= 2) {
    return (
      <FallbackStorybookView
        reason={`Graphics context was interrupted on this device (last committed scene: #${committedSceneId}).`}
      />
    );
  }

  const activePreset = QUALITY_PRESETS[qualityProfile];
  const isDrivingSceneActive = committedSceneId === 5;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <Canvas
        dpr={activePreset.dpr}
        shadows={activePreset.shadows}
        camera={{ position: [0, 3.2, 3.0], fov: 53, near: 0.25, far: 460 }}
        gl={{ antialias: initialAntialias, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => setCanvasElement(gl.domElement)}
      >
        <SceneStage
          controller={sceneController}
          inputRef={inputRef}
          resetNonce={resetNonce}
          telemetryRefs={telemetryRefs}
          onArrivedChange={setArrived}
        />
      </Canvas>

      {isDrivingSceneActive ? (
        <>
          <PrototypeHUD
            arrived={arrived}
            qualityProfile={qualityProfile}
            onChangeQuality={setQualityProfile}
            touchControlsVisible={touchControlsVisible}
            onToggleTouchControls={() => setTouchControlsVisible((visible) => !visible)}
            onResetRide={handleResetRide}
            telemetryRefs={telemetryRefs}
            defaultGuideOpen={!isTouchDevice}
          />
          <MobileTouchControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              transitionPhase === 'idle'
            }
            onMoveControl={setMoveZoneControl}
            onActionControl={setActionZoneControl}
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5">
          <div className="pointer-events-auto rounded-2xl border border-slate-700/70 bg-slate-950/75 px-4 py-2.5 text-slate-100 shadow-lg backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-teal-300 uppercase">
              Temporary Phase 1B Test Scene
            </p>
            <p className="mt-0.5 text-xs font-medium text-white">
              Scene 0 Slot · Shared Scooter Cache &amp; CameraDirector Active
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Press Esc / P to test pause, or open DEV Router to switch scenes.
            </p>
          </div>
        </div>
      )}

      <DevPhase1BPanel
        controller={sceneController}
        touchControlsVisible={touchControlsVisible && isDrivingSceneActive}
        onBeforeTransition={clearAllInputs}
        onSaveCheckpoint={saveCheckpoint}
        onClearCheckpoint={clearCheckpoint}
      />

      <TransitionOverlay
        controller={sceneController}
        contextLost={contextLost}
        pendingResumeCheckpoint={pendingResumeCheckpoint}
        onContinueCheckpoint={() => continueFromCheckpoint()}
        onStartFresh={startFreshFromCheckpoint}
        onDismissResumePrompt={dismissPendingResume}
      />

      {contextLost && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-slate-950/90 px-6 text-center backdrop-blur-sm">
          <p className="text-sm text-slate-200">
            Graphics paused. Restoring 3D canvas...
          </p>
          {contextRestoreTimedOut && (
            <button
              type="button"
              onClick={() => setEscalatedToFallback(true)}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Switch to 2D Fallback Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
}
