import { create } from 'zustand';
import {
  CHECKPOINT_VERSION,
  clearCheckpointInStorage,
  readCheckpointFromStorage,
  writeCheckpointToStorage,
  type CheckpointData,
} from '@/lib/checkpoint';
import {
  detectInitialQualityProfile,
  type QualityProfile,
} from '@/lib/qualityProfile';
import {
  LEAD_START_DISTANCE,
  type BaalKuwariSubStage,
  type MountainRoadSegmentId,
  type MountainRoadSubStage,
} from '@/lib/mountainSpline';
import { inferChapterRank } from '@/lib/chapters';
import type { SceneId } from '@/lib/sceneConfig';

export type TransitionPhase =
  | 'idle'
  | 'fading_out'
  | 'loading'
  | 'mounting'
  | 'fading_in'
  | 'error';

export type DevFailureMode = 'none' | 'load' | 'mount';

export interface NarrationEntry {
  id: string;
  badge?: string;
  speaker?: string;
  lines: readonly string[];
  isPlaceholder?: boolean;
}

export interface ActiveNarrationState {
  entry: NarrationEntry;
  lineIndex: number;
}

export interface ProgressStoreState {
  // Decoupled Scene Lifecycle & Recovery Guards (§7)
  requestedSceneId: SceneId;
  committedSceneId: SceneId;
  previousCommittedSceneId: SceneId | null;
  transitionPhase: TransitionPhase;
  transitionError: string | null;
  transitionToken: number;
  retryNonce: number;
  mountAttemptedForTransition: boolean;
  saveOnNextCommit: boolean;
  staleCallbacksRejected: number;

  // Development-only Phase 1B test controls
  devFailureMode: DevFailureMode;

  // Collection & Scene Progress
  collectedPolaroids: string[];
  furthestChapterRank: number;
  stairStepCount: number;
  mountainRoadSegment: MountainRoadSegmentId;
  roadSubStage: MountainRoadSubStage;
  baalKuwariSubStage: BaalKuwariSubStage;
  baalKuwariStairDirection: 'ascent' | 'descent';
  roadResumeDistance: number;
  activeNarration: ActiveNarrationState | null;

  // Independent Pause & Recovery Flags
  userPaused: boolean;
  tabHiddenPaused: boolean;
  contextLostPaused: boolean;
  modalPaused: boolean;

  // Settings & Quality
  audioMuted: boolean;
  guidedMode: boolean;
  qualityProfile: QualityProfile;

  // Checkpoint State
  lastCheckpoint: CheckpointData | null;
  pendingResumeCheckpoint: CheckpointData | null;
  checkpointStorageBlocked: boolean;
  checkpointStatusNote: string | null;

  // Lifecycle Actions
  beginFadeOut: (targetId: SceneId, token: number, saveOnCommit?: boolean) => void;
  enterLoadingPhase: (targetId: SceneId, token: number) => void;
  enterMountingPhase: (token: number) => void;
  commitSceneReady: (token: number, sceneId: SceneId) => boolean;
  finishFadeIn: (token: number) => void;
  failTransition: (token: number, message: string) => void;
  prepareRetry: (token: number) => void;
  prepareReturnToCommitted: (token: number) => SceneId;
  recordStaleCallbackRejected: () => void;
  setDevFailureMode: (mode: DevFailureMode) => void;

  // Collection & Settings Actions
  addPolaroid: (id: string) => void;
  capturePolaroidAndSave: (id: string) => boolean;
  showNarration: (entry: NarrationEntry) => void;
  advanceNarration: () => void;
  closeNarration: () => void;
  setStairStepCount: (step: number) => void;
  setMountainRoadSegment: (segment: MountainRoadSegmentId) => void;
  setRoadSubStage: (subStage: MountainRoadSubStage) => void;
  setBaalKuwariSubStage: (subStage: BaalKuwariSubStage) => void;
  setBaalKuwariStairDirection: (direction: 'ascent' | 'descent') => void;
  setRoadResumeDistance: (distance: number) => void;
  setUserPaused: (paused: boolean) => void;
  setTabHiddenPaused: (paused: boolean) => void;
  setContextLostPaused: (lost: boolean) => void;
  setModalPaused: (paused: boolean) => void;
  toggleAudio: () => void;
  toggleGuidedMode: () => void;
  setQualityProfile: (profile: QualityProfile) => void;
  downgradeQualityProfile: () => void;

  // Checkpoint Actions
  saveCheckpoint: () => CheckpointData;
  restoreCheckpointSettings: (data: CheckpointData) => void;
  hydrateCheckpointFromStorage: () => CheckpointData | null;
  dismissPendingResume: () => void;
  clearCheckpoint: () => void;
}

export function selectIsSimulationPaused(state: ProgressStoreState): boolean {
  return (
    state.userPaused || state.tabHiddenPaused || state.contextLostPaused || state.modalPaused
  );
}

const DEFAULT_INITIAL_SCENE_ID: SceneId = 1;

export const useProgressStore = create<ProgressStoreState>((set, get) => ({
  requestedSceneId: DEFAULT_INITIAL_SCENE_ID,
  committedSceneId: DEFAULT_INITIAL_SCENE_ID,
  previousCommittedSceneId: null,
  transitionPhase: 'idle',
  transitionError: null,
  transitionToken: 0,
  retryNonce: 0,
  mountAttemptedForTransition: false,
  saveOnNextCommit: false,
  staleCallbacksRejected: 0,

  devFailureMode: 'none',

  collectedPolaroids: [],
  furthestChapterRank: 0,
  stairStepCount: 0,
  mountainRoadSegment: 'to_dhaba',
  roadSubStage: 'driving',
  baalKuwariSubStage: 'driving',
  baalKuwariStairDirection: 'ascent',
  roadResumeDistance: LEAD_START_DISTANCE,
  activeNarration: null,

  userPaused: false,
  tabHiddenPaused: false,
  contextLostPaused: false,
  modalPaused: false,

  audioMuted: false,
  guidedMode: false,
  qualityProfile: detectInitialQualityProfile(),

  lastCheckpoint: null,
  pendingResumeCheckpoint: null,
  checkpointStorageBlocked: false,
  checkpointStatusNote: null,

  beginFadeOut: (_targetId, token, saveOnCommit = true) => {
    set({
      transitionPhase: 'fading_out',
      transitionError: null,
      transitionToken: token,
      mountAttemptedForTransition: false,
      saveOnNextCommit: saveOnCommit,
      activeNarration: null,
    });
  },

  enterLoadingPhase: (targetId, token) => {
    const state = get();
    if (token !== state.transitionToken) return;
    set({
      requestedSceneId: targetId,
      transitionPhase: 'loading',
      transitionError: null,
      mountAttemptedForTransition: false,
    });
  },

  enterMountingPhase: (token) => {
    const state = get();
    if (token !== state.transitionToken) return;
    set({
      transitionPhase: 'mounting',
      transitionError: null,
      mountAttemptedForTransition: true,
    });
  },

  commitSceneReady: (token, sceneId) => {
    const state = get();
    const isPhaseExpectingCommit =
      state.transitionPhase === 'mounting' || state.transitionPhase === 'loading';

    if (
      token !== state.transitionToken ||
      sceneId !== state.requestedSceneId ||
      !isPhaseExpectingCommit
    ) {
      set({ staleCallbacksRejected: state.staleCallbacksRejected + 1 });
      return false;
    }

    const previousId = state.committedSceneId;
    const shouldSave = state.saveOnNextCommit;
    const nextRank = Math.max(
      state.furthestChapterRank,
      inferChapterRank(
        sceneId,
        state.mountainRoadSegment,
        state.roadSubStage,
        state.collectedPolaroids,
        state.baalKuwariSubStage
      )
    );

    set({
      previousCommittedSceneId: previousId,
      committedSceneId: sceneId,
      furthestChapterRank: nextRank,
      transitionPhase: 'fading_in',
      transitionError: null,
      saveOnNextCommit: false,
      ...(sceneId !== 9 ? { baalKuwariStairDirection: 'ascent' as const } : {}),
    });

    if (shouldSave) {
      get().saveCheckpoint();
    }

    return true;
  },

  finishFadeIn: (token) => {
    const state = get();
    if (token !== state.transitionToken) return;
    set({ transitionPhase: 'idle' });
  },

  failTransition: (token, message) => {
    const state = get();
    if (token !== state.transitionToken) return;
    // Note: intentionally leaves committedSceneId and localStorage completely untouched.
    set({
      transitionPhase: 'error',
      transitionError: message,
    });
  },

  prepareRetry: (token) => {
    const state = get();
    set({
      retryNonce: state.retryNonce + 1,
      devFailureMode: 'none',
      transitionPhase: 'loading',
      transitionError: null,
      transitionToken: token,
      mountAttemptedForTransition: false,
      saveOnNextCommit: true,
    });
  },

  prepareReturnToCommitted: (token) => {
    const state = get();
    const safeSceneId = state.committedSceneId;
    set({
      requestedSceneId: safeSceneId,
      retryNonce: state.retryNonce + 1,
      devFailureMode: 'none',
      transitionPhase: 'mounting',
      transitionError: null,
      transitionToken: token,
      mountAttemptedForTransition: true,
      saveOnNextCommit: false,
    });
    return safeSceneId;
  },

  recordStaleCallbackRejected: () => {
    set((state) => ({
      staleCallbacksRejected: state.staleCallbacksRejected + 1,
    }));
  },

  setDevFailureMode: (mode) => set({ devFailureMode: mode }),

  addPolaroid: (id) => {
    set((state) =>
      state.collectedPolaroids.includes(id)
        ? state
        : { collectedPolaroids: [...state.collectedPolaroids, id] }
    );
  },

  capturePolaroidAndSave: (id) => {
    const state = get();
    const isNew = !state.collectedPolaroids.includes(id);
    if (isNew) {
      const nextPolaroids = [...state.collectedPolaroids, id];
      const nextRank = Math.max(
        state.furthestChapterRank,
        inferChapterRank(
          state.committedSceneId,
          state.mountainRoadSegment,
          state.roadSubStage,
          nextPolaroids,
          state.baalKuwariSubStage
        )
      );
      set({ collectedPolaroids: nextPolaroids, furthestChapterRank: nextRank });
    }
    get().saveCheckpoint();
    return isNew;
  },

  showNarration: (entry) => {
    if (entry.lines.length === 0) return;
    set({ activeNarration: { entry, lineIndex: 0 } });
  },

  advanceNarration: () => {
    const current = get().activeNarration;
    if (!current) return;
    const nextIndex = current.lineIndex + 1;
    if (nextIndex >= current.entry.lines.length) {
      set({ activeNarration: null });
    } else {
      set({ activeNarration: { entry: current.entry, lineIndex: nextIndex } });
    }
  },

  closeNarration: () => set({ activeNarration: null }),

  setStairStepCount: (step) => set({ stairStepCount: Math.max(0, Math.round(step)) }),
  setMountainRoadSegment: (segment) =>
    set((state) => ({
      mountainRoadSegment: segment,
      furthestChapterRank: Math.max(
        state.furthestChapterRank,
        inferChapterRank(
          state.committedSceneId,
          segment,
          state.roadSubStage,
          state.collectedPolaroids,
          state.baalKuwariSubStage
        )
      ),
    })),
  setRoadSubStage: (subStage) =>
    set((state) => ({
      roadSubStage: subStage,
      furthestChapterRank: Math.max(
        state.furthestChapterRank,
        inferChapterRank(
          state.committedSceneId,
          state.mountainRoadSegment,
          subStage,
          state.collectedPolaroids,
          state.baalKuwariSubStage
        )
      ),
    })),
  setBaalKuwariSubStage: (subStage) =>
    set((state) => ({
      baalKuwariSubStage: subStage,
      furthestChapterRank: Math.max(
        state.furthestChapterRank,
        inferChapterRank(
          state.committedSceneId,
          state.mountainRoadSegment,
          state.roadSubStage,
          state.collectedPolaroids,
          subStage
        )
      ),
    })),
  setBaalKuwariStairDirection: (direction) => set({ baalKuwariStairDirection: direction }),
  setRoadResumeDistance: (distance) =>
    set({ roadResumeDistance: Math.max(LEAD_START_DISTANCE, distance) }),

  setUserPaused: (paused) => set({ userPaused: paused }),
  setTabHiddenPaused: (paused) => set({ tabHiddenPaused: paused }),
  setContextLostPaused: (lost) => set({ contextLostPaused: lost }),
  setModalPaused: (paused) => set({ modalPaused: paused }),

  toggleAudio: () => set((state) => ({ audioMuted: !state.audioMuted })),
  toggleGuidedMode: () => set((state) => ({ guidedMode: !state.guidedMode })),
  setQualityProfile: (profile) => set({ qualityProfile: profile }),

  downgradeQualityProfile: () => {
    set((state) => {
      if (state.qualityProfile === 'high') return { qualityProfile: 'balanced' };
      if (state.qualityProfile === 'balanced') return { qualityProfile: 'low' };
      return state;
    });
  },

  saveCheckpoint: () => {
    const state = get();
    const snapshot: CheckpointData = {
      version: CHECKPOINT_VERSION,
      committedSceneId: state.committedSceneId,
      collectedPolaroids: [...state.collectedPolaroids],
      stairStepCount: state.stairStepCount > 0 ? state.stairStepCount : undefined,
      baalKuwariStairDirection: state.baalKuwariStairDirection,
      mountainRoadSegment: state.mountainRoadSegment,
      roadSubStage: state.roadSubStage,
      baalKuwariSubStage: state.baalKuwariSubStage,
      roadResumeDistance: state.roadResumeDistance,
      audioMuted: state.audioMuted,
      guidedMode: state.guidedMode,
      timestamp: Date.now(),
    };

    const writeResult = writeCheckpointToStorage(snapshot);
    set({
      lastCheckpoint: snapshot,
      checkpointStorageBlocked: writeResult.storageUnavailable,
      checkpointStatusNote: writeResult.ok
        ? `Saved Scene ${snapshot.committedSceneId} at ${new Date(snapshot.timestamp).toLocaleTimeString()}`
        : `Session-only checkpoint (storage unavailable: ${writeResult.errorMessage ?? 'blocked'})`,
    });

    return snapshot;
  },

  restoreCheckpointSettings: (data) => {
    const seg = data.mountainRoadSegment ?? 'to_dhaba';
    const sub = data.roadSubStage ?? 'driving';
    const baalSub = data.baalKuwariSubStage ?? 'driving';
    set((state) => ({
      collectedPolaroids: [...data.collectedPolaroids],
      furthestChapterRank: Math.max(
        state.furthestChapterRank,
        inferChapterRank(data.committedSceneId, seg, sub, data.collectedPolaroids, baalSub)
      ),
      stairStepCount: data.stairStepCount ?? 0,
      baalKuwariStairDirection: data.baalKuwariStairDirection ?? 'ascent',
      mountainRoadSegment: seg,
      roadSubStage: sub,
      baalKuwariSubStage: baalSub,
      roadResumeDistance: data.roadResumeDistance ?? LEAD_START_DISTANCE,
      audioMuted: data.audioMuted,
      guidedMode: data.guidedMode,
      lastCheckpoint: data,
      pendingResumeCheckpoint: null,
      checkpointStatusNote: 'Saved progress restored',
    }));
  },

  hydrateCheckpointFromStorage: () => {
    const result = readCheckpointFromStorage();
    if (result.status === 'ok' && result.data) {
      const seg = result.data.mountainRoadSegment ?? 'to_dhaba';
      const sub = result.data.roadSubStage ?? 'driving';
      const baalSub = result.data.baalKuwariSubStage ?? 'driving';
      set((state) => ({
        collectedPolaroids: [...result.data!.collectedPolaroids],
        furthestChapterRank: Math.max(
          state.furthestChapterRank,
          inferChapterRank(
            result.data!.committedSceneId,
            seg,
            sub,
            result.data!.collectedPolaroids,
            baalSub
          )
        ),
        stairStepCount: result.data!.stairStepCount ?? 0,
        baalKuwariStairDirection: result.data!.baalKuwariStairDirection ?? 'ascent',
        baalKuwariSubStage: baalSub,
        audioMuted: result.data!.audioMuted,
        guidedMode: result.data!.guidedMode,
        lastCheckpoint: result.data,
        pendingResumeCheckpoint: result.data,
        checkpointStorageBlocked: false,
        checkpointStatusNote: 'Saved journey found',
      }));
      return result.data;
    }

    if (result.status === 'storage_unavailable') {
      set({
        checkpointStorageBlocked: true,
        pendingResumeCheckpoint: null,
        checkpointStatusNote:
          'Browser storage blocked; using safe in-memory session state.',
      });
    } else if (result.status === 'invalid') {
      set({
        pendingResumeCheckpoint: null,
        checkpointStatusNote: result.errorMessage,
      });
    } else {
      set({
        pendingResumeCheckpoint: null,
        checkpointStatusNote: null,
      });
    }
    return null;
  },

  dismissPendingResume: () => set({ pendingResumeCheckpoint: null }),

  clearCheckpoint: () => {
    const removed = clearCheckpointInStorage();
    set({
      lastCheckpoint: null,
      pendingResumeCheckpoint: null,
      collectedPolaroids: [],
      furthestChapterRank: 0,
      mountainRoadSegment: 'to_dhaba',
      roadSubStage: 'driving',
      baalKuwariSubStage: 'driving',
      baalKuwariStairDirection: 'ascent',
      roadResumeDistance: LEAD_START_DISTANCE,
      stairStepCount: 0,
      checkpointStatusNote: removed
        ? 'Cleared saved checkpoint'
        : 'Cleared in-memory checkpoint (storage unavailable)',
    });
  },
}));
