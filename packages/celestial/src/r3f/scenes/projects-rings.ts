// Particle-ring buffer generator for ProjectsScene.
//
// Saturn-like multi-zone layout (radii scaled 3.5× from the original
// Phase 9.0 plan to match the 6.3-radius gas-giant body):
//
//   - Inner ring (D / C analogue): r 7.0 .. 8.575, faint dust
//   - Cassini gap:                  r 8.575 .. 9.275, NO particles
//   - Mid ring (B analogue):        r 9.275 .. 12.6, dense brightest
//     Encke gap (carved out below): r 12.075 .. 12.25, NO particles
//   - Outer ring (A analogue):      r 12.6 .. 15.4, medium density
//   - Roche / F-ring outlier:       r 15.925 .. 16.275, narrow bright ringlet
//
// Particles are sampled stratified per zone (weighted by zone weight),
// uniformly distributed over the zone's area (so dense zones don't end
// up with unrealistic radial density gradients), with a small Gaussian
// vertical jitter. Color is drawn from a 4-tone ice/dust/rock palette
// modulated by each zone's brightness factor (dense ice → bright;
// dust → dimmer). Each particle's orbit factor is `1 / sqrt(r)` —
// Kepler's third law's signature — so the inner ring visibly orbits
// faster than the outer when the host scene advances `time`.

const ZONES: ReadonlyArray<{ rIn: number; rOut: number; weight: number; brightness: number }> = [
  { rIn: 7.0, rOut: 8.575, weight: 0.1, brightness: 0.55 }, // D / C
  {
    rIn: 9.275,
    rOut: 12.6,
    weight: 0.45,
    brightness: 1.0,
  }, // B (with Encke gap punched out below)
  { rIn: 12.6, rOut: 15.4, weight: 0.35, brightness: 0.85 }, // A
  { rIn: 15.925, rOut: 16.275, weight: 0.1, brightness: 0.75 }, // F-ring
];

// Continuous low-opacity tinted bands that sit underneath the particle
// system to "thicken" each ring zone visually. The particles alone
// read as too sparse; these bands fill the in-between with a soft
// haze whose color matches each band's character (cooler grey for
// dust-rich zones, warmer cream for ice-rich zones). Rendered as
// flat ring annuli with low opacity so they composite cleanly with
// the particles overlaid on top.
export interface RingBandConfig {
  readonly rIn: number;
  readonly rOut: number;
  readonly color: string;
  readonly opacity: number;
}

export const RING_BANDS: ReadonlyArray<RingBandConfig> = [
  // D / C ring (inner) — dusty cool grey, faint.
  { rIn: 7.0, rOut: 8.575, color: '#b4b6bc', opacity: 0.05 },
  // B ring (mid, pre-Encke) — densest band; warm amber-cream.
  { rIn: 9.275, rOut: 12.075, color: '#e8c98a', opacity: 0.12 },
  // B ring (mid, post-Encke) — same warm amber; separated so the
  // Encke gap shows through as a thin transparent slot.
  { rIn: 12.25, rOut: 12.6, color: '#e8c98a', opacity: 0.12 },
  // A ring (outer) — pale warm grey, slightly cooler than B.
  { rIn: 12.6, rOut: 15.4, color: '#c8c2b0', opacity: 0.08 },
  // F-ring outlier — deeper amber, narrow bright ringlet.
  { rIn: 15.925, rOut: 16.275, color: '#c79a5d', opacity: 0.1 },
];

// Encke gap inside zone B. Particles that land here are rejected and
// re-sampled — gives a thin transparent slot inside the densest ring.
const ENCKE_INNER = 12.075;
const ENCKE_OUTER = 12.25;

// Per-particle size distribution. Single uniform [MIN, MIN + RANGE]
// with MIN matching what the previous fine-dust tier used and RANGE
// such that the maximum is 5× MIN. The ring shader's size attenuation
// at the projects camera distance maps these to ~0.1-0.5 px gl_PointSize.
const PARTICLE_SIZE_MIN = 0.01;
const PARTICLE_SIZE_RANGE = 0.1;

// Sparkle particles (effect A). Sparser than dust, larger than dust
// but still small enough to read as bright pinpricks (gl_PointSize
// ~2-4 px after attenuation at the projects camera distance) rather
// than fuzzy blobs. The ring shader treats any particle with size >
// SPARKLE_SHADER_THRESHOLD as a sparkle: sharper alpha falloff in the
// fragment + a per-particle twinkle (sin(time + a0-phase)²) so each
// pulses independently and the rings read as alive. Toggleable via
// window.portfolio.rings.sparkles.toggle().
const SPARKLE_FRACTION = 0.002;
const SPARKLE_SIZE_MIN = 0.18;
const SPARKLE_SIZE_RANGE = 0.18;
// Threshold the ring shader uses to identify sparkles vs dust.
// Anything > this is treated as a sparkle. Exported so ProjectsScene
// can hand it to the shader as a uniform — keeps the JS-side
// SPARKLE_SIZE_MIN and the shader's branch in lockstep.
export const SPARKLE_SHADER_THRESHOLD = 0.15;

// Azimuthal density clumps (effect B). Sum of three sine harmonics
// across angle gives a non-uniform density profile that varies smoothly
// around the ring. Rejection sampling: a candidate angle is accepted
// with probability density(angle) / maxDensity, so denser sectors
// receive proportionally more particles. As the rings rotate, the
// denser sectors visibly travel — directly readable motion.
//   harmonics: [frequency, phase, amplitude]
const CLUMP_HARMONICS: ReadonlyArray<readonly [number, number, number]> = [
  [3, 0.7, 0.55], // 3 wide clumps — primary structure
  [7, 2.1, 0.3], // 7 finer clumps — secondary texture
  [17, 4.2, 0.15], // very fine variation
];
const CLUMP_BASE = 1.0;
const CLUMP_MAX_DENSITY = CLUMP_BASE + CLUMP_HARMONICS.reduce((acc, [, , a]) => acc + a, 0);

function clumpDensity(angle: number): number {
  let v = CLUMP_BASE;
  for (const [f, p, a] of CLUMP_HARMONICS) {
    v += a * Math.sin(angle * f + p);
  }
  // Floor at 0.05 so even the sparsest sector still receives some
  // particles (a fully empty sector reads as a hard gap, which is
  // not what we want — we have explicit gaps via the zone layout).
  return Math.max(0.05, v);
}

export interface RingParticleBufferOptions {
  readonly sparkles: boolean;
  readonly clumps: boolean;
}

// Saturn's rings are ~90% water ice; the rest is silicate dust and
// trace organics. Palette skews bright-cream/pale-blue for the ice with
// a couple of warmer dust tones for variation.
const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.96, 0.93, 0.85], // ice 1 — warm white
  [0.88, 0.9, 0.92], // ice 2 — cool white-blue
  [0.78, 0.68, 0.52], // dust — sandy beige
  [0.62, 0.5, 0.38], // rock — dark rust
];
const PALETTE_WEIGHTS: ReadonlyArray<number> = [0.55, 0.3, 0.1, 0.05];

// Box-Muller normal sample. Used for the vertical jitter so particle
// thickness has soft Gaussian falloff rather than a hard band.
function gauss(): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function pickWeighted<T>(items: ReadonlyArray<T>, weights: ReadonlyArray<number>): T {
  let total = 0;
  for (const w of weights) total += w;
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) {
      const item = items[i];
      if (item !== undefined) return item;
    }
  }
  const last = items[items.length - 1];
  if (last === undefined) {
    throw new Error('pickWeighted: empty items array');
  }
  return last;
}

export interface RingParticleBuffers {
  readonly positions: Float32Array;
  readonly orbitFactors: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
}

export function buildRingParticleBuffers(
  particleCount: number,
  options: RingParticleBufferOptions = { sparkles: true, clumps: true },
): RingParticleBuffers {
  const positions = new Float32Array(particleCount * 3);
  const orbitFactors = new Float32Array(particleCount);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const zoneWeights = ZONES.map((z) => z.weight);

  let i = 0;
  // Hard cap on retries to avoid pathological loops if a zone config has
  // no valid samples — practically the Encke gap rejection rate is ~2%
  // so we'd never hit this, but defense-in-depth.
  let retries = 0;
  const RETRY_CAP = particleCount * 8;

  while (i < particleCount && retries < RETRY_CAP) {
    const zone = pickWeighted(ZONES, zoneWeights);

    // Uniform-by-area sampling: r² uniform between rIn² and rOut².
    // Yields equal expected count per annulus area — visually uniform
    // density per zone rather than crowding the inner edge.
    const u = Math.random();
    const r = Math.sqrt(zone.rIn * zone.rIn + u * (zone.rOut * zone.rOut - zone.rIn * zone.rIn));

    // Reject samples landing inside the Encke gap (only relevant when
    // we picked zone B, but the test is cheap enough to apply always).
    if (r >= ENCKE_INNER && r <= ENCKE_OUTER) {
      retries++;
      continue;
    }

    // Angle sampling. With clumps OFF, uniform across [0, 2π). With
    // clumps ON, rejection-sample against clumpDensity(angle): pick a
    // candidate angle, accept with probability density/maxDensity. The
    // result is a non-uniform azimuthal distribution where denser
    // sectors visibly travel as the ring rotates.
    let angle: number;
    if (options.clumps) {
      let attempts = 0;
      while (true) {
        const candidate = Math.random() * Math.PI * 2;
        const accept = Math.random() * CLUMP_MAX_DENSITY;
        if (accept <= clumpDensity(candidate) || attempts >= 64) {
          angle = candidate;
          break;
        }
        attempts++;
      }
    } else {
      angle = Math.random() * Math.PI * 2;
    }

    // Vertical jitter scaled with radius — outer rings are slightly
    // thicker in absolute terms than inner ones (matches real ring
    // geometry: thickness scales with orbital perturbations).
    const y = gauss() * 0.012 * r;

    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = r * Math.sin(angle);

    orbitFactors[i] = 1 / Math.sqrt(r);

    const color = pickWeighted(PALETTE, PALETTE_WEIGHTS);
    colors[i * 3] = color[0] * zone.brightness;
    colors[i * 3 + 1] = color[1] * zone.brightness;
    colors[i * 3 + 2] = color[2] * zone.brightness;

    // Size assignment. With sparkles OFF, uniform [MIN, MIN + RANGE]
    // across all particles. With sparkles ON, ~SPARKLE_FRACTION of the
    // total are bumped to a much larger size — they read as individual
    // ice chunks and the eye can directly track their Keplerian orbit.
    if (options.sparkles && Math.random() < SPARKLE_FRACTION) {
      sizes[i] = SPARKLE_SIZE_MIN + Math.random() * SPARKLE_SIZE_RANGE;
    } else {
      sizes[i] = PARTICLE_SIZE_MIN + Math.random() * PARTICLE_SIZE_RANGE;
    }

    i++;
  }

  return { positions, orbitFactors, colors, sizes };
}
