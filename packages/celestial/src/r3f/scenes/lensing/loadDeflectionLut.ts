import * as THREE from 'three';

import lutUrl from '../../../assets/deflection-lut.bin?url';
import lutMeta from '../../../assets/deflection-lut.meta.json';

// Loads the precomputed Schwarzschild deflection LUT and uploads it to GPU as
// a 1D-style DataTexture (technically 2D with height=1; sampler2D in the shader).
//
// The LUT is baked offline by `packages/celestial/scripts/bake-deflection-lut.mjs`.
// See that script for the physics, the float layout, and the b-axis sampling.
//
// Module-cached: the LUT is fetched and uploaded at most once per page load.
// Concurrent callers get the same Promise. The new GravitationalLensingEffect
// runs in passthrough mode while the load is in flight, so the colophon mount
// is never blocked.

export interface DeflectionLut {
  readonly texture: THREE.DataTexture;
  readonly samples: number;
  readonly bMin: number;
  readonly bMax: number;
  readonly bCrit: number;
  readonly half: number;
}

let cached: Promise<DeflectionLut> | null = null;

export function loadDeflectionLut(): Promise<DeflectionLut> {
  if (cached) return cached;
  cached = (async () => {
    const res = await fetch(lutUrl);
    if (!res.ok) {
      throw new Error(`Failed to load deflection LUT: ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    const data = new Float32Array(buf);
    const expected = lutMeta.samples * lutMeta.channels;
    if (data.length !== expected) {
      throw new Error(
        `Deflection LUT size mismatch: got ${data.length} floats, expected ${expected}`,
      );
    }
    const texture = new THREE.DataTexture(
      data,
      lutMeta.samples,
      1,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return {
      texture,
      samples: lutMeta.samples,
      bMin: lutMeta.bMin,
      bMax: lutMeta.bMax,
      bCrit: lutMeta.bCrit,
      half: lutMeta.half,
    };
  })();
  return cached;
}

// Test hook — clears the cache so a unit/visual test can force a fresh fetch.
export function _resetDeflectionLutCache(): void {
  if (cached) {
    cached
      .then((lut) => lut.texture.dispose())
      .catch(() => {
        /* noop */
      });
  }
  cached = null;
}
