'use client';

import { useEffect, useState } from 'react';
import { loadPrivateCloudMedia } from '@/lib/privateMemoryLoader';

export function PrivateMediaBootstrap() {
  const [unavailable, setUnavailable] = useState(false);
  const load = () => { void loadPrivateCloudMedia().then(ok => setUnavailable(!ok)); };
  useEffect(load, []);
  return unavailable ? <div role="status" className="fixed left-4 bottom-4 z-50 rounded-lg bg-slate-950/90 p-3 text-xs text-amber-100">
    Some memories are unavailable. <button onClick={load} className="underline">Retry</button>
  </div> : null;
}
