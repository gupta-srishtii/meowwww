'use client';

import {
  ContextualActionPill,
  MinimalTopBar,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface ViewpointHUDProps {
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  touchControlsVisible: boolean;
  onOpenChapters: () => void;
  onPause: () => void;
  capturedShree: boolean;
  capturedSolo: boolean;
  capturedGroup: boolean;
  polaroidCount: number;
  nearbyHotspot: WalkHotspot | null;
  activePhotoLabel: string | null;
  polaroidToastKind: 'shree' | 'solo' | 'group' | null;
  onDismissPolaroidToast: () => void;
  onTriggerHotspot: () => void;
  onResumeRiding: () => void;
}

export function ViewpointHUD({
  audioMuted,
  onToggleAudioMute,
  touchControlsVisible,
  onOpenChapters,
  onPause,
  capturedShree,
  capturedSolo,
  capturedGroup,
  polaroidCount,
  nearbyHotspot,
  activePhotoLabel,
  polaroidToastKind,
  onDismissPolaroidToast,
  onTriggerHotspot,
  onResumeRiding,
}: ViewpointHUDProps) {
  const capturedInViewpoint = [capturedShree, capturedSolo, capturedGroup].filter(Boolean).length;
  const readyToContinue = capturedInViewpoint > 0;

  const toastMeta =
    polaroidToastKind === 'shree'
      ? {
          polaroidId: 'scene05_viewpoint_shree' as const,
          title: 'Shree — Mountain Overlook',
          caption: 'Alone by the gorge · Hands behind back facing the river bend',
          gradientClass: 'from-amber-100 via-emerald-100 to-sky-100',
        }
      : polaroidToastKind === 'solo'
        ? {
            polaroidId: 'scene05_viewpoint_solo' as const,
            title: 'Shree & Ishaan — Mountain View',
            caption: 'Pointing Out Mountains · Cliff Overlook',
            gradientClass: 'from-sky-200 via-emerald-100 to-amber-100',
          }
        : {
            polaroidId: 'scene05_viewpoint_group' as const,
            title: 'All Four Together',
            caption: 'All Four Friends · Overlook Rail',
            gradientClass: 'from-sky-200 via-emerald-100 to-amber-100',
          };

  return (
    <>
      <MinimalTopBar
        title="Scenic Mountain Viewpoint"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              capturedShree ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {capturedShree ? '✓ Shree Solo' : '○ Shree Solo'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              capturedSolo ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {capturedSolo ? '✓ Shree & Ishaan' : '○ Shree & Ishaan Spot'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${capturedGroup
                ? 'bg-emerald-950/80 text-emerald-300'
                : 'bg-slate-800/80 text-slate-300'
              }`}
          >
            {capturedGroup ? '✓ All Four' : '○ All Four Spot'}
          </span>
          {readyToContinue && (
            <button
              type="button"
              onClick={onResumeRiding}
              className="rounded-md bg-amber-400 px-2.5 py-0.5 font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Continue Journey →
            </button>
          )}
        </div>
      </MinimalTopBar>

      {activePhotoLabel && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className="rounded-full border border-amber-300/60 bg-slate-950/85 px-4 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur-md">
            📸 {activePhotoLabel}
          </div>
        </div>
      )}

      {polaroidToastKind && (
        <PolaroidToastCard
          polaroidId={toastMeta.polaroidId}
          caption={toastMeta.caption}
          title={toastMeta.title}
          gradientClass={toastMeta.gradientClass}
          stackedCount={capturedInViewpoint}
          onDismiss={onDismissPolaroidToast}
        />
      )}

      <ContextualActionPill
        nearbyHotspot={nearbyHotspot}
        visible={!activePhotoLabel}
        touchControlsVisible={touchControlsVisible}
        onTrigger={onTriggerHotspot}
      />
    </>
  );
}
