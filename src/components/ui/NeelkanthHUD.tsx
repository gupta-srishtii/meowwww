'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface NeelkanthHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  rangBell: boolean;
  litDiya: boolean;
  hadDarshan: boolean;
  capturedPolaroid: boolean;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  activeDarshanPan: boolean;
  polaroidToastVisible: boolean;
  onDismissPolaroidToast: () => void;
  onTriggerHotspot: () => void;
}

export function NeelkanthHUD({
  audioMuted = false,
  onToggleAudioMute,
  touchControlsVisible,
  onOpenChapters,
  onPause,
  rangBell,
  litDiya,
  hadDarshan,
  polaroidCount,
  nearbyHotspot,
  hasActiveNarration,
  activeDarshanPan,
  polaroidToastVisible,
  onDismissPolaroidToast,
  onTriggerHotspot,
}: NeelkanthHUDProps) {
  return (
    <>
      <MinimalTopBar
        title="Neelkanth Mahadev Temple"
        subtitle={
          hadDarshan
            ? 'Darshan complete · Walk back through the gate toward parked scooters'
            : undefined
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
              rangBell ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {rangBell ? '✓ Bell' : '○ Bell'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              litDiya ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {litDiya ? '✓ Diya' : '○ Diya'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              hadDarshan ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {hadDarshan ? '✓ Darshan' : '○ Darshan'}
          </span>
        </div>
      </MinimalTopBar>

      {/* Prayer Moment Caption */}
      {activeDarshanPan && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-amber-300/75 bg-slate-950/92 px-6 py-3 text-center shadow-2xl backdrop-blur-md">
            <p className="text-base font-bold tracking-wider text-amber-300">
              🙏 &ldquo;Har Har Mahadev!&rdquo;
            </p>
            <p className="text-xs text-slate-200">
              Bowing together quietly before Mahadev...
            </p>
          </div>
        </div>
      )}

      {polaroidToastVisible && (
        <PolaroidToastCard
          polaroidId="scene07_neelkanth"
          caption="Neelkanth Temple · Darshan ke Baad"
          title="Neelkanth Mahadev"
          gradientClass="from-amber-100 via-orange-100 to-sky-200"
          onDismiss={onDismissPolaroidToast}
        />
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!hasActiveNarration && !activeDarshanPan}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
