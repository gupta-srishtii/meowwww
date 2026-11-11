'use client';

import type { ReactNode } from 'react';
import {
  connectPrivateMediaInteractively,
  getResolvedPolaroidMemory,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface MinimalTopBarProps {
  title: string;
  subtitle?: string;
  polaroidCount: number;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  children?: ReactNode;
}

/**
 * Uncluttered top-right action bar (Memories / Mute / Menu) — zero blocking left info card.
 */
export function MinimalTopBar({
  polaroidCount,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
}: MinimalTopBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end p-3 sm:p-5">
      {/* Top-right compact actions: Memories, Mute, Menu */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenChapters}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700/75 bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-slate-100 backdrop-blur-md transition hover:border-amber-300/60 hover:text-amber-200"
        >
          <span>Memories</span>
          {polaroidCount > 0 && (
            <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              {polaroidCount}
            </span>
          )}
        </button>

        {onToggleAudioMute && (
          <button
            type="button"
            onClick={onToggleAudioMute}
            aria-label={audioMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-md transition ${
              audioMuted
                ? 'border-rose-400/50 bg-rose-950/75 text-rose-200'
                : 'border-slate-700/75 bg-slate-950/75 text-slate-200 hover:text-white'
            }`}
          >
            {audioMuted ? 'Muted (M)' : 'Sound (M)'}
          </button>
        )}

        <button
          type="button"
          onClick={onPause}
          className="rounded-xl border border-amber-400/50 bg-slate-950/80 px-3 py-1.5 text-[11px] font-semibold text-amber-200 backdrop-blur-md transition hover:bg-amber-500/20"
        >
          Menu (Esc)
        </button>
      </div>
    </div>
  );
}

export interface PolaroidToastCardProps {
  polaroidId?: string;
  caption: string;
  title: string;
  gradientClass: string;
  stackedCount?: number;
  onConnectPhotos?: () => void;
  onDismiss: () => void;
}

export function PolaroidToastCard({
  polaroidId,
  caption,
  title,
  gradientClass,
  stackedCount = 0,
  onConnectPhotos,
  onDismiss,
}: PolaroidToastCardProps) {
  usePolaroidMemoryRevision();
  const resolvedMem = polaroidId ? getResolvedPolaroidMemory(polaroidId) : null;
  const resolvedUrl = resolvedMem?.resolvedUrl ?? null;

  const handleConnectClick = () => {
    if (onConnectPhotos) {
      onConnectPhotos();
      return;
    }
    void connectPrivateMediaInteractively();
  };

  return (
    <div className="pointer-events-none fixed top-20 right-4 z-20 transition-all duration-500 ease-out">
      <div className="relative">
        {stackedCount > 1 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-1.5 translate-y-1.5 -rotate-3 rounded-xl border border-amber-200/60 bg-[#f3ede0] shadow-lg"
          />
        )}
        <div className="group pointer-events-auto relative w-64 rotate-[1.4deg] rounded-xl border border-amber-200/85 bg-[#faf6ed] p-3 pb-3.5 text-slate-900 shadow-[0_18px_40px_rgba(2,6,23,0.48)] transition-transform duration-500 ease-out hover:rotate-0 sm:w-72">
          <div
            className={`relative flex h-44 items-center justify-center overflow-hidden rounded-lg border border-amber-900/10 bg-[#efe7d6] px-2 py-1 text-center sm:h-48 ${
              resolvedUrl ? '' : `bg-gradient-to-br ${gradientClass} px-3`
            }`}
          >
            {resolvedUrl ? (
              resolvedMem?.mediaKind === 'video' ? (
                <video
                  src={resolvedUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="max-h-full max-w-full rounded object-contain"
                />
              ) : (
                <img
                  src={resolvedUrl}
                  alt={title}
                  style={{ imageOrientation: 'from-image' }}
                  className="max-h-full max-w-full rounded object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <span className="rounded-full border border-slate-900/15 bg-white/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-700 uppercase">
                  {resolvedMem?.mediaKind === 'video'
                    ? 'Local Video Unlinked'
                    : 'Local Photo Unlinked'}
                </span>
                <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-800">
                  {resolvedMem?.matchedFilename
                    ? `Needs local folder access for "${resolvedMem.matchedFilename}"`
                    : caption}
                </p>
                <button
                  type="button"
                  onClick={handleConnectClick}
                  className="rounded-lg border border-slate-900/20 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-amber-100 shadow transition hover:bg-slate-800"
                >
                  {resolvedMem?.mediaKind === 'video' ? 'Connect Trip Media' : 'Connect Photos'}
                </button>
              </div>
            )}
          </div>
          <div className="mt-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-serif text-xs font-semibold text-slate-900 italic">
                {title}
              </p>
              <p className="mt-0.5 font-serif text-[11px] leading-snug text-slate-600 italic">
                {resolvedMem?.caption ?? caption}
              </p>
              <p className="mt-1 text-[10px] font-medium text-emerald-700">
                ✓ Saved to Yaadein{stackedCount > 1 ? ` · ${stackedCount} captured` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close memory preview"
              className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ContextualActionPillProps {
  nearbyHotspot: WalkHotspot | null;
  visible: boolean;
  touchControlsVisible: boolean;
  onTrigger: () => void;
}

/**
 * Single contextual action prompt centered near bottom edge when approaching an interactable or photo spot.
 */
export function ContextualActionPill({
  nearbyHotspot,
  visible,
  touchControlsVisible,
  onTrigger,
}: ContextualActionPillProps) {
  if (!visible || !nearbyHotspot) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 ${
        touchControlsVisible ? 'bottom-44 sm:bottom-24' : 'bottom-6 sm:bottom-8'
      }`}
    >
      <button
        type="button"
        onClick={onTrigger}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/75 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-amber-100 shadow-xl backdrop-blur-md transition hover:bg-slate-900"
      >
        <kbd className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
          {nearbyHotspot.actionType === 'photo' ? 'P' : 'E'}
        </kbd>
        <span>{nearbyHotspot.label}</span>
      </button>
    </div>
  );
}

