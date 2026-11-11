'use client';

import { useRef } from 'react';
import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';
import {
  getPrivateMediaSessionState,
  registerLocalTempleSong,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';

export interface NeelkanthHUDProps {
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  rangBell: boolean;
  litDiya: boolean;
  hadDarshan: boolean;
  capturedFood?: boolean;
  eatingCafeActive?: boolean;
  onSkipCafe?: () => void;
  polaroidCount: number;
  polaroidToastVisible?: boolean;
  onDismissPolaroidToast?: () => void;
  nearbyHotspot: WalkHotspot | null;
  hasActiveNarration: boolean;
  activeDarshanPan: boolean;
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
  capturedFood = false,
  eatingCafeActive = false,
  onSkipCafe,
  polaroidCount,
  polaroidToastVisible = false,
  onDismissPolaroidToast,
  nearbyHotspot,
  hasActiveNarration,
  activeDarshanPan,
  onTriggerHotspot,
}: NeelkanthHUDProps) {
  usePolaroidMemoryRevision();
  const mediaState = getPrivateMediaSessionState();
  const templeAudioInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <MinimalTopBar
        title="Neelkanth Mahadev Temple"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      {process.env.NODE_ENV !== 'production' && !mediaState.templeSongUrl && (
        <>
          <input
            ref={templeAudioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) registerLocalTempleSong(file);
            }}
          />
          <button
            type="button"
            onClick={() => templeAudioInputRef.current?.click()}
            className="pointer-events-auto fixed bottom-4 left-4 z-20 rounded-full border border-slate-700/75 bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-amber-200 backdrop-blur-md transition hover:border-amber-300/60"
          >
            ♪ Temple Audio
          </button>
        </>
      )}

      {polaroidToastVisible && onDismissPolaroidToast && (
        <PolaroidToastCard
          polaroidId="scene07_neelkanth_food"
          title="Meal Outside Neelkanth"
          caption="Hot chhole bhature in steel thalis at the Neelkanth market cafe after temple darshan"
          gradientClass="from-orange-200 via-amber-100 to-yellow-100"
          stackedCount={polaroidCount}
          onDismiss={onDismissPolaroidToast}
        />
      )}

      {eatingCafeActive && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/55 bg-slate-950/90 px-5 py-2 text-xs text-amber-100 shadow-xl backdrop-blur-md">
            <span>Hot chhole bhature together at the Neelkanth market cafe...</span>
            {onSkipCafe && (
              <button
                type="button"
                onClick={onSkipCafe}
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
              >
                Head to Scooters →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subtle Prayer Caption Only (zero blocking chatter) */}
      {activeDarshanPan && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className="rounded-2xl border border-amber-300/75 bg-slate-950/90 px-6 py-2.5 text-center shadow-2xl backdrop-blur-md">
            <p className="text-base font-bold tracking-wider text-amber-300">
              🙏 &ldquo;Har Har Mahadev&rdquo;
            </p>
          </div>
        </div>
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!hasActiveNarration && !activeDarshanPan && !eatingCafeActive}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
