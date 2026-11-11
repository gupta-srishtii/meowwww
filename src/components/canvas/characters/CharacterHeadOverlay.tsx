'use client';

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import {
  selectIsSimulationPaused,
  useProgressStore,
} from '@/store/progressStore';
import type { CharacterVariant } from '@/components/canvas/characters/StylizedPlaceholderCharacter';

interface BadgeMeta {
  name: string;
  chipClass: string;
  dotColor: string;
}

const BADGE_BY_VARIANT: Partial<Record<CharacterVariant, BadgeMeta>> = {
  ishaan: {
    name: 'Ishaan',
    chipClass: 'border-slate-300/70 bg-slate-900/80 text-slate-100',
    dotColor: '#f1f5f9',
  },
  srishti: {
    name: 'Srishti',
    chipClass: 'border-indigo-300/75 bg-indigo-950/85 text-amber-100',
    dotColor: '#e0e7ff',
  },
  friend_black_tee: {
    name: 'Manish',
    chipClass: 'border-zinc-400/70 bg-zinc-950/85 text-zinc-100',
    dotColor: '#18181b',
  },
  friend_plaid: {
    name: 'Yash',
    chipClass: 'border-amber-300/70 bg-stone-900/85 text-amber-100',
    dotColor: '#c7b8a8',
  },
};

function getConversationalBubble(
  variant: CharacterVariant,
  sceneId: number,
  roadSubStage: string,
  baalSubStage: string,
  stairDirection: 'ascent' | 'descent',
  phaseIndex: number
): string | null {
  if (variant !== 'srishti' && variant !== 'ishaan') return null;

  const linesByRole: Record<'srishti' | 'ishaan', readonly string[]> = (() => {
    if (sceneId === 5 && roadSubStage === 'viewpoint_walk') {
      return {
        srishti: [
          'Neeche ghaati dekh, kitna pyaara view hai!',
        ],
        ishaan: [
          'Woh rahi nadi — chalo ek photo lete hain.',
        ],
      };
    }
    if (sceneId === 6) {
      return {
        srishti: [
          'Pahadon mein garam Maggi aur kulhad chai!',
        ],
        ishaan: [
          'Late start sahi tha, par chai best hai.',
        ],
      };
    }
    if (sceneId === 7) {
      return {
        srishti: [],
        ishaan: [],
      };
    }
    if (sceneId === 9 && stairDirection === 'descent') {
      return {
        srishti: [
          'Dhyan se Bhai, jaldi neeche chalte hain!',
        ],
        ishaan: [
          'Sambhal ke Shree, safe speed rakho!',
        ],
      };
    }
    if (sceneId === 2 || sceneId === 3) {
      return { srishti: [], ishaan: [] };
    }
    if (sceneId === 9) {
      return { srishti: [], ishaan: [] };
    }
    if (sceneId === 10) {
      return {
        srishti: [
          '400 seedhiyon ke baad upar aana worth tha!',
        ],
        ishaan: [
          'Chaaro taraf ki pahadiyan dekh, Shree.',
        ],
      };
    }
    // Scene 12: Rishikesh Stay, Lane & Terrace
    return {
      srishti: [
        'Terrace se shaam aur chhaton ka nazara dekh!',
      ],
      ishaan: [
        'Shaam se pehle safely pahunch gaye, Shree.',
      ],
    };
  })();

  const pool = variant === 'srishti' ? linesByRole.srishti : linesByRole.ishaan;
  return pool[phaseIndex % pool.length] ?? null;
}

export interface CharacterHeadOverlayProps {
  variant: CharacterVariant;
  headY?: number;
  showTag?: boolean;
}

/**
 * Lightweight world-space name badge (`Ishaan`, `Shree`, `Manish`, `Yash`) matched subtly
 * to each outfit, plus gentle non-overlapping conversational bubbles between Ishaan & Shree.
 */
export function CharacterHeadOverlay({
  variant,
  headY = 0.28,
  showTag = true,
}: CharacterHeadOverlayProps) {
  const badge = BADGE_BY_VARIANT[variant];
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const baalSubStage = useProgressStore((s) => s.baalKuwariSubStage);
  const stairDirection = useProgressStore((s) => s.baalKuwariStairDirection);
  const neelkanthDarshanActive = useProgressStore((s) => s.neelkanthDarshanActive);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const isPaused = useProgressStore(selectIsSimulationPaused);

  const isWalkingScene =
    committedSceneId === 2 ||
    committedSceneId === 3 ||
    committedSceneId === 6 ||
    committedSceneId === 7 ||
    committedSceneId === 9 ||
    committedSceneId === 10 ||
    committedSceneId === 12 ||
    (committedSceneId === 5 && roadSubStage === 'viewpoint_walk');

  const enabled = Boolean(
    badge &&
      showTag &&
      isWalkingScene &&
      !neelkanthDarshanActive &&
      !isPaused &&
      transitionPhase === 'idle'
  );

  const [bubbleTick, setBubbleTick] = useState(0);
  useEffect(() => {
    if (!enabled || (variant !== 'srishti' && variant !== 'ishaan')) return;
    const id = window.setInterval(() => {
      setBubbleTick((prev) => prev + 1);
    }, 7000);
    return () => window.clearInterval(id);
  }, [enabled, variant]);

  if (!enabled || !badge) {
    return null;
  }

  // Rare, quiet cadence: mostly silent, at most one short bubble every ~21s–28s
  const cyclePos = bubbleTick % 7;
  const showBubbleNow =
    (variant === 'srishti' && cyclePos === 2) ||
    (variant === 'ishaan' && cyclePos === 5);

  const speech = showBubbleNow
    ? getConversationalBubble(
        variant,
        committedSceneId,
        roadSubStage,
        baalSubStage,
        stairDirection,
        Math.floor(bubbleTick / 7)
      )
    : null;

  return (
    <Html
      center
      position={[0, headY, 0]}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className="flex w-[224px] flex-col items-center gap-1.5">
        {speech && (
          <div className="min-w-[168px] max-w-[224px] rounded-xl border border-amber-200/70 bg-slate-950/92 px-3 py-1.5 text-center text-[10px] leading-snug font-medium whitespace-normal break-words text-amber-50 shadow-lg backdrop-blur-sm transition-opacity duration-200">
            {speech}
          </div>
        )}
        <span
          className={`inline-flex w-max items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide whitespace-nowrap shadow ${badge.chipClass}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full border border-white/40"
            style={{ backgroundColor: badge.dotColor }}
          />
          {badge.name}
        </span>
      </div>
    </Html>
  );
}

