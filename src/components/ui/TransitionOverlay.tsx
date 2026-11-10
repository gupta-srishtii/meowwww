'use client';

import type { SceneManagerController } from '@/components/canvas/managers/SceneManager';
import type { CheckpointData } from '@/lib/checkpoint';
import { getSceneDefinition } from '@/lib/sceneConfig';
import { useProgressStore } from '@/store/progressStore';

export interface TransitionOverlayProps {
  controller: SceneManagerController;
  contextLost: boolean;
  pendingResumeCheckpoint: CheckpointData | null;
  onContinueCheckpoint: () => void;
  onStartFresh: () => void;
  onDismissResumePrompt: () => void;
}

export function TransitionOverlay({
  controller,
  contextLost,
  pendingResumeCheckpoint,
  onContinueCheckpoint,
  onStartFresh,
  onDismissResumePrompt,
}: TransitionOverlayProps) {
  const requestedSceneId = useProgressStore((s) => s.requestedSceneId);
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const transitionError = useProgressStore((s) => s.transitionError);
  const userPaused = useProgressStore((s) => s.userPaused);
  const tabHiddenPaused = useProgressStore((s) => s.tabHiddenPaused);
  const contextLostPaused = useProgressStore((s) => s.contextLostPaused);
  const setUserPaused = useProgressStore((s) => s.setUserPaused);

  const requestedDef = getSceneDefinition(requestedSceneId);
  const committedDef = getSceneDefinition(committedSceneId);

  const curtainOpaque =
    transitionPhase === 'fading_out' ||
    transitionPhase === 'loading' ||
    transitionPhase === 'mounting' ||
    transitionPhase === 'error';

  const canRetryTarget = requestedDef.phase1BStage !== 'unimplemented_stub';

  return (
    <>
      {/* 350ms Cinematic Fade Curtain */}
      <div
        aria-hidden={!curtainOpaque}
        className={`fixed inset-0 z-30 flex items-center justify-center bg-[#060913] transition-opacity duration-[350ms] ease-in-out ${
          curtainOpaque
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        {(transitionPhase === 'loading' || transitionPhase === 'mounting') && (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-slate-200">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
            <p className="text-xs font-medium tracking-[0.18em] text-amber-300/90 uppercase">
              {transitionPhase === 'loading' ? 'Preparing Scene' : 'Mounting Scene'}
            </p>
            <p className="text-sm text-slate-300">
              Scene {requestedDef.id} · {requestedDef.title}
            </p>
          </div>
        )}

        {transitionPhase === 'error' && (
          <section className="mx-4 w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 text-slate-100 shadow-2xl backdrop-blur-md">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-rose-300 uppercase">
              Scene Transition Recovery
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-white">
              Could not enter Scene {requestedDef.id}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {transitionError ?? 'An unexpected error prevented mounting this scene.'}
            </p>
            <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[11px] text-emerald-300">
              Committed scene preserved: Scene {committedDef.id} ({committedDef.title}). Saved
              checkpoint was not modified.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {canRetryTarget && (
                <button
                  type="button"
                  onClick={controller.retryTransition}
                  className="flex-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Retry Scene {requestedDef.id}
                </button>
              )}
              <button
                type="button"
                onClick={controller.revertToCommittedScene}
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Return to Scene {committedDef.id}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Independent User Pause Menu Overlay (unaffected by scene timeline pause) */}
      {userPaused && transitionPhase === 'idle' && !contextLost && (
        <div className="fixed inset-0 z-25 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 text-center text-slate-100 shadow-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
              Paused
            </p>
            <p className="mt-1.5 text-sm font-medium text-white">
              Scene {committedDef.id} · {committedDef.title}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Pause Flags: user={String(userPaused)} · hidden={String(tabHiddenPaused)} ·
              ctxLost={String(contextLostPaused)}
            </p>
            <button
              type="button"
              onClick={() => setUserPaused(false)}
              className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Resume (Esc / P)
            </button>
          </div>
        </div>
      )}

      {/* Versioned Local Checkpoint Resume Banner */}
      {pendingResumeCheckpoint && transitionPhase === 'idle' && !userPaused && !contextLost && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-25 flex justify-center px-4 sm:bottom-6">
          <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2.5 rounded-2xl border border-amber-400/50 bg-slate-950/90 px-4 py-3 text-slate-100 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
                Saved Checkpoint v{pendingResumeCheckpoint.version}
              </p>
              <p className="mt-0.5 text-xs text-slate-200">
                Scene {pendingResumeCheckpoint.committedSceneId}:{' '}
                {getSceneDefinition(pendingResumeCheckpoint.committedSceneId).title}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onContinueCheckpoint}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onStartFresh}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={onDismissResumePrompt}
                aria-label="Dismiss checkpoint banner"
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

