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
    name: 'Shree',
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
          'Bhai, neeche ghaati dekh — ek photo toh banti hai!',
          'Ishaan, idhar rail ke paas aao, view kamaal hai.',
        ],
        ishaan: [
          'Haan Shree, ruk — abhi click karte hain.',
          'Sach mein kaafi sundar valley lag rahi hai.',
        ],
      };
    }
    if (sceneId === 6) {
      return {
        srishti: [
          'Kumbhkaran Bhai, aakhir garam Maggi mil hi gayi!',
          'Ishaan, pahadon mein kulhad chai ki baat hi alag hai.',
        ],
        ishaan: [
          'Subah late ho gaye par chai sahi mein best hai!',
          'Shree, garam Maggi aur thandi hawa — perfect combo.',
        ],
      };
    }
    if (sceneId === 7) {
      return {
        srishti: [
          'Bhai, mandap mein aao — saath diya jalate hain.',
          'Ishaan, yahan mandir ke andar kitni shaanti hai.',
        ],
        ishaan: [
          'Chalo Shree, darshan karke phir Baal Kuwari nikalte hain.',
          'Har Har Mahadev — dil khush ho gaya.',
        ],
      };
    }
    if (sceneId === 8 && baalSubStage === 'maggi_stop') {
      return {
        srishti: [
          'Seedhiyon se pehle Maggi break zaroori tha, Bhai!',
          'Chalo Ishaan, ab dobara scooties pe gate tak chalte hain.',
        ],
        ishaan: [
          'Bilkul Shree — ab bas gate ke baad ~400 steps.',
          'Chalo sab, scooty start karte hain.',
        ],
      };
    }
    if (sceneId === 9 && stairDirection === 'descent') {
      return {
        srishti: [
          'Dhyan se Bhai, jaldi chalo wapsi bhi karni hai!',
          'Ishaan, dekhte hain pehle neeche kaun aata hai!',
        ],
        ishaan: [
          'Sambhal ke Shree, bhaagte hue bhi safe chalna!',
          'Haha, step sambhal ke chalo!',
        ],
      };
    }
    if (sceneId === 9) {
      return {
        srishti: [
          'Haath do Bhai, yeh waala pitch kaafi steep hai!',
          'Ishaan, bas thoda aur — upar pahunchne wale hain!',
        ],
        ishaan: [
          'Main hoon na Shree, aaram se haath pakad ke chalo.',
          'Bas ek aur mod, phir seedha mandir gate.',
        ],
      };
    }
    if (sceneId === 10) {
      return {
        srishti: [
          '~400 seedhiyon ke baad upar aana bilkul worth tha, Bhai!',
          'Ishaan, chaaro taraf ki pahadiyan dekh!',
        ],
        ishaan: [
          'Sach mein Shree — itna shaant lag raha hai yahan.',
          'Chalo pehle ghanti bajate hain.',
        ],
      };
    }
    // Scene 12: Rishikesh Stay, Lane & Terrace
    return {
      srishti: [
        'Terrace se shaam aur chhaton ka nazara dekho, Bhai!',
        'Ishaan, yeh Rishikesh trip hamesha sabse khas rahega.',
      ],
      ishaan: [
        'Shaam se pehle safely pahunch gaye, Shree.',
        'Hamesha yaad rahega yeh safar.',
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
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const isPaused = useProgressStore(selectIsSimulationPaused);

  const isWalkingScene =
    committedSceneId === 6 ||
    committedSceneId === 7 ||
    committedSceneId === 9 ||
    committedSceneId === 10 ||
    committedSceneId === 12 ||
    (committedSceneId === 5 && roadSubStage === 'viewpoint_walk') ||
    (committedSceneId === 8 && baalSubStage === 'maggi_stop');

  const enabled = Boolean(badge && showTag && isWalkingScene && !isPaused && transitionPhase === 'idle');

  const [bubbleTick, setBubbleTick] = useState(0);
  useEffect(() => {
    if (!enabled || (variant !== 'srishti' && variant !== 'ishaan')) return;
    const id = window.setInterval(() => {
      setBubbleTick((prev) => prev + 1);
    }, 5200);
    return () => window.clearInterval(id);
  }, [enabled, variant]);

  if (!enabled || !badge) {
    return null;
  }

  // Alternate speakers cleanly: Shree speaks on ticks 1, 5, 9...; Ishaan replies on 3, 7...; quiet rest in between
  const cyclePos = bubbleTick % 6;
  const showBubbleNow =
    (variant === 'srishti' && cyclePos === 1) ||
    (variant === 'ishaan' && cyclePos === 3);

  const speech = showBubbleNow
    ? getConversationalBubble(
        variant,
        committedSceneId,
        roadSubStage,
        baalSubStage,
        stairDirection,
        Math.floor(bubbleTick / 6)
      )
    : null;

  return (
    <Html
      center
      position={[0, headY, 0]}
      distanceFactor={7.2}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className="flex flex-col items-center gap-1 whitespace-nowrap">
        {speech && (
          <div className="max-w-[178px] whitespace-normal rounded-xl border border-amber-200/70 bg-slate-950/90 px-2.5 py-1 text-center text-[10px] leading-snug font-medium text-amber-50 shadow-lg backdrop-blur-sm">
            {speech}
          </div>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide shadow ${badge.chipClass}`}
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
