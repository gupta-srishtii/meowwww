import type { MountainRoadSegmentId, MountainRoadSubStage } from '@/lib/mountainSpline';
import type { SceneId } from '@/lib/sceneConfig';

export type ChapterKey =
  | 'mountain_road'
  | 'scenic_viewpoint'
  | 'maggi_chai_stop'
  | 'neelkanth_road'
  | 'neelkanth_temple';

export interface StoryChapterItem {
  key: ChapterKey;
  rank: number;
  title: string;
  subtitle: string;
  targetSceneId: SceneId;
  targetSegment?: MountainRoadSegmentId;
  targetSubStage?: MountainRoadSubStage;
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
];

export const UPCOMING_CHAPTER_PREVIEW = {
  title: 'Baal Kuwari Temple & ~400 Stairs',
  subtitle: 'Next chapter coming soon',
} as const;

export function inferChapterRank(
  sceneId: SceneId,
  segment: MountainRoadSegmentId,
  subStage: MountainRoadSubStage,
  polaroids: readonly string[]
): number {
  let rank = 0;
  if (sceneId === 7 || polaroids.includes('scene07_neelkanth')) {
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
  subStage: MountainRoadSubStage
): ChapterKey {
  if (sceneId === 7) return 'neelkanth_temple';
  if (sceneId === 6) return 'maggi_chai_stop';
  if (segment === 'to_neelkanth') return 'neelkanth_road';
  if (subStage === 'viewpoint_walk') return 'scenic_viewpoint';
  return 'mountain_road';
}

