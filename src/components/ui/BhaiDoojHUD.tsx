'use client';

import { useRef } from 'react';
import type { BhaiDoojPhase } from '@/components/canvas/scenes/Scene13_BhaiDoojFinale';
import { MinimalTopBar } from '@/components/ui/MinimalHudChrome';
import { ambientAudio } from '@/lib/ambientAudio';
import {
  getPrivateMediaSessionState,
  registerLocalFinaleSong,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';

export interface BhaiDoojHUDProps {
  phase: BhaiDoojPhase;
  tilakApplied: boolean;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  onStartCelebration?: () => void;
  onTriggerTilak: () => void;
  onAcceptSweets: () => void;
  onSkipEating?: () => void;
  onViewMemories?: () => void;
  onReplayJourney?: () => void;
  onFinishFinale?: () => void;
}

export function BhaiDoojHUD({
  phase,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  onTriggerTilak,
  onAcceptSweets,
  onSkipEating,
  onViewMemories,
  onReplayJourney,
}: BhaiDoojHUDProps) {
  usePolaroidMemoryRevision();
  const songInputRef = useRef<HTMLInputElement | null>(null);
  const { finaleSongName, finaleSongUrl } = getPrivateMediaSessionState();
  const trackBlocked = ambientAudio.isCustomTrackBlocked();
  const showHappyHeading =
    phase === 'playful_laugh' || phase === 'jhula_swing' || phase === 'complete';

  return (
    <>
      <MinimalTopBar
        title="Happy Bhai Dooj"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      {/* Large floating transparent celebratory lettering over the marigold Jhula */}
      {showHappyHeading && (
        <div className="pointer-events-none fixed inset-x-0 top-3.5 z-10 flex justify-center px-4 sm:top-4">
          <h1 className="bg-transparent text-center font-serif text-3xl font-bold tracking-[0.22em] text-amber-200 uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.72)] sm:text-5xl">
            HAPPY BHAI DOOJ
          </h1>
        </div>
      )}

      {/* Subtle audio attach / autoplay unlock pill when needed */}
      {trackBlocked ? (
        <button
          type="button"
          onClick={() => ambientAudio.unlock()}
          className="pointer-events-auto fixed bottom-4 left-4 z-20 rounded-full border border-amber-300/60 bg-slate-950/75 px-3.5 py-1.5 text-[11px] font-medium text-amber-200 shadow-lg backdrop-blur-md transition hover:bg-slate-900"
        >
          ♪ Play Bhai Dooj Song
        </button>
      ) : (
        process.env.NODE_ENV !== 'production' && !finaleSongUrl &&
        phase !== 'complete' && (
          <>
            <input
              ref={songInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  registerLocalFinaleSong(file);
                  ambientAudio.unlock();
                }
              }}
            />
            <button
              type="button"
              onClick={() => songInputRef.current?.click()}
              className="pointer-events-auto fixed bottom-4 left-4 z-20 rounded-full border border-slate-700/75 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-amber-200 backdrop-blur-md transition hover:border-amber-300/60"
            >
              {finaleSongName ? `♪ ${finaleSongName}` : '♪ Attach Bhai Dooj Song'}
            </button>
          </>
        )
      )}

      {/* Interactive Tilak & Mithai prompts */}
      {phase === 'arrival' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onTriggerTilak}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/80 bg-slate-950/90 px-5 py-2.5 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-[11px] font-bold text-slate-950">
              E
            </span>
            <span>Apply Bhai Dooj Tilak</span>
          </button>
        </div>
      )}

      {phase === 'sweet_offer' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onAcceptSweets}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/80 bg-slate-950/90 px-5 py-2.5 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-[11px] font-bold text-slate-950">
              E
            </span>
            <span>Share Mithai Together</span>
          </button>
        </div>
      )}

      {phase === 'eating_together' && onSkipEating && (
        <div className="pointer-events-none fixed right-4 bottom-4 z-20 sm:right-6 sm:bottom-6">
          <button
            type="button"
            onClick={onSkipEating}
            className="pointer-events-auto rounded-full border border-slate-700/70 bg-slate-950/70 px-3.5 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur-md transition hover:bg-slate-900"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Clean corner-only ending buttons during peaceful swing finale */}
      {phase === 'complete' && (
        <div className="pointer-events-none fixed right-4 bottom-4 z-20 flex items-center gap-2 sm:right-6 sm:bottom-6">
          {onViewMemories && (
            <button
              type="button"
              onClick={onViewMemories}
              className="pointer-events-auto rounded-full border border-sky-300/50 bg-slate-950/80 px-4 py-2 text-xs font-medium text-sky-100 shadow-lg backdrop-blur-md transition hover:border-sky-300 hover:bg-slate-900"
            >
              Memories
            </button>
          )}
          {onReplayJourney && (
            <button
              type="button"
              onClick={onReplayJourney}
              className="pointer-events-auto rounded-full border border-amber-300/60 bg-amber-400/95 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg backdrop-blur-md transition hover:bg-amber-300"
            >
              Experience Again
            </button>
          )}
        </div>
      )}
    </>
  );
}

