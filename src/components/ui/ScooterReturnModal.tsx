'use client';

import { UPCOMING_CHAPTER_PREVIEW } from '@/lib/chapters';

export interface ScooterReturnModalProps {
  open: boolean;
  onRideToBaalKuwari: () => void;
  onRideBackOnRoad: () => void;
  onOpenChapters: () => void;
  onKeepExploring: () => void;
}

/**
 * Shown when Srishti physically walks back to the parked scooters outside Neelkanth Temple.
 * Offers real functional road continuation onward toward Baal Kuwari or replay/chapter navigation.
 */
export function ScooterReturnModal({
  open,
  onRideToBaalKuwari,
  onRideBackOnRoad,
  onOpenChapters,
  onKeepExploring,
}: ScooterReturnModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Back at the Parked Scooters"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-300/50 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
          Scooters Ready
        </p>
        <h2 className="mt-1 text-base font-semibold text-white">
          Continue Toward Baal Kuwari?
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Both scooters are parked outside Neelkanth Mahadev Temple. Ride onward through the forest mountain route toward Baal Kuwari, or revisit an earlier stop.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onRideToBaalKuwari}
            className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Ride Onward to Baal Kuwari →
          </button>

          <button
            type="button"
            onClick={onRideBackOnRoad}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/85 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-slate-800"
          >
            Replay Neelkanth Forest Road
          </button>

          <button
            type="button"
            onClick={onOpenChapters}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/85 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-slate-800"
          >
            Choose Another Chapter / Memory
          </button>

          <button
            type="button"
            onClick={onKeepExploring}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Stay at Temple Courtyard
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-center">
          <p className="text-[10px] text-slate-400">
            Next up: {UPCOMING_CHAPTER_PREVIEW.title} ({UPCOMING_CHAPTER_PREVIEW.subtitle})
          </p>
        </div>
      </div>
    </div>
  );
}

