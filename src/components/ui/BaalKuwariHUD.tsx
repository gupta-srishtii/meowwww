'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface BaalKuwariHUDProps {
  mode: 'maggi_stop' | 'footpath' | 'stairs' | 'temple';
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
  // Stairs fields
  stepCount?: number;
  totalSteps?: number;
  assistCount?: number;
  assistActive?: boolean;
  // Temple fields
  arrivalCinematicActive?: boolean;
  onSkipArrivalCinematic?: () => void;
  rangBell?: boolean;
  capturedPolaroid?: boolean;
  polaroidToastVisible?: boolean;
  toastTitle?: string;
  toastCaption?: string;
  onDismissPolaroidToast?: () => void;
  onTriggerHotspot: () => void;
}

/**
 * Clean minimal HUD for Scene 8 (Trailhead Maggi Base), Scene 9 (~400 Stairs Climb), and Scene 10 (Baal Kuwari Temple).
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
  stepCount = 0,
  totalSteps = 400,
  assistCount = 0,
  assistActive = false,
  arrivalCinematicActive = false,
  onSkipArrivalCinematic,
  rangBell = false,
  capturedPolaroid = false,
  polaroidToastVisible = false,
  toastTitle = 'Baal Kuwari Temple',
  toastCaption = 'Baal Kuwari Summit · After ~400 Steps',
  onDismissPolaroidToast,
  onTriggerHotspot,
}: BaalKuwariHUDProps) {
  const flightNumber =
    stepCount >= 300 ? 4 : stepCount >= 200 ? 3 : stepCount >= 100 ? 2 : 1;
  const pct = Math.min(100, Math.round((stepCount / Math.max(1, totalSteps)) * 100));

  const title =
    mode === 'maggi_stop'
      ? 'Roadside Maggi Clearing'
      : mode === 'footpath'
        ? 'Forest Path to Baal Kuwari'
        : mode === 'stairs'
          ? 'Baal Kuwari: The ~400 Stairs'
          : 'Baal Kuwari Temple';

  const subtitle =
    mode === 'maggi_stop'
      ? ateMaggi
        ? 'Follow the north forest path toward the Baal Kuwari staircase'
        : 'Pre-climb Maggi clearing along the mountain route'
      : mode === 'footpath'
        ? 'Walk uphill along the forested mountain path to reach the staircase gate'
        : mode === 'stairs'
          ? `Flight ${flightNumber} of 4 · Winding hillside steps together`
          : 'Serene summit sanctuary above the pines';

  if (mode === 'temple' && arrivalCinematicActive) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/85 px-5 py-2.5 text-center shadow-2xl backdrop-blur-md">
          <p className="text-xs font-medium text-amber-100">
            Reaching Baal Kuwari Temple after ~400 stairs together...
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
      >
        {mode === 'maggi_stop' && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                ateMaggi ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              {ateMaggi ? '✓ Pre-Climb Maggi' : eatingActive ? 'Eating Maggi...' : '○ Clearing Maggi'}
            </span>
            {ateMaggi && onBeginClimbFromMaggi && (
              <button
                type="button"
                onClick={onBeginClimbFromMaggi}
                className="rounded-md bg-amber-400 px-2.5 py-0.5 font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Walk Forest Path →
              </button>
            )}
          </div>
        )}

        {mode === 'stairs' && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-4 text-[11px]">
              <span className="font-semibold text-amber-200 tabular-nums">
                Steps: ~{stepCount} / {totalSteps}
              </span>
              {assistCount > 0 && (
                <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  🤝 Assisted {assistCount}×
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {mode === 'temple' && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                rangBell ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              {rangBell ? '✓ Summit Bell' : '○ Bell'}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                capturedPolaroid ? 'bg-sky-950/80 text-sky-300' : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              {capturedPolaroid ? '✓ Polaroid' : '○ Summit Photo'}
            </span>
          </div>
        )}
      </MinimalTopBar>

      {polaroidToastVisible && onDismissPolaroidToast && (
        <PolaroidToastCard
          caption={toastCaption}
          title={toastTitle}
          gradientClass="from-sky-100 via-amber-100 to-emerald-100"
          onDismiss={onDismissPolaroidToast}
        />
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!hasActiveNarration && !eatingActive && !assistActive && !arrivalCinematicActive}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
