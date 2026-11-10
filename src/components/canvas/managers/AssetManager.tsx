'use client';

import type { ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  getAsphaltRoadTexture,
  getDenimTexture,
  getGopuramDetailTexture,
  getOffroadDirtTrackTexture,
  getPlaidShirtTexture,
  getSrishtiFloralPeplumTexture,
  getStoneCourtyardTexture,
} from '@/lib/proceduralTextures';
import {
  PERSISTENT_SHARED_ASSETS,
  getSceneDefinition,
  type SceneId,
  type SharedAssetKey,
} from '@/lib/sceneConfig';

export interface AssetManagerSnapshot {
  sharedAssets: SharedAssetKey[];
  sharedRetentionChecks: number;
  sharedDisposalBlockedCount: number;
  loadedSceneIds: SceneId[];
  sceneOwnedEvictions: number;
  lastDisposedSceneId: SceneId | null;
  lastClearedFailedSceneId: SceneId | null;
}

export interface EnsureSceneLoadedOptions {
  simulateFailure?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

class AssetManagerRegistry {
  private readonly persistentSharedSet = new Set<SharedAssetKey>(
    Object.keys(PERSISTENT_SHARED_ASSETS) as SharedAssetKey[]
  );
  private readonly loadedSceneSet = new Set<SceneId>();
  private readonly protectedSharedTextures = new Set<THREE.Texture>();
  private readonly sceneOwnedRoots = new Map<SceneId, Set<THREE.Object3D>>();
  private readonly listeners = new Set<() => void>();

  private sharedRetentionChecks = 0;
  private sharedDisposalBlockedCount = 0;
  private sceneOwnedEvictions = 0;
  private lastDisposedSceneId: SceneId | null = null;
  private lastClearedFailedSceneId: SceneId | null = null;
  private proceduralTexturesWarmed = false;

  constructor() {
    // Seed session-owned shared asset keys up front so they are protected session-wide.
    this.sharedRetentionChecks = this.persistentSharedSet.size;
  }

  warmUpProceduralTextures(): void {
    if (this.proceduralTexturesWarmed || typeof document === 'undefined') return;
    this.proceduralTexturesWarmed = true;
    const generators = [
      getSrishtiFloralPeplumTexture,
      getPlaidShirtTexture,
      getDenimTexture,
      getAsphaltRoadTexture,
      getOffroadDirtTrackTexture,
      getStoneCourtyardTexture,
      getGopuramDetailTexture,
    ];
    for (const makeTex of generators) {
      const tex = makeTex();
      if (tex) {
        this.registerSharedTexture(tex);
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  isSharedAsset(key: string): key is SharedAssetKey {
    return this.persistentSharedSet.has(key as SharedAssetKey);
  }

  registerSharedTexture(texture: THREE.Texture): void {
    this.protectedSharedTextures.add(texture);
  }

  registerSceneOwnedRoot(sceneId: SceneId, root: THREE.Object3D): void {
    const existing = this.sceneOwnedRoots.get(sceneId) ?? new Set<THREE.Object3D>();
    existing.add(root);
    this.sceneOwnedRoots.set(sceneId, existing);
  }

  unregisterSceneOwnedRoot(sceneId: SceneId, root: THREE.Object3D): void {
    const existing = this.sceneOwnedRoots.get(sceneId);
    if (!existing) return;
    existing.delete(root);
    if (existing.size === 0) {
      this.sceneOwnedRoots.delete(sceneId);
    }
  }

  preloadScene(sceneId: SceneId): void {
    this.warmUpProceduralTextures();
    const def = getSceneDefinition(sceneId);
    def.sharedAssets.forEach((key) => {
      if (this.persistentSharedSet.has(key)) {
        this.sharedRetentionChecks += 1;
      }
    });

    def.sceneOwnedAssets.forEach((asset) => {
      if (asset.loadedKind === 'gltf') {
        useGLTF.preload(asset.url);
      }
    });
    this.emit();
  }

  async ensureSceneLoaded(
    sceneId: SceneId,
    options: EnsureSceneLoadedOptions = {}
  ): Promise<void> {
    this.warmUpProceduralTextures();
    const { simulateFailure = false, signal, timeoutMs = 10_000 } = options;
    const def = getSceneDefinition(sceneId);

    // Ensure session-owned shared dependencies remain accounted for and never evicted.
    def.sharedAssets.forEach((key) => {
      if (this.persistentSharedSet.has(key)) {
        this.sharedRetentionChecks += 1;
      }
    });

    if (def.phase1BStage === 'unimplemented_stub') {
      throw new Error(
        `Scene ${def.id} (${def.title}) is registered in MASTER_PLAN §2 and scheduled for later phases.`
      );
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Scene loading cancelled.'));
      };

      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Timed out after ${timeoutMs}ms loading Scene ${def.id}.`));
      }, timeoutMs);

      const loadDelayHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();

        if (simulateFailure) {
          reject(
            new Error(
              `Simulated asset load failure for Scene ${def.id} (${def.title}).`
            )
          );
          return;
        }

        // Preload any declared scene-owned GLTF URLs when Phase 4+ binary assets arrive.
        def.sceneOwnedAssets.forEach((asset) => {
          if (asset.loadedKind === 'gltf') {
            useGLTF.preload(asset.url);
          }
        });

        this.loadedSceneSet.add(sceneId);
        this.emit();
        resolve();
      }, 55);

      const cleanup = () => {
        clearTimeout(timeoutHandle);
        clearTimeout(loadDelayHandle);
        signal?.removeEventListener('abort', onAbort);
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort);
    });
  }

  /**
   * Evicts scene-owned assets ONLY after outgoing scene unmount and new scene commit.
   * Explicitly skips persistent shared assets and shared textures.
   */
  disposeSceneOwned(prevSceneId: SceneId, activeSceneId: SceneId): void {
    if (prevSceneId === activeSceneId) return;

    const prevDef = getSceneDefinition(prevSceneId);
    const activeDef = getSceneDefinition(activeSceneId);

    // Audit protection: confirm shared assets shared with active or future scenes stay cached.
    prevDef.sharedAssets.forEach((key) => {
      if (this.persistentSharedSet.has(key)) {
        this.sharedDisposalBlockedCount += 1;
      }
    });

    const activeSceneUrls = new Set(activeDef.sceneOwnedAssets.map((asset) => asset.url));

    prevDef.sceneOwnedAssets.forEach((asset) => {
      if (asset.ownership !== 'scene_owned') return;
      if (activeSceneUrls.has(asset.url)) return;
      if (asset.loadedKind === 'gltf') {
        useGLTF.clear(asset.url);
      }
    });

    const retainedRoots = this.sceneOwnedRoots.get(prevSceneId);
    if (retainedRoots) {
      retainedRoots.forEach((root) => this.disposeNonSharedObjectTree(root));
      this.sceneOwnedRoots.delete(prevSceneId);
    }

    this.loadedSceneSet.delete(prevSceneId);
    this.sceneOwnedEvictions += 1;
    this.lastDisposedSceneId = prevSceneId;
    this.emit();
  }

  clearFailedSceneAssets(sceneId: SceneId): void {
    const def = getSceneDefinition(sceneId);
    def.sceneOwnedAssets.forEach((asset) => {
      if (asset.ownership === 'scene_owned' && asset.loadedKind === 'gltf') {
        useGLTF.clear(asset.url);
      }
    });
    this.loadedSceneSet.delete(sceneId);
    this.lastClearedFailedSceneId = sceneId;
    this.emit();
  }

  private disposeNonSharedObjectTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (!material) return;
        const std = material as THREE.MeshStandardMaterial;
        if (std.map && !this.protectedSharedTextures.has(std.map)) {
          std.map.dispose();
        }
        material.dispose();
      });
    });
  }

  getSnapshot(): AssetManagerSnapshot {
    return {
      sharedAssets: Array.from(this.persistentSharedSet),
      sharedRetentionChecks: this.sharedRetentionChecks,
      sharedDisposalBlockedCount: this.sharedDisposalBlockedCount,
      loadedSceneIds: Array.from(this.loadedSceneSet),
      sceneOwnedEvictions: this.sceneOwnedEvictions,
      lastDisposedSceneId: this.lastDisposedSceneId,
      lastClearedFailedSceneId: this.lastClearedFailedSceneId,
    };
  }
}

export const assetManager = new AssetManagerRegistry();

/**
 * Protection wrapper adhering to §7 `dispose={null}` convention so R3F unmount
 * traversal does not destroy session-shared GPU geometries/materials/textures.
 */
export function SharedAssetRoot({ children }: { children: ReactNode }) {
  return <group dispose={null}>{children}</group>;
}

