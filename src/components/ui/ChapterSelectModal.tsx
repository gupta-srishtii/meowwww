'use client';

import {
  PHASE2_STORY_CHAPTERS,
  UPCOMING_CHAPTER_PREVIEW,
  getActiveChapterKey,
  type StoryChapterItem,
} from '@/lib/chapters';
import { useProgressStore } from '@/store/progressStore';

export interface ChapterSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelectChapter: (chapter: StoryChapterItem) => void;
}

/**
 * Clean story progression & Polaroid memory selector without developer jargon.
 */
export function ChapterSelectModal({
  open,
  onClose,
  onSelectChapter,
}: ChapterSelectModalProps) {
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const furthestChapterRank = useProgressStore((s) => s.furthestChapterRank);
  const collectedPolaroids = useProgressStore((s) => s.collectedPolaroids);

  if (!open) return null;

  const activeKey = getActiveChapterKey(committedSceneId, mountainRoadSegment, roadSubStage);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memories and Chapters"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
              Journey Log
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Memories &amp; Chapters
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {collectedPolaroids.length} of 4 trip Polaroids collected
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

        <ul className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
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

          <li className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/30 p-3 opacity-75">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  6. {UPCOMING_CHAPTER_PREVIEW.title}
                </p>
                <p className="mt-0.5 text-[11px] text-amber-300/80">
                  {UPCOMING_CHAPTER_PREVIEW.subtitle}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                Soon
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

