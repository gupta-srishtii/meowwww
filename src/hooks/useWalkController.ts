'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface WalkBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type WalkObstacle =
  | {
      kind: 'circle';
      x: number;
      z: number;
      radius: number;
    }
  | {
      kind: 'box';
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    };

export interface WalkHotspot {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  actionType: 'interact' | 'photo';
}

export interface WalkInputState {
  moveX: number; // -1 left strafe, +1 right strafe
  moveZ: number; // +1 forward into camera look, -1 backward
  orbitYawDelta: number; // accumulated pointer drag radians
  orbitPitchDelta: number;
  orbitKey: number; // -1 Q/ArrowLeft, +1 R/ArrowRight
}

export interface UseWalkInputOptions {
  enabled: boolean;
  onInteractRequested?: () => void;
  onPhotoRequested?: () => void;
}

export const WALK_PLAYER_RADIUS = 0.38;
export const WALK_SPEED_MPS = 3.7;
export const WALK_KEY_ORBIT_SPEED = 1.65;

/**
 * Manages keyboard + multitouch walk inputs cleanly via refs with sticky-drag
 * and focus-loss guards so controls never remain stuck across UI modals or scenes.
 */
export function useWalkInput({
  enabled,
  onInteractRequested,
  onPhotoRequested,
}: UseWalkInputOptions) {
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const movePointerIdRef = useRef<number | null>(null);
  const dragPointerRef = useRef<{ pointerId: number | null; lastX: number; lastY: number }>({
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  const inputRef = useRef<WalkInputState>({
    moveX: 0,
    moveZ: 0,
    orbitYawDelta: 0,
    orbitPitchDelta: 0,
    orbitKey: 0,
  });

  const recomputeInput = useCallback(() => {
    const keys = pressedKeysRef.current;
    const keyZ =
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
      (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const keyX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const orbitKey =
      (keys.has('KeyR') || keys.has('ArrowRight') ? 1 : 0) -
      (keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);

    const rawX = keyX + touchMoveRef.current.x;
    const rawZ = keyZ + touchMoveRef.current.z;
    const mag = Math.hypot(rawX, rawZ);
    if (mag > 1) {
      inputRef.current.moveX = rawX / mag;
      inputRef.current.moveZ = rawZ / mag;
    } else {
      inputRef.current.moveX = rawX;
      inputRef.current.moveZ = rawZ;
    }
    inputRef.current.orbitKey = orbitKey;
  }, []);

  const clearAllWalkInputs = useCallback(() => {
    pressedKeysRef.current.clear();
    touchMoveRef.current.x = 0;
    touchMoveRef.current.z = 0;
    movePointerIdRef.current = null;
    dragPointerRef.current.pointerId = null;
    inputRef.current.moveX = 0;
    inputRef.current.moveZ = 0;
    inputRef.current.orbitYawDelta = 0;
    inputRef.current.orbitPitchDelta = 0;
    inputRef.current.orbitKey = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearAllWalkInputs();
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
        event.code === 'ArrowRight'
      ) {
        event.preventDefault();
      }

      if (!event.repeat) {
        if (event.code === 'KeyE' || event.code === 'Enter') {
          onInteractRequested?.();
          return;
        }
        if (event.code === 'KeyP') {
          onPhotoRequested?.();
          return;
        }
      }

      pressedKeysRef.current.add(event.code);
      recomputeInput();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code);
      recomputeInput();
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (dragPointerRef.current.pointerId === event.pointerId) {
        dragPointerRef.current.pointerId = null;
      }
      if (movePointerIdRef.current === event.pointerId) {
        movePointerIdRef.current = null;
        touchMoveRef.current.x = 0;
        touchMoveRef.current.z = 0;
        recomputeInput();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearAllWalkInputs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('blur', clearAllWalkInputs);
    window.addEventListener('pointercancel', clearAllWalkInputs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('blur', clearAllWalkInputs);
      window.removeEventListener('pointercancel', clearAllWalkInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllWalkInputs();
    };
  }, [clearAllWalkInputs, enabled, onInteractRequested, onPhotoRequested, recomputeInput]);

  const setWalkMoveTouch = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right' | 'release', active: boolean, pointerId: number) => {
      if (!enabled) return;
      if (active && dir !== 'release') {
        movePointerIdRef.current = pointerId;
        touchMoveRef.current.x = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
        touchMoveRef.current.z = dir === 'up' ? 1 : dir === 'down' ? -1 : 0;
      } else if (movePointerIdRef.current === null || movePointerIdRef.current === pointerId) {
        movePointerIdRef.current = null;
        touchMoveRef.current.x = 0;
        touchMoveRef.current.z = 0;
      }
      recomputeInput();
    },
    [enabled, recomputeInput]
  );

  const handleOrbitDragStart = useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      if (!enabled) return;
      if (movePointerIdRef.current === pointerId) return;
      dragPointerRef.current.pointerId = pointerId;
      dragPointerRef.current.lastX = clientX;
      dragPointerRef.current.lastY = clientY;
    },
    [enabled]
  );

  const handleOrbitDragMove = useCallback(
    (pointerId: number, clientX: number, clientY: number, buttons?: number, pointerType?: string) => {
      if (!enabled) return;
      if (pointerType === 'mouse' && buttons === 0) {
        if (dragPointerRef.current.pointerId === pointerId) {
          dragPointerRef.current.pointerId = null;
        }
        return;
      }
      if (dragPointerRef.current.pointerId !== pointerId) return;

      const dx = clientX - dragPointerRef.current.lastX;
      const dy = clientY - dragPointerRef.current.lastY;
      dragPointerRef.current.lastX = clientX;
      dragPointerRef.current.lastY = clientY;

      inputRef.current.orbitYawDelta -= dx * 0.0062;
      inputRef.current.orbitPitchDelta = THREE.MathUtils.clamp(
        inputRef.current.orbitPitchDelta + dy * 0.0042,
        -0.45,
        0.45
      );
    },
    [enabled]
  );

  const handleOrbitDragEnd = useCallback((pointerId: number) => {
    if (dragPointerRef.current.pointerId === pointerId) {
      dragPointerRef.current.pointerId = null;
    }
  }, []);

  return {
    walkInputRef: inputRef,
    clearAllWalkInputs,
    setWalkMoveTouch,
    handleOrbitDragStart,
    handleOrbitDragMove,
    handleOrbitDragEnd,
  };
}

/**
 * Clamps `(posX, posZ)` outside circular/box obstacles and inside walkable perimeter bounds.
 */
export function resolveWalkCollisions(
  pos: { posX: number; posZ: number },
  radius: number,
  bounds: WalkBounds,
  obstacles: readonly WalkObstacle[]
): void {
  for (let i = 0; i < obstacles.length; i += 1) {
    const obs = obstacles[i];
    if (obs.kind === 'circle') {
      const dx = pos.posX - obs.x;
      const dz = pos.posZ - obs.z;
      const minDist = obs.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist > 1e-4) {
          const push = (minDist - dist) / dist;
          pos.posX += dx * push;
          pos.posZ += dz * push;
        } else {
          pos.posZ += minDist;
        }
      }
    } else {
      const closestX = THREE.MathUtils.clamp(pos.posX, obs.minX, obs.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.posZ, obs.minZ, obs.maxZ);
      const dx = pos.posX - closestX;
      const dz = pos.posZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 1e-4) {
          const overlap = radius - dist;
          pos.posX += (dx / dist) * overlap;
          pos.posZ += (dz / dist) * overlap;
        } else {
          // Center fell inside AABB; push out along shortest axis.
          const penLeft = Math.abs(pos.posX - obs.minX);
          const penRight = Math.abs(obs.maxX - pos.posX);
          const penTop = Math.abs(pos.posZ - obs.minZ);
          const penBottom = Math.abs(obs.maxZ - pos.posZ);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) pos.posX = obs.minX - radius;
          else if (minPen === penRight) pos.posX = obs.maxX + radius;
          else if (minPen === penTop) pos.posZ = obs.minZ - radius;
          else pos.posZ = obs.maxZ + radius;
        }
      }
    }
  }

  pos.posX = THREE.MathUtils.clamp(pos.posX, bounds.minX, bounds.maxX);
  pos.posZ = THREE.MathUtils.clamp(pos.posZ, bounds.minZ, bounds.maxZ);
}

/**
 * Integrates one clamped delta-time walk step with velocity smoothing, clearing perimeter clamping,
 * and AABB/circle obstacle push-out. Returns actual displacement distance in meters.
 */
export function stepWalkSimulation(
  state: {
    posX: number;
    posZ: number;
    velX: number;
    velZ: number;
    facingYaw: number;
    orbitYaw: number;
    orbitPitch: number;
  },
  input: WalkInputState,
  delta: number,
  bounds: WalkBounds,
  obstacles: readonly WalkObstacle[]
): number {
  if (Math.abs(input.orbitKey) > 0.01) {
    state.orbitYaw -= input.orbitKey * WALK_KEY_ORBIT_SPEED * delta;
  }
  if (Math.abs(input.orbitYawDelta) > 1e-5) {
    state.orbitYaw += input.orbitYawDelta;
    input.orbitYawDelta = 0;
  }
  if (Math.abs(input.orbitPitchDelta) > 1e-5) {
    state.orbitPitch = THREE.MathUtils.clamp(state.orbitPitch + input.orbitPitchDelta, 0.2, 0.72);
    input.orbitPitchDelta = 0;
  }

  // Camera-relative movement direction in XZ plane
  const forwardX = -Math.sin(state.orbitYaw);
  const forwardZ = -Math.cos(state.orbitYaw);
  const rightX = Math.cos(state.orbitYaw);
  const rightZ = -Math.sin(state.orbitYaw);

  const worldDirX = forwardX * input.moveZ + rightX * input.moveX;
  const worldDirZ = forwardZ * input.moveZ + rightZ * input.moveX;
  const dirMag = Math.hypot(worldDirX, worldDirZ);

  let targetVx = 0;
  let targetVz = 0;
  if (dirMag > 0.02) {
    const nx = worldDirX / dirMag;
    const nz = worldDirZ / dirMag;
    const moveScale = Math.min(1, dirMag);
    targetVx = nx * WALK_SPEED_MPS * moveScale;
    targetVz = nz * WALK_SPEED_MPS * moveScale;
  }

  // Smooth acceleration & stop damping (prevents sudden start snaps or icy glide)
  state.velX = THREE.MathUtils.damp(state.velX, targetVx, 14.0, delta);
  state.velZ = THREE.MathUtils.damp(state.velZ, targetVz, 14.0, delta);
  if (dirMag <= 0.02 && Math.hypot(state.velX, state.velZ) < 0.04) {
    state.velX = 0;
    state.velZ = 0;
  }

  const speed = Math.hypot(state.velX, state.velZ);
  if (speed > 0.08) {
    const targetYaw = Math.atan2(-(state.velX / speed), -(state.velZ / speed));
    let angleDiff = targetYaw - state.facingYaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    state.facingYaw += angleDiff * (1 - Math.exp(-12 * delta));
  }

  const prevX = state.posX;
  const prevZ = state.posZ;
  state.posX += state.velX * delta;
  state.posZ += state.velZ * delta;

  resolveWalkCollisions(state, WALK_PLAYER_RADIUS, bounds, obstacles);

  return Math.hypot(state.posX - prevX, state.posZ - prevZ);
}

/**
 * Finds the nearest interactive hotspot within radius of `(posX, posZ)`.
 */
export function findNearestWalkHotspot(
  posX: number,
  posZ: number,
  hotspots: readonly WalkHotspot[]
): WalkHotspot | null {
  let nearest: WalkHotspot | null = null;
  let nearestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < hotspots.length; i += 1) {
    const spot = hotspots[i];
    const dx = posX - spot.x;
    const dz = posZ - spot.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= spot.radius * spot.radius && distSq < nearestDistSq) {
      nearest = spot;
      nearestDistSq = distSq;
    }
  }

  return nearest;
}
