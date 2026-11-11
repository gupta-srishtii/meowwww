'use client';

import { MinimalTopBar } from '@/components/ui/MinimalHudChrome';

export interface EndingScreenHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  onReplayJourney: () => void;
  onViewMemories: () => void;
  onCelebrateAgain?: () => void;
}

export function EndingScreenHUD({
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  onReplayJourney,
  onViewMemories,
}: EndingScreenHUDProps) {
  return (
    <>
      <MinimalTopBar
        title="For Ishaan"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      <div className="pointer-events-none fixed right-4 bottom-4 z-20 flex items-center gap-2 sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={onViewMemories}
          className="pointer-events-auto rounded-full border border-sky-300/50 bg-slate-950/80 px-4 py-2 text-xs font-medium text-sky-100 shadow-lg backdrop-blur-md transition hover:border-sky-300 hover:bg-slate-900"
        >
          Memories
        </button>
        <button
          type="button"
          onClick={onReplayJourney}
          className="pointer-events-auto rounded-full border border-amber-300/60 bg-amber-400/95 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg backdrop-blur-md transition hover:bg-amber-300"
        >
          Experience Again
        </button>
      </div>
    </>
  );
}

