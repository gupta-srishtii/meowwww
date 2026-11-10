'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { WalkHotspot } from '@/hooks/useWalkController';

export interface MobileWalkControlsProps {
  visible: boolean;
  nearbyHotspot: WalkHotspot | null;
  onWalkMoveTouch: (
    dir: 'up' | 'down' | 'left' | 'right' | 'release',
    active: boolean,
    pointerId: number
  ) => void;
  onInteract: () => void;
  onPhoto: () => void;
}

function capturePointerSafely(event: ReactPointerEvent<HTMLButtonElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Ignore synthetic pointer environments.
  }
}

export function MobileWalkControls({
  visible,
  nearbyHotspot,
  onWalkMoveTouch,
  onInteract,
  onPhoto,
}: MobileWalkControlsProps) {
  if (!visible) return null;

  const makePadProps = (dir: 'up' | 'down' | 'left' | 'right', label: string) => ({
    'aria-label': label,
    onContextMenu: (e: ReactPointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) =>
      e.preventDefault(),
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      capturePointerSafely(e);
      onWalkMoveTouch(dir, true, e.pointerId);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) =>
      onWalkMoveTouch(dir, false, e.pointerId),
    onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) =>
      onWalkMoveTouch(dir, false, e.pointerId),
    onLostPointerCapture: (e: ReactPointerEvent<HTMLButtonElement>) =>
      onWalkMoveTouch(dir, false, e.pointerId),
    style: { touchAction: 'none' as const },
  });

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-4 select-none sm:px-6 sm:pb-6"
      style={{ touchAction: 'none' }}
    >
      {/* Left thumb zone: compact 4-way directional walk pad */}
      <div
        className="pointer-events-auto grid grid-cols-3 gap-1.5"
        style={{ touchAction: 'none' }}
      >
        <div />
        <button
          type="button"
          {...makePadProps('up', 'Walk forward')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/75 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md active:scale-95 active:border-amber-400 active:bg-slate-800"
        >
          ▲
        </button>
        <div />
        <button
          type="button"
          {...makePadProps('left', 'Strafe left')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/75 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md active:scale-95 active:border-amber-400 active:bg-slate-800"
        >
          ◀
        </button>
        <button
          type="button"
          {...makePadProps('down', 'Walk backward')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/75 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md active:scale-95 active:border-amber-400 active:bg-slate-800"
        >
          ▼
        </button>
        <button
          type="button"
          {...makePadProps('right', 'Strafe right')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/75 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md active:scale-95 active:border-amber-400 active:bg-slate-800"
        >
          ▶
        </button>
      </div>

      {/* Right thumb zone: single contextual action button (`E` interact or `P` photo) */}
      <div
        className="pointer-events-auto flex items-center"
        style={{ touchAction: 'none' }}
      >
        <button
          type="button"
          onClick={() => {
            if (!nearbyHotspot) return;
            if (nearbyHotspot.actionType === 'photo') {
              onPhoto();
            } else {
              onInteract();
            }
          }}
          disabled={!nearbyHotspot}
          className={`flex h-14 items-center justify-center rounded-2xl border px-4 text-xs font-semibold shadow-lg backdrop-blur-md transition active:scale-95 ${
            nearbyHotspot
              ? nearbyHotspot.actionType === 'photo'
                ? 'border-sky-300 bg-sky-400 text-slate-950'
                : 'border-amber-300 bg-amber-400 text-slate-950'
              : 'border-slate-600/60 bg-slate-900/70 text-slate-400 opacity-55'
          }`}
        >
          {nearbyHotspot
            ? nearbyHotspot.actionType === 'photo'
              ? 'Take Photo'
              : nearbyHotspot.label
            : 'Walk Nearby'}
        </button>
      </div>
    </div>
  );
}

