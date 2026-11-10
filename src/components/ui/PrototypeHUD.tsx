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
    const canEnterBaalKuwariMaggi =
      arrived && roadSegment === 'to_baalkuwari' && Boolean(onEnterBaalKuwariMaggi);
    const canEnterHotel =
      arrived && roadSegment === 'to_hotel_return' && Boolean(onEnterHotelCourtyard);

    if (
      !canEnterViewpoint &&
      !canPullOverViewpoint &&
      !canEnterDhaba &&
      !canEnterNeelkanth &&
      !canEnterBaalKuwariMaggi &&
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
            canEnterBaalKuwariMaggi ||
            canEnterHotel))
      ) {
        event.preventDefault();
        if (canEnterViewpoint) {
          onEnterViewpoint?.();
        } else if (canEnterDhaba) {
          onContinueToDhaba?.();
        } else if (canEnterNeelkanth) {
          onEnterNeelkanthTemple?.();
        } else if (canEnterBaalKuwariMaggi) {
          onEnterBaalKuwariMaggi?.();
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
    onEnterHotelCourtyard,
    onPullOverAtViewpoint,
    onEnterViewpoint,
  ]);

  return (
    <>
      <MinimalTopBar
        title={
          roadSegment === 'to_dhaba'
            ? 'Rishikesh Mountain Highway'
            : roadSegment === 'to_baalkuwari'
              ? 'Off-Road Track to Baal Kuwari'
              : roadSegment === 'to_hotel_return'
                ? 'Evening Safe Return to Rishikesh'
                : 'Forest Road to Neelkanth'
        }
        subtitle={
          roadSegment === 'to_hotel_return'
            ? 'Evening bus schedule · Steady & safe return with Scooter 2'
            : roadSegment === 'to_baalkuwari'
              ? 'Rugged mountain dirt track · Keep steady alongside Scooter 2'
              : undefined
        }
        polaroidCount={polaroidCount}
        audioMuted={audioMuted}
        onToggleAudioMute={onToggleAudioMute}
        onOpenChapters={onOpenChapters}
        onPause={onPause}
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#e06d44]" />
            <span>Scooter 1</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#2a9d8f]" />
            <span>Scooter 2</span>
          </span>
          <span
            ref={telemetryRefs.speedEl}
            className="rounded-md bg-slate-800/80 px-1.5 py-0.5 font-medium text-amber-200 tabular-nums"
          >
            0 km/h
          </span>
          <span
            ref={telemetryRefs.distanceEl}
            className="rounded-md bg-slate-800/80 px-1.5 py-0.5 font-medium text-slate-200 tabular-nums"
          >
            0 m
          </span>
        </div>
      </MinimalTopBar>

      {/* Subtle boundary nudge / traffic brush toast */}
      <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex flex-col items-center gap-1.5 px-4 sm:top-20">
        <span
          ref={telemetryRefs.boundaryEl}
          style={{ opacity: 0 }}
          className="rounded-full border border-amber-400/50 bg-slate-950/80 px-3.5 py-1 text-xs font-medium text-amber-200 shadow backdrop-blur-md transition-opacity duration-150"
        >
          Guiding gently back into lane
        </span>
        {trafficWarningVisible && (
          <span className="rounded-full border border-rose-400/60 bg-slate-950/88 px-3.5 py-1 text-xs font-medium text-rose-200 shadow backdrop-blur-md">
            Close pass! Stay clear of mountain traffic
          </span>
        )}
      </div>

      {/* Scenic Viewpoint Ahead Pull-Over Pill */}
      {inViewpointZone && !viewpointArrived && !arrived && onPullOverAtViewpoint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={onPullOverAtViewpoint}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/75 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-amber-100 shadow-xl backdrop-blur-md transition hover:bg-slate-900"
          >
            <kbd className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
              E
            </kbd>
            <span>Pull Over at Scenic Viewpoint</span>
          </button>
        </div>
      )}

      {/* Scenic Viewpoint Parked Banner */}
      {viewpointArrived && !arrived && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-amber-400/50 bg-slate-950/90 px-5 py-3.5 text-center text-slate-100 shadow-xl backdrop-blur-md">
            <p className="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
              Scenic Mountain Viewpoint
            </p>
            <p className="text-xs text-slate-300">
              Both scooters pulled onto the cliffside terrace. Step off for valley photos or keep riding.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              {onEnterViewpoint && (
                <button
                  type="button"
                  onClick={onEnterViewpoint}
                  className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Step Off at Viewpoint (E) →
                </button>
              )}
              {onContinuePastViewpoint && (
                <button
                  type="button"
                  onClick={onContinuePastViewpoint}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  Keep Riding →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Arrival Banner */}
      {arrived && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-teal-400/45 bg-slate-950/88 px-5 py-3.5 text-center text-slate-100 shadow-xl backdrop-blur-md">
            {roadSegment === 'to_dhaba' ? (
              <>
                <p className="text-xs font-semibold tracking-[0.16em] text-teal-300 uppercase">
                  Maggi &amp; Chai Tapri Pull-Off
                </p>
                <p className="text-xs text-slate-300">
                  Both scooters parked off the main road. Grab hot Maggi and chai before riding onward.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {onContinueToDhaba && (
                    <button
                      type="button"
                      onClick={onContinueToDhaba}
                      className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Stop for Maggi &amp; Chai (E) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetRide}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Ride Again
                  </button>
                </div>
              </>
            ) : roadSegment === 'to_baalkuwari' ? (
              <>
                <p className="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
                  Roadside Maggi Clearing
                </p>
                <p className="text-xs text-slate-300">
                  Scooters parked off the rocky dirt track. Share hot Maggi here before walking the forest footpath to the stairs.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {onEnterBaalKuwariMaggi && (
                    <button
                      type="button"
                      onClick={onEnterBaalKuwariMaggi}
                      className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Stop at Maggi Clearing (E) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetRide}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Ride Again
                  </button>
                </div>
              </>
            ) : roadSegment === 'to_hotel_return' ? (
              <>
                <p className="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
                  Rishikesh Hotel Forecourt
                </p>
                <p className="text-xs text-slate-300">
                  Made it back smoothly before dusk. Park beside the entrance to rejoin your group.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {onEnterHotelCourtyard && (
                    <button
                      type="button"
                      onClick={onEnterHotelCourtyard}
                      className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Enter Hotel Courtyard (E) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetRide}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Ride Again
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
                  Neelkanth Mahadev Temple Plaza
                </p>
                <p className="text-xs text-slate-300">
                  Scooters parked outside the temple entrance gate. Walk inside the courtyard with the group.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {onEnterNeelkanthTemple && (
                    <button
                      type="button"
                      onClick={onEnterNeelkanthTemple}
                      className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Enter Neelkanth Temple (E) →
                    </button>
                  )}
                  {onContinueToDhaba && (
                    <button
                      type="button"
                      onClick={onContinueToDhaba}
                      className="rounded-xl border border-teal-400/50 bg-teal-950/75 px-3.5 py-1.5 text-xs font-medium text-teal-200 transition hover:bg-teal-900/75"
                    >
                      ← Back to Maggi &amp; Chai
                    </button>
                  )}
                  {onReplayPreDhabaSegment && (
                    <button
                      type="button"
                      onClick={onReplayPreDhabaSegment}
                      className="rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      Restart Ride
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
