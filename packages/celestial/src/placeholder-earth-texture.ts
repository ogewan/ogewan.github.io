import * as THREE from 'three';

// Procedural placeholder for the day/night maps. Generated once in a hidden
// 1024×512 <canvas> at module init, then exposed as THREE.CanvasTexture for
// the EarthScene shader to sample like any other equirectangular texture.
//
// Continent outlines are heavily simplified — landmass shapes are 8-12-vertex
// polygons. Good enough to read as "Earth" at backdrop scale; will be
// replaced when the real NASA Blue Marble webps are dropped into
// `packages/celestial/src/textures/`.
//
// Two textures, same continent geometry, different palettes: day uses
// saturated green/blue, night uses dimmer green and near-black ocean so the
// terminator still reads cleanly when the lambert dims the day side.

const TEX_WIDTH = 1024;
const TEX_HEIGHT = 512;

interface Palette {
  ocean: string;
  land: string;
}

const DAY_PALETTE: Palette = { ocean: '#1e4f6b', land: '#3a8f4a' };
const NIGHT_PALETTE: Palette = { ocean: '#0a1828', land: '#142a18' };

// Equirectangular projection: u=0 → lng=-180, u=1 → lng=+180, v=0 → lat=+90,
// v=1 → lat=-90. Wraps horizontally so polygons that cross the antimeridian
// must be split — we keep all continent outlines firmly within (-180, 180).
function project(lng: number, lat: number): [number, number] {
  return [((lng + 180) / 360) * TEX_WIDTH, ((90 - lat) / 180) * TEX_HEIGHT];
}

// Continent polygons in (lng, lat). Hand-traced approximations — placeholder
// data, not navigation. Each row is one continent outline, drawn as a closed
// fill on the canvas.
const CONTINENTS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  // Eurasia (Western Europe → Siberia → SE Asia → India → Middle East → back)
  [
    [-10, 36],
    [-9, 43],
    [-5, 48],
    [3, 50],
    [10, 54],
    [10, 65],
    [25, 71],
    [55, 72],
    [80, 75],
    [110, 73],
    [140, 73],
    [170, 70],
    [180, 65],
    [170, 60],
    [155, 50],
    [140, 45],
    [130, 42],
    [125, 38],
    [122, 30],
    [110, 22],
    [108, 12],
    [102, 5],
    [97, 16],
    [88, 22],
    [82, 12],
    [78, 8],
    [72, 18],
    [66, 25],
    [55, 25],
    [52, 30],
    [44, 36],
    [35, 36],
    [30, 36],
    [22, 38],
    [12, 38],
  ],
  // North America
  [
    [-168, 65],
    [-160, 70],
    [-130, 70],
    [-100, 72],
    [-78, 74],
    [-65, 60],
    [-55, 50],
    [-65, 45],
    [-78, 40],
    [-80, 30],
    [-82, 25],
    [-92, 17],
    [-100, 16],
    [-108, 23],
    [-115, 30],
    [-125, 40],
    [-135, 55],
    [-150, 60],
    [-168, 64],
  ],
  // Greenland
  [
    [-55, 83],
    [-22, 83],
    [-15, 75],
    [-30, 65],
    [-50, 60],
    [-58, 75],
  ],
  // South America
  [
    [-80, 12],
    [-65, 12],
    [-50, 5],
    [-35, -5],
    [-38, -22],
    [-55, -34],
    [-65, -55],
    [-72, -52],
    [-72, -30],
    [-77, -10],
    [-80, 0],
    [-80, 12],
  ],
  // Africa
  [
    [-17, 35],
    [10, 36],
    [22, 32],
    [33, 32],
    [40, 14],
    [50, 12],
    [52, 0],
    [42, -10],
    [40, -25],
    [25, -34],
    [17, -34],
    [10, -5],
    [-2, 4],
    [-10, 6],
    [-17, 14],
    [-17, 25],
  ],
  // Australia
  [
    [113, -15],
    [135, -12],
    [145, -12],
    [153, -25],
    [148, -38],
    [135, -38],
    [120, -34],
    [114, -22],
  ],
  // Antarctica (single horizontal strip — the pole wraps off-screen anyway)
  [
    [-180, -65],
    [180, -65],
    [180, -90],
    [-180, -90],
  ],
  // Madagascar
  [
    [44, -12],
    [50, -16],
    [50, -25],
    [44, -25],
    [44, -12],
  ],
  // British Isles
  [
    [-7, 58],
    [-2, 59],
    [2, 53],
    [-5, 50],
    [-7, 54],
  ],
  // Japan
  [
    [140, 41],
    [146, 44],
    [142, 35],
    [136, 34],
    [138, 36],
    [140, 41],
  ],
  // Indonesia / Borneo / Java cluster
  [
    [95, 6],
    [105, 6],
    [115, 5],
    [120, 5],
    [125, 0],
    [120, -3],
    [110, -7],
    [100, -3],
    [95, 0],
  ],
  [
    [126, -5],
    [142, -3],
    [140, -8],
    [130, -10],
    [126, -8],
  ],
];

function drawContinent(ctx: CanvasRenderingContext2D, poly: ReadonlyArray<[number, number]>): void {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const pt = poly[i];
    if (!pt) continue;
    const [x, y] = project(pt[0], pt[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function buildTexture(palette: Palette): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_WIDTH;
  canvas.height = TEX_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // 2D context unavailable (very rare). Return a 1×1 ocean-colored data
    // texture so the shader still has something to sample.
    const fallback = new THREE.DataTexture(new Uint8Array([30, 79, 107, 255]), 1, 1);
    fallback.needsUpdate = true;
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback as unknown as THREE.CanvasTexture;
  }

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

  ctx.fillStyle = palette.land;
  for (const poly of CONTINENTS) {
    drawContinent(ctx, poly);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Flat-color CanvasTexture. Small canvas (the texture is never sampled
// visibly when its purpose is to keep a sampler complete) configured the same
// way buildTexture() configures its output, so it drops into any sampler slot
// without driver-specific behavior differences.
function buildFlatTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.DataTexture(new Uint8Array([204, 205, 208, 255]), 1, 1);
    fallback.needsUpdate = true;
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback as unknown as THREE.CanvasTexture;
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makePlaceholderEarthTextures(): {
  day: THREE.CanvasTexture;
  night: THREE.CanvasTexture;
  moon: THREE.CanvasTexture;
} {
  return {
    day: buildTexture(DAY_PALETTE),
    night: buildTexture(NIGHT_PALETTE),
    // Flat gray matching the moon shader's baseColor (#cccdd0). Never visible
    // in procedural mode (useMap=0 selects baseColor in GLSL); exists so the
    // moonMap sampler is always backed by a renderable texture, avoiding the
    // incomplete-sampler state that bound the moon to a draw-call-broken
    // texture when seeded with an image-less `new THREE.Texture()`.
    moon: buildFlatTexture('#cccdd0'),
  };
}

// ---------------------------------------------------------------------------
// Procedural cloud texture — multi-octave value noise
// ---------------------------------------------------------------------------
// A pre-baked 48×32 grid of random values (LCG, seed 0xdeadbeef) is sampled
// at 5 octaves with asymmetric UV frequencies (freqU >> freqV) to produce
// horizontally-elongated cloud formations that resemble real cloud systems.
// NOISE_W=48 is chosen so every freqU (3,6,12,24,48) divides it exactly,
// giving perfect seamless tiling in the horizontal (longitude) direction.

const NOISE_W = 48;
const NOISE_H = 32;

const _noiseGrid: Float32Array = (() => {
  const g = new Float32Array(NOISE_W * NOISE_H);
  let s = 0xdeadbeef;
  for (let i = 0; i < g.length; i++) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    g[i] = s / 0xffffffff;
  }
  return g;
})();

// Bilinear value noise — wraps horizontally (seamless longitude), open vertically.
function _vnoise(fx: number, fy: number): number {
  const xi = Math.floor(fx) | 0;
  const yi = Math.floor(fy) | 0;
  const xf = fx - xi;
  const yf = fy - yi;
  const u = xf * xf * (3 - 2 * xf); // smoothstep
  const v = yf * yf * (3 - 2 * yf);
  const x0 = xi % NOISE_W;
  const x1 = (xi + 1) % NOISE_W;
  const y0 = Math.min(yi, NOISE_H - 1);
  const y1 = Math.min(yi + 1, NOISE_H - 1);
  const n00 = _noiseGrid[y0 * NOISE_W + x0] ?? 0;
  const n10 = _noiseGrid[y0 * NOISE_W + x1] ?? 0;
  const n01 = _noiseGrid[y1 * NOISE_W + x0] ?? 0;
  const n11 = _noiseGrid[y1 * NOISE_W + x1] ?? 0;
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

// Five octaves; horizontal frequency 2× vertical → elongated cloud bands.
function _cloudDensity(tu: number, tv: number): number {
  return (
    _vnoise(tu * 3, tv * 1.5) * 0.45 +
    _vnoise(tu * 6, tv * 3) * 0.25 +
    _vnoise(tu * 12, tv * 6) * 0.15 +
    _vnoise(tu * 24, tv * 12) * 0.1 +
    _vnoise(tu * 48, tv * 24) * 0.05
  ); // sum range ≈ [0, 1]
}

// Cloud sharpness controls the noise threshold (coverage) and edge transition
// width. 0 = soft/hazy; 0.95 = crisp edges with less overall coverage.
export const DEFAULT_CLOUD_SHARPNESS = 0.35;
let _cloudSharpness = DEFAULT_CLOUD_SHARPNESS;
let _cloudTex: THREE.CanvasTexture | null = null;

export function getCloudSharpness(): number {
  return _cloudSharpness;
}

export function setCloudSharpness(v: number): void {
  _cloudSharpness = Math.max(0, Math.min(0.95, v));
  if (!_cloudTex) return;
  const canvas = _cloudTex.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  _paintCloudNoise(ctx, canvas.width, canvas.height, _cloudSharpness);
  _cloudTex.needsUpdate = true;
}

function _paintCloudNoise(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sharpness: number,
): void {
  // Higher sharpness → higher threshold (less coverage) + narrower transition.
  const threshold = 0.44 + sharpness * 0.18; // [0.44 … 0.61]
  const edge = 0.22 - sharpness * 0.2; // [0.22 … 0.02]

  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let py = 0; py < H; py++) {
    const tv = py / H;
    for (let px = 0; px < W; px++) {
      const tu = px / W;
      const density = _cloudDensity(tu, tv);

      let a: number;
      if (density >= threshold) {
        a = 220;
      } else if (density <= threshold - edge) {
        a = 0;
      } else {
        a = Math.round(((density - (threshold - edge)) / edge) * 220);
      }

      const i = (py * W + px) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Procedural cloud texture for placeholder (procedural) mode. 512×256 canvas
// painted with value-noise clouds. Seamlessly tiles in U (longitude).
// Sharpness is controlled live via setCloudSharpness().
export function makeProceduralCloudTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 0]),
      1,
      1,
      THREE.RGBAFormat,
    );
    fallback.needsUpdate = true;
    return fallback as unknown as THREE.CanvasTexture;
  }

  _paintCloudNoise(ctx, W, H, _cloudSharpness);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  _cloudTex = tex;
  return tex;
}

// Treat any image with width or height < 64 as a stub (the committed webps
// at packages/celestial/src/textures/ are 34-byte placeholder files that
// decode to 1×1). Real Blue Marble at 4096×2048 sails past this threshold.
export function isLikelyStubTexture(tex: THREE.Texture): boolean {
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (!img) return true;
  const w = img.width ?? 0;
  const h = img.height ?? 0;
  return w < 64 || h < 64;
}
