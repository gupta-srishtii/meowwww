'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

export interface MobileTouchControlsProps {
  visible: boolean;
  onMoveControl: (side: 'left' | 'right', active: boolean, pointerId: number) => void;
  onActionControl: (pedal: 'gas' | 'brake', active: boolean, pointerId: number) => void;
}

function capturePointerSafely(event: ReactPointerEvent<HTMLButtonElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Ignore when pointer capture is unavailable (e.g., synthetic mouse test events).
  }
}

export function MobileTouchControls({
  visible,
  onMoveControl,
  onActionControl,
}: MobileTouchControlsProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-5 select-none sm:px-6 sm:pb-6"
      style={{ touchAction: 'none' }}
    >
      {/* Left thumb zone: independent steering pointer ownership */}
      <div className="pointer-events-auto flex items-center gap-2.5" style={{ touchAction: 'none' }}>
        <button
          type="button"
          aria-label="Steer left"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            capturePointerSafely(e);
            onMoveControl('left', true, e.pointerId);
          }}
          onPointerUp={(e) => onMoveControl('left', false, e.pointerId)}
          onPointerCancel={(e) => onMoveControl('left', false, e.pointerId)}
          onLostPointerCapture={(e) => onMoveControl('left', false, e.pointerId)}
          style={{ touchAction: 'none' }}
          className="flex h-14 w-16 items-center justify-center rounded-2xl border border-slate-500/60 bg-slate-900/75 text-base font-semibold text-slate-100 shadow-lg backdrop-blur-md transition active:scale-95 active:border-amber-400 active:bg-slate-800/95"
        >
          ◀
        </button>
        <button
          type="button"
          aria-label="Steer right"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            capturePointerSafely(e);
            onMoveControl('right', true, e.pointerId);
          }}
          onPointerUp={(e) => onMoveControl('right', false, e.pointerId)}
          onPointerCancel={(e) => onMoveControl('right', false, e.pointerId)}
          onLostPointerCapture={(e) => onMoveControl('right', false, e.pointerId)}
          style={{ touchAction: 'none' }}
          className="flex h-14 w-16 items-center justify-center rounded-2xl border border-slate-500/60 bg-slate-900/75 text-base font-semibold text-slate-100 shadow-lg backdrop-blur-md transition active:scale-95 active:border-amber-400 active:bg-slate-800/95"
        >
          ▶
        </button>
      </div>

      {/* Right thumb zone: independent brake & gas pointer ownership */}
      <div className="pointer-events-auto flex items-center gap-2.5" style={{ touchAction: 'none' }}>
        <button
          type="button"
          aria-label="Brake"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            capturePointerSafely(e);
            onActionControl('brake', true, e.pointerId);
          }}
          onPointerUp={(e) => onActionControl('brake', false, e.pointerId)}
          onPointerCancel={(e) => onActionControl('brake', false, e.pointerId)}
          onLostPointerCapture={(e) => onActionControl('brake', false, e.pointerId)}
          style={{ touchAction: 'none' }}
          className="flex h-14 w-16 items-center justify-center rounded-2xl border border-rose-400/50 bg-rose-950/75 text-xs font-semibold tracking-wide text-rose-100 uppercase shadow-lg backdrop-blur-md transition active:scale-95 active:border-rose-300 active:bg-rose-800/90"
        >
          Brake
        </button>
        <button
          type="button"
          aria-label="Throttle"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            capturePointerSafely(e);
            onActionControl('gas', true, e.pointerId);
          }}
          onPointerUp={(e) => onActionControl('gas', false, e.pointerId)}
          onPointerCancel={(e) => onActionControl('gas', false, e.pointerId)}
          onLostPointerCapture={(e) => onActionControl('gas', false, e.pointerId)}
          style={{ touchAction: 'none' }}
          className="flex h-14 w-20 items-center justify-center rounded-2xl border border-amber-400/60 bg-amber-950/75 text-xs font-semibold tracking-wide text-amber-100 uppercase shadow-lg backdrop-blur-md transition active:scale-95 active:border-amber-300 active:bg-amber-700/90"
        >
          Gas
        </button>
      </div>
    </div>
  );
}

