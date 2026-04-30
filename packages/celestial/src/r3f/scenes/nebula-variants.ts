// Per-variant data for the contact-scene nebulae. Each variant is a
// real-world nebula (Carina / Lagoon / Pillars / Veil) backed by a
// public-domain NASA / ESA / STScI photograph. The photographs were
// prepped by `scripts/build-nebula-textures.mjs` (one-shot, run when
// source masters change) into 2k + 1k square-cropped WebPs under
// `packages/celestial/src/textures/nebulae/{slug}/photo_{2k,1k}.webp`.
//
// The shader sampling parameters (densityScale / noiseFreq /
// warpAmplitude / falloffPower / variantSeed) are tuned per nebula so
// each one's character translates into the volumetric raymarch:
//   - Density scale controls how "thick" the cloud appears.
//   - Noise freq controls graininess of depth perturbation.
//   - Warp amplitude controls how much the photo's UV shifts per
//     depth slice (more = more 3D feel; too much = photo dissolves).
//   - Falloff power shapes how photo brightness translates to density
//     (higher = darker pixels are even more transparent; sharper edges).
//   - Variant seed shifts the FBM hash so two variants don't share
//     identical depth perturbation patterns.
//
// Tune live via `portfolio.nebulae.config()` partial-set; final values
// land here.

import carina2k from '../../textures/nebulae/01-carina/photo_2k.webp';
import carina1k from '../../textures/nebulae/01-carina/photo_1k.webp';
import lagoon2k from '../../textures/nebulae/02-lagoon/photo_2k.webp';
import lagoon1k from '../../textures/nebulae/02-lagoon/photo_1k.webp';
import pillars2k from '../../textures/nebulae/03-pillars/photo_2k.webp';
import pillars1k from '../../textures/nebulae/03-pillars/photo_1k.webp';
import veil2k from '../../textures/nebulae/04-veil/photo_2k.webp';
import veil1k from '../../textures/nebulae/04-veil/photo_1k.webp';

export type NebulaVariant = '01' | '02' | '03' | '04';

export const NEBULA_VARIANTS_ORDER: readonly NebulaVariant[] = ['01', '02', '03', '04'];

export interface NebulaParams {
  readonly slug: string;
  readonly name: string;
  readonly photoUrl2k: string;
  readonly photoUrl1k: string;
  readonly densityScale: number;
  readonly noiseFreq: number;
  readonly warpAmplitude: number;
  readonly falloffPower: number;
  readonly variantSeed: readonly [number, number, number];
  // Visual-polish controls. Per-variant tuned values; bake the
  // calibrated defaults here as you iterate.
  readonly edgeFeather: number; // 0.3..0.5; lower = more feathered edges
  readonly saturation: number; // 1.0 neutral; 1.3..1.8 makes colors pop
  readonly glowAmount: number; // 0..1.5; HDR brighten on highlights
  readonly diffuseStrength: number; // 0..1; soft mipmap-blurred haze overlay
  readonly diffuseLodBias: number; // 3..6; LOD offset for the diffuse layer
}

export const NEBULA_VARIANTS: Record<NebulaVariant, NebulaParams> = {
  '01': {
    slug: '01-carina',
    name: 'Carina — Cosmic Cliffs',
    photoUrl2k: carina2k,
    photoUrl1k: carina1k,
    // Carina has dramatic vertical dust ridges + bright stars; medium
    // density with mild warp so the ridge silhouette stays readable.
    densityScale: 1.4,
    noiseFreq: 1.6,
    warpAmplitude: 0.04,
    falloffPower: 1.1,
    variantSeed: [3.7, 1.2, 9.4],
    edgeFeather: 0.42,
    saturation: 1.45,
    glowAmount: 0.6,
    diffuseStrength: 0.55,
    diffuseLodBias: 4.0,
  },
  '02': {
    slug: '02-lagoon',
    name: 'Lagoon Nebula (M8)',
    photoUrl2k: lagoon2k,
    photoUrl1k: lagoon1k,
    // Lagoon's vivid magenta/cyan/yellow gas wraps in twister-like
    // structures; higher noise frequency for finer depth granularity,
    // moderate warp.
    densityScale: 1.6,
    noiseFreq: 2.2,
    warpAmplitude: 0.06,
    falloffPower: 1.0,
    variantSeed: [7.1, 4.4, 2.8],
    edgeFeather: 0.4,
    saturation: 1.6,
    glowAmount: 0.7,
    diffuseStrength: 0.5,
    diffuseLodBias: 4.0,
  },
  '03': {
    slug: '03-pillars',
    name: 'Pillars of Creation (M16)',
    photoUrl2k: pillars2k,
    photoUrl1k: pillars1k,
    // Pillars are tall + narrow; LOW warp so the column silhouettes
    // stay column-shaped instead of dissolving. Higher falloff power
    // crushes the dim background, makes the pillars stand out.
    densityScale: 1.5,
    noiseFreq: 1.4,
    warpAmplitude: 0.025,
    falloffPower: 1.4,
    variantSeed: [11.2, 8.6, 5.3],
    edgeFeather: 0.45,
    saturation: 1.4,
    glowAmount: 0.55,
    diffuseStrength: 0.45,
    diffuseLodBias: 5.0,
  },
  '04': {
    slug: '04-veil',
    name: 'Veil Nebula',
    photoUrl2k: veil2k,
    photoUrl1k: veil1k,
    // Veil is wispy filamentary structure; high warp + high noise freq
    // for the most "3D dust" feel. Lower density (Veil is thin).
    densityScale: 1.1,
    noiseFreq: 2.6,
    warpAmplitude: 0.09,
    falloffPower: 0.95,
    variantSeed: [2.6, 6.9, 12.1],
    edgeFeather: 0.4,
    saturation: 1.7,
    glowAmount: 0.85,
    diffuseStrength: 0.65,
    diffuseLodBias: 4.0,
  },
};
