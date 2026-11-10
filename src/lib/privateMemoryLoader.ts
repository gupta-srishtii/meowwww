'use client';

import { useEffect, useState } from 'react';

export interface PolaroidMemorySpec {
  id: string;
  title: string;
  caption: string;
  locationTag: string;
  gradientClass: string;
  /** High-confidence filename in user's local `personal-photos/` folder; `null` when uncertain/unassigned. */
  matchedFilename: string | null;
}

export const POLAROID_MEMORY_SPECS: Record<string, PolaroidMemorySpec> = {
  scene05_viewpoint_solo: {
    id: 'scene05_viewpoint_solo',
    title: 'Shree & Ishaan — Mountain View',
    caption: 'Standing together by the cliff rail as Ishaan points out the Rishikesh peaks',
    locationTag: 'Rishikesh Overlook',
    gradientClass: 'from-amber-200 via-sky-200 to-emerald-100',
    matchedFilename: 'me and ishaan explaing mountains.jpg',
  },
  scene05_viewpoint_group: {
    id: 'scene05_viewpoint_group',
    title: 'All Four Together',
    caption: 'Ishaan, Shree, Manish & Yash — our first mountain group frame',
    locationTag: 'Cliff Overlook',
    gradientClass: 'from-sky-200 via-amber-100 to-teal-200',
    matchedFilename: 'all four togethere.jpg',
  },
  scene06_dhaba: {
    id: 'scene06_dhaba',
    title: 'Maggi & Chai Tapri',
    caption: 'After sleeping through morning like Kumbhkaran, hot Maggi & kulhad chai tasted even better',
    locationTag: 'Roadside Stall',
    gradientClass: 'from-amber-200 via-orange-100 to-teal-100',
    matchedFilename: 'maggi and tea.jpg',
  },
  scene09_stairs_landing: {
    id: 'scene09_stairs_landing',
    title: 'Baal Kuwari: ~400 Steps',
    caption: 'Side by side up the steep stone steps — hand held, zero complaints',
    locationTag: 'Hillside Stairway',
    gradientClass: 'from-emerald-200 via-amber-100 to-sky-200',
    matchedFilename: 'baalkumari stairs.jpg',
  },
  scene10_baalkuwari: {
    id: 'scene10_baalkuwari',
    title: 'Baal Kuwari Summit',
    caption: 'Top of the hill after 400 steps — breeze, bells, and wide valley views',
    locationTag: 'Baal Kuwari Shrine',
    gradientClass: 'from-sky-200 via-amber-100 to-emerald-200',
    matchedFilename: 'baalkumari.jpg',
  },
};

export interface ResolvedPolaroidMemory extends PolaroidMemorySpec {
  resolvedUrl: string | null;
}

const localObjectUrls = new Map<string, string>();
const memoryListeners = new Set<() => void>();
let memoryRevision = 0;

function notifyMemoryListeners(): void {
  memoryRevision += 1;
  memoryListeners.forEach((fn) => fn());
}

/**
 * Registers user-selected local image files strictly in browser memory via `URL.createObjectURL`.
 * No files are copied into `public/`, bundled at build time, or uploaded over HTTP.
 */
export function registerLocalPhotoFolder(files: FileList | readonly File[]): number {
  const targetNames = new Set(
    Object.values(POLAROID_MEMORY_SPECS)
      .map((s) => s.matchedFilename?.toLowerCase() ?? null)
      .filter((n): n is string => Boolean(n))
  );

  let matchedCount = 0;
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file) continue;
    const key = file.name.toLowerCase();
    if (!targetNames.has(key)) continue;

    const prev = localObjectUrls.get(key);
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    localObjectUrls.set(key, URL.createObjectURL(file));
    matchedCount += 1;
  }

  if (matchedCount > 0) {
    notifyMemoryListeners();
  }
  return matchedCount;
}

export function clearLocalPhotoUrls(): void {
  localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  localObjectUrls.clear();
  notifyMemoryListeners();
}

export function getResolvedPolaroidMemory(polaroidId: string): ResolvedPolaroidMemory {
  const base = POLAROID_MEMORY_SPECS[polaroidId] ?? {
    id: polaroidId,
    title: 'Trip Memory',
    caption: 'Saved along the Rishikesh scooters ride',
    locationTag: 'Rishikesh',
    gradientClass: 'from-amber-200 via-teal-100 to-sky-200',
    matchedFilename: null,
  };
  const key = base.matchedFilename?.toLowerCase() ?? null;
  const resolvedUrl = key ? (localObjectUrls.get(key) ?? null) : null;
  return { ...base, resolvedUrl };
}

export function usePolaroidMemoryRevision(): number {
  const [rev, setRev] = useState(memoryRevision);
  useEffect(() => {
    const update = () => setRev(memoryRevision);
    memoryListeners.add(update);
    return () => {
      memoryListeners.delete(update);
    };
  }, []);
  return rev;
}
