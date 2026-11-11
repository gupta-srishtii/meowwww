import ExperienceWrapper from '@/components/canvas/ExperienceWrapper';
import { cookies } from 'next/headers';
import { accessConfigured, localDevelopment, SESSION_COOKIE, verifySession } from '@/lib/server/experienceAccess';
import { PrivateMediaBootstrap } from '@/components/ui/PrivateMediaBootstrap';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const local = localDevelopment();
  if (!local && !verifySession((await cookies()).get(SESSION_COOKIE)?.value)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-amber-50">
        <section className="w-full max-w-sm space-y-5 rounded-2xl border border-amber-300/30 p-7">
          <h1 className="font-serif text-2xl">A little journey for Ishaan</h1>
          {accessConfigured() ? <form action="/api/access" method="post" className="space-y-4">
            <label className="block text-sm" htmlFor="gift-code">Enter your gift code</label>
            {(await searchParams).access === 'retry' && <p role="alert" className="text-sm text-amber-200">That code did not open the gift. Please try again.</p>}
            <input id="gift-code" name="code" type="password" required maxLength={1024} autoComplete="current-password" className="w-full rounded-lg bg-slate-800 p-3" />
            <button className="w-full rounded-lg bg-amber-400 p-3 font-semibold text-slate-950">Open our journey</button>
          </form> : <p>This gift is not ready to open yet. Please check back soon.</p>}
        </section>
      </main>
    );
  }
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0b1020] select-none">
      {!local && <PrivateMediaBootstrap />}
      <ExperienceWrapper />
    </main>
  );
}

