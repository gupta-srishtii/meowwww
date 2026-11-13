'use client';

import { useEffect } from 'react';
import type { TelemetryRefs } from '@/components/canvas/ScooterPrototypeScene';
import { MinimalTopBar } from '@/components/ui/MinimalHudChrome';
import type { MountainRoadSegmentId } from '@/lib/mountainSpline';

export interface PrototypeHUDProps {
  arrived: boolean;
  inViewpointZone?: boolean;
  viewpointArrived?: boolean;
  trafficWarningVisible?: boolean;
  roadSegment: MountainRoadSegmentId;
  polaroidCount: number;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenChapters: () => void;
  onPause: () => void;
  onResetRide: () => void;
  onPullOverAtViewpoint?: () => void;
  onEnterViewpoint?: () => void;
  onContinuePastViewpoint?: () => void;
  onContinueToDhaba?: () => void;
  onEnterNeelkanthTemple?: () => void;
  onEnterBaalKuwariMaggi?: () => void;
  onEnterBaalKuwariStairs?: () => void;
  onEnterHotelCourtyard?: () => void;
  onReplayPreDhabaSegment?: () => void;
  telemetryRefs: TelemetryRefs;
}

export function PrototypeHUD({
  arrived,
  inViewpointZone = false,
  viewpointArrived = false,
  trafficWarningVisible = false,
  roadSegment,
  polaroidCount,
  audioMuted = false,
  onToggleAudioMute,
  onOpenChapters,
  onPause,
  onResetRide,
  onPullOverAtViewpoint,
  onEnterViewpoint,
  onContinuePastViewpoint,
  onContinueToDhaba,
  onEnterNeelkanthTemple,
  onEnterBaalKuwariMaggi,
  onEnterBaalKuwariStairs,
  onEnterHotelCourtyard,
  onReplayPreDhabaSegment,
  telemetryRefs,
}: PrototypeHUDProps) {
  useEffect(() => {
    const canEnterViewpoint = viewpointArrived && Boolean(onEnterViewpoint);
    const canPullOverViewpoint =
      inViewpointZone && !viewpointArrived && !arrived && Boolean(onPullOverAtViewpoint);
    const canEnterDhaba = arrived && roadSegment === 'to_dhaba' && Boolean(onContinueToDhaba);
    const canEnterNeelkanth =
      arrived && roadSegment === 'to_neelkanth' && Boolean(onEnterNeelkanthTemple);
    const canEnterBaalKuwariStairs =
      arrived &&
      (roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs') &&
      Boolean(onEnterBaalKuwariStairs);
    const canEnterHotel =
      arrived && roadSegment === 'to_hotel_return' && Boolean(onEnterHotelCourtyard);

    if (
      !canEnterViewpoint &&
      !canPullOverViewpoint &&
      !canEnterDhaba &&
      !canEnterNeelkanth &&
      !canEnterBaalKuwariStairs &&
      !canEnterHotel
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') {
        return;
      }
      if (
        event.code === 'KeyE' ||
        (event.code === 'Enter' &&
          (canEnterViewpoint ||
            canEnterDhaba ||
            canEnterNeelkanth ||
            canEnterBaalKuwariStairs ||
            canEnterHotel))
      ) {
        event.preventDefault();
        if (canEnterViewpoint) {
          onEnterViewpoint?.();
        } else if (canEnterDhaba) {
          onContinueToDhaba?.();
        } else if (canEnterNeelkanth) {
          onEnterNeelkanthTemple?.();
        } else if (canEnterBaalKuwariStairs) {
          onEnterBaalKuwariStairs?.();
        } else if (canEnterHotel) {
          onEnterHotelCourtyard?.();
        } else if (canPullOverViewpoint) {
          onPullOverAtViewpoint?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    arrived,
    inViewpointZone,
    viewpointArrived,
    roadSegment,
    onContinueToDhaba,
    onEnterNeelkanthTemple,
    onEnterBaalKuwariMaggi,
    onEnterBaalKuwariStairs,
    onEnterHotelCourtyard,
    onPullOverAtViewpoint,
    onEnterViewpoint,
  ]);

  return (
    <>
      <MinimalTopBar
        title={
          roadSegment === 'to_dhaba'
            ? 'Morning Mountain Ride'
            : roadSegment === 'to_baalkuwari'
              ? 'Off-Road Track to Baal Kuwari'
              : roadSegment === 'to_baalkuwari_stairs'
                ? 'Mountain Track to Staircase Gate'
                : roadSegment === 'to_hotel_return'
                  ? 'Evening Safe Return to Rishikesh'
                  : 'Forest Road to Neelkanth'
        }
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      />

      {/* Subtle boundary nudge / traffic brush toast */}
      <aside aria-label="Scooter speed" className="pointer-events-none fixed bottom-28 left-4 z-20 rounded-2xl border border-amber-200/30 bg-slate-950/90 px-4 py-3 text-amber-50 shadow-xl backdrop-blur-sm sm:bottom-5">
        <p className="text-[9px] uppercase tracking-[0.18em] text-amber-200/60">Mountain ride · max 75</p>
        <span ref={telemetryRefs.speedEl} className="mt-1 block text-2xl font-semibold tabular-nums">0 km/h</span>
        <p className="mt-1 text-[10px] text-slate-300">W / ↑ accelerate · S / ↓ brake</p>
        <p className="text-[10px] text-slate-400">Touch: Gas / Brake · A / D steer</p>
      </aside>
      <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-1.5 px-4">
        <span
          ref={telemetryRefs.boundaryEl}
          style={{ opacity: 0 }}
          className="rounded-full border border-amber-400/50 bg-slate-950/80 px-3.5 py-1 text-xs font-medium text-amber-200 shadow backdrop-blur-md transition-opacity duration-150"
        >
          Stay inside the mountain lane
        </span>
        {trafficWarningVisible && (
          <span className="rounded-full border border-rose-400/60 bg-slate-950/88 px-3.5 py-1 text-xs font-medium text-rose-200 shadow backdrop-blur-md">
            Keep left past mountain traffic
          </span>
        )}
      </div>

      {/* Scenic Viewpoint Ahead Pull-Over Pill */}
      {inViewpointZone && !viewpointArrived && !arrived && onPullOverAtViewpoint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onPullOverAtViewpoint}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/75 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-amber-100 shadow-xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <kbd className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
              E
            </kbd>
            <span>Pull Over at Viewpoint</span>
          </button>
        </div>
      )}

      {/* Scenic Viewpoint Parked Slim Bottom Pill */}
      {viewpointArrived && !arrived && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-amber-400/50 bg-slate-950/90 px-3.5 py-1.5 text-xs text-slate-100 shadow-xl backdrop-blur-md">
            {onEnterViewpoint && (
              <button
                type="button"
                onClick={onEnterViewpoint}
                className="rounded-full bg-amber-400 px-3.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Step Off at Viewpoint (E) →
              </button>
            )}

          </div>
        </div>
      )}

      {/* Arrival Slim Bottom Pill */}
      {arrived && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-amber-300/50 bg-slate-950/90 px-3.5 py-1.5 text-xs text-slate-100 shadow-xl backdrop-blur-md">
            {roadSegment === 'to_dhaba' ? (
              onContinueToDhaba && (
                <button
                  type="button"
                  onClick={onContinueToDhaba}
                  className="rounded-full bg-amber-400 px-3.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Stop for Maggi &amp; Chai (E) →
                </button>
              )
            ) : roadSegment === 'to_baalkuwari' || roadSegment === 'to_baalkuwari_stairs' ? (
              onEnterBaalKuwariStairs && (
                <button
                  type="button"
                  onClick={onEnterBaalKuwariStairs}
                  className="rounded-full bg-amber-400 px-3.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Climb Baal Kuwari Stairs (E) →
                </button>
              )
            ) : roadSegment === 'to_hotel_return' ? (
              onEnterHotelCourtyard && (
                <button
                  type="button"
                  onClick={onEnterHotelCourtyard}
                  className="rounded-full bg-amber-400 px-3.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Walk Into House Lane (E) →
                </button>
              )
            ) : (
              <>
                {onEnterNeelkanthTemple && (
                  <button
                    type="button"
                    onClick={onEnterNeelkanthTemple}
                    className="rounded-full bg-amber-400 px-3.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                  >
                    Enter Neelkanth Temple (E) →
                  </button>
                )}
                {onContinueToDhaba && (
                  <button
                    type="button"
                    onClick={onContinueToDhaba}
                    className="rounded-full border border-teal-400/50 bg-teal-950/75 px-3 py-1 text-xs font-medium text-teal-200 transition hover:bg-teal-900/75"
                  >
                    ← Back to Maggi &amp; Chai
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
