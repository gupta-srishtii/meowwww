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
  | 'baal_kuwari_footpath'
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
    subtitle: 'Riding up the winding valley curves together on two scooters',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'scenic_viewpoint',
    rank: 1,
    title: 'Scenic Mountain Viewpoint',
    subtitle: 'Pulling over above the blue-green river gorge for group photos',
    targetSceneId: 5,
    targetSegment: 'to_dhaba',
    targetSubStage: 'viewpoint_walk',
    polaroidIds: ['scene05_viewpoint_solo', 'scene05_viewpoint_group'],
  },
  {
    key: 'maggi_chai_stop',
    rank: 2,
    title: 'Maggi & Chai Tapri',
    subtitle: 'Hot Maggi & kulhad chai at the small roadside mountain stall',
    targetSceneId: 6,
    polaroidIds: ['scene06_dhaba'],
  },
  {
    key: 'neelkanth_road',
    rank: 3,
    title: 'Forest Road to Neelkanth',
    subtitle: 'Cruising beneath pine bends onward toward the temple valley',
    targetSceneId: 5,
    targetSegment: 'to_neelkanth',
    targetSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'neelkanth_temple',
    rank: 4,
    title: 'Neelkanth Mahadev Temple',
    subtitle: 'Walking through the painted gate into the temple courtyard & darshan',
    targetSceneId: 7,
    polaroidIds: ['scene07_neelkanth'],
  },
  {
    key: 'baal_kuwari_road',
    rank: 5,
    title: 'Off-Road Track to Baal Kuwari',
    subtitle: 'Riding the rugged rocky dirt trail onward from Neelkanth toward the hills',
    targetSceneId: 8,
    targetSegment: 'to_baalkuwari',
    targetBaalSubStage: 'driving',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_maggi',
    rank: 6,
    title: 'Roadside Maggi Clearing',
    subtitle: 'Gathering around the rustic forest tapri before walking onto the temple path',
    targetSceneId: 8,
    targetBaalSubStage: 'maggi_stop',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_footpath',
    rank: 7,
    title: 'Forest Path to the Stairs',
    subtitle: 'Walking together through pines and boulders toward the Baal Kuwari staircase gate',
    targetSceneId: 8,
    targetBaalSubStage: 'forest_footpath',
    polaroidIds: [],
  },
  {
    key: 'baal_kuwari_stairs',
    rank: 8,
    title: 'Baal Kuwari: The ~400 Stairs',
    subtitle: 'Climbing winding hillside steps together as Ishaan helps along steeper turns',
    targetSceneId: 9,
    polaroidIds: ['scene09_stairs_landing'],
  },
  {
    key: 'baal_kuwari_temple',
    rank: 9,
    title: 'Baal Kuwari Summit Temple',
    subtitle: 'Quiet summit courtyard overlooking the distant Himalayan hills',
    targetSceneId: 10,
    polaroidIds: ['scene10_baalkuwari'],
  },
  {
    key: 'evening_return',
    rank: 10,
    title: 'Evening Safe Return to Rishikesh',
    subtitle: 'Cruising down cleanly & safely in golden-hour light before the evening bus',
    targetSceneId: 11,
    targetSegment: 'to_hotel_return',
    polaroidIds: [],
  },
  {
    key: 'hotel_farewell',
    rank: 11,
    title: 'Hotel Return & Gentle Farewell',
    subtitle: 'Returning to the shared Rishikesh hotel courtyard as Srishti rejoins her group',
    targetSceneId: 12,
    polaroidIds: ['scene12_hotel_farewell'],
  },
];

export const UPCOMING_CHAPTER_PREVIEW = {
  title: 'Bhai Dooj Tilak · Separate Later Epilogue',
  subtitle: 'Awaits next phase (separate post-trip occasion)',
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
  } else if (sceneId === 8 && baalKuwariSubStage === 'forest_footpath') {
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
    if (baalKuwariSubStage === 'forest_footpath') return 'baal_kuwari_footpath';
    return baalKuwariSubStage === 'maggi_stop' ? 'baal_kuwari_maggi' : 'baal_kuwari_road';
  }
  if (sceneId === 7) return 'neelkanth_temple';
  if (sceneId === 6) return 'maggi_chai_stop';
  if (segment === 'to_neelkanth') return 'neelkanth_road';
  if (segment === 'to_baalkuwari') return 'baal_kuwari_road';
  if (segment === 'to_hotel_return') return 'evening_return';
  if (subStage === 'viewpoint_walk') return 'scenic_viewpoint';
  return 'mountain_road';
}

