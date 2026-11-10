import type {
  MountainRoadSegmentId,
  MountainRoadSubStage,
} from '@/lib/mountainSpline';
import { isValidSceneId, type SceneId } from '@/lib/sceneConfig';

export const CHECKPOINT_STORAGE_KEY = 'road_made_us_family_checkpoint';
export const CHECKPOINT_VERSION = 2;

export interface CheckpointData {
  version: number;
  committedSceneId: SceneId;
  collectedPolaroids: string[];
  stairStepCount?: number;
  mountainRoadSegment?: MountainRoadSegmentId;
  roadSubStage?: MountainRoadSubStage;
  roadResumeDistance?: number;
  audioMuted: boolean;
  guidedMode: boolean;
  timestamp: number;
}

export interface CheckpointReadResult {
  status: 'ok' | 'missing' | 'invalid' | 'storage_unavailable';
  data: CheckpointData | null;
  errorMessage: string | null;
}

export interface CheckpointWriteResult {
  ok: boolean;
  storageUnavailable: boolean;
  errorMessage: string | null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Strictly validates an untrusted parsed value against CheckpointData v2.
 */
export function validateCheckpointData(raw: unknown): CheckpointData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.version !== CHECKPOINT_VERSION) {
    return null;
  }
  if (!isValidSceneId(candidate.committedSceneId)) {
    return null;
  }
  if (!isStringArray(candidate.collectedPolaroids)) {
    return null;
  }
  if (
    candidate.stairStepCount !== undefined &&
    (typeof candidate.stairStepCount !== 'number' ||
      !Number.isFinite(candidate.stairStepCount) ||
      candidate.stairStepCount < 0)
  ) {
    return null;
  }
  if (
    candidate.mountainRoadSegment !== undefined &&
    candidate.mountainRoadSegment !== 'to_dhaba' &&
    candidate.mountainRoadSegment !== 'to_neelkanth'
  ) {
    return null;
  }
  if (
    candidate.roadSubStage !== undefined &&
    candidate.roadSubStage !== 'driving' &&
    candidate.roadSubStage !== 'viewpoint_walk'
  ) {
    return null;
  }
  if (
    candidate.roadResumeDistance !== undefined &&
    (typeof candidate.roadResumeDistance !== 'number' ||
      !Number.isFinite(candidate.roadResumeDistance) ||
      candidate.roadResumeDistance < 0)
  ) {
    return null;
  }
  if (typeof candidate.audioMuted !== 'boolean' || typeof candidate.guidedMode !== 'boolean') {
    return null;
  }
  if (
    typeof candidate.timestamp !== 'number' ||
    !Number.isFinite(candidate.timestamp) ||
    candidate.timestamp <= 0
  ) {
    return null;
  }

  return {
    version: CHECKPOINT_VERSION,
    committedSceneId: candidate.committedSceneId,
    collectedPolaroids: [...candidate.collectedPolaroids],
    stairStepCount: candidate.stairStepCount,
    mountainRoadSegment: candidate.mountainRoadSegment,
    roadSubStage: candidate.roadSubStage,
    roadResumeDistance: candidate.roadResumeDistance,
    audioMuted: candidate.audioMuted,
    guidedMode: candidate.guidedMode,
    timestamp: candidate.timestamp,
  };
}

/**
 * Reads and validates checkpoint JSON from localStorage with safe fallbacks.
 * Discards corrupt/unsupported payloads without crashing the session.
 */
export function readCheckpointFromStorage(): CheckpointReadResult {
  if (typeof window === 'undefined') {
    return { status: 'missing', data: null, errorMessage: null };
  }

  let rawText: string | null = null;
  try {
    rawText = window.localStorage.getItem(CHECKPOINT_STORAGE_KEY);
  } catch (error) {
    return {
      status: 'storage_unavailable',
      data: null,
      errorMessage: error instanceof Error ? error.message : 'localStorage access blocked.',
    };
  }

  if (rawText === null || rawText.trim() === '') {
    return { status: 'missing', data: null, errorMessage: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    clearCheckpointInStorage();
    return {
      status: 'invalid',
      data: null,
      errorMessage: 'Corrupt checkpoint JSON was discarded cleanly.',
    };
  }

  const validated = validateCheckpointData(parsed);
  if (!validated) {
    clearCheckpointInStorage();
    return {
      status: 'invalid',
      data: null,
      errorMessage: 'Incompatible or invalid checkpoint version was discarded cleanly.',
    };
  }

  return {
    status: 'ok',
    data: validated,
    errorMessage: null,
  };
}

/**
 * Serializes a verified checkpoint inside a guarded try/catch block.
 * Degrades silently to in-memory session state if storage is blocked or full.
 */
export function writeCheckpointToStorage(data: CheckpointData): CheckpointWriteResult {
  if (typeof window === 'undefined') {
    return { ok: false, storageUnavailable: true, errorMessage: 'No browser storage context.' };
  }

  try {
    window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(data));
    return { ok: true, storageUnavailable: false, errorMessage: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to write checkpoint to localStorage.';
    return {
      ok: false,
      storageUnavailable: true,
      errorMessage: message,
    };
  }
}

export function clearCheckpointInStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

