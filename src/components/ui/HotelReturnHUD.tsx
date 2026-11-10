'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface HotelReturnHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  farewellDone: boolean;
  tripSummaryOpen: boolean;
  onDismissTripSummary: () => void;
  capturedPolaroid: boolean;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  polaroidToastVisible: boolean;
  onDismissPolaroidToast: () => void;
  onTriggerHotspot: () => void;
}

/**
 * Clean minimal HUD for Scene 12 — Rishikesh Hotel Return & Gentle Farewell.
 */
export function HotelReturnHUD({
  audioMuted = false,
  onToggleAudioMute,
  touchControlsVisible,
  onOpenChapters,
  onPause,
  farewellDone,
  tripSummaryOpen,
  onDismissTripSummary,
  capturedPolaroid,
  polaroidCount,
  nearbyHotspot,
  hasActiveNarration,
  polaroidToastVisible,
  onDismissPolaroidToast,
  onTriggerHotspot,
}: HotelReturnHUDProps) {
  return (
    <>
      <MinimalTopBar
        title="Rishikesh Hotel Courtyard"
        subtitle={
          farewellDone
            ? 'Srishti rejoined her group before heading toward her evening bus'
            : 'Shared stay courtyard · Rejoin your original friends & wave goodbye'
        }
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              farewellDone ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {farewellDone ? '✓ Rejoined Group & Farewell' : '○ Rejoin Friends'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              capturedPolaroid ? 'bg-sky-950/80 text-sky-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {capturedPolaroid ? '✓ Polaroid' : '○ Evening Photo'}
          </span>
        </div>
      </MinimalTopBar>

      {polaroidToastVisible && (
        <PolaroidToastCard
          caption="Hotel Courtyard · Evening Farewell"
          title="Rishikesh Evening"
          gradientClass="from-amber-200 via-orange-100 to-slate-300"
          onDismiss={onDismissPolaroidToast}
        />
      )}

      {tripSummaryOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/60 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
              Rishikesh Trip Complete
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Until Next Time
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Back safely from Baal Kuwari before the evening bus — Srishti rejoined her original group at the hotel courtyard with a quiet wave goodbye to Ishaan, Manish, and Yash.
            </p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-[11px] text-slate-300">
              <p className="font-medium text-amber-200">
                Memories Collected: {polaroidCount} Polaroid{polaroidCount === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-slate-400">
                Up next in a later chapter: the separate Bhai Dooj epilogue.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onDismissTripSummary();
                  onOpenChapters();
                }}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Open Memories &amp; Chapters
              </button>
              <button
                type="button"
                onClick={onDismissTripSummary}
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                Stay in Courtyard
              </button>
            </div>
          </div>
        </div>
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!hasActiveNarration && !tripSummaryOpen}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}

