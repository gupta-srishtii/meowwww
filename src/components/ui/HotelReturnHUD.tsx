'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
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
  onProceedToBhaiDooj: () => void;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  onTriggerHotspot: () => void;
}

/**
 * Clean minimal HUD for Scene 12 — Rishikesh Stay Return & Rooftop Terrace Reunion.
 * Strictly keeps the post-terrace finale surprise secret ("There's one more little thing…" / "Open It").
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
  onProceedToBhaiDooj,
  polaroidCount,
  nearbyHotspot,
  hasActiveNarration,
  onTriggerHotspot,
}: HotelReturnHUDProps) {
  return (
    <>
      <MinimalTopBar
        title="Rishikesh Stay &amp; Rooftop Terrace"
        subtitle={
          farewellDone
            ? 'Back before the evening bus — head up to the rooftop terrace together with Kanishka & friends'
            : 'Meet Kanishka & your friends downstairs, then go up together to the rooftop terrace'
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
            {farewellDone ? '✓ Reunited with Friends' : '○ Reunite with Kanishka & Friends'}
          </span>
        </div>
      </MinimalTopBar>

      {tripSummaryOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-300/55 bg-slate-900/95 p-6 text-center text-slate-100 shadow-2xl">
            <h2 className="font-serif text-xl font-semibold text-white sm:text-2xl">
              There&rsquo;s one more little thing&hellip;
            </h2>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onDismissTripSummary();
                  onProceedToBhaiDooj();
                }}
                className="w-full rounded-xl bg-amber-400 px-5 py-3 text-xs font-semibold tracking-wide text-slate-950 shadow-lg transition hover:bg-amber-300"
              >
                Open It
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDismissTripSummary();
                    onOpenChapters();
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  Memories &amp; Chapters
                </button>
                <button
                  type="button"
                  onClick={onDismissTripSummary}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Stay on Terrace
                </button>
              </div>
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

