import type {
  BaalKuwariSubStage,
  MountainRoadSegmentId,
  MountainRoadSubStage,
} from '@/lib/mountainSpline';
import type { SceneId } from '@/lib/sceneConfig';

export type ChapterKey =
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
  | 'hotel_farewell';

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
    key: 'mountain_road',
    rank: 0,
    title: 'Rishikesh Mountain Highway',
    subtitle: 'Kitaabi Dastaan se Rishikesh tak — do scooties pe saath nikal pade',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'scenic_viewpoint',
    rank: 1,
    title: 'Scenic Mountain Viewpoint',
    subtitle: 'Neeche ghaati aur nadi ke upar thodi der ruk ke saath photos liye',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'viewpoint_walk',
    polaroidIds: ['scene05_viewpoint_solo', 'scene05_viewpoint_group'],
  },
  {
    key: 'maggi_chai_stop',
    rank: 2,
    title: 'Maggi & Chai Tapri',
    subtitle: 'Day 2 ke late uthne ("Kumbhkaran" moment!) ke baad raaste pe garam Maggi aur chai',
    targetSceneId: 6,
    polaroidIds: ['scene06_dhaba'],
  },
  {
    key: 'neelkanth_road',
    rank: 3,
    title: 'Forest Road to Neelkanth',
    subtitle: 'Peeche Manish aur Yash — hawa aur jungle ke mod pe scooty chalaate hue',
    targetSceneId: 5,
    targetSegment: 'to_neelkanth',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'neelkanth_temple',
    rank: 4,
    title: 'Neelkanth Mahadev Temple',
    subtitle: 'Mandir ke gate se andar — diya, ghanti, aur sabke saath Neelkanth darshan',
    targetSceneId: 7,
    polaroidIds: ['scene07_neelkanth'],
  },
  {
    key: 'baal_kuwari_road',
    rank: 5,
    title: 'Off-Road Track to Baal Kuwari',
    subtitle: 'Neelkanth ke baad pattharon waali kacche raaste pe off-roading ka maza',
    targetSceneId: 8,
    targetSegment: 'to_baalkuwari',
    targetBaalSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_maggi',
    rank: 6,
    title: 'Roadside Maggi Clearing',
    subtitle: 'Seedhiyan chadhne se pehle chhoti si clearing mein garam Maggi break',
    targetSceneId: 8,
    targetBaalSubStage: 'maggi_stop',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_stairs_ride',
    rank: 7,
    title: 'Mountain Ride to Staircase Gate',
    subtitle: 'Maggi break ke baad dobara scooty chalaake ~400 seedhiyon ke gate tak',
    targetSceneId: 8,
    targetSegment: 'to_baalkuwari_stairs',
    targetBaalSubStage: 'driving_to_stairs',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_stairs',
    rank: 8,
    title: 'Baal Kuwari: The ~400 Stairs',
    subtitle: 'Lagbhag 400 seedhiyan saath mein — steep chadhai pe tumne haath pakad ke upar le jaaya',
    targetSceneId: 9,
    polaroidIds: ['scene09_stairs_landing'],
  },
  {
    key: 'baal_kuwari_temple',
    rank: 9,
    title: 'Baal Kuwari Summit Temple',
    subtitle: 'Upar mandir ki shaanti aur chaaro taraf faili hari pahadiyan',
    targetSceneId: 10,
    polaroidIds: ['scene10_baalkuwari'],
  },
  {
    key: 'evening_return',
    rank: 10,
    title: 'Evening Safe Return to Rishikesh',
    subtitle: 'Shaam ki Delhi bus se pehle dhyan se, jaldi aur safely neeche wapsi',
    targetSceneId: 11,
    targetSegment: 'to_hotel_return',
    polaroidIds: [],
  },
  {
    key: 'hotel_farewell',
    rank: 11,
    title: 'Rishikesh Stay, Terrace & Farewell',
    subtitle: 'Main road ke andar gali wali stay aur terrace view — Srishti apne group se mili',
    targetSceneId: 12,
    polaroidIds: ['scene12_hotel_farewell'],
  },
];

export const UPCOMING_CHAPTER_PREVIEW = {
  title: 'Bhai Dooj Tilak · Later Epilogue',
  subtitle: 'Agle phase mein — trip ke baad ka hamara Bhai Dooj chapter',
} as const;

export function inferChapterRank(
  sceneId: SceneId,
  segment: MountainRoadSegmentId,
  subStage: MountainRoadSubStage,
  polaroids: readonly string[],
  baalKuwariSubStage: BaalKuwariSubStage = 'driving'
): number {
  let rank = 0;
  if (sceneId === 12 || polaroids.includes('scene12_hotel_farewell')) {
    rank = 11;
  } else if (sceneId === 11 || (sceneId === 5 && segment === 'to_hotel_return')) {
    rank = 10;
  } else if (sceneId === 10 || polaroids.includes('scene10_baalkuwari')) {
    rank = 9;
  } else if (sceneId === 9 || polaroids.includes('scene09_stairs_landing')) {
    rank = 8;
  } else if (
    (sceneId === 8 && baalKuwariSubStage === 'driving_to_stairs') ||
    (sceneId === 5 && segment === 'to_baalkuwari_stairs')
  ) {
    rank = 7;
  } else if (sceneId === 8 && baalKuwariSubStage === 'maggi_stop') {
    rank = 6;
  } else if (sceneId === 8 || (sceneId === 5 && segment === 'to_baalkuwari')) {
    rank = 5;
  } else if (sceneId === 7 || polaroids.includes('scene07_neelkanth')) {
    rank = 4;
  } else if (sceneId === 5 && segment === 'to_neelkanth') {
    rank = 3;
  } else if (sceneId === 6 || polaroids.includes('scene06_dhaba')) {
    rank = 2;
  } else if (
    (sceneId === 5 && subStage === 'viewpoint_walk') ||
    polaroids.includes('scene05_viewpoint_solo') ||
    polaroids.includes('scene05_viewpoint_group')
  ) {
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
  if (segment === 'to_neelkanth') return 'neelkanth_road';
  if (segment === 'to_baalkuwari_stairs') return 'baal_kuwari_stairs_ride';
  if (segment === 'to_baalkuwari') return 'baal_kuwari_road';
  if (segment === 'to_hotel_return') return 'evening_return';
  if (subStage === 'viewpoint_walk') return 'scenic_viewpoint';
  return 'mountain_road';
}

