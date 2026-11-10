'use client';

import type { QualityProfile } from '@/lib/qualityProfile';

export interface PauseMenuModalProps {
  open: boolean;
  chapterTitle: string;
  qualityProfile: QualityProfile;
  audioMuted: boolean;
  musicVolume: number;
  sfxVolume: number;
  touchControlsVisible: boolean;
  canShowDevToggle?: boolean;
  devToolsVisible?: boolean;
  onToggleDevTools?: () => void;
  onChangeQuality: (profile: QualityProfile) => void;
  onToggleAudioMute: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onChangeSfxVolume: (volume: number) => void;
  onToggleTouchControls: () => void;
  onResume: () => void;
  onOpenChapters: () => void;
  onOpenControls: () => void;
  onRestartStretch: () => void;
}

const QUALITY_OPTIONS: { value: QualityProfile; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'low', label: 'Low' },
];

export function PauseMenuModal({
  open,
  chapterTitle,
  qualityProfile,
  audioMuted,
  musicVolume,
  sfxVolume,
  touchControlsVisible,
  canShowDevToggle = false,
  devToolsVisible = false,
  onToggleDevTools,
  onChangeQuality,
  onToggleAudioMute,
  onChangeMusicVolume,
  onChangeSfxVolume,
  onToggleTouchControls,
  onResume,
  onOpenChapters,
  onOpenControls,
  onRestartStretch,
}: PauseMenuModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause Menu"
      className="fixed inset-0 z-25 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
            Journey Paused
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{chapterTitle}</p>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Resume (Esc)
          </button>

          <button
            type="button"
            onClick={onOpenChapters}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/85 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-slate-800"
          >
            Memories &amp; Chapters
          </button>

          <button
            type="button"
            onClick={onOpenControls}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/85 px-4 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
          >
            How to Play &amp; Controls
          </button>

          <button
            type="button"
            onClick={onRestartStretch}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Restart Current Stretch
          </button>
        </div>

        {/* Settings Drawer */}
        <div className="mt-4 space-y-2.5 border-t border-slate-800 pt-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300">Sound</span>
            <button
              type="button"
              onClick={onToggleAudioMute}
              className={`rounded-lg border px-3 py-1 text-[11px] font-medium transition ${
                audioMuted
                  ? 'border-rose-400/50 bg-rose-950/70 text-rose-200'
                  : 'border-slate-700 bg-slate-800 text-slate-100'
              }`}
            >
              {audioMuted ? 'Muted (M)' : 'On (M)'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="pause-music-volume" className="text-slate-300">
              Music &amp; Ambience
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pause-music-volume"
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={audioMuted}
                value={Math.round(musicVolume * 100)}
                aria-label="Music volume"
                onChange={(e) => onChangeMusicVolume(Number(e.target.value) / 100)}
                className="h-1.5 w-24 cursor-pointer accent-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
              />
              <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
                {audioMuted ? '0%' : `${Math.round(musicVolume * 100)}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="pause-sfx-volume" className="text-slate-300">
              SFX Volume
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pause-sfx-volume"
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={audioMuted}
                value={Math.round(sfxVolume * 100)}
                aria-label="SFX volume"
                onChange={(e) => onChangeSfxVolume(Number(e.target.value) / 100)}
                className="h-1.5 w-24 cursor-pointer accent-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
              />
              <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
                {audioMuted ? '0%' : `${Math.round(sfxVolume * 100)}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300">On-Screen Touch Pads</span>
            <button
              type="button"
              onClick={onToggleTouchControls}
              className={`rounded-lg border px-3 py-1 text-[11px] font-medium transition ${
                touchControlsVisible
                  ? 'border-teal-400/50 bg-teal-950/70 text-teal-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              {touchControlsVisible ? 'Shown' : 'Hidden'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300">Graphics Quality</span>
            <div className="flex rounded-lg border border-slate-700 bg-slate-950/80 p-0.5">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeQuality(option.value)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                    qualityProfile === option.value
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {canShowDevToggle && onToggleDevTools && (
          <div className="mt-3.5 border-t border-slate-800/80 pt-2.5 text-center">
            <button
              type="button"
              onClick={onToggleDevTools}
              className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              {devToolsVisible ? 'Hide Developer Router' : 'Show Developer Router'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

