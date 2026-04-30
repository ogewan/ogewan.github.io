// Per-variant data for the contact-scene nebulae. Each variant is a
// real-world nebula (Carina / Lagoon / Pillars / Veil) backed by a
// public-domain NASA / ESA / STScI photograph. The photographs were
// prepped by `scripts/build-nebula-textures.mjs` (one-shot, run when
// source masters change) into 2k + 1k square-cropped WebPs under
// `packages/celestial/src/textures/nebulae/{slug}/photo_{2k,1k}.webp`.
//
// Per-variant tint baselines are multiplied by the runtime context
// multipliers (billboardBrightness etc.) before reaching the materials.
// 1.0 means "use the variant photo as-is"; per-variant tuning lets
// dimmer source images get an extra push without users having to
// crank the global multiplier.

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
  // Per-variant tint baselines (multiplied by runtime context multipliers).
  readonly billboardBaseBrightness: number;
  readonly billboardBaseSaturation: number;
  readonly billboardBaseGlow: number;
  readonly particleBaseBrightness: number;
  readonly particleBaseSaturation: number;
  readonly particleBaseGlow: number;
}

export const NEBULA_VARIANTS: Record<NebulaVariant, NebulaParams> = {
  '01': {
    slug: '01-carina',
    name: 'Carina — Cosmic Cliffs',
    photoUrl2k: carina2k,
    photoUrl1k: carina1k,
    billboardBaseBrightness: 1.0,
    billboardBaseSaturation: 1.0,
    billboardBaseGlow: 1.0,
    particleBaseBrightness: 1.0,
    particleBaseSaturation: 1.0,
    particleBaseGlow: 1.0,
  },
  '02': {
    slug: '02-lagoon',
    name: 'Lagoon Nebula (M8)',
    photoUrl2k: lagoon2k,
    photoUrl1k: lagoon1k,
    billboardBaseBrightness: 1.0,
    billboardBaseSaturation: 1.0,
    billboardBaseGlow: 1.0,
    particleBaseBrightness: 1.0,
    particleBaseSaturation: 1.0,
    particleBaseGlow: 1.0,
  },
  '03': {
    slug: '03-pillars',
    name: 'Pillars of Creation (M16)',
    photoUrl2k: pillars2k,
    photoUrl1k: pillars1k,
    // Pillars source photo is darker than the others; nudge brightness
    // baseline up so it reads at parity without users having to crank
    // the global multiplier.
    billboardBaseBrightness: 1.3,
    billboardBaseSaturation: 1.0,
    billboardBaseGlow: 1.0,
    particleBaseBrightness: 1.3,
    particleBaseSaturation: 1.0,
    particleBaseGlow: 1.0,
  },
  '04': {
    slug: '04-veil',
    name: 'Veil Nebula',
    photoUrl2k: veil2k,
    photoUrl1k: veil1k,
    billboardBaseBrightness: 1.0,
    billboardBaseSaturation: 1.0,
    billboardBaseGlow: 1.0,
    particleBaseBrightness: 1.0,
    particleBaseSaturation: 1.0,
    particleBaseGlow: 1.0,
  },
};
