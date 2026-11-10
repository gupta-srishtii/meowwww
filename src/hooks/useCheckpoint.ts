'use client';

import { useCallback, useEffect } from 'react';
import type { CheckpointData } from '@/lib/checkpoint';
import type { SceneId } from '@/lib/sceneConfig';
import { useProgressStore } from '@/store/progressStore';

export function useCheckpoint(requestSceneTransition: (targetId: SceneId) => void) {
  const pendingResumeCheckpoint = useProgressStore((s) => s.pendingResumeCheckpoint);
  const lastCheckpoint = useProgressStore((s) => s.lastCheckpoint);
  const checkpointStorageBlocked = useProgressStore((s) => s.checkpointStorageBlocked);
  const checkpointStatusNote = useProgressStore((s) => s.checkpointStatusNote);

  const hydrateCheckpointFromStorage = useProgressStore((s) => s.hydrateCheckpointFromStorage);
  const restoreCheckpointSettings = useProgressStore((s) => s.restoreCheckpointSettings);
  const dismissPendingResume = useProgressStore((s) => s.dismissPendingResume);
  const saveCheckpoint = useProgressStore((s) => s.saveCheckpoint);
  const clearCheckpoint = useProgressStore((s) => s.clearCheckpoint);

  useEffect(() => {
    hydrateCheckpointFromStorage();
  }, [hydrateCheckpointFromStorage]);

  const continueFromCheckpoint = useCallback(
    (checkpoint?: CheckpointData | null) => {
      const target = checkpoint ?? useProgressStore.getState().pendingResumeCheckpoint;
      if (!target) return;

      restoreCheckpointSettings(target);
      const currentCommitted = useProgressStore.getState().committedSceneId;
      if (target.committedSceneId !== currentCommitted) {
        requestSceneTransition(target.committedSceneId);
      }
    },
    [requestSceneTransition, restoreCheckpointSettings]
  );

  const startFreshFromCheckpoint = useCallback(() => {
    clearCheckpoint();
    const currentCommitted = useProgressStore.getState().committedSceneId;
    if (currentCommitted !== 1) {
      requestSceneTransition(1);
    }
  }, [clearCheckpoint, requestSceneTransition]);

  return {
    pendingResumeCheckpoint,
    lastCheckpoint,
    checkpointStorageBlocked,
    checkpointStatusNote,
    continueFromCheckpoint,
    startFreshFromCheckpoint,
    dismissPendingResume,
    saveCheckpoint,
    clearCheckpoint,
  };
}

