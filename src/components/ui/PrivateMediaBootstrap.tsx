'use client';

import { useCallback, useEffect, useState } from 'react';
import { cloudMediaFailures, loadPrivateCloudMedia, usePolaroidMemoryRevision } from '@/lib/privateMemoryLoader';

export function PrivateMediaBootstrap() {
  usePolaroidMemoryRevision();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    void loadPrivateCloudMedia().finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const failures = [...cloudMediaFailures];
  return <aside className="fixed top-3 left-3 z-50 max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-amber-100/15 bg-slate-950/90 px-3 py-2 text-xs text-amber-50 shadow-lg">
    <div className="flex items-center gap-3">
      <button type="button" aria-expanded={details} onClick={() => setDetails(v => !v)}>Our Memories</button>
      <span role="status" className="text-[10px] text-amber-100/65">{loading ? 'Connecting…' : failures.length ? `${failures.length} unavailable` : 'Connected'}</span>
    </div>
    {details && <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
      <p>The journey continues while your memories reconnect.</p>
      {failures.some(([, status]) => status === 401) && <p>Your gift session has ended. Reload and enter your gift code again.</p>}
      <ul className="max-h-40 overflow-auto text-[10px] text-slate-400">{failures.map(([id, status]) => <li key={id}>{id.replaceAll('_', ' ')} · {status || 'connection interrupted'}</li>)}</ul>
      <button type="button" disabled={loading} onClick={load} className="rounded border border-amber-100/30 px-3 py-1 disabled:opacity-50">Retry memories</button>
    </div>}
  </aside>;
}
