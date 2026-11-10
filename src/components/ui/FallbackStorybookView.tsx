'use client';

interface FallbackStorybookViewProps {
  reason?: string;
}

export function FallbackStorybookView({
  reason = 'WebGL2 is unavailable or disabled in this browser.',
}: FallbackStorybookViewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0b1020] px-6 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-amber-300/85 uppercase">
          2D Fallback Mode
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          The Road That Made Us Family
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{reason}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          This lightweight fallback shell is active so the site remains accessible
          without 3D hardware acceleration. Full 2D fallback chapters will be
          wired in later phases.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Retry 3D Initialization
        </button>
      </section>
    </div>
  );
}

