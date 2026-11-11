'use client';

import { useEffect, useMemo } from 'react';
import { selectIsSimulationPaused, useProgressStore } from '@/store/progressStore';

/** UI/story deadlines advance only while gameplay is running. No React updates per tick. */
export function useStoryTimers() {
  const queue = useMemo(() => {
    const timers = new Map<number, { remaining: number; at: number; callback: () => void }>();
    let nextId = 0;
    let frame: number | null = null;
    const isPaused = () => {
      const state = useProgressStore.getState();
      return selectIsSimulationPaused(state) || state.transitionPhase !== 'idle' ||
        (typeof document !== 'undefined' && document.hidden);
    };
    let paused = isPaused();

    const accountElapsed = (now: number) => {
      for (const timer of timers.values()) {
        if (!paused) timer.remaining -= now - timer.at;
        timer.at = now;
      }
      paused = isPaused();
    };
    const requestTick = () => {
      if (frame === null && timers.size > 0) frame = window.requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      frame = null;
      accountElapsed(now);
      if (!paused) {
        for (const [id, timer] of [...timers]) {
          if (timer.remaining <= 0 && timers.delete(id)) timer.callback();
          if (isPaused()) break;
        }
      }
      requestTick();
    };
    const setStoryTimeout = (callback: () => void, delay: number) => {
      const id = ++nextId;
      timers.set(id, { callback, remaining: delay, at: performance.now() });
      requestTick();
      return id;
    };
    const clearStoryTimeout = (id: number) => { timers.delete(id); };
    const clearStoryTimers = () => {
      timers.clear();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    };
    const sync = () => accountElapsed(performance.now());
    return { setStoryTimeout, clearStoryTimeout, clearStoryTimers, sync };
  }, []);

  useEffect(() => {
    queue.sync();
    const unsubscribe = useProgressStore.subscribe(queue.sync);
    document.addEventListener('visibilitychange', queue.sync);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', queue.sync);
      queue.clearStoryTimers();
    };
  }, [queue]);

  return queue;
}
