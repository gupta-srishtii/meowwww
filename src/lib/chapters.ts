import type {
  BaalKuwariSubStage,
  MountainRoadSegmentId,
  MountainRoadSubStage,
} from '@/lib/mountainSpline';
import type { SceneId } from '@/lib/sceneConfig';

export type ChapterKey =
  | 'kitaabi_dastaan'
  | 'rishikesh_day1'
  | 'day2_bun_maska'
  | 'scooter_departure'
  | 'mountain_road'
  | 'scenic_viewpoint'
  | 'maggi_chai_stop'
  | 'neelkanth_road'
  | 'neelkanth_temple'
  | 'baal_kuwari_road'
  | 'baal_kuwari_maggi'
  | 'baal_kuwari_stairs_ride'
  | 'baal_kuwari_stairs'
  | 'baal_kuwari_temple'
  | 'evening_return'
  | 'hotel_farewell'
  | 'bhai_dooj_finale'
  | 'memory_gallery';

export interface StoryChapterItem {
  key: ChapterKey;
  rank: number;
  title: string;
  subtitle: string;
  targetSceneId: SceneId;
  targetSegment?: MountainRoadSegmentId;
  targetSubStage?: MountainRoadSubStage;
  targetBaalSubStage?: BaalKuwariSubStage;
  polaroidIds: readonly string[];
}

export const PHASE2_STORY_CHAPTERS: readonly StoryChapterItem[] = [
  {
    key: 'kitaabi_dastaan',
    rank: 0,
    title: 'Kitaabi Dastaan · How We Connected',
    subtitle: 'Chats aur calls se dosti shuru — phir Rishikesh milne ka plan bana',
    targetSceneId: 1,
    polaroidIds: [],
  },
  {
    key: 'rishikesh_day1',
    rank: 1,
    title: 'Day 1 · Arrival, Lane Stay & Evening Maggi',
    subtitle: 'Lucknow se train aur Delhi se bus — shaam ko scooty outing aur Maggi',
    targetSceneId: 2,
    polaroidIds: [],
  },
  {
    key: 'day2_bun_maska',
    rank: 2,
    title: 'Day 2 Morning · Bun Maska & Chai',
    subtitle: 'Gali ke bahar road par garam bun maska aur chai saath mein',
    targetSceneId: 3,
    polaroidIds: [],
  },
  {
    key: 'scooter_departure',
    rank: 3,
    title: 'Setting Off on Two Scooters',
    subtitle: 'Subah der se hi sahi — par dono scooties par sab saath nikal pade',
    targetSceneId: 4,
    polaroidIds: [],
  },
  {
    key: 'mountain_road',
    rank: 4,
    title: 'Rishikesh Mountain Highway',
    subtitle: 'Pahadi mod aur thandi hawa — do scooties pe Neelkanth ki taraf',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'scenic_viewpoint',
    rank: 5,
    title: 'Scenic Mountain Viewpoint',
    subtitle: 'Neeche ghaati aur nadi ke upar ruk kar teen yaadgar photos liye',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'viewpoint_walk',
    polaroidIds: [
      'scene05_viewpoint_shree',
      'scene05_viewpoint_solo',
      'scene05_viewpoint_group',
    ],
  },
  {
    key: 'maggi_chai_stop',
    rank: 6,
    title: 'Maggi & Chai Tapri',
    subtitle: 'Day 2 ke late uthne ke baad raaste pe garam Maggi aur chai',
    targetSceneId: 6,
    polaroidIds: ['scene06_dhaba'],
  },
  {
    key: 'neelkanth_road',
    rank: 7,
    title: 'Forest Road to Neelkanth',
    subtitle: 'Peeche Manish aur Yash — hawa aur jungle ke mod pe scooty chalaate hue',
    targetSceneId: 5,
    targetSegment: 'to_neelkanth',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'neelkanth_temple',
    rank: 8,
    title: 'Neelkanth Mahadev Temple',
    subtitle: 'Mandir ke gate se andar — diya, ghanti, aur sabke saath Neelkanth darshan',
    targetSceneId: 7,
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_road',
    rank: 9,
    title: 'Off-Road Track to Baal Kuwari',
    subtitle: 'Neelkanth ke baad pattharon waali kacche raaste pe off-roading ka maza',
    targetSceneId: 8,
    targetSegment: 'to_baalkuwari',
    targetBaalSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_maggi',
    rank: 10,
    title: 'Roadside Maggi Clearing',
    subtitle: 'Seedhiyon se pehle chhoti si clearing mein garam Maggi break',
    targetSceneId: 8,
    targetBaalSubStage: 'maggi_stop',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_stairs_ride',
    rank: 11,
    title: 'Mountain Ride to Staircase Gate',
    subtitle: 'Maggi break ke baad dobara scooty chalaake ~400 seedhiyon ke gate tak',
    targetSceneId: 8,
    targetSegment: 'to_baalkuwari_stairs',
    targetBaalSubStage: 'driving_to_stairs',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_stairs',
    rank: 12,
    title: 'Baal Kuwari: The ~400 Stairs',
    subtitle: 'Lagbhag 400 seedhiyan saath mein — steep chadhai pe tumne haath pakad ke upar le jaaya',
    targetSceneId: 9,
    polaroidIds: ['scene09_stairs_landing'],
  },
  {
    key: 'baal_kuwari_temple',
    rank: 13,
    title: 'Baal Kuwari Summit Temple',
    subtitle: 'Upar mandir ki shaanti, kitaab ke saath photo, aur chaaro taraf faili pahadiyan',
    targetSceneId: 10,
    polaroidIds: ['scene10_baalkuwari', 'scene10_baalkuwari_book'],
  },
  {
    key: 'evening_return',
    rank: 14,
    title: 'Evening Safe Return to Rishikesh',
    subtitle: 'Shaam ki Delhi bus se pehle dhyan se, jaldi aur safely neeche wapsi',
    targetSceneId: 11,
    targetSegment: 'to_hotel_return',
    polaroidIds: [],
  },
  {
    key: 'hotel_farewell',
    rank: 15,
    title: 'Rishikesh Stay, Terrace & Farewell',
    subtitle: 'Main road ke andar gali wali stay aur terrace view — Srishti apne group se mili',
    targetSceneId: 12,
    polaroidIds: [],
  },
  {
    key: 'bhai_dooj_finale',
    rank: 16,
    title: 'Bhai Dooj Tilak · Virtual Finale',
    subtitle: 'Kitaabi Dastaan se Bhai Dooj tak — tilak, mithai aur chhota sa paigham',
    targetSceneId: 13,
    polaroidIds: [],
  },
  {
    key: 'memory_gallery',
    rank: 17,
    title: 'Our Journey · Memories Showcase',
    subtitle: 'Saath bitaye hue pal, collected Polaroids aur dobara khelne ke options',
    targetSceneId: 14,
    polaroidIds: [],
  },
];

export function inferChapterRank(
  sceneId: SceneId,
  segment: MountainRoadSegmentId,
  subStage: MountainRoadSubStage,
  polaroids: readonly string[],
  baalKuwariSubStage: BaalKuwariSubStage = 'driving'
): number {
  let rank = 0;
  if (sceneId === 14) {
    rank = 17;
  } else if (sceneId === 13) {
    rank = 16;
  } else if (sceneId === 12) {
    rank = 15;
  } else if (sceneId === 11 || (sceneId === 5 && segment === 'to_hotel_return')) {
    rank = 14;
  } else if (
    sceneId === 10 ||
    polaroids.includes('scene10_baalkuwari') ||
    polaroids.includes('scene10_baalkuwari_book')
  ) {
    rank = 13;
  } else if (sceneId === 9 || polaroids.includes('scene09_stairs_landing')) {
    rank = 12;
  } else if (
    (sceneId === 8 && baalKuwariSubStage === 'driving_to_stairs') ||
    (sceneId === 5 && segment === 'to_baalkuwari_stairs')
  ) {
    rank = 11;
  } else if (sceneId === 8 && baalKuwariSubStage === 'maggi_stop') {
    rank = 10;
  } else if (sceneId === 8 || (sceneId === 5 && segment === 'to_baalkuwari')) {
    rank = 9;
  } else if (sceneId === 7) {
    rank = 8;
  } else if (sceneId === 5 && segment === 'to_neelkanth') {
    rank = 7;
  } else if (sceneId === 6 || polaroids.includes('scene06_dhaba')) {
    rank = 6;
  } else if (
    (sceneId === 5 && subStage === 'viewpoint_walk') ||
    polaroids.includes('scene05_viewpoint_shree') ||
    polaroids.includes('scene05_viewpoint_solo') ||
    polaroids.includes('scene05_viewpoint_group')
  ) {
    rank = 5;
  } else if (sceneId === 5) {
    rank = 4;
  } else if (sceneId === 4) {
    rank = 3;
  } else if (sceneId === 3) {
    rank = 2;
  } else if (sceneId === 2) {
    rank = 1;
  }
  return rank;
}

export function getActiveChapterKey(
  sceneId: SceneId,
  segment: MountainRoadSegmentId,
  subStage: MountainRoadSubStage,
  baalKuwariSubStage: BaalKuwariSubStage = 'driving'
): ChapterKey {
  if (sceneId === 14) return 'memory_gallery';
  if (sceneId === 13) return 'bhai_dooj_finale';
  if (sceneId === 12) return 'hotel_farewell';
  if (sceneId === 11) return 'evening_return';
  if (sceneId === 10) return 'baal_kuwari_temple';
  if (sceneId === 9) return 'baal_kuwari_stairs';
  if (sceneId === 8) {
    if (baalKuwariSubStage === 'driving_to_stairs') return 'baal_kuwari_stairs_ride';
    return baalKuwariSubStage === 'maggi_stop' ? 'baal_kuwari_maggi' : 'baal_kuwari_road';
  }
  if (sceneId === 7) return 'neelkanth_temple';
  if (sceneId === 6) return 'maggi_chai_stop';
  if (sceneId === 4) return 'scooter_departure';
  if (sceneId === 3) return 'day2_bun_maska';
  if (sceneId === 2) return 'rishikesh_day1';
  if (sceneId === 1) return 'kitaabi_dastaan';
  if (segment === 'to_neelkanth') return 'neelkanth_road';
  if (segment === 'to_baalkuwari_stairs') return 'baal_kuwari_stairs_ride';
  if (segment === 'to_baalkuwari') return 'baal_kuwari_road';
  if (segment === 'to_hotel_return') return 'evening_return';
  if (subStage === 'viewpoint_walk') return 'scenic_viewpoint';
  return 'mountain_road';
}

