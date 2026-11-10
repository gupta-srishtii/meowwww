export type SceneId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type SceneKind = 'SYSTEM' | 'NARRATIVE' | 'CINEMATIC' | 'GAMEPLAY' | 'ENDING';

export type SceneAct = 'Prologue' | 'Act 1' | 'Act 2' | 'Act 3' | 'Epilogue';

export type CameraMode = 'cinematic' | 'follow' | 'orbit' | 'fixed';

export type AssetOwnershipTier = 'shared' | 'scene_owned';

export type SharedAssetKey =
  | 'srishti'
  | 'ishaan'
  | 'manish'
  | 'yash'
  | 'scooter'
  | 'shared-palette-atlas'
  | 'core-ui-audio';

export type Phase1BStageKind =
  | 'milestone_0_prototype'
  | 'temp_test_scene'
  | 'phase2_playable'
  | 'phase3_playable'
  | 'unimplemented_stub';

export interface PersistentSharedAssetDescriptor {
  key: SharedAssetKey;
  label: string;
  plannedUrl: string;
  ownership: 'shared';
  loadedKind: 'procedural';
}

export interface SceneOwnedAssetDescriptor {
  id: string;
  label: string;
  url: string;
  ownership: 'scene_owned';
  loadedKind: 'procedural' | 'gltf';
}

export interface SceneDefinition {
  id: SceneId;
  slug: string;
  title: string;
  type: SceneKind;
  act: SceneAct;
  estDuration: string;
  cameraMode: CameraMode;
  checkpointPolicy: 'none' | 'on_commit' | 'milestone';
  phase1BStage: Phase1BStageKind;
  sharedAssets: readonly SharedAssetKey[];
  sceneOwnedAssets: readonly SceneOwnedAssetDescriptor[];
}

/**
 * Session-owned shared resources protected with `dispose={null}` and never
 * evicted during inter-scene transitions (§7 AssetManager & Shared Resource Ownership).
 * Phase 1B keeps these backed by lightweight procedural identifiers until Phase 4 GLBs land.
 */
export const PERSISTENT_SHARED_ASSETS: Record<SharedAssetKey, PersistentSharedAssetDescriptor> = {
  srishti: {
    key: 'srishti',
    label: 'Srishti Character Rig (Shared)',
    plannedUrl: '/models/characters/srishti.glb',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  ishaan: {
    key: 'ishaan',
    label: 'Ishaan Character Rig (Shared)',
    plannedUrl: '/models/characters/ishaan.glb',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  manish: {
    key: 'manish',
    label: 'Manish Character Rig (Shared)',
    plannedUrl: '/models/characters/manish.glb',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  yash: {
    key: 'yash',
    label: 'Yash Character Rig (Shared)',
    plannedUrl: '/models/characters/yash.glb',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  scooter: {
    key: 'scooter',
    label: 'Prototype Scooter Assembly (Shared)',
    plannedUrl: '/models/vehicles/scooter.glb',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  'shared-palette-atlas': {
    key: 'shared-palette-atlas',
    label: 'Shared Palette Material Tokens',
    plannedUrl: '/textures/palette-atlas.webp',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
  'core-ui-audio': {
    key: 'core-ui-audio',
    label: 'Core UI Audio Slots (Deferred to Phase 5)',
    plannedUrl: '/audio/ui-sprites.webm',
    ownership: 'shared',
    loadedKind: 'procedural',
  },
};

/**
 * Typed registry matching MASTER_PLAN.md §2 (15 scenes: Scene 0..14).
 * Phase 1B enables Scene 5 (preserved Milestone 0 prototype) and Scene 0
 * (temporary non-story Phase 1B switch/retention test stage).
 */
export const SCENE_REGISTRY: Record<SceneId, SceneDefinition> = {
  0: {
    id: 0,
    slug: 'loading-title',
    title: 'Loading, Cozy Lamp & Title',
    type: 'SYSTEM',
    act: 'Prologue',
    estDuration: '10–20s',
    cameraMode: 'cinematic',
    checkpointPolicy: 'none',
    phase1BStage: 'temp_test_scene',
    sharedAssets: ['scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'phase1b-test-stage-geometry',
        label: 'Phase 1B Temporary Test Stage (Procedural)',
        url: 'procedural://phase1b-test-stage',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  1: {
    id: 1,
    slug: 'kitaabi-dastaan',
    title: 'Kitaabi Dastaan: 3D Library Reveal',
    type: 'NARRATIVE',
    act: 'Prologue',
    estDuration: '60–90s',
    cameraMode: 'cinematic',
    checkpointPolicy: 'none',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan', 'shared-palette-atlas'],
    sceneOwnedAssets: [],
  },
  2: {
    id: 2,
    slug: 'mahakumbh-flash',
    title: 'Mahakumbh Flash (~2 Minutes)',
    type: 'CINEMATIC',
    act: 'Prologue',
    estDuration: '20–30s',
    cameraMode: 'cinematic',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan', 'shared-palette-atlas'],
    sceneOwnedAssets: [],
  },
  3: {
    id: 3,
    slug: 'late-morning-departure',
    title: 'Late Morning Departure',
    type: 'GAMEPLAY',
    act: 'Act 1',
    estDuration: '90–120s',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'shared-palette-atlas'],
    sceneOwnedAssets: [],
  },
  4: {
    id: 4,
    slug: 'scooter-departure',
    title: 'Scooter Departure',
    type: 'CINEMATIC',
    act: 'Act 1',
    estDuration: '30–45s',
    cameraMode: 'cinematic',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter'],
    sceneOwnedAssets: [],
  },
  5: {
    id: 5,
    slug: 'mountain-road-ride',
    title: 'Mountain Road Ride',
    type: 'GAMEPLAY',
    act: 'Act 1',
    estDuration: '3–5 min',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'milestone_0_prototype',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'mountain-road-procedural-env',
        label: 'Mountain Road Spline & Pine Instancing',
        url: 'procedural://mountain-road-prototype',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  6: {
    id: 6,
    slug: 'maggi-chai-stop',
    title: 'Maggi & Chai Stop',
    type: 'GAMEPLAY',
    act: 'Act 1',
    estDuration: '90–120s',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase2_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'dhaba-procedural-env',
        label: 'Roadside Dhaba Clearing (Placeholder Greybox)',
        url: 'procedural://dhaba-clearing',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  7: {
    id: 7,
    slug: 'neelkanth-mahadev',
    title: 'Neelkanth Mahadev',
    type: 'GAMEPLAY',
    act: 'Act 2',
    estDuration: '90–120s',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase2_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'neelkanth-temple-env',
        label: 'Neelkanth Mahadev Temple Courtyard & Gopuram',
        url: 'procedural://neelkanth-temple',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  8: {
    id: 8,
    slug: 'ride-to-baal-kuwari',
    title: 'Off-Road Track, Maggi Clearing & Forest Trail',
    type: 'GAMEPLAY',
    act: 'Act 2',
    estDuration: '3–4 min',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase3_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'baal-kuwari-approach-env',
        label: 'Off-Road Mountain Track, Maggi Clearing & Forest Footpath',
        url: 'procedural://baal-kuwari-approach',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  9: {
    id: 9,
    slug: 'baal-kuwari-400-stairs',
    title: 'Baal Kuwari: The ~400 Stairs',
    type: 'GAMEPLAY',
    act: 'Act 2',
    estDuration: '2–3 min',
    cameraMode: 'follow',
    checkpointPolicy: 'milestone',
    phase1BStage: 'phase3_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'baal-kuwari-stairs-env',
        label: 'Forest Hillside Segmented Staircase (~400 Steps)',
        url: 'procedural://baal-kuwari-stairs',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  10: {
    id: 10,
    slug: 'baal-kuwari-arrival',
    title: 'Baal Kuwari Temple Arrival & Summit',
    type: 'GAMEPLAY',
    act: 'Act 2',
    estDuration: '90s',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase3_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'baal-kuwari-temple-env',
        label: 'Baal Kuwari Summit Sanctuary & Courtyard',
        url: 'procedural://baal-kuwari-temple',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  11: {
    id: 11,
    slug: 'evening-safe-return',
    title: 'Evening Safe Return to Rishikesh',
    type: 'GAMEPLAY',
    act: 'Act 3',
    estDuration: '2 min',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase3_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'evening-return-road-env',
        label: 'Golden-Hour Mountain Descent Route',
        url: 'procedural://evening-return-road',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  12: {
    id: 12,
    slug: 'hotel-return-farewell',
    title: 'Rishikesh Hotel Return & Gentle Farewell',
    type: 'GAMEPLAY',
    act: 'Act 3',
    estDuration: '90s',
    cameraMode: 'follow',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'phase3_playable',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter', 'shared-palette-atlas'],
    sceneOwnedAssets: [
      {
        id: 'rishikesh-hotel-courtyard-env',
        label: 'Rishikesh Hotel Courtyard & Reunion Stage',
        url: 'procedural://hotel-return-courtyard',
        ownership: 'scene_owned',
        loadedKind: 'procedural',
      },
    ],
  },
  13: {
    id: 13,
    slug: 'bhai-dooj-tilak',
    title: 'Bhai Dooj Tilak',
    type: 'GAMEPLAY',
    act: 'Act 3',
    estDuration: '2–3 min',
    cameraMode: 'fixed',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan'],
    sceneOwnedAssets: [],
  },
  14: {
    id: 14,
    slug: 'memory-gallery',
    title: 'Inspectable 3D Memory Gallery',
    type: 'ENDING',
    act: 'Epilogue',
    estDuration: 'Open-ended',
    cameraMode: 'orbit',
    checkpointPolicy: 'on_commit',
    phase1BStage: 'unimplemented_stub',
    sharedAssets: ['srishti', 'ishaan', 'manish', 'yash', 'scooter'],
    sceneOwnedAssets: [],
  },
};

export const ALL_SCENE_IDS: readonly SceneId[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];

export const PHASE1B_PLAYABLE_SCENE_IDS: readonly SceneId[] = [5, 6, 7, 0];
export const PHASE2A_PLAYABLE_SCENE_IDS: readonly SceneId[] = [5, 6, 7, 0];

export function isValidSceneId(value: unknown): value is SceneId {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 14;
}

export function getSceneDefinition(sceneId: SceneId): SceneDefinition {
  return SCENE_REGISTRY[sceneId];
}

