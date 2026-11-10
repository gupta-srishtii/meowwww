'use client';

import { MinimalTopBar, ContextualActionPill } from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface PrologueStoryHUDProps {
  mode: 'scene01_kitaabi' | 'scene02_day1' | 'scene03_morning' | 'scene04_departure';
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  // Scene 1
  kitaabiStep?: number;
  onAdvanceKitaabi?: () => void;
  // Scene 2
  day1Phase?: 'travel_cinematic' | 'stay_explore' | 'evening_maggi';
  onSkipDay1Travel?: () => void;
  onSkipEveningMaggi?: () => void;
  // Scene 3
  morningBreakfastActive?: boolean;
  morningBreakfastDone?: boolean;
  onSkipBreakfast?: () => void;
  // Scene 4
  onSkipDeparture?: () => void;
  // Shared Walk
  touchControlsVisible?: boolean;
  nearbyHotspot?: WalkHotspot | null;
  onTriggerHotspot?: () => void;
}

const KITAABI_BEATS = [
  {
    eyebrow: 'HOW IT BEGAN · KITAABI DASTAAN',
    title: 'Chats, Books & Long Phone Calls',
    body: 'Through the Kitaabi Dastaan reading circle, conversations about books turned into daily chats and easy phone calls.',
    cards: [
      { kind: 'chat', label: 'Online Book Circle', detail: 'Notes, shared recommendations & late evening chats' },
      { kind: 'call', label: 'Phone Calls', detail: 'Long conversations that started feeling like family' },
    ],
    cta: 'Next: Planning Rishikesh →',
  },
  {
    eyebrow: 'THE PLAN · RISHIKESH',
    title: 'From Screen to Real Mountains',
    body: 'After online chats, calls, and even a brief ~2-minute glimpse at Mahakumbh in a huge crowd, the plan came together: meeting properly in Rishikesh.',
    cards: [
      { kind: 'plan', label: 'Rishikesh Meet-Up', detail: 'Ishaan arriving by train from Lucknow · Shree by bus from Delhi' },
    ],
    cta: 'Begin the Trip →',
  },
] as const;

export function PrologueStoryHUD({
  mode,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  kitaabiStep = 0,
  onAdvanceKitaabi,
  day1Phase = 'stay_explore',
  onSkipDay1Travel,
  onSkipEveningMaggi,
  morningBreakfastActive = false,
  morningBreakfastDone = false,
  onSkipBreakfast,
  onSkipDeparture,
  touchControlsVisible = false,
  nearbyHotspot = null,
  onTriggerHotspot,
}: PrologueStoryHUDProps) {
  if (mode === 'scene01_kitaabi') {
    const beat = KITAABI_BEATS[Math.min(kitaabiStep, KITAABI_BEATS.length - 1)];
    return (
      <>
        <MinimalTopBar
          title="Kitaabi Dastaan"
          subtitle="Where online book-circle chats & phone calls led to Rishikesh"
          polaroidCount={polaroidCount}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          onOpenChapters={onOpenChapters}
          onPause={onPause}
        />

        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 pt-14">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-300/35 bg-slate-950/88 p-5 text-slate-100 shadow-2xl backdrop-blur-md">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
              {beat.eyebrow}
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-white">{beat.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{beat.body}</p>

            {/* Generic original chat & call memory cards */}
            <div className="mt-4 space-y-2">
              {beat.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5"
                >
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      card.kind === 'call'
                        ? 'bg-emerald-900/80 text-emerald-300'
                        : card.kind === 'chat'
                          ? 'bg-amber-900/70 text-amber-200'
                          : 'bg-sky-900/70 text-sky-200'
                    }`}
                  >
                    {card.kind === 'call' ? '☎' : card.kind === 'chat' ? '✉' : '⛰'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-100">{card.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{card.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAdvanceKitaabi}
              className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              {beat.cta}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (mode === 'scene02_day1') {
    if (day1Phase === 'travel_cinematic') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 · Journeys to Rishikesh"
            subtitle="Train from Lucknow with friends · Bus from Delhi"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/88 px-5 py-3 shadow-2xl backdrop-blur-md">
              <div className="text-left">
                <p className="text-xs font-semibold text-amber-200">
                  Two Separate Journeys Converging in Rishikesh
                </p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Ishaan came from Lucknow by train with his friends · Shree came from Delhi by bus
                </p>
              </div>
              <button
                type="button"
                onClick={onSkipDay1Travel}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Continue (Space) →
              </button>
            </div>
          </div>
        </>
      );
    }

    if (day1Phase === 'evening_maggi') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 Evening · Outing & Maggi"
            subtitle="Roaming Rishikesh lanes on scooters with Ishaan & his friend before turning in"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/50 bg-slate-950/90 px-4 py-2 text-xs text-amber-100 shadow-xl">
              <span>Evening scooter ride &amp; Maggi together before Day 2...</span>
              <button
                type="button"
                onClick={onSkipEveningMaggi}
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
              >
                Next Morning →
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <MinimalTopBar
          title="Day 1 · Rishikesh Lane Stay"
          subtitle="Ground floor beside scooters · Terrace upstairs · Evening scooter & Maggi outside"
          polaroidCount={polaroidCount}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          onOpenChapters={onOpenChapters}
          onPause={onPause}
        />
        {onTriggerHotspot && (
          <ContextualActionPill
            nearbyHotspot={nearbyHotspot}
            visible
            touchControlsVisible={touchControlsVisible}
            onTrigger={onTriggerHotspot}
          />
        )}
      </>
    );
  }

  if (mode === 'scene03_morning') {
    return (
      <>
        <MinimalTopBar
          title="Day 2 Morning · Main Road"
          subtitle={
            morningBreakfastDone
              ? 'Bun maska & chai done — walk back to parked scooters to head toward Neelkanth'
              : 'Walk out of the lane onto the morning road to share bun maska & chai with Shree'
          }
          polaroidCount={polaroidCount}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          onOpenChapters={onOpenChapters}
          onPause={onPause}
        >
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                morningBreakfastDone
                  ? 'bg-emerald-950/80 text-emerald-300'
                  : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              {morningBreakfastDone ? '✓ Bun Maska & Chai' : '○ Bun Maska & Chai'}
            </span>
          </div>
        </MinimalTopBar>

        {morningBreakfastActive && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/55 bg-slate-950/90 px-5 py-2 text-xs text-amber-100 shadow-xl backdrop-blur-md">
              <span>Crispy bun maska aur garam chai saath mein on the morning road...</span>
              <button
                type="button"
                onClick={onSkipBreakfast}
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {onTriggerHotspot && (
          <ContextualActionPill
            nearbyHotspot={nearbyHotspot}
            visible={!morningBreakfastActive}
            touchControlsVisible={touchControlsVisible}
            onTrigger={onTriggerHotspot}
          />
        )}
      </>
    );
  }

  // scene04_departure
  return (
    <>
      <MinimalTopBar
        title="Heading Toward Neelkanth"
        subtitle="Two scooters in left lane — Ishaan & Shree ahead, Manish & Yash following"
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/45 bg-slate-950/90 px-4 py-2 text-xs text-amber-100 shadow-xl">
          <span>Rolling out of Rishikesh onto the mountain road...</span>
          <button
            type="button"
            onClick={onSkipDeparture}
            className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
          >
            Start Riding (Space) →
          </button>
        </div>
      </div>
    </>
  );
}

