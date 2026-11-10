'use client';

import { useEffect } from 'react';

export interface ControlsTutorialOverlayProps {
  open: boolean;
  isTouchDevice: boolean;
  onDismiss: () => void;
}

/**
 * Friendly, optional controls card for first-time players.
 * Dismisses cleanly with Space or button tap and stays hidden until reopened via Menu.
 */
export function ControlsTutorialOverlay({
  open,
  isTouchDevice,
  onDismiss,
}: ControlsTutorialOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to Play"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-300/40 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
          Chalo Chalein
        </p>
        <h2 className="mt-1 text-base font-semibold text-white">
          Rishikesh Scooty Ride · For You, Ishaan
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Kitaabi Dastaan chats aur calls ke baad finally Rishikesh — apni scooty chalaao, Maggi &amp; chai stops pe ruko, aur hum sabke saath Neelkanth aur Baal Kuwari tak chalo.
        </p>

        {isTouchDevice ? (
          <ul className="mt-3.5 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
            <li>
              <strong className="text-amber-300">Steer / Walk:</strong> Use the left arrows on screen
            </li>
            <li>
              <strong className="text-amber-300">Ride / Brake:</strong> Use Gas &amp; Brake on the right
            </li>
            <li>
              <strong className="text-amber-300">Look Around:</strong> Drag anywhere on the screen
            </li>
            <li>
              <strong className="text-amber-300">Stop &amp; Explore:</strong> Tap prompts or Action when near
            </li>
          </ul>
        ) : (
          <ul className="mt-3.5 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Ride Scooter / Walk</span>
              <kbd className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                W A S D / Arrows
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Look Around (on foot)</span>
              <kbd className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Mouse Drag / Q &amp; R
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Park, Talk, Pray &amp; Ride</span>
              <kbd className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                E
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Take Photo (at photo spots)</span>
              <kbd className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                P
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Menu &amp; Chapters</span>
              <kbd className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Esc
              </kbd>
            </li>
          </ul>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Got It · Continue Journey
        </button>
      </div>
    </div>
  );
}

