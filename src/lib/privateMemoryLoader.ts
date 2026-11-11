'use client';

import { useEffect, useState } from 'react';

export interface PolaroidMemorySpec {
  id: string;
  title: string;
  caption: string;
  locationTag: string;
  gradientClass: string;
  mediaKind?: 'image' | 'video';
  /** Primary high-confidence filename in user's local `personal-photos/` folder; `null` when uncertain/unassigned. */
  matchedFilename: string | null;
  /** Optional alternate local filename aliases that map to this exact confirmed moment. */
  altFilenames?: readonly string[];
}

export const FINALE_SONG_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.aac',
  '.flac',
  '.webm',
] as const;

export const POLAROID_MEMORY_SPECS: Record<string, PolaroidMemorySpec> = {
  scene02_day1_stream_video: {
    id: 'scene02_day1_stream_video',
    title: 'Day 1 · Rocky Stream Stop',
    caption: 'Spontaneous scooter ride off the Rishikesh road — sitting together by the clear stream boulders',
    locationTag: 'Rishikesh Day 1 · Video',
    gradientClass: 'from-emerald-200 via-teal-100 to-sky-100',
    mediaKind: 'video',
    matchedFilename: 'DAY 1 1.mp4',
  },
  scene02_day1_stream_video_2: {
    id: 'scene02_day1_stream_video_2', title: 'Day 1 · By the Stream',
    caption: 'Another moment together beside the stream', locationTag: 'Rishikesh Day 1 · Video',
    gradientClass: 'from-emerald-200 via-teal-100 to-sky-100', mediaKind: 'video',
    matchedFilename: 'DAY 1 2 .mp4', altFilenames: ['DAY 1 2.mp4'],
  },
  scene03_tea_stop: {
    id: 'scene03_tea_stop',
    title: 'Morning Bun Maska & Kulhad Chai',
    caption: 'Four steaming kulhads and fresh morning buns outside on the Rishikesh road before starting our ride',
    locationTag: 'Rishikesh Main Road · Day 2',
    gradientClass: 'from-amber-200 via-orange-100 to-amber-50',
    matchedFilename: 'BUN MASKA TEA .jpg',
    altFilenames: ['tea stop.jpg', 'bun maska tea.jpg', 'bun maska tea .jpg'],
  },
  scene05_viewpoint_shree: {
    id: 'scene05_viewpoint_shree',
    title: 'Shree — Overlook Solo',
    caption: 'Looking out across the winding Rishikesh gorge and river sandbar',
    locationTag: 'Rishikesh Overlook',
    gradientClass: 'from-sky-200 via-emerald-100 to-amber-100',
    matchedFilename: 'randomview point srishti.jpg',
  },
  scene05_viewpoint_solo: {
    id: 'scene05_viewpoint_solo',
    title: 'Shree & Ishaan — Mountain View',
    caption: 'Standing together by the cliff rail as Ishaan points out the Rishikesh peaks',
    locationTag: 'Rishikesh Overlook',
    gradientClass: 'from-amber-200 via-sky-200 to-emerald-100',
    matchedFilename: 'me and ishaan explaing mountains.jpg',
    altFilenames: ['ishaan and srishti.jpg'],
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
  scene07_neelkanth_food: {
    id: 'scene07_neelkanth_food',
    title: 'Meal Outside Neelkanth',
    caption: 'Hot chhole bhature in steel thalis at the Neelkanth market cafe after temple darshan',
    locationTag: 'Neelkanth Market Cafe',
    gradientClass: 'from-orange-200 via-amber-100 to-yellow-100',
    matchedFilename: 'food in neelkanth.jpg',
  },
  scene09_stairs_landing: {
    id: 'scene09_stairs_landing',
    title: 'Baal Kuwari: ~400 Steps',
    caption: 'Side by side up the steep stone steps — climbing steadily, laughing and catching breath together',
    locationTag: 'Hillside Stairway',
    gradientClass: 'from-emerald-200 via-amber-100 to-sky-200',
    matchedFilename: 'baalkumari stairs.jpg',
    altFilenames: ['staies of baakumari.jpg', 'baalkumari.jpg'],
  },
  scene10_baalkuwari: {
    id: 'scene10_baalkuwari',
    title: 'Baal Kuwari Summit',
    caption: 'Top of the hill after 400 steps — breeze, bells, and wide valley views',
    locationTag: 'Baal Kuwari Shrine',
    gradientClass: 'from-sky-200 via-amber-100 to-emerald-200',
    matchedFilename: 'baalkumari vieew.jpg',
  },
  scene10_baalkuwari_book: {
    id: 'scene10_baalkuwari_book',
    title: 'With Her Book — Baal Kuwari',
    caption: 'Quiet moment by the summit overlook, reading facing the hills as Ishaan clicked this',
    locationTag: 'Summit Backyard',
    gradientClass: 'from-amber-100 via-sky-100 to-emerald-200',
    matchedFilename: 'book on baalkumari temple me.jpg',
  },
  scene13_bhaidooj_tilak: {
    id: 'scene13_bhaidooj_tilak',
    title: 'Bhai Dooj · Tilak & Blessing',
    caption: 'Traditional festive tilak, mithai, and a lifelong bond of sibling love and adventure',
    locationTag: 'Virtual Bhai Dooj Finale',
    gradientClass: 'from-amber-300 via-rose-200 to-amber-100',
    matchedFilename: null,
  },
};

export interface ResolvedPolaroidMemory extends PolaroidMemorySpec {
  resolvedUrl: string | null;
}

export interface PrivateMediaSessionState {
  hasLinkedPhotos: boolean;
  matchedPhotoCount: number;
  totalPhotoCount: number;
  folderLabel: string | null;
  finaleSongName: string | null;
  finaleSongUrl: string | null;
  templeSongName: string | null;
  templeSongUrl: string | null;
  savedHandleNeedsPermission: boolean;
  statusNote: string | null;
}

const localObjectUrls = new Map<string, string>();
const cloudUrls = new Map<string, string>();
const virtualMemories = new Map<string, string>();

export function registerVirtualMemory(id: string, dataUrl: string): void {
  if (id !== 'scene13_bhaidooj_tilak' || !dataUrl.startsWith('data:image/')) return;
  virtualMemories.set(id, dataUrl);
  notifyMemoryListeners();
}

/** Catalog contains same-origin authenticated routes, never storage credentials or object keys. */
export async function loadPrivateCloudMedia(): Promise<boolean> {
  try {
    const response = await fetch('/api/media', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return false;
    const data = await response.json() as { media?: { id: string; url: string }[] };
    if (!Array.isArray(data.media) || data.media.length === 0) return false;
    for (const item of data.media) {
      if (item.url !== `/api/media/${item.id}`) continue;
      if (Object.hasOwn(POLAROID_MEMORY_SPECS, item.id)) cloudUrls.set(item.id, item.url);
      if (item.id === 'finale_song') { finaleSongUrl = new URL(item.url, window.location.origin).href; finaleSongName = 'Bhai Dooj'; }
      if (item.id === 'temple_song') { templeSongUrl = new URL(item.url, window.location.origin).href; templeSongName = 'Har Har Mahadev'; }
    }
    lastStatusNote = 'Private memories connected';
    notifyMemoryListeners();
    return true;
  } catch { return false; }
}
let linkedFolderLabel: string | null = null;
let finaleSongName: string | null = null;
let finaleSongUrl: string | null = null;
let templeSongName: string | null = null;
let templeSongUrl: string | null = null;
let savedHandleNeedsPermission = false;
let lastStatusNote: string | null = null;
const memoryListeners = new Set<() => void>();
let memoryRevision = 0;

type DirectoryHandleLike = {
  name?: string;
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  values: () => AsyncIterable<
    | { kind: 'file'; name: string; getFile: () => Promise<File> }
    | (DirectoryHandleLike & { kind: 'directory'; name: string })
  >;
};

const MEDIA_DB_NAME = 'rishikesh_bhaidooj_private_media_v1';
const MEDIA_STORE_NAME = 'directory_handles';
const MEDIA_HANDLES_KEY = 'saved_dirs';

function notifyMemoryListeners(): void {
  memoryRevision += 1;
  memoryListeners.forEach((fn) => fn());
}

function getAllTargetFilenames(): Set<string> {
  const names = new Set<string>();
  for (const spec of Object.values(POLAROID_MEMORY_SPECS)) {
    if (spec.matchedFilename) names.add(spec.matchedFilename.toLowerCase());
    if (spec.altFilenames) {
      for (const alt of spec.altFilenames) {
        names.add(alt.toLowerCase());
      }
    }
  }
  return names;
}

function isAudioFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return FINALE_SONG_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isLikelyBhaiDoojTrack(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    isAudioFilename(lower) &&
    (lower.includes('bhai') ||
      lower.includes('ladki') ||
      lower.includes('limdi') ||
      lower.includes('beni') ||
      lower.includes('dooj'))
  );
}

function isLikelyTempleTrack(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    isAudioFilename(lower) &&
    (lower.includes('neelkanth') ||
      lower.includes('mahadev') ||
      lower.includes('temple') ||
      lower.includes('remple') ||
      lower.includes('shiva') ||
      lower.includes('bholenath') ||
      lower.includes('har_har') ||
      lower.includes('har har'))
  );
}

function openMediaHandleDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(MEDIA_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          db.createObjectStore(MEDIA_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readSavedDirectoryHandles(): Promise<DirectoryHandleLike[]> {
  const db = await openMediaHandleDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readonly');
      const req = tx.objectStore(MEDIA_STORE_NAME).get(MEDIA_HANDLES_KEY);
      req.onsuccess = () => {
        const val = req.result;
        db.close();
        if (Array.isArray(val)) {
          resolve(val.filter((item): item is DirectoryHandleLike => Boolean(item && typeof item.values === 'function')));
        } else {
          resolve([]);
        }
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

async function saveDirectoryHandleToDb(handle: DirectoryHandleLike): Promise<void> {
  const existing = await readSavedDirectoryHandles();
  const next = [handle, ...existing.filter((item) => item.name !== handle.name)].slice(0, 4);
  const db = await openMediaHandleDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      tx.objectStore(MEDIA_STORE_NAME).put(next, MEDIA_HANDLES_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function clearSavedDirectoryHandles(): Promise<void> {
  const db = await openMediaHandleDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      tx.objectStore(MEDIA_STORE_NAME).delete(MEDIA_HANDLES_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function collectFilesFromDirectoryHandle(rootHandle: DirectoryHandleLike): Promise<File[]> {
  const collected: File[] = [];
  const targetNames = getAllTargetFilenames();

  const walkDirectory = async (dir: DirectoryHandleLike, depth: number): Promise<void> => {
    if (depth > 4) return;
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        const lower = entry.name.toLowerCase();
        if (targetNames.has(lower) || isLikelyBhaiDoojTrack(lower) || isLikelyTempleTrack(lower)) {
          collected.push(await entry.getFile());
        }
      } else if (entry.kind === 'directory') {
        await walkDirectory(entry, depth + 1);
      }
    }
  };

  await walkDirectory(rootHandle, 0);
  return collected;
}

/**
 * Registers user-selected local image files strictly in browser memory via `URL.createObjectURL`.
 * No files are copied into `public/`, bundled at build time, or uploaded over HTTP.
 * Automatically picks up matching local Bhai Dooj & Temple audio files if present inside the selected folder.
 */
export function registerLocalPhotoFolder(
  files: FileList | readonly File[],
  folderLabel?: string | null
): number {
  const targetNames = getAllTargetFilenames();

  let matchedFiles = 0;
  let autoDetectedFinaleAudio: File | null = null;
  let autoDetectedTempleAudio: File | null = null;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file) continue;
    const key = file.name.toLowerCase();

    if (!autoDetectedFinaleAudio && isLikelyBhaiDoojTrack(key)) {
      autoDetectedFinaleAudio = file;
    }
    if (!autoDetectedTempleAudio && isLikelyTempleTrack(key)) {
      autoDetectedTempleAudio = file;
    }

    if (!targetNames.has(key)) continue;

    const prev = localObjectUrls.get(key);
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    localObjectUrls.set(key, URL.createObjectURL(file));
    matchedFiles += 1;
  }

  if (autoDetectedFinaleAudio) {
    if (finaleSongUrl) {
      URL.revokeObjectURL(finaleSongUrl);
    }
    finaleSongName = autoDetectedFinaleAudio.name;
    finaleSongUrl = URL.createObjectURL(autoDetectedFinaleAudio);
  }

  if (autoDetectedTempleAudio) {
    if (templeSongUrl) {
      URL.revokeObjectURL(templeSongUrl);
    }
    templeSongName = autoDetectedTempleAudio.name;
    templeSongUrl = URL.createObjectURL(autoDetectedTempleAudio);
  }

  if (matchedFiles > 0 || autoDetectedFinaleAudio || autoDetectedTempleAudio) {
    const cleanLabel = folderLabel?.trim() || 'Local Trip Folder';
    linkedFolderLabel =
      linkedFolderLabel && !linkedFolderLabel.includes(cleanLabel)
        ? `${linkedFolderLabel} + ${cleanLabel}`
        : cleanLabel;
    savedHandleNeedsPermission = false;
    const totalLinked = Object.keys(POLAROID_MEMORY_SPECS).filter(
      (id) => getResolvedPolaroidMemory(id).resolvedUrl !== null
    ).length;
    lastStatusNote = `Loaded ${totalLinked}/${Object.keys(POLAROID_MEMORY_SPECS).length} media memories${
      finaleSongUrl || templeSongUrl ? ' + audio' : ''
    } for this browser session.`;
    notifyMemoryListeners();
  } else {
    lastStatusNote =
      'No matching trip files found in that folder (try selecting personal-photos, personal-audio, or the parent folder).';
    notifyMemoryListeners();
  }
  return Object.keys(POLAROID_MEMORY_SPECS).filter(
    (id) => getResolvedPolaroidMemory(id).resolvedUrl !== null
  ).length;
}

export function registerLocalFinaleSong(file: File | null): string | null {
  if (!file || !isAudioFilename(file.name)) return null;
  if (finaleSongUrl) {
    URL.revokeObjectURL(finaleSongUrl);
  }
  finaleSongName = file.name;
  finaleSongUrl = URL.createObjectURL(file);
  notifyMemoryListeners();
  return finaleSongUrl;
}

export function clearLocalFinaleSong(): void {
  if (finaleSongUrl) {
    URL.revokeObjectURL(finaleSongUrl);
  }
  finaleSongName = null;
  finaleSongUrl = null;
  notifyMemoryListeners();
}

export function registerLocalTempleSong(file: File | null): string | null {
  if (!file || !isAudioFilename(file.name)) return null;
  if (templeSongUrl) {
    URL.revokeObjectURL(templeSongUrl);
  }
  templeSongName = file.name;
  templeSongUrl = URL.createObjectURL(file);
  notifyMemoryListeners();
  return templeSongUrl;
}

export function clearLocalTempleSong(): void {
  if (templeSongUrl) {
    URL.revokeObjectURL(templeSongUrl);
  }
  templeSongName = null;
  templeSongUrl = null;
  notifyMemoryListeners();
}

export function supportsNativeDirectoryPicker(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}

/**
 * Silently checks IndexedDB for previously authorized private media directories on startup.
 * Re-links immediately when browser read permission is still granted; otherwise sets `savedHandleNeedsPermission`
 * so a single user click on "Reconnect Saved Folder" restores everything without re-browsing.
 */
export async function tryRestoreSavedMediaDirectory(): Promise<{
  restored: number;
  needsPermission: boolean;
}> {
  if (!supportsNativeDirectoryPicker()) {
    return { restored: 0, needsPermission: false };
  }
  const handles = await readSavedDirectoryHandles();
  if (handles.length === 0) {
    savedHandleNeedsPermission = false;
    return { restored: 0, needsPermission: false };
  }

  let restoredCount = 0;
  let needsPerm = false;
  for (const handle of handles) {
    try {
      const perm = handle.queryPermission
        ? await handle.queryPermission({ mode: 'read' })
        : 'prompt';
      if (perm === 'granted') {
        const files = await collectFilesFromDirectoryHandle(handle);
        restoredCount = registerLocalPhotoFolder(files, handle.name ?? null);
      } else if (perm === 'prompt') {
        needsPerm = true;
      }
    } catch {
      needsPerm = true;
    }
  }

  if (savedHandleNeedsPermission !== needsPerm) {
    savedHandleNeedsPermission = needsPerm;
    notifyMemoryListeners();
  }
  return { restored: restoredCount, needsPermission: needsPerm };
}

/**
 * Re-requests read access on previously persisted directory handles (must run from a user click/gesture).
 */
export async function reconnectSavedMediaDirectory(): Promise<{
  status: 'restored' | 'empty' | 'denied';
  matchedPhotos: number;
}> {
  if (!supportsNativeDirectoryPicker()) {
    return { status: 'empty', matchedPhotos: 0 };
  }
  const handles = await readSavedDirectoryHandles();
  if (handles.length === 0) {
    savedHandleNeedsPermission = false;
    return { status: 'empty', matchedPhotos: 0 };
  }

  let totalMatched = 0;
  let grantedAny = false;
  for (const handle of handles) {
    try {
      const current = handle.queryPermission
        ? await handle.queryPermission({ mode: 'read' })
        : 'prompt';
      const perm =
        current === 'granted'
          ? 'granted'
          : handle.requestPermission
            ? await handle.requestPermission({ mode: 'read' })
            : 'denied';
      if (perm === 'granted') {
        grantedAny = true;
        const files = await collectFilesFromDirectoryHandle(handle);
        totalMatched = registerLocalPhotoFolder(files, handle.name ?? null);
      }
    } catch {
      // Skip stale handles cleanly
    }
  }

  savedHandleNeedsPermission = false;
  notifyMemoryListeners();
  if (!grantedAny) {
    return { status: 'denied', matchedPhotos: 0 };
  }
  return { status: 'restored', matchedPhotos: totalMatched };
}

/**
 * Opens the browser File System Access directory picker when available so a user can grant
 * one-step folder access (including nested subfolders like `Photos-1-001/`) and remember the handle.
 */
export async function pickPrivateMediaDirectory(): Promise<{
  status: 'picked' | 'cancelled' | 'unsupported';
  matchedPhotos: number;
}> {
  if (!supportsNativeDirectoryPicker()) {
    return { status: 'unsupported', matchedPhotos: 0 };
  }

  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker: (opts?: { mode?: string }) => Promise<DirectoryHandleLike>;
      }
    ).showDirectoryPicker;
    const rootHandle = await picker({ mode: 'read' });
    const collected = await collectFilesFromDirectoryHandle(rootHandle);
    const matchedPhotos = registerLocalPhotoFolder(collected, rootHandle.name ?? null);
    await saveDirectoryHandleToDb(rootHandle);
    return { status: 'picked', matchedPhotos };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'cancelled', matchedPhotos: 0 };
    }
    return { status: 'unsupported', matchedPhotos: 0 };
  }
}

export async function pickDirectoryViaFallbackInput(): Promise<{
  status: 'picked' | 'cancelled';
  matchedPhotos: number;
}> {
  if (typeof document === 'undefined') {
    return { status: 'cancelled', matchedPhotos: 0 };
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    let settled = false;
    const finalize = (res: { status: 'picked' | 'cancelled'; matchedPhotos: number }) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', handleFocusBack);
      resolve(res);
    };
    const handleFocusBack = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finalize({ status: 'cancelled', matchedPhotos: 0 });
        }
      }, 450);
    };
    input.addEventListener('change', () => {
      const files = input.files;
      if (!files || files.length === 0) {
        finalize({ status: 'cancelled', matchedPhotos: 0 });
        return;
      }
      const matchedPhotos = registerLocalPhotoFolder(files, 'Selected Folder');
      finalize({ status: 'picked', matchedPhotos });
    });
    window.addEventListener('focus', handleFocusBack, { once: true });
    input.click();
  });
}

/**
 * Convenience helper for inline UI buttons (e.g. inside unlinked Polaroid toast cards):
 * reconnects a saved folder handle in 1 click if available, otherwise opens directory picker with `<input webkitdirectory>` fallback.
 */
export async function connectPrivateMediaInteractively(): Promise<{
  status: 'picked' | 'restored' | 'cancelled' | 'unsupported';
  matchedPhotos: number;
}> {
  if (savedHandleNeedsPermission) {
    const rec = await reconnectSavedMediaDirectory();
    if (rec.status === 'restored') {
      return { status: 'restored', matchedPhotos: rec.matchedPhotos };
    }
    if (rec.status === 'denied') {
      lastStatusNote =
        'Folder read permission was not granted — browser security requires permission to read local files.';
      notifyMemoryListeners();
    }
  }
  const picked = await pickPrivateMediaDirectory();
  if (picked.status === 'unsupported') {
    return pickDirectoryViaFallbackInput();
  }
  return picked;
}

export function clearLocalPhotoUrls(): void {
  localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  localObjectUrls.clear();
  linkedFolderLabel = null;
  if (finaleSongUrl) {
    URL.revokeObjectURL(finaleSongUrl);
  }
  finaleSongName = null;
  finaleSongUrl = null;
  if (templeSongUrl) {
    URL.revokeObjectURL(templeSongUrl);
  }
  templeSongName = null;
  templeSongUrl = null;
  savedHandleNeedsPermission = false;
  lastStatusNote = null;
  void clearSavedDirectoryHandles();
  notifyMemoryListeners();
}

export function getResolvedPolaroidMemory(polaroidId: string): ResolvedPolaroidMemory {
  const base: PolaroidMemorySpec = POLAROID_MEMORY_SPECS[polaroidId] ?? {
    id: polaroidId,
    title: 'Trip Memory',
    caption: 'Saved along the Rishikesh scooters ride',
    locationTag: 'Rishikesh',
    gradientClass: 'from-amber-200 via-teal-100 to-sky-200',
    matchedFilename: null,
  };

  let resolvedUrl: string | null = null;
  if (base.matchedFilename) {
    resolvedUrl = localObjectUrls.get(base.matchedFilename.toLowerCase()) ?? null;
  }
  if (!resolvedUrl && base.altFilenames) {
    for (const alt of base.altFilenames) {
      const candidate = localObjectUrls.get(alt.toLowerCase());
      if (candidate) {
        resolvedUrl = candidate;
        break;
      }
    }
  }
  return { ...base, resolvedUrl: resolvedUrl ?? cloudUrls.get(polaroidId) ?? virtualMemories.get(polaroidId) ?? null };
}

export function getPrivateMediaSessionState(): PrivateMediaSessionState {
  const specs = Object.values(POLAROID_MEMORY_SPECS);
  const matchedPhotoCount = specs.filter(
    (s) => getResolvedPolaroidMemory(s.id).resolvedUrl !== null
  ).length;
  return {
    hasLinkedPhotos: matchedPhotoCount > 0,
    matchedPhotoCount,
    totalPhotoCount: specs.length,
    folderLabel: linkedFolderLabel,
    finaleSongName,
    finaleSongUrl,
    templeSongName,
    templeSongUrl,
    savedHandleNeedsPermission,
    statusNote: lastStatusNote,
  };
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
