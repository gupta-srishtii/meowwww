'use client';

import { MinimalTopBar } from '@/components/ui/MinimalHudChrome';
import { POLAROID_MEMORY_SPECS } from '@/lib/privateMemoryLoader';

export interface EndingScreenHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  onReplayJourney: () => void;
  onViewMemories: () => void;
  onCelebrateAgain: () => void;
}

export function EndingScreenHUD({
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  onReplayJourney,
  onViewMemories,
  onCelebrateAgain,
}: EndingScreenHUDProps) {
  const totalPolaroids = Object.keys(POLAROID_MEMORY_SPECS).length;

  return (
    <>
      <MinimalTopBar
        title="For Ishaan"
        subtitle="Rishikesh · Neelkanth · Baal Kuwari · Bhai Dooj"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4 sm:bottom-8">
        <section className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-amber-300/60 bg-slate-950/90 p-5 text-center text-slate-100 shadow-2xl backdrop-blur-md sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
            Happy Bhai Dooj, Ishaan
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-white sm:text-2xl">
            Every Road Led Here
          </h2>
          <p className="mt-1.5 text-xs text-slate-300">
            Collected {polaroidCount} of {totalPolaroids} confirmed trip Polaroids · Jump into any chapter anytime or link your private photos folder inside Memories.
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onReplayJourney}
              className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Replay Our Journey
            </button>
            <button
              type="button"
              onClick={onViewMemories}
              className="flex-1 rounded-xl border border-sky-400/60 bg-sky-950/75 px-4 py-2.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-900"
            >
              View Our Memories ({polaroidCount}/{totalPolaroids})
            </button>
            <button
              type="button"
              onClick={onCelebrateAgain}
              className="flex-1 rounded-xl border border-amber-400/50 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-amber-100 transition hover:bg-slate-700"
            >
              Celebrate Bhai Dooj Again
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

