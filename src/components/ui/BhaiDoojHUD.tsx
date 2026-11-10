'use client';

import { useRef } from 'react';
import type { BhaiDoojPhase } from '@/components/canvas/scenes/Scene13_BhaiDoojFinale';
import { MinimalTopBar } from '@/components/ui/MinimalHudChrome';
import {
  BHAI_DOOJ_SPECIAL_TRACK_SPEC,
  CREATOR_BHAI_DOOJ_LETTER,
  KITAABI_CALLBACK_BEAT,
} from '@/lib/finaleContent';
import {
  getPrivateMediaSessionState,
  registerLocalFinaleSong,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';

export interface BhaiDoojHUDProps {
  phase: BhaiDoojPhase;
  tilakApplied: boolean;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  onStartCelebration: () => void;
  onTriggerTilak: () => void;
  onAcceptSweets: () => void;
  onSkipEating?: () => void;
  onFinishFinale: () => void;
}

export function BhaiDoojHUD({
  phase,
  tilakApplied,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  onStartCelebration,
  onTriggerTilak,
  onAcceptSweets,
  onSkipEating,
  onFinishFinale,
}: BhaiDoojHUDProps) {
  usePolaroidMemoryRevision();
  const songInputRef = useRef<HTMLInputElement | null>(null);
  const { finaleSongName } = getPrivateMediaSessionState();

  return (
    <>
      <MinimalTopBar
        title="Happy Bhai Dooj · Finale"
        subtitle={
          phase === 'kitaabi_callback'
            ? 'Kitaabi Dastaan se Rishikesh aur aaj ke din tak'
            : tilakApplied
              ? 'Tilak · Mithai · Celebrating Bhai Dooj together'
              : 'Cozy home setup — Shree & Ishaan'
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
              tilakApplied ? 'bg-amber-950/90 text-amber-300' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {tilakApplied ? '✓ Tilak Applied' : '○ Bhai Dooj Tilak'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              phase === 'creator_letter'
                ? 'bg-emerald-950/80 text-emerald-300'
                : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            {phase === 'creator_letter' ? '✓ Sweets Shared' : '○ Mithai & Note'}
          </span>
          <input
            ref={songInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) registerLocalFinaleSong(file);
            }}
          />
          <button
            type="button"
            onClick={() => songInputRef.current?.click()}
            title={BHAI_DOOJ_SPECIAL_TRACK_SPEC.note}
            className={`rounded-md border px-2 py-0.5 font-medium transition ${
              finaleSongName
                ? 'border-amber-400/50 bg-amber-950/70 text-amber-200 hover:bg-amber-900/70'
                : 'border-sky-400/40 bg-sky-950/60 text-sky-200 hover:bg-sky-900/70'
            }`}
          >
            {finaleSongName
              ? `♪ ${finaleSongName}`
              : `♪ Attach "${BHAI_DOOJ_SPECIAL_TRACK_SPEC.confirmedTraditionalTitle.split(' (')[0]}"`}
          </button>
        </div>
      </MinimalTopBar>

      {/* Pre-celebration Kitaabi Dastaan callback card */}
      {phase === 'kitaabi_callback' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-amber-300/60 bg-slate-900/95 p-6 text-slate-100 shadow-2xl sm:p-7">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
              {KITAABI_CALLBACK_BEAT.eyebrow}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold text-white">
              {KITAABI_CALLBACK_BEAT.title}
            </h2>
            <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-200">
              {KITAABI_CALLBACK_BEAT.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={onStartCelebration}
              className="mt-6 w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              {KITAABI_CALLBACK_BEAT.cta}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tilak & Mithai prompts */}
      {phase === 'arrival' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onTriggerTilak}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/80 bg-slate-950/90 px-5 py-2.5 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-[11px] font-bold text-slate-950">
              E
            </span>
            <span>Begin Bhai Dooj Tilak</span>
          </button>
        </div>
      )}

      {phase === 'applying_tilak' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <div className="rounded-2xl border border-amber-300/45 bg-slate-950/85 px-5 py-2.5 text-center text-xs font-medium text-amber-100 shadow-xl backdrop-blur-md">
            Shree gently puts the vermilion tilak &amp; akshat on Ishaan’s forehead...
          </div>
        </div>
      )}

      {phase === 'sweet_offer' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onAcceptSweets}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/80 bg-slate-950/90 px-5 py-2.5 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-[11px] font-bold text-slate-950">
              E
            </span>
            <span>Accept Mithai &amp; Share Together</span>
          </button>
        </div>
      )}

      {phase === 'eating_together' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-7 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/85 px-5 py-2.5 text-xs font-medium text-amber-100 shadow-2xl backdrop-blur-md">
            <span>Sharing festive mithai together in peaceful celebration...</span>
            {onSkipEating && (
              <button
                type="button"
                onClick={onSkipEating}
                className="rounded-lg border border-slate-600 bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Continue (Space)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Personal Creator Message Letter Overlay */}
      {phase === 'creator_letter' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-slate-950/45 px-4 py-14 backdrop-blur-[2px]">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-300/65 bg-slate-900/95 p-6 text-slate-100 shadow-2xl sm:p-7">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
              A Note For Bhai Dooj
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-amber-50">
              {CREATOR_BHAI_DOOJ_LETTER.title}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200">
              <p className="font-medium text-amber-100">{CREATOR_BHAI_DOOJ_LETTER.salutation}</p>
              {CREATOR_BHAI_DOOJ_LETTER.paragraphs.map((p, idx) => (
                <p
                  key={idx}
                  className={
                    idx === 0
                      ? 'rounded-lg border border-amber-400/35 bg-amber-950/35 px-3 py-1.5 text-xs text-amber-200'
                      : undefined
                  }
                >
                  {p}
                </p>
              ))}
              <div className="pt-2">
                <p className="text-slate-300">{CREATOR_BHAI_DOOJ_LETTER.closing}</p>
                <p className="mt-0.5 font-serif text-base font-semibold text-amber-200 italic">
                  {CREATOR_BHAI_DOOJ_LETTER.signature}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              {CREATOR_BHAI_DOOJ_LETTER.creatorDraftNotice}
            </p>
            <button
              type="button"
              onClick={onFinishFinale}
              className="mt-5 w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              See Our Journey &amp; Memories →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

