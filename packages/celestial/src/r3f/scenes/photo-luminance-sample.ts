// Photo-luminance particle sampling. Treats the input image as a 2D
// probability density (bright pixels attract more particles than dark)
// and emits N samples via inverse-CDF rejection sampling. Seeded RNG
// (mulberry32) for reproducible distributions across re-renders.
//
// Pure module — no React, no Three. The call site (NebulaParticles)
// converts the variant's photo to ImageData once via canvas, calls
// `sampleParticles()`, and feeds the returned Float32Arrays into a
// bufferGeometry.

export interface ParticleBuffers {
  readonly positions: Float32Array; // length = count * 3 (vec3)
  readonly colors: Float32Array; // length = count * 3 (vec3, sRGB linear)
  readonly sizes: Float32Array; // length = count (per-particle size)
}

export interface SampleOptions {
  readonly count: number;
  readonly volumeRadius: number; // half-extent on x/y; z spans ±volumeRadius
  readonly jitterZ: number; // additional ±half-range on z beyond ±volumeRadius
  readonly baseSize: number; // base per-particle size
  readonly seed?: number; // RNG seed (default 1)
}

// mulberry32 — small, fast, deterministic.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// sRGB → linear-RGB conversion for accumulating in linear-light space.
function srgbToLinear(c: number): number {
  if (c <= 0.04045) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

export function sampleParticles(image: ImageData, options: SampleOptions): ParticleBuffers {
  const { count, volumeRadius, jitterZ, baseSize, seed = 1 } = options;
  const { width, height, data } = image;
  const pixelCount = width * height;

  // Build per-pixel luminance (Rec. 709). Stays in sRGB space for the CDF
  // — relative weights are what matter for sampling, not absolute values.
  const lum = new Float32Array(pixelCount);
  let totalLum = 0;
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4 + 0]! / 255;
    const g = data[i * 4 + 1]! / 255;
    const b = data[i * 4 + 2]! / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Bias slightly so true-black pixels still get a tiny chance of sampling
    // (avoids a hard cutoff that creates visible voids in dark photos).
    const biased = Math.max(l, 0.005);
    lum[i] = biased;
    totalLum += biased;
  }

  // Build CDF.
  const cdf = new Float32Array(pixelCount);
  let acc = 0;
  for (let i = 0; i < pixelCount; i++) {
    acc += lum[i]! / totalLum;
    cdf[i] = acc;
  }
  // Numerical safety: ensure last entry is exactly 1.0.
  cdf[pixelCount - 1] = 1.0;

  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let p = 0; p < count; p++) {
    // Inverse-CDF sample: binary-search for the pixel whose CDF entry
    // first exceeds u.
    const u = rand();
    let lo = 0;
    let hi = pixelCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cdf[mid]! < u) lo = mid + 1;
      else hi = mid;
    }
    const pixelIdx = lo;
    const px = pixelIdx % width;
    const py = (pixelIdx - px) / width;

    // Sub-pixel jitter so particles don't snap to integer grid.
    const fx = (px + rand()) / width; // 0..1
    const fy = (py + rand()) / height; // 0..1

    // Photo (u, v) → volume-local (x, y). Centered, [-radius, +radius].
    // Flip Y so the image's top-row pixels sit at +Y in 3D.
    const x = (fx - 0.5) * 2 * volumeRadius;
    const y = (0.5 - fy) * 2 * volumeRadius;

    // Random z in [-volumeRadius, +volumeRadius] plus user jitter.
    const z = (rand() - 0.5) * 2 * (volumeRadius + jitterZ);

    positions[p * 3 + 0] = x;
    positions[p * 3 + 1] = y;
    positions[p * 3 + 2] = z;

    // Linear-RGB color from the source pixel (so additive blending in
    // linear space gives correct results).
    const r = data[pixelIdx * 4 + 0]! / 255;
    const g = data[pixelIdx * 4 + 1]! / 255;
    const b = data[pixelIdx * 4 + 2]! / 255;
    colors[p * 3 + 0] = srgbToLinear(r);
    colors[p * 3 + 1] = srgbToLinear(g);
    colors[p * 3 + 2] = srgbToLinear(b);

    // Per-particle size variation (0.7..1.3 of base).
    sizes[p] = baseSize * (0.7 + rand() * 0.6);
  }

  return { positions, colors, sizes };
}

// Cached ImageData decoder. Drawing an HTMLImageElement to a canvas and
// reading pixels is ~5-15ms depending on size; cache the result by URL.
const imageDataCache = new Map<string, ImageData>();

export function decodeImageDataSync(image: HTMLImageElement, cacheKey: string): ImageData | null {
  const cached = imageDataCache.get(cacheKey);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;
  if (!image.complete || !image.naturalWidth) return null;

  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  try {
    const data = ctx.getImageData(0, 0, w, h);
    imageDataCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}
