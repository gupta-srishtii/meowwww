'use client';

import { useEffect } from 'react';
import {
  selectIsSimulationPaused,
  useProgressStore,
} from '@/store/progressStore';

export interface NarrationCardProps {
  touchControlsVisible: boolean;
}

/**
 * Responsive Hinglish narration & reflection overlay.
 * Advances on tap/click or `Space` / `Enter` without blocking movement HUDs.
 */
export function NarrationCard({ touchControlsVisible }: NarrationCardProps) {
  const activeNarration = useProgressStore((s) => s.activeNarration);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const isPaused = useProgressStore(selectIsSimulationPaused);
  const advanceNarration = useProgressStore((s) => s.advanceNarration);
  const closeNarration = useProgressStore((s) => s.closeNarration);

  const visible = activeNarration !== null && transitionPhase === 'idle' && !isPaused;

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') {
        return;
      }

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        advanceNarration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advanceNarration, visible]);

  if (!visible || !activeNarration) return null;

  const { entry, lineIndex } = activeNarration;
  const line = entry.lines[lineIndex] ?? '';
  const isLastLine = lineIndex >= entry.lines.length - 1;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-20 flex justify-center px-3 sm:px-6 ${
        touchControlsVisible ? 'bottom-44 sm:bottom-28' : 'bottom-5 sm:bottom-7'
      }`}
    >
      <div
        role="dialog"
        aria-label={entry.speaker ?? 'Story Narration'}
        onClick={advanceNarration}
        className="pointer-events-auto w-full max-w-xl cursor-pointer rounded-2xl border border-amber-300/45 bg-slate-950/90 px-4 py-3.5 text-slate-100 shadow-2xl backdrop-blur-md transition hover:border-amber-300/75 sm:px-5 sm:py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {entry.speaker && (
              <span className="text-[11px] font-semibold tracking-[0.14em] text-amber-300 uppercase">
                {entry.speaker}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeNarration();
            }}
            aria-label="Close narration"
            className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-100 sm:text-[15px]">{line}</p>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {entry.lines.length > 1 ? `${lineIndex + 1} / ${entry.lines.length}` : ''}
          </span>
          <span className="font-medium text-amber-200">
            {isLastLine ? 'Tap or press Space to close ✓' : 'Tap or press Space →'}
          </span>
        </div>
      </div>
    </div>
  );
}

