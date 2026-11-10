'use client';

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import {
  PHASE2_STORY_CHAPTERS,
  getActiveChapterKey,
  type StoryChapterItem,
} from '@/lib/chapters';
import { BHAI_DOOJ_SPECIAL_TRACK_SPEC } from '@/lib/finaleContent';
import {
  POLAROID_MEMORY_SPECS,
  clearLocalFinaleSong,
  getPrivateMediaSessionState,
  getResolvedPolaroidMemory,
  pickPrivateMediaDirectory,
  registerLocalFinaleSong,
  registerLocalPhotoFolder,
  supportsNativeDirectoryPicker,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';
import { useProgressStore } from '@/store/progressStore';

export interface ChapterSelectModalProps {
  open: boolean;
  initialTab?: 'chapters' | 'memories';
  onClose: () => void;
  onSelectChapter: (chapter: StoryChapterItem) => void;
}

/**
 * Clean story progression & safe Polaroid Yaadein gallery without developer jargon.
 * Keeps `personal-photos/` completely outside bundles/HTTP routes; users may optionally
 * link their own local folder strictly inside browser memory (`URL.createObjectURL`).
 */
export function ChapterSelectModal({
  open,
  initialTab = 'chapters',
  onClose,
  onSelectChapter,
}: ChapterSelectModalProps) {
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const baalKuwariSubStage = useProgressStore((s) => s.baalKuwariSubStage);
  const furthestChapterRank = useProgressStore((s) => s.furthestChapterRank);
  const collectedPolaroids = useProgressStore((s) => s.collectedPolaroids);

  usePolaroidMemoryRevision();
  const [activeTab, setActiveTab] = useState<'chapters' | 'memories'>(initialTab);
  const [previewPolaroidId, setPreviewPolaroidId] = useState<string | null>(null);
  const [localLinkStatus, setLocalLinkStatus] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const songInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  if (!open) return null;

  const activeKey = getActiveChapterKey(
    committedSceneId,
    mountainRoadSegment,
    roadSubStage,
    baalKuwariSubStage
  );
  const allPolaroidIds = Object.keys(POLAROID_MEMORY_SPECS);
  const totalPolaroidsCount = allPolaroidIds.length;
  const validCollectedCount = collectedPolaroids.filter((id) => id in POLAROID_MEMORY_SPECS).length;
  const mediaSession = getPrivateMediaSessionState();
  const previewMem = previewPolaroidId ? getResolvedPolaroidMemory(previewPolaroidId) : null;

  const handleFolderSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const matched = registerLocalPhotoFolder(files);
    setLocalLinkStatus(
      matched > 0
        ? `Linked ${matched}/${totalPolaroidsCount} trip photos privately for this browser session`
        : 'No matching trip filenames found in that folder'
    );
  };

  const handlePickDirectoryClick = async () => {
    if (supportsNativeDirectoryPicker()) {
      const res = await pickPrivateMediaDirectory();
      if (res.status === 'picked') {
        setLocalLinkStatus(
          res.matchedPhotos > 0
            ? `Linked ${res.matchedPhotos}/${totalPolaroidsCount} trip photos privately for this browser session`
            : 'No matching trip filenames found in that folder'
        );
        return;
      }
      if (res.status === 'cancelled') return;
    }
    folderInputRef.current?.click();
  };

  const handleSongSelected = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) return;
    const url = registerLocalFinaleSong(file);
    setLocalLinkStatus(
      url
        ? `Attached finale song "${file.name}" privately in browser memory`
        : 'Please select an audio file (.mp3, .wav, .m4a, .ogg)'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memories and Chapters"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
              Hamara Safar
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Memories &amp; Chapters
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {validCollectedCount} of {totalPolaroidsCount} trip Polaroids collected
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapters"
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Minimal Tab Switcher */}
        <div className="mt-3.5 flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'chapters'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Chapters ({PHASE2_STORY_CHAPTERS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memories')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'memories'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Polaroids ({validCollectedCount}/{totalPolaroidsCount})
          </button>
        </div>

        {activeTab === 'chapters' ? (
          <ul className="mt-3 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {PHASE2_STORY_CHAPTERS.map((chapter) => {
              const isCurrent = chapter.key === activeKey;
              const isUnlocked = chapter.rank <= furthestChapterRank;
              const collectedInChapter = chapter.polaroidIds.filter((id) =>
                collectedPolaroids.includes(id)
              ).length;

              return (
                <li
                  key={chapter.key}
                  className={`rounded-xl border p-3 transition ${
                    isCurrent
                      ? 'border-amber-400/70 bg-amber-950/25'
                      : isUnlocked
                        ? 'border-slate-700/80 bg-slate-950/60 hover:border-slate-500'
                        : 'border-slate-800/70 bg-slate-950/35 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {chapter.rank + 1}. {chapter.title}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            Here Now
                          </span>
                        )}
                        {chapter.polaroidIds.length > 0 && (
                          <span className="rounded-full bg-sky-950/90 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                            📷 {collectedInChapter}/{chapter.polaroidIds.length}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{chapter.subtitle}</p>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onSelectChapter(chapter)}
                        className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-300"
                      >
                        {isCurrent ? 'Restart' : 'Go'}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[10px] font-medium text-slate-500">
                        Locked
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Client-Only Local Media Linker (Zero HTTP Exposure) */}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/75 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-200">
                    Local Trip Photos ({mediaSession.matchedPhotoCount}/{totalPolaroidsCount} linked)
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {localLinkStatus ??
                      (mediaSession.hasLinkedPhotos
                        ? `Linked from ${mediaSession.folderLabel ?? 'local folder'} (device-only, never uploaded).`
                        : 'Stylized Polaroids load by default. Link your local Photos folder once per browser session (browsers clear file links after refresh).')}
                  </p>
                </div>
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  {...({
                    webkitdirectory: '',
                    directory: '',
                  } as InputHTMLAttributes<HTMLInputElement>)}
                  onChange={(e) => handleFolderSelected(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => void handlePickDirectoryClick()}
                  className="shrink-0 rounded-lg border border-amber-300/50 bg-amber-950/50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-900/60"
                >
                  {mediaSession.hasLinkedPhotos ? 'Re-link Photos Folder' : 'Link Local Folder'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-200">
                    Bhai Dooj Finale Song · {BHAI_DOOJ_SPECIAL_TRACK_SPEC.confirmedTraditionalTitle}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {mediaSession.finaleSongName
                      ? `Attached: ${mediaSession.finaleSongName} (fades in smoothly during Tilak ceremony).`
                      : `Warm instrumental plays by default. Attach your "${BHAI_DOOJ_SPECIAL_TRACK_SPEC.requestedName}" local audio file if desired.`}
                  </p>
                </div>
                <input
                  ref={songInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
                  className="hidden"
                  onChange={(e) => handleSongSelected(e.target.files)}
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  {mediaSession.finaleSongName && (
                    <button
                      type="button"
                      onClick={() => {
                        clearLocalFinaleSong();
                        setLocalLinkStatus('Switched back to warm procedural Bhai Dooj theme');
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => songInputRef.current?.click()}
                    className="rounded-lg border border-sky-400/50 bg-sky-950/50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-900/60"
                  >
                    {mediaSession.finaleSongName ? 'Change Song' : 'Attach Audio File'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid max-h-[45vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {allPolaroidIds.map((pid) => {
                const mem = getResolvedPolaroidMemory(pid);
                const unlocked = collectedPolaroids.includes(pid);

                return (
                  <button
                    key={pid}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setPreviewPolaroidId(pid)}
                    className={`group rounded-xl border p-2 text-left transition ${
                      unlocked
                        ? 'border-amber-200/60 bg-[#faf6ed] text-slate-900 shadow-md hover:-translate-y-0.5 hover:shadow-lg'
                        : 'cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-500 opacity-60'
                    }`}
                  >
                    <div
                      className={`relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${
                        unlocked ? mem.gradientClass : 'from-slate-800 to-slate-900'
                      }`}
                    >
                      {unlocked && mem.resolvedUrl ? (
                        <img
                          src={mem.resolvedUrl}
                          alt={mem.title}
                          style={{ imageOrientation: 'from-image' }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      ) : unlocked ? (
                        <span className="px-2 text-center text-[10px] font-medium text-slate-800 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                          {mem.locationTag}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Locked</span>
                      )}
                    </div>
                    <p
                      className={`mt-1.5 truncate text-[11px] font-semibold ${
                        unlocked ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {mem.title}
                    </p>
                    <p
                      className={`truncate text-[10px] ${
                        unlocked ? 'text-slate-600' : 'text-slate-500'
                      }`}
                    >
                      {unlocked ? mem.locationTag : 'Collect along trip'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Polaroid Lightbox Modal (gentle zoom & fade, graceful placeholder or browser-linked photo) */}
        {previewMem && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewMem.title}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 px-4 transition-opacity duration-300"
            onClick={() => setPreviewPolaroidId(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-amber-200/80 bg-[#faf6ed] p-3.5 text-slate-900 shadow-2xl transition-transform duration-300 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`flex h-64 items-center justify-center overflow-hidden rounded-xl px-4 text-center ${
                  previewMem.resolvedUrl
                    ? 'bg-[#efe7d6] p-2'
                    : `bg-gradient-to-br ${previewMem.gradientClass}`
                }`}
              >
                {previewMem.resolvedUrl ? (
                  <img
                    src={previewMem.resolvedUrl}
                    alt={previewMem.title}
                    style={{ imageOrientation: 'from-image' }}
                    className="max-h-full max-w-full rounded object-contain transition-transform duration-500 ease-out hover:scale-[1.02]"
                  />
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold tracking-wider text-slate-700 uppercase">
                      {previewMem.locationTag}
                    </p>
                    <p className="text-xs font-medium text-slate-800">{previewMem.caption}</p>
                    {previewMem.matchedFilename && (
                      <p className="text-[10px] text-slate-600/80">
                        Link local folder to preview personal photo here
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{previewMem.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{previewMem.caption}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPolaroidId(null)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
