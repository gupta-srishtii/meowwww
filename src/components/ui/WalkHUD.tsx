'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface WalkHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  ateMaggi: boolean;
  sippedChai: boolean;
  capturedDhabaPolaroid: boolean;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  foodCinematicActive: boolean;
  onSkipFoodCinematic: () => void;
  polaroidToastVisible: boolean;
  onDismissPolaroidToast: () => void;
  onTriggerHotspot: () => void;
  onContinueRiding: () => void;
}

export function WalkHUD({
  audioMuted = false,
  onToggleAudioMute,
  touchControlsVisible,
  onOpenChapters,
  onPause,
  ateMaggi,
  sippedChai,
  polaroidCount,
  nearbyHotspot,
  hasActiveNarration,
  foodCinematicActive,
  onSkipFoodCinematic,
  polaroidToastVisible,
  onDismissPolaroidToast,
  onTriggerHotspot,
  onContinueRiding,
}: WalkHUDProps) {
  const readyToContinue = ateMaggi || sippedChai;

  if (foodCinematicActive) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex flex-col items-center gap-2.5 px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/85 px-5 py-2.5 text-center shadow-2xl backdrop-blur-md">
          <p className="text-xs font-medium text-amber-100">
            Hot Maggi &amp; mountain chai together by the roadside table...
          </p>
          <button
            type="button"
            onClick={onSkipFoodCinematic}
            className="rounded-lg border border-slate-600 bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            Skip (Space)
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MinimalTopBar
        title="Pahadi Maggi & Chai Tapri"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      {readyToContinue && (
        <div className="pointer-events-none fixed right-4 bottom-4 z-20 sm:right-6 sm:bottom-6">
          <button
            type="button"
            onClick={onContinueRiding}
            className="pointer-events-auto rounded-full bg-amber-400/95 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg backdrop-blur-md transition hover:bg-amber-300"
          >
            Continue Journey →
          </button>
        </div>
      )}

      {polaroidToastVisible && (
        <PolaroidToastCard
          polaroidId="scene06_dhaba"
          caption="Pahadi Tapri · Garam Maggi aur Chai"
          title="Maggi & Chai Stop"
          gradientClass="from-sky-200 via-amber-100 to-amber-300"
          onDismiss={onDismissPolaroidToast}
        />
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!hasActiveNarration}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
