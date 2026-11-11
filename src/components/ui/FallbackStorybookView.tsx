'use client';

interface FallbackStorybookViewProps {
  reason?: string;
}

const STORY_SUMMARY_BEATS = [
  '1. Where It Began — Meeting online first, then meeting in Rishikesh on Day 1 evening after rafting.',
  '2. Rishikesh Day 1 Evening — Golden-hour waterfall scooter ride, boulder rest, an evening phone call, and late-night dhaba dinner.',
  '3. Day 2 Morning & Mountain Ride — Bun maska & chai on the main road, viewpoint overlook, roadside tapri & Neelkanth Mahadev.',
  '4. Neelkanth Market Café & Baal Kuwari — Chole bhature outside the temple, rugged off-road dirt ride, ~400 steep steps & summit book overlook.',
  '5. Safe Return & Virtual Bhai Dooj Finale — Back to the guesthouse terrace before evening bus, then Tilak, mithai & personal Bhai Dooj letter.',
] as const;

export function FallbackStorybookView({
  reason = 'WebGL2 is unavailable or disabled in this browser.',
}: FallbackStorybookViewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#0b1020] px-6 py-10 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-amber-300/85 uppercase">
          2D Storybook Mode
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Rishikesh · Bhai Dooj
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">{reason}</p>
        <ul className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-300">
          {STORY_SUMMARY_BEATS.map((beat, idx) => (
            <li key={idx}>{beat}</li>
          ))}
        </ul>
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
