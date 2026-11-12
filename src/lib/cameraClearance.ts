import type { WalkObstacle } from '@/hooks/useWalkController';

/** Shorten a follow-camera boom before it enters a solid footprint. */
export function constrainCameraBoom(
  eye: { x: number; y: number; z: number }, target: { x: number; y: number; z: number },
  obstacles: readonly WalkObstacle[], clearance = 0.18
): void {
  const dx = eye.x - target.x, dy = eye.y - target.y, dz = eye.z - target.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (clearance * 0.5)));
  for (let i = 1; i <= steps; i++) {
    const u = i / steps, x = target.x + dx * u, z = target.z + dz * u;
    const blocked = obstacles.some(o => o.kind === 'circle'
      ? Math.hypot(x - o.x, z - o.z) < o.radius + clearance
      : x > o.minX - clearance && x < o.maxX + clearance && z > o.minZ - clearance && z < o.maxZ + clearance);
    if (blocked) {
      const safe = Math.max(0, (i - 1) / steps);
      eye.x = target.x + dx * safe; eye.y = target.y + dy * safe; eye.z = target.z + dz * safe;
      return;
    }
  }
}
