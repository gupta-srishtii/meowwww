'use client';

import type { SceneManagerController } from '@/components/canvas/managers/SceneManager';
import type { CheckpointData } from '@/lib/checkpoint';
import type {
  BaalKuwariSubStage,
  MountainRoadSegmentId,
  MountainRoadSubStage,
} from '@/lib/mountainSpline';
import { getSceneDefinition, type SceneId } from '@/lib/sceneConfig';
import { useProgressStore } from '@/store/progressStore';

export interface TransitionOverlayProps {
  controller: SceneManagerController;
  contextLost: boolean;
  pendingResumeCheckpoint: CheckpointData | null;
  onContinueCheckpoint: () => void;
  onStartFresh: () => void;
  onDismissResumePrompt: () => void;
}

function getFriendlyStopTitle(
  sceneId: SceneId,
  segment?: MountainRoadSegmentId,
  subStage?: MountainRoadSubStage,
  baalKuwariSubStage?: BaalKuwariSubStage
): string {
  if (sceneId === 6) return 'Maggi & Chai Tapri';
  if (sceneId === 7) return 'Neelkanth Mahadev Temple';
  if (sceneId === 8) {
    return baalKuwariSubStage === 'maggi_stop'
      ? 'Baal Kuwari Trailhead Maggi Stop'
      : 'Mountain Route to Baal Kuwari';
  }
  if (sceneId === 9) return 'Baal Kuwari: The ~400 Stairs';
  if (sceneId === 10) return 'Baal Kuwari Summit Temple';
  if (sceneId === 5) {
    if (subStage === 'viewpoint_walk') return 'Scenic Mountain Viewpoint';
    if (segment === 'to_baalkuwari') return 'Mountain Route to Baal Kuwari';
    return segment === 'to_neelkanth' ? 'Forest Road to Neelkanth' : 'Rishikesh Mountain Road';
  }
  return getSceneDefinition(sceneId).title;
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
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const baalKuwariSubStage = useProgressStore((s) => s.baalKuwariSubStage);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const transitionError = useProgressStore((s) => s.transitionError);
  const userPaused = useProgressStore((s) => s.userPaused);

  const requestedDef = getSceneDefinition(requestedSceneId);

  const curtainOpaque =
    transitionPhase === 'fading_out' ||
    transitionPhase === 'loading' ||
    transitionPhase === 'mounting' ||
    transitionPhase === 'error';

  const canRetryTarget = requestedDef.phase1BStage !== 'unimplemented_stub';
  const requestedTitle = getFriendlyStopTitle(
    requestedDef.id,
    mountainRoadSegment,
    roadSubStage,
    baalKuwariSubStage
  );
  const committedTitle = getFriendlyStopTitle(
    committedSceneId,
    mountainRoadSegment,
    roadSubStage,
    baalKuwariSubStage
  );

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
              On the Way
            </p>
            <p className="text-sm font-medium text-slate-100">{requestedTitle}</p>
          </div>
        )}

        {transitionPhase === 'error' && (
          <section className="mx-4 w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 text-slate-100 shadow-2xl backdrop-blur-md">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-rose-300 uppercase">
              Unable to Open Stop
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-white">
              Could not enter {requestedTitle}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {transitionError ?? 'Something interrupted loading this part of the trip.'}
            </p>
            <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[11px] text-emerald-300">
              Your progress at {committedTitle} was kept safely.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {canRetryTarget && (
                <button
                  type="button"
                  onClick={controller.retryTransition}
                  className="flex-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                onClick={controller.revertToCommittedScene}
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Return to {committedTitle}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Warm Resume Saved Journey Banner */}
      {pendingResumeCheckpoint && transitionPhase === 'idle' && !userPaused && !contextLost && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-25 flex justify-center px-4 sm:bottom-6">
          <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2.5 rounded-2xl border border-amber-400/50 bg-slate-950/90 px-4 py-3 text-slate-100 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
                Continue Journey?
              </p>
              <p className="mt-0.5 text-xs text-slate-200">
                Saved at{' '}
                {getFriendlyStopTitle(
                  pendingResumeCheckpoint.committedSceneId,
                  pendingResumeCheckpoint.mountainRoadSegment,
                  pendingResumeCheckpoint.roadSubStage,
                  pendingResumeCheckpoint.baalKuwariSubStage
                )}
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
