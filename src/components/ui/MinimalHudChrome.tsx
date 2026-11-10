'use client';

import type { ReactNode } from 'react';
import {
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
 * Unified, clutter-free top bar shared across driving and exploration scenes.
 * Keeps recipient screen minimal: Story Stop pill (top-left) + Memories, Sound, Menu (top-right).
 */
export function MinimalTopBar({
  title,
  subtitle,
  polaroidCount,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  children,
}: MinimalTopBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-3 sm:p-5">
      {/* Top-left location card & concise progress telemetry */}
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-slate-700/65 bg-slate-950/72 px-3.5 py-2.5 text-slate-100 shadow-lg backdrop-blur-md">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-300/90 uppercase">
          The Road That Made Us Family
        </p>
        <p className="mt-0.5 text-xs font-semibold text-white">{title}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-300">{subtitle}</p>}
        {children}
      </div>

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
  onDismiss: () => void;
}

export function PolaroidToastCard({
  polaroidId,
  caption,
  title,
  gradientClass,
  onDismiss,
}: PolaroidToastCardProps) {
  usePolaroidMemoryRevision();
  const resolvedMem = polaroidId ? getResolvedPolaroidMemory(polaroidId) : null;
  const resolvedUrl = resolvedMem?.resolvedUrl ?? null;

  return (
    <div className="pointer-events-none fixed top-24 right-4 z-20 transition-all duration-300 ease-out">
      <div className="group pointer-events-auto w-56 rounded-xl border border-amber-200/75 bg-[#faf6ed] p-2.5 text-slate-900 shadow-2xl">
        <div
          className={`relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br px-3 text-center ${gradientClass}`}
        >
          {resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <span className="text-[11px] font-medium text-slate-800 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
              {caption}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-slate-900">{title}</p>
            <p className="text-[10px] text-emerald-700">Saved to Yaadein</p>
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

