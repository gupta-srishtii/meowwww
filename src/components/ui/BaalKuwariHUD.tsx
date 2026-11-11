'use client';

import type { StairTelemetryRefs } from '@/components/canvas/scenes/Scene09_BaalKuwariStairs';
import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface BaalKuwariHUDProps {
  mode: 'maggi_stop' | 'stairs' | 'descent' | 'temple';
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  // Maggi Stop fields
  ateMaggi?: boolean;
  eatingActive?: boolean;
  onBeginClimbFromMaggi?: () => void;
  // Automatic Stairs Ascent & Descent fields
  totalSteps?: number;
  stairTelemetryRefs?: StairTelemetryRefs;
  onSkipStairCinematic?: () => void;
  // Temple fields
  arrivalCinematicActive?: boolean;
  onSkipArrivalCinematic?: () => void;
  rangBell?: boolean;
  capturedPolaroid?: boolean;
  capturedBookPolaroid?: boolean;
  bookPhotoActive?: boolean;
  polaroidToastVisible?: boolean;
  polaroidId?: string;
  toastTitle?: string;
  toastCaption?: string;
  onDismissPolaroidToast?: () => void;
  onTriggerHotspot: () => void;
}

/**
 * Clean minimal HUD for Scene 8 (Trailhead Maggi Base / Footpath), Scene 9 (Automatic ~400 Stairs Ascent & Descent), and Scene 10 (Baal Kuwari Temple).
 */
export function BaalKuwariHUD({
  mode,
  audioMuted = false,
  onToggleAudioMute,
  touchControlsVisible,
  onOpenChapters,
  onPause,
  polaroidCount,
  nearbyHotspot,
  hasActiveNarration,
  ateMaggi = false,
  eatingActive = false,
  onBeginClimbFromMaggi,
  totalSteps = 400,
  stairTelemetryRefs,
  onSkipStairCinematic,
  arrivalCinematicActive = false,
  onSkipArrivalCinematic,
  rangBell = false,
  capturedPolaroid = false,
  capturedBookPolaroid = false,
  bookPhotoActive = false,
  polaroidToastVisible = false,
  polaroidId = 'scene10_baalkuwari',
  toastTitle = 'Baal Kuwari Temple',
  toastCaption = 'Baal Kuwari Summit · After ~400 Steps',
  onDismissPolaroidToast,
  onTriggerHotspot,
}: BaalKuwariHUDProps) {
  const isStairCinematic = mode === 'stairs' || mode === 'descent';

  const title =
    mode === 'maggi_stop'
      ? 'Roadside Maggi Clearing'
      : mode === 'stairs'
        ? 'Baal Kuwari: The ~400 Stairs'
        : mode === 'descent'
          ? 'Back Down the Baal Kuwari Steps'
          : 'Baal Kuwari Temple';

  const subtitle =
    mode === 'maggi_stop'
      ? ateMaggi
        ? 'Walk back to your scooters — seedhiyon ke gate tak aage scooty ride hai'
        : 'Hot Maggi in a quiet clearing before continuing toward the stairs'
      : mode === 'stairs'
        ? '4 winding hillside flights together'
        : mode === 'descent'
          ? 'Lightly jogging down after darshan together'
          : 'Quiet summit temple above the Rishikesh hills';

  if (mode === 'temple' && arrivalCinematicActive) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/85 px-5 py-2.5 text-center shadow-2xl backdrop-blur-md">
          <p className="text-xs font-medium text-amber-100">
            Stepping onto the Baal Kuwari summit courtyard after ~400 steps...
          </p>
          {onSkipArrivalCinematic && (
            <button
              type="button"
              onClick={onSkipArrivalCinematic}
              className="rounded-lg border border-slate-600 bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              Skip (Space)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <MinimalTopBar
        title={title}
        subtitle={subtitle}
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      {mode === 'maggi_stop' && ateMaggi && onBeginClimbFromMaggi && (
        <div className="pointer-events-none fixed right-4 bottom-4 z-20 sm:right-6 sm:bottom-6">
          <button
            type="button"
            onClick={onBeginClimbFromMaggi}
            className="pointer-events-auto rounded-full bg-amber-400/95 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg backdrop-blur-md transition hover:bg-amber-300"
          >
            Ride Scooters to Stairs →
          </button>
        </div>
      )}

      {isStairCinematic && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-full border border-amber-300/35 bg-slate-950/80 px-4 py-2 shadow-xl backdrop-blur-md">
            <span
              ref={stairTelemetryRefs?.stepCountEl}
              className="text-xs font-semibold text-amber-200 tabular-nums"
            >
              {mode === 'stairs' ? `~0 / ${totalSteps} steps` : `Descending · ~${totalSteps} steps`}
            </span>
            <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" />
            <p
              ref={stairTelemetryRefs?.phaseLabelEl}
              className="text-xs font-medium text-slate-200"
            >
              {mode === 'stairs'
                ? 'Climbing the winding stone steps together...'
                : 'Walking back down safely...'}
            </p>
            {/* Hidden ref hooks so Scene09 logic continues to update safely without visual bloat */}
            <span ref={stairTelemetryRefs?.flightEl} className="hidden" />
            <div className="hidden"><div ref={stairTelemetryRefs?.barFillEl} /></div>
            {onSkipStairCinematic && (
              <button
                type="button"
                onClick={onSkipStairCinematic}
                className="ml-1 rounded-full border border-slate-600 bg-slate-800/90 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Skip (Space)
              </button>
            )}
          </div>
        </div>
      )}

      {polaroidToastVisible && onDismissPolaroidToast && (
        <PolaroidToastCard
          polaroidId={polaroidId}
          caption={toastCaption}
          title={toastTitle}
          gradientClass="from-sky-100 via-amber-100 to-emerald-100"
          stackedCount={(capturedPolaroid ? 1 : 0) + (capturedBookPolaroid ? 1 : 0)}
          onDismiss={onDismissPolaroidToast}
        />
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={
          !hasActiveNarration &&
          !eatingActive &&
          !bookPhotoActive &&
          !isStairCinematic &&
          !arrivalCinematicActive
        }
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
