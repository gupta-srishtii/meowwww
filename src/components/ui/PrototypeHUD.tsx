'use client';

import { useState } from 'react';
import type { TelemetryRefs } from '@/components/canvas/ScooterPrototypeScene';
import type { QualityProfile } from '@/lib/qualityProfile';

export interface PrototypeHUDProps {
  arrived: boolean;
  qualityProfile: QualityProfile;
  onChangeQuality: (profile: QualityProfile) => void;
  touchControlsVisible: boolean;
  onToggleTouchControls: () => void;
  onResetRide: () => void;
  telemetryRefs: TelemetryRefs;
  defaultGuideOpen: boolean;
}

const QUALITY_OPTIONS: { value: QualityProfile; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'low', label: 'Low' },
];

export function PrototypeHUD({
  arrived,
  qualityProfile,
  onChangeQuality,
  touchControlsVisible,
  onToggleTouchControls,
  onResetRide,
  telemetryRefs,
  defaultGuideOpen,
}: PrototypeHUDProps) {
  const [guideOpen, setGuideOpen] = useState(defaultGuideOpen);

  return (
    <>
      {/* Top overlay: title, scooter legend, telemetry & quick settings */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-3 sm:p-5">
        {/* Top-left identity, scooter pairing & telemetry */}
        <div className="pointer-events-auto max-w-sm rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3.5 py-2.5 text-slate-100 shadow-lg backdrop-blur-md">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-300/90 uppercase">
            The Road That Made Us Family
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-200">
            Milestone 0 · Mountain Scooter Prototype
          </p>

          {/* Distinct scooter legend without assigning Scooter 2 driver/pillion roles */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e06d44]" />
              <span>Scooter 1: Ishaan &amp; Srishti</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2a9d8f]" />
              <span>Scooter 2: Manish &amp; Yash</span>
            </span>
          </div>

          {/* Direct DOM telemetry (updated in useFrame via refs without React re-renders) */}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/90 pt-2 text-[11px] font-medium text-slate-200 tabular-nums">
            <span
              ref={telemetryRefs.speedEl}
              className="rounded-md bg-slate-800/80 px-2 py-0.5 text-amber-200"
            >
              0 km/h
            </span>
            <span
              ref={telemetryRefs.distanceEl}
              className="rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-200"
            >
              0 m
            </span>
            <span
              ref={telemetryRefs.gapEl}
              className="rounded-md bg-slate-800/80 px-2 py-0.5 text-teal-200"
            >
              4.5 m behind
            </span>
          </div>
        </div>

        {/* Top-right quality selector, touch UI preview toggle & controls/reset buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <div
            role="group"
            aria-label="Graphics quality profile"
            className="flex items-center rounded-xl border border-slate-700/70 bg-slate-950/75 p-1 backdrop-blur-md"
          >
            {QUALITY_OPTIONS.map((option) => {
              const active = option.value === qualityProfile;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeQuality(option.value)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'bg-amber-400/90 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleTouchControls}
            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-md transition ${
              touchControlsVisible
                ? 'border-teal-400/60 bg-teal-950/75 text-teal-200'
                : 'border-slate-700/70 bg-slate-950/75 text-slate-300 hover:text-white'
            }`}
          >
            {touchControlsVisible ? 'Touch Pads: On' : 'Touch Pads: Off'}
          </button>

          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="rounded-xl border border-slate-700/70 bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur-md transition hover:border-slate-500"
          >
            {guideOpen ? 'Hide Keys' : 'Controls'}
          </button>

          <button
            type="button"
            onClick={onResetRide}
            className="rounded-xl border border-amber-400/50 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 backdrop-blur-md transition hover:bg-amber-500/20"
          >
            Reset (R)
          </button>
        </div>
      </div>

      {/* Subtle boundary nudge indicator (toggled directly via opacity ref) */}
      <div className="pointer-events-none absolute inset-x-0 top-32 z-20 flex justify-center sm:top-24">
        <span
          ref={telemetryRefs.boundaryEl}
          style={{ opacity: 0 }}
          className="rounded-full border border-amber-400/50 bg-slate-950/80 px-3.5 py-1 text-xs font-medium text-amber-200 shadow backdrop-blur-md transition-opacity duration-150"
        >
          Road shoulder · Guiding back into lane
        </span>
      </div>

      {/* Discrete route-end notification banner (leaves parked scooters centered below) */}
      {arrived && (
        <div className="pointer-events-none absolute inset-x-0 top-36 z-20 flex justify-center px-4 sm:top-28">
          <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-teal-400/45 bg-slate-950/80 px-5 py-3.5 text-center text-slate-100 shadow-xl backdrop-blur-md">
            <p className="text-xs font-semibold tracking-[0.16em] text-teal-300 uppercase">
              Test Route Complete
            </p>
            <p className="text-xs text-slate-300">
              Both scooters arrived safely and parked side by side along the stop apron.
            </p>
            <button
              type="button"
              onClick={onResetRide}
              className="mt-1 rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Ride Again (R)
            </button>
          </div>
        </div>
      )}

      {/* Minimal collapsible controls guide tucked cleanly away from center screen */}
      {guideOpen && (
        <div
          className={`pointer-events-auto absolute z-20 rounded-2xl border border-slate-700/70 bg-slate-950/75 px-3.5 py-2.5 text-[11px] text-slate-200 shadow-lg backdrop-blur-md ${
            touchControlsVisible ? 'top-20 right-3 sm:right-5' : 'bottom-4 left-4 sm:bottom-5 sm:left-5'
          }`}
        >
          <p className="font-semibold text-amber-200">Riding Controls</p>
          <ul className="mt-1.5 space-y-1 text-slate-300">
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100">
                W / ↑
              </kbd>{' '}
              Accelerate
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100">
                S / ↓
              </kbd>{' '}
              Brake / Slow down
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100">
                A / D
              </kbd>{' '}
              or{' '}
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100">
                ← / →
              </kbd>{' '}
              Steer lane
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100">
                R
              </kbd>{' '}
              Reset to start
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

