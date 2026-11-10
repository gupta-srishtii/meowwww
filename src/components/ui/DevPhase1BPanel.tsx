'use client';

import { useEffect, useState } from 'react';
import {
  assetManager,
  type AssetManagerSnapshot,
} from '@/components/canvas/managers/AssetManager';
import type { SceneManagerController } from '@/components/canvas/managers/SceneManager';
import { CHECKPOINT_STORAGE_KEY } from '@/lib/checkpoint';
import { getSceneDefinition, type SceneId } from '@/lib/sceneConfig';
import { useProgressStore } from '@/store/progressStore';

export interface DevPhase1BPanelProps {
  controller: SceneManagerController;
  touchControlsVisible: boolean;
  onBeforeTransition: () => void;
  onSaveCheckpoint: () => void;
  onClearCheckpoint: () => void;
}

export function DevPhase1BPanel({
  controller,
  touchControlsVisible,
  onBeforeTransition,
  onSaveCheckpoint,
  onClearCheckpoint,
}: DevPhase1BPanelProps) {
  const [open, setOpen] = useState(false);
  const [assetSnapshot, setAssetSnapshot] = useState<AssetManagerSnapshot>(() =>
    assetManager.getSnapshot()
  );
  const [stubTargetId, setStubTargetId] = useState<SceneId>(1);
  const [corruptInjectedNote, setCorruptInjectedNote] = useState<string | null>(null);

  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const requestedSceneId = useProgressStore((s) => s.requestedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const transitionToken = useProgressStore((s) => s.transitionToken);
  const retryNonce = useProgressStore((s) => s.retryNonce);
  const staleCallbacksRejected = useProgressStore((s) => s.staleCallbacksRejected);
  const userPaused = useProgressStore((s) => s.userPaused);
  const tabHiddenPaused = useProgressStore((s) => s.tabHiddenPaused);
  const contextLostPaused = useProgressStore((s) => s.contextLostPaused);
  const checkpointStatusNote = useProgressStore((s) => s.checkpointStatusNote);
  const checkpointStorageBlocked = useProgressStore((s) => s.checkpointStorageBlocked);
  const lastCheckpoint = useProgressStore((s) => s.lastCheckpoint);
  const setUserPaused = useProgressStore((s) => s.setUserPaused);

  useEffect(() => {
    return assetManager.subscribe(() => {
      setAssetSnapshot(assetManager.getSnapshot());
    });
  }, []);

  const committedDef = getSceneDefinition(committedSceneId);
  const otherPlayableSceneId: SceneId = committedSceneId === 5 ? 0 : 5;
  const isBusy = transitionPhase !== 'idle';

  const switchTo = (targetId: SceneId, failureMode?: 'load' | 'mount') => {
    setCorruptInjectedNote(null);
    controller.requestSceneTransition(targetId, {
      simulateFailureMode: failureMode,
      clearInputs: onBeforeTransition,
    });
  };

  const handleInjectCorruptCheckpoint = () => {
    try {
      window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, '{"version":999,"bad":true');
      setCorruptInjectedNote(
        'Injected invalid checkpoint into localStorage. Reload page to verify safe discard.'
      );
    } catch {
      setCorruptInjectedNote('localStorage unavailable (cannot write corrupt sample).');
    }
  };

  return (
    <div
      className={`pointer-events-none fixed right-3 z-20 flex justify-end sm:right-4 ${
        touchControlsVisible ? 'bottom-24' : 'bottom-24 sm:bottom-4'
      }`}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-indigo-400/50 bg-slate-950/85 px-3.5 py-1.5 text-[11px] font-medium text-indigo-200 shadow-lg backdrop-blur-md transition hover:border-indigo-300 hover:bg-slate-900"
        >
          <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-indigo-200 uppercase">
            DEV
          </span>
          <span>
            Phase 1B Router · Scene {committedSceneId} ({transitionPhase})
          </span>
        </button>
      ) : (
        <aside className="pointer-events-auto max-h-[78vh] w-full max-w-md overflow-y-auto rounded-2xl border border-indigo-400/45 bg-slate-950/92 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-300 uppercase">
                Temporary Dev Harness · Phase 1B
              </p>
              <p className="mt-0.5 text-xs font-medium text-white">
                Scene Router, Asset Retention &amp; Checkpoints
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Live State Readout */}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-[11px]">
            <div>
              <dt className="text-slate-400">Committed Scene</dt>
              <dd className="font-semibold text-emerald-300">
                #{committedDef.id} · {committedDef.phase1BStage === 'temp_test_scene' ? 'Temp Test Stage' : committedDef.title}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Requested / Phase</dt>
              <dd className="font-semibold text-amber-200">
                #{requestedSceneId} · {transitionPhase}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Token / Retry Nonce</dt>
              <dd className="tabular-nums text-slate-200">
                t={transitionToken} / retry={retryNonce}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Stale Tokens Rejected</dt>
              <dd className="tabular-nums text-sky-300">{staleCallbacksRejected}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Shared Assets Retained</dt>
              <dd className="tabular-nums text-teal-300">
                {assetSnapshot.sharedAssets.length} keys (blocked dispose:{' '}
                {assetSnapshot.sharedDisposalBlockedCount})
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Scene-Owned Evictions</dt>
              <dd className="tabular-nums text-slate-200">
                {assetSnapshot.sceneOwnedEvictions} (last:{' '}
                {assetSnapshot.lastDisposedSceneId ?? 'none'})
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-400">Pause Flags</dt>
              <dd className="text-slate-300">
                user={String(userPaused)} · hidden={String(tabHiddenPaused)} · ctxLost=
                {String(contextLostPaused)}
              </dd>
            </div>
          </dl>

          {/* Implemented Scene Switchers */}
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Switch Implemented Scenes (Fade + Ready Token)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBusy || committedSceneId === 5}
                onClick={() => switchTo(5)}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Scene 5: Scooter Prototype
              </button>
              <button
                type="button"
                disabled={isBusy || committedSceneId === 0}
                onClick={() => switchTo(0)}
                className="rounded-lg border border-teal-400/40 bg-teal-500/15 px-2.5 py-1.5 text-[11px] font-medium text-teal-200 transition hover:bg-teal-500/25 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Scene 0: Temp Test Stage
              </button>
            </div>
          </div>

          {/* Recovery & Race Condition Checks */}
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Failure Recovery &amp; Lifecycle Checks
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchTo(otherPlayableSceneId, 'load')}
                className="rounded-lg border border-rose-400/40 bg-rose-950/60 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 transition hover:bg-rose-900/60 disabled:opacity-45"
              >
                Sim Load Failure → #{otherPlayableSceneId}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchTo(otherPlayableSceneId, 'mount')}
                className="rounded-lg border border-rose-400/40 bg-rose-950/60 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 transition hover:bg-rose-900/60 disabled:opacity-45"
              >
                Sim ErrorBoundary → #{otherPlayableSceneId}
              </button>
              <button
                type="button"
                onClick={controller.triggerStaleCallbackTest}
                className="rounded-lg border border-sky-400/40 bg-sky-950/60 px-2.5 py-1.5 text-[11px] font-medium text-sky-200 transition hover:bg-sky-900/60"
              >
                Fire Stale Ready Token
              </button>
              <button
                type="button"
                onClick={() => setUserPaused(!userPaused)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700"
              >
                {userPaused ? 'Resume Pause Flag' : 'Trigger User Pause (Esc)'}
              </button>
            </div>

            {/* Unimplemented Registry Target Guard Check */}
            <div className="flex items-center gap-2 pt-1">
              <select
                aria-label="Registry scene target"
                value={stubTargetId}
                onChange={(e) => setStubTargetId(Number(e.target.value) as SceneId)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200"
              >
                {[1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((id) => (
                  <option key={id} value={id}>
                    Scene {id}: {getSceneDefinition(id as SceneId).title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchTo(stubTargetId)}
                className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700 disabled:opacity-45"
              >
                Test Guard
              </button>
            </div>
          </div>

          {/* Checkpoint Persistence Tools */}
          <div className="mt-3 space-y-2 border-t border-slate-800 pt-2.5">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Checkpoint v2 ({checkpointStorageBlocked ? 'In-Memory Fallback' : 'localStorage'})
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSaveCheckpoint}
                className="rounded-lg border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-900/60"
              >
                Save Committed (#{committedSceneId})
              </button>
              <button
                type="button"
                onClick={onClearCheckpoint}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                Clear Save
              </button>
              <button
                type="button"
                onClick={handleInjectCorruptCheckpoint}
                className="rounded-lg border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-900/60"
              >
                Inject Corrupt JSON
              </button>
            </div>
            {(checkpointStatusNote || corruptInjectedNote || lastCheckpoint) && (
              <p className="text-[10px] leading-relaxed text-slate-400">
                {corruptInjectedNote ??
                  checkpointStatusNote ??
                  `Stored Scene #${lastCheckpoint?.committedSceneId}`}
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
