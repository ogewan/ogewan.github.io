// Multi-layer cloud system. The single legacy earth-clouds-2k.webp is replaced
// by a pool of up to 9 author-supplied equirectangular cloud maps under
// packages/celestial/src/textures/clouds/. At session start the EarthScene
// picks 2 or 3 (1 in degraded quality) at random and renders each as its own
// transparent sphere co-radial at 1.005, drifting at a slightly different rate
// so the composite reads as layered atmosphere rather than a rigid skin.
//
// Module-level mutable state (same pattern as earth-rotation-rate.ts /
// earth-cloud-rate.ts): the current session's pick is captured on first call
// to pickCloudLayers and surfaced via getCloudLayerSnapshot for the dev
// console. Drift-rate variance is sampled once at pick-time so frame-by-frame
// reads stay stable.

import { getCloudDriftRate } from './earth-cloud-rate.js';

// Vite glob: collects every cloud-NN.webp the author has dropped into the
// clouds/ subdirectory. Until at least one file exists, this resolves to an
// empty object and the cloud system renders nothing.
const _cloudModules = import.meta.glob('./textures/clouds/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const CLOUD_TEXTURE_URLS: readonly string[] = Object.keys(_cloudModules)
  .sort()
  .map((k) => _cloudModules[k]!);

export interface CloudLayerSpec {
  readonly url: string;
  readonly driftRate: number;
  // 2D noise offset captured per layer so the shader's coverage / detail fbm
  // sampling produces a different mask per layer — layers won't clear and
  // cover the same regions in lockstep.
  readonly seed: readonly [number, number];
}

let _snapshot: readonly CloudLayerSpec[] = [];

export function pickCloudLayers(opts: { degraded: boolean }): CloudLayerSpec[] {
  if (CLOUD_TEXTURE_URLS.length === 0) {
    _snapshot = [];
    return [];
  }
  const n = opts.degraded ? 1 : Math.random() < 0.5 ? 2 : 3;
  const count = Math.min(n, CLOUD_TEXTURE_URLS.length);
  // Fisher–Yates partial shuffle for the first `count` indices.
  const indices = CLOUD_TEXTURE_URLS.map((_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  const base = getCloudDriftRate();
  const layers: CloudLayerSpec[] = indices.slice(0, count).map((idx) => ({
    url: CLOUD_TEXTURE_URLS[idx]!,
    // 70–130% of base; sign preserved so all layers co-rotate.
    driftRate: base * (0.7 + Math.random() * 0.6),
    // Large random offset into noise space so each layer samples a distinct
    // region of the fbm field — no shared coverage holes across layers.
    seed: [Math.random() * 100, Math.random() * 100],
  }));
  _snapshot = layers;
  return layers;
}

export function getCloudLayerDriftRate(idx: number): number {
  return _snapshot[idx]?.driftRate ?? getCloudDriftRate();
}

export function getCloudLayerSnapshot(): readonly CloudLayerSpec[] {
  return _snapshot;
}
