export type StoryWaypoint = readonly [x: number, y: number, z: number];

export function prayerBeatWeight(elapsed: number): number {
  const smooth = (v: number) => { const u = Math.max(0, Math.min(1, v)); return u * u * (3 - 2 * u); };
  return smooth((elapsed - 1.8) / 1.2) * (1 - smooth((elapsed - 5) / 1.2));
}

/** Constant-distance traversal keeps feet and pacing consistent through authored clear corridors. */
export function sampleStoryRoute(points: readonly StoryWaypoint[], distance: number) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (remaining <= length || i === points.length - 1) {
      const u = length ? Math.min(1, remaining / length) : 1;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u,
        z: a[2] + (b[2] - a[2]) * u, yaw: Math.atan2(a[0] - b[0], a[2] - b[2]),
        arrived: i === points.length - 1 && remaining >= length };
    }
    remaining -= length;
  }
  const end = points[0] ?? [0, 0, 0];
  return { x: end[0], y: end[1], z: end[2], yaw: 0, arrived: true };
}
