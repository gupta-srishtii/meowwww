import type * as THREE from 'three';

export interface TerrainMeshSampler {
  sampleY: (worldX: number, worldZ: number, fallbackY?: number) => number;
  trySampleY: (worldX: number, worldZ: number) => number | null;
}

interface IndexedTriangle {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  cx: number;
  cy: number;
  cz: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Exact 2D XZ triangle query + barycentric Y interpolation built directly from rendered
 * `BufferGeometry` vertices and indices so trees, bushes, boulders, and signage never
 * float above coarse triangles or height-function discontinuities.
 */
export function createTerrainMeshSampler(
  geometries: readonly THREE.BufferGeometry[],
  cellSize = 3.5
): TerrainMeshSampler {
  const triangles: IndexedTriangle[] = [];
  const buckets = new Map<string, number[]>();

  for (let g = 0; g < geometries.length; g += 1) {
    const geom = geometries[g];
    const pos = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos) continue;

    const index = geom.getIndex();
    const triCount = index ? Math.floor(index.count / 3) : Math.floor(pos.count / 3);

    for (let t = 0; t < triCount; t += 1) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const ax = pos.getX(i0);
      const ay = pos.getY(i0);
      const az = pos.getZ(i0);
      const bx = pos.getX(i1);
      const by = pos.getY(i1);
      const bz = pos.getZ(i1);
      const cx = pos.getX(i2);
      const cy = pos.getY(i2);
      const cz = pos.getZ(i2);

      // Skip degenerate zero-area XZ triangles
      const area2D = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(area2D) < 1e-6) continue;

      const minX = Math.min(ax, bx, cx);
      const maxX = Math.max(ax, bx, cx);
      const minZ = Math.min(az, bz, cz);
      const maxZ = Math.max(az, bz, cz);

      const triIndex = triangles.length;
      triangles.push({ ax, ay, az, bx, by, bz, cx, cy, cz, minX, maxX, minZ, maxZ });

      const cMinX = Math.floor(minX / cellSize);
      const cMaxX = Math.floor(maxX / cellSize);
      const cMinZ = Math.floor(minZ / cellSize);
      const cMaxZ = Math.floor(maxZ / cellSize);

      for (let gx = cMinX; gx <= cMaxX; gx += 1) {
        for (let gz = cMinZ; gz <= cMaxZ; gz += 1) {
          const key = `${gx},${gz}`;
          let list = buckets.get(key);
          if (!list) {
            list = [];
            buckets.set(key, list);
          }
          list.push(triIndex);
        }
      }
    }
  }

  const trySampleY = (worldX: number, worldZ: number): number | null => {
    const gx = Math.floor(worldX / cellSize);
    const gz = Math.floor(worldZ / cellSize);
    const list = buckets.get(`${gx},${gz}`);
    if (!list) return null;

    let bestY: number | null = null;

    for (let i = 0; i < list.length; i += 1) {
      const tri = triangles[list[i]];
      if (
        worldX < tri.minX - 1e-3 ||
        worldX > tri.maxX + 1e-3 ||
        worldZ < tri.minZ - 1e-3 ||
        worldZ > tri.maxZ + 1e-3
      ) {
        continue;
      }

      const v0x = tri.cx - tri.ax;
      const v0z = tri.cz - tri.az;
      const v1x = tri.bx - tri.ax;
      const v1z = tri.bz - tri.az;
      const v2x = worldX - tri.ax;
      const v2z = worldZ - tri.az;

      const dot00 = v0x * v0x + v0z * v0z;
      const dot01 = v0x * v1x + v0z * v1z;
      const dot02 = v0x * v2x + v0z * v2z;
      const dot11 = v1x * v1x + v1z * v1z;
      const dot12 = v1x * v2x + v1z * v2z;

      const denom = dot00 * dot11 - dot01 * dot01;
      if (Math.abs(denom) < 1e-8) continue;

      const invDenom = 1 / denom;
      const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
      const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

      if (u >= -1.5e-3 && v >= -1.5e-3 && u + v <= 1.0015) {
        const clampedU = Math.max(0, Math.min(1, u));
        const clampedV = Math.max(0, Math.min(1 - clampedU, v));
        const w = 1 - clampedU - clampedV;
        const y = w * tri.ay + clampedV * tri.by + clampedU * tri.cy;
        if (bestY === null || y > bestY) {
          bestY = y;
        }
      }
    }

    return bestY;
  };

  return {
    trySampleY,
    sampleY: (worldX: number, worldZ: number, fallbackY = 0) => {
      const sampled = trySampleY(worldX, worldZ);
      return sampled !== null ? sampled : fallbackY;
    },
  };
}
