'use client';

import {
  MinimalTopBar,
  ContextualActionPill,
  PolaroidToastCard,
} from '@/components/ui/MinimalHudChrome';
import type { WalkHotspot } from '@/hooks/useWalkController';
import {
  connectPrivateMediaInteractively,
  getPrivateMediaSessionState,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';

export type Day1StoryPhase =
  | 'stay_meet'
  | 'waterfall_ride_stop'
  | 'evening_maggi_stop'
  | 'return_and_kanishka'
  | 'market_street_walk'
  | 'night_dhaba_dinner'
  | 'night_hotel_return';

export interface PrologueStoryHUDProps {
  mode: 'scene01_kitaabi' | 'scene02_day1' | 'scene03_morning' | 'scene04_departure';
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  polaroidCount: number;
  // Scene 1 + Mode Selection
  playMode?: 'play' | 'watch';
  modeChosen?: boolean;
  onChoosePlayMode?: (mode: 'play' | 'watch') => void;
  onConnectMedia?: () => void;
  onAdvanceKitaabi?: () => void;
  // Scene 2 (Day 1 Evening)
  day1Phase?: Day1StoryPhase;
  day1CallActive?: boolean;
  day1StreamToastVisible?: boolean;
  onDismissDay1StreamToast?: () => void;
  onAnswerDay1Call?: () => void;
  onSkipDay1Phase?: () => void;
  // Scene 3
  morningKnockPhase?: boolean;
  onKnockWakeIshaan?: () => void;
  morningBreakfastActive?: boolean;
  morningBreakfastDone?: boolean;
  morningToastVisible?: boolean;
  onDismissMorningToast?: () => void;
  onSkipBreakfast?: () => void;
  // Scene 4
  onSkipDeparture?: () => void;
  // Shared Walk
  touchControlsVisible?: boolean;
  nearbyHotspot?: WalkHotspot | null;
  onTriggerHotspot?: () => void;
}

export function PrologueStoryHUD({
  mode,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  polaroidCount,
  playMode = 'play',
  modeChosen = false,
  onChoosePlayMode,
  onConnectMedia,
  onAdvanceKitaabi,
  day1Phase = 'stay_meet',
  day1CallActive = false,
  day1StreamToastVisible = false,
  onDismissDay1StreamToast,
  onAnswerDay1Call,
  onSkipDay1Phase,
  morningKnockPhase = false,
  onKnockWakeIshaan,
  morningBreakfastActive = false,
  morningBreakfastDone = false,
  morningToastVisible = false,
  onDismissMorningToast,
  onSkipBreakfast,
  onSkipDeparture,
  touchControlsVisible = false,
  nearbyHotspot = null,
  onTriggerHotspot,
}: PrologueStoryHUDProps) {
  usePolaroidMemoryRevision();
  const mediaState = getPrivateMediaSessionState();

  const handleLinkClick = () => {
    if (onConnectMedia) {
      onConnectMedia();
      return;
    }
    void connectPrivateMediaInteractively();
  };

  if (mode === 'scene01_kitaabi') {
    return (
      <>
        <MinimalTopBar
          title="Before Rishikesh · Phone Call"
          subtitle="Delhi aur Lucknow se call — aur Rishikesh milne ka plan"
          polaroidCount={polaroidCount}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          onOpenChapters={onOpenChapters}
          onPause={onPause}
        />

        <div
          className={`pointer-events-none fixed inset-0 z-20 flex justify-center px-4 ${
            modeChosen ? 'items-end pb-7' : 'items-center pt-14'
          }`}
        >
          {!modeChosen ? (
            <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-amber-300/40 bg-slate-950/90 p-5 text-slate-100 shadow-2xl backdrop-blur-md sm:p-6">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
                For Ishaan
              </p>
              <h1 className="mt-1.5 text-xl font-semibold text-white">
                Welcome to one of our favourite memories.
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                Some journeys are worth experiencing again.
              </p>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onChoosePlayMode?.('play')}
                  className="flex flex-col items-start rounded-xl border border-amber-400/75 bg-amber-400 px-4 py-3 text-left text-slate-950 shadow-lg transition hover:bg-amber-300"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Play It Yourself
                  </span>
                  <span className="mt-1 text-[11px] leading-snug text-slate-900">
                    Drive scooters, walk spots &amp; click Polaroids yourself
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChoosePlayMode?.('watch')}
                  className="flex flex-col items-start rounded-xl border border-slate-600/80 bg-slate-900/90 px-4 py-3 text-left text-slate-100 shadow-lg transition hover:border-amber-300/70 hover:bg-slate-800"
                >
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    Watch Our Story
                  </span>
                  <span className="mt-1 text-[11px] leading-snug text-slate-300">
                    Sit back — complete automatic playback of our trip
                  </span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/75 px-3.5 py-2.5">
                <div className="min-w-0 text-[11px]">
                  <p className="font-medium text-amber-100">
                    {mediaState.hasLinkedPhotos
                      ? `${mediaState.matchedPhotoCount}/${mediaState.totalPhotoCount} real photos linked${
                          mediaState.templeSongUrl || mediaState.finaleSongUrl ? ' · audio ready' : ''
                        }`
                      : mediaState.savedHandleNeedsPermission
                        ? 'Saved private media folder ready to reconnect'
                        : 'Optional: Link your private Photos & Audio folders'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Stays strictly local in browser memory · never uploaded
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLinkClick}
                  className="rounded-lg border border-amber-400/50 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/20"
                >
                  {mediaState.savedHandleNeedsPermission
                    ? 'Reconnect Saved Folder'
                    : mediaState.hasLinkedPhotos
                      ? 'Add Another Folder'
                      : 'Connect Photos & Songs'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-amber-300/40 bg-slate-950/88 px-5 py-4 text-center text-slate-100 shadow-2xl backdrop-blur-md">
              <p className="text-sm font-medium text-amber-100">
                &ldquo;Let&apos;s meet in Rishikesh.&rdquo;
              </p>

              <button
                type="button"
                onClick={onAdvanceKitaabi}
                className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                {playMode === 'watch'
                  ? 'Beginning Story →'
                  : 'Begin Rishikesh Day 1 →'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  if (mode === 'scene02_day1') {
    if (day1Phase === 'waterfall_ride_stop') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 Evening · Spontaneous Road & Stream Stop"
            subtitle="Stopped casually off a Rishikesh road — walk in slightly to the small rocky water flow"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          {day1StreamToastVisible && onDismissDay1StreamToast && (
            <PolaroidToastCard
              polaroidId="scene02_day1_stream_video"
              title="Day 1 Creek & Water Flow"
              caption="Spontaneous roadside stop · cool clear trickle over stream boulders"
              gradientClass="from-emerald-100 via-teal-100 to-sky-100"
              stackedCount={polaroidCount}
              onDismiss={onDismissDay1StreamToast}
            />
          )}
          {onTriggerHotspot && (
            <ContextualActionPill
              nearbyHotspot={nearbyHotspot}
              visible
              touchControlsVisible={touchControlsVisible}
              onTrigger={onTriggerHotspot}
            />
          )}
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/88 px-5 py-2.5 shadow-2xl backdrop-blur-md">
              <span className="text-xs text-amber-100">
                Ishaan: &ldquo;Yahan thodi der rukte hain.&rdquo; &middot; Cool green hills &amp; gentle water flowing over stones...
              </span>
              {onSkipDay1Phase && (
                <button
                  type="button"
                  onClick={onSkipDay1Phase}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Stop for Maggi (~5 PM) →
                </button>
              )}
            </div>
          </div>
        </>
      );
    }

    if (day1Phase === 'evening_maggi_stop') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 ~5:00 PM · Roadside Maggi Stop"
            subtitle="Golden late-afternoon chai & steaming Maggi plates together before riding back"
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
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-300/45 bg-slate-950/88 px-5 py-2.5 shadow-2xl backdrop-blur-md">
              <span className="text-xs text-amber-100">
                Hot Maggi in the cool 5 PM Rishikesh breeze...
              </span>
              {onSkipDay1Phase && (
                <button
                  type="button"
                  onClick={onSkipDay1Phase}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Return to Stay →
                </button>
              )}
            </div>
          </div>
        </>
      );
    }

    if (day1Phase === 'return_and_kanishka') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 Dusk → Night · Back at the Stay"
            subtitle="Srishti catching up with Kanishka & friends as dusk turns into evening"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          {day1CallActive && (
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-full border border-emerald-400/55 bg-slate-950/92 px-4 py-2 text-xs text-slate-100 shadow-2xl backdrop-blur-md">
                <span className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
                  ~9:00 PM · Ishaan
                </span>
                <span className="text-amber-100">
                  &ldquo;Dinner ke liye dhaba chalte hain?&rdquo;
                </span>
                <button
                  type="button"
                  onClick={onAnswerDay1Call}
                  className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Ride Through 9 PM Market →
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (day1Phase === 'market_street_walk') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 ~9:00 PM · Illuminated Rishikesh Market"
            subtitle="Evening ride & walk past bright bazaar lights, scooters & shopfronts toward the dhaba"
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
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/50 bg-slate-950/90 px-4 py-2 text-xs text-amber-100 shadow-xl">
              <span>~9:00 PM scooter ride through illuminated Rishikesh bazaar...</span>
              {onSkipDay1Phase && (
                <button
                  type="button"
                  onClick={onSkipDay1Phase}
                  className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
                >
                  Join Dinner at Dhaba →
                </button>
              )}
            </div>
          </div>
        </>
      );
    }

    if (day1Phase === 'night_dhaba_dinner') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 Night · Lively Roadside Dhaba"
            subtitle="Warm lantern light, busy roadside tables & late dinner together before Day 2"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/50 bg-slate-950/90 px-4 py-2 text-xs text-amber-100 shadow-xl">
              <span>Late dhaba dinner under night lights...</span>
              {onSkipDay1Phase && (
                <button
                  type="button"
                  onClick={onSkipDay1Phase}
                  className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
                >
                  Return to Stay →
                </button>
              )}
            </div>
          </div>
        </>
      );
    }

    if (day1Phase === 'night_hotel_return') {
      return (
        <>
          <MinimalTopBar
            title="Day 1 Night · Back at the Lane Stay"
            subtitle="Night settles peacefully over Rishikesh — rest before Day 2 morning"
            polaroidCount={polaroidCount}
            audioMuted={audioMuted}
            onToggleAudioMute={onToggleAudioMute}
            onOpenChapters={onOpenChapters}
            onPause={onPause}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/50 bg-slate-950/90 px-4 py-2 text-xs text-amber-100 shadow-xl">
              <span>Back at the stay · Day 1 winds down...</span>
              {onSkipDay1Phase && (
                <button
                  type="button"
                  onClick={onSkipDay1Phase}
                  className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
                >
                  Next Morning →
                </button>
              )}
            </div>
          </div>
        </>
      );
    }

    // stay_meet interactive walk phase
    return (
      <>
        <MinimalTopBar
          title="Day 1 Evening · Rishikesh Stay"
          subtitle="After Srishti's rafting — meet Kanishka & your friends near the scooters"
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
          title={
            morningKnockPhase
              ? 'Day 2 Morning · Ground-Floor Room'
              : 'Day 2 Morning · Scooter Ride'
          }
          polaroidCount={polaroidCount}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          onOpenChapters={onOpenChapters}
          onPause={onPause}
        />

        {morningKnockPhase && onKnockWakeIshaan && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/55 bg-slate-950/90 px-5 py-2 text-xs text-amber-100 shadow-xl backdrop-blur-md">
              <span>&ldquo;Kumbhkaran!&rdquo;</span>
              <button
                type="button"
                onClick={onKnockWakeIshaan}
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
              >
                Open Door &amp; Step Out →
              </button>
            </div>
          </div>
        )}

        {morningToastVisible && onDismissMorningToast && (
          <PolaroidToastCard
            polaroidId="scene03_tea_stop"
            title="Morning Bun Maska & Kulhad Chai"
            caption="Four steaming kulhads and fresh morning buns outside on the Rishikesh road before starting our ride"
            gradientClass="from-amber-200 via-orange-100 to-amber-50"
            stackedCount={polaroidCount}
            onDismiss={onDismissMorningToast}
          />
        )}

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
            visible={!morningBreakfastActive && !morningKnockPhase}
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

