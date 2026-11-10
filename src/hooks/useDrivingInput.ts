'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface DrivingInputState {
  throttle: number;
  brake: number;
  steer: number; // -1 (left) to +1 (right)
}

interface TouchFlags {
  steerLeft: boolean;
  steerRight: boolean;
  gas: boolean;
  brake: boolean;
}

export function useDrivingInput(onResetRequested?: () => void, enabled = true) {
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchFlagsRef = useRef<TouchFlags>({
    steerLeft: false,
    steerRight: false,
    gas: false,
    brake: false,
  });

  // Independent multitouch pointerId ownership (§4 rule)
  const movePointerIdRef = useRef<number | null>(null);
  const actionPointerIdRef = useRef<number | null>(null);

  const inputRef = useRef<DrivingInputState>({
    throttle: 0,
    brake: 0,
    steer: 0,
  });

  const recomputeInput = useCallback(() => {
    const keys = pressedKeysRef.current;
    const touch = touchFlagsRef.current;

    const throttleActive = keys.has('KeyW') || keys.has('ArrowUp') || touch.gas;
    const brakeActive = keys.has('KeyS') || keys.has('ArrowDown') || touch.brake;
    const leftActive = keys.has('KeyA') || keys.has('ArrowLeft') || touch.steerLeft;
    const rightActive = keys.has('KeyD') || keys.has('ArrowRight') || touch.steerRight;

    inputRef.current.throttle = throttleActive ? 1 : 0;
    inputRef.current.brake = brakeActive ? 1 : 0;
    inputRef.current.steer = (rightActive ? 1 : 0) - (leftActive ? 1 : 0);
  }, []);

  const clearAllInputs = useCallback(() => {
    pressedKeysRef.current.clear();
    touchFlagsRef.current.steerLeft = false;
    touchFlagsRef.current.steerRight = false;
    touchFlagsRef.current.gas = false;
    touchFlagsRef.current.brake = false;
    movePointerIdRef.current = null;
    actionPointerIdRef.current = null;
    inputRef.current.throttle = 0;
    inputRef.current.brake = 0;
    inputRef.current.steer = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearAllInputs();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') {
        return;
      }

      if (
        event.code === 'ArrowUp' ||
        event.code === 'ArrowDown' ||
        event.code === 'ArrowLeft' ||
        event.code === 'ArrowRight' ||
        event.code === 'Space'
      ) {
        event.preventDefault();
      }

      if (event.code === 'KeyR' && !event.repeat) {
        onResetRequested?.();
        return;
      }

      pressedKeysRef.current.add(event.code);
      recomputeInput();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code);
      recomputeInput();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearAllInputs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAllInputs);
    window.addEventListener('pointercancel', clearAllInputs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      window.removeEventListener('pointercancel', clearAllInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllInputs();
    };
  }, [clearAllInputs, enabled, onResetRequested, recomputeInput]);

  const setMoveZoneControl = useCallback(
    (side: 'left' | 'right', active: boolean, pointerId: number) => {
      if (active) {
        movePointerIdRef.current = pointerId;
        touchFlagsRef.current.steerLeft = side === 'left';
        touchFlagsRef.current.steerRight = side === 'right';
      } else if (movePointerIdRef.current === null || movePointerIdRef.current === pointerId) {
        movePointerIdRef.current = null;
        if (side === 'left') touchFlagsRef.current.steerLeft = false;
        if (side === 'right') touchFlagsRef.current.steerRight = false;
      }
      recomputeInput();
    },
    [recomputeInput]
  );

  const setActionZoneControl = useCallback(
    (pedal: 'gas' | 'brake', active: boolean, pointerId: number) => {
      if (active) {
        actionPointerIdRef.current = pointerId;
        touchFlagsRef.current.gas = pedal === 'gas';
        touchFlagsRef.current.brake = pedal === 'brake';
      } else if (actionPointerIdRef.current === null || actionPointerIdRef.current === pointerId) {
        actionPointerIdRef.current = null;
        if (pedal === 'gas') touchFlagsRef.current.gas = false;
        if (pedal === 'brake') touchFlagsRef.current.brake = false;
      }
      recomputeInput();
    },
    [recomputeInput]
  );

  return {
    inputRef,
    clearAllInputs,
    setMoveZoneControl,
    setActionZoneControl,
  };
}

