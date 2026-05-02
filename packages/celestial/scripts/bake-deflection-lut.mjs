// Bakes the Schwarzschild gravitational-lensing deflection LUT.
//
// Run manually (committed artifact, not built on install):
//   node packages/celestial/scripts/bake-deflection-lut.mjs
//
// Outputs:
//   packages/celestial/src/assets/deflection-lut.bin
//   packages/celestial/src/assets/deflection-lut.meta.json
//
// Physics. Null geodesics in Schwarzschild geometry. Units GM = c = 1, so
// the Schwarzschild radius Rs = 2M = 2 and the photon sphere sits at r = 3M
// = 1.5 Rs. The critical (capture) impact parameter is b_c = 3√3·M ≈ 5.196.
//
// For an inbound ray with impact parameter b > b_c, the trajectory has a
// closest-approach radius r_min satisfying the cubic
//
//   2u³ - u² + 1/b² = 0,         u = M/r
//
// (smallest positive root in (0, 1/3)). Below b_c the ray is captured.
// The total deflection angle is found by integrating
//
//   du/dφ = ±√(1/b² - u² + 2u³)
//
// from u = 0 to u_turn (sign +) and back to u = 0 (sign -). By symmetry the
// outbound integral equals the inbound, so we double the inbound result.
//
// Output layout. 2048 samples × 1 row × RGBA float32 (32 KB).
//   R = totalDeflectionPhi  (radians from incoming asymptote to outgoing
//                            asymptote; π would be a straight line, larger
//                            means the ray was bent toward the BH)
//   G = closestApproachU    (1/r_min in M=1 units; 0.5 = horizon)
//   B = phiToPerihelion     (radians from incoming asymptote to closest
//                            approach; useful for finding disk crossings)
//   A = captureFlag         (1.0 = escapes, 0.0 = captured by BH)
//
// b sampling is piecewise-uniform around b_c so the shader can invert with a
// single branch. First half (i ∈ [0, SAMPLES/2)) covers b ∈ [0, b_c] uniformly;
// second half covers b ∈ [b_c, B_MAX] uniformly. Each half gets SAMPLES/2 = 1024
// samples ⇒ Δb ≈ 0.005 below b_c and Δb ≈ 0.007 above. Range b ∈ [0, 12·M];
// beyond 12 the deflection is < 0.04 rad and we treat the ray as undeflected.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SAMPLES = 2048;
const B_MIN = 0;
const B_MAX = 12;
const B_CRIT = 3 * Math.sqrt(3); // ≈ 5.19615
const HORIZON_U = 0.5; // r = 2M ⇒ u = 1/(2M) = 0.5 (M=1)

const HALF = SAMPLES / 2;
function bAtIndex(i) {
  if (i < HALF) {
    // Uniform from 0 to b_c over indices [0, HALF-1]; index HALF-1 maps to b_c.
    return (B_CRIT * i) / (HALF - 1);
  }
  // Uniform from b_c to B_MAX over indices [HALF, SAMPLES-1]; index SAMPLES-1
  // maps to B_MAX.
  return B_CRIT + ((B_MAX - B_CRIT) * (i - HALF)) / (SAMPLES - 1 - HALF);
}

// Smallest positive real root of 2u³ - u² + 1/b² in (0, 1/3].
// Returns null if no real root exists in that range (i.e., ray captured).
// Uses bisection on a monotonically-decreasing-then-increasing cubic.
function findTurningU(b) {
  if (b <= 0) return null;
  const f = (u) => 2 * u * u * u - u * u + 1 / (b * b);
  // f(0) = 1/b² > 0 by construction; the cubic dips negative iff f(1/3) ≤ 0.
  const f13 = f(1 / 3); // = -1/27 + 1/b²
  if (f13 > 0) return null; // cubic stays positive in (0, 1/3) ⇒ no turning point ⇒ captured
  // f decreases from positive to f13 ≤ 0 in [0, 1/3]; root by bisection.
  let lo = 0;
  let hi = 1 / 3;
  for (let it = 0; it < 80; it++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm > 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14) break;
  }
  return 0.5 * (lo + hi);
}

// du/dφ for the inbound branch. RHS clamped at 0 to absorb numerical noise
// near the turning point (where the radicand crosses zero analytically).
function duDphi(u, b) {
  const rhs = 1 / (b * b) - u * u + 2 * u * u * u;
  return rhs > 0 ? Math.sqrt(rhs) : 0;
}

// RK4 step in u with φ as independent variable.
function rk4Step(u, b, dphi) {
  const k1 = duDphi(u, b);
  const k2 = duDphi(u + 0.5 * dphi * k1, b);
  const k3 = duDphi(u + 0.5 * dphi * k2, b);
  const k4 = duDphi(u + dphi * k3, b);
  return u + (dphi / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

// Integrate inbound from u ≈ 0 to uTurn. Returns Δφ_inbound; outbound is the
// same by symmetry. Two-stage stepping: coarse RK4 until close to uTurn, then
// the analytic √(uTurn - u) singularity ∫du/√(...) is approximated with
// trapezoidal substitution. Total accuracy ~10⁻⁴ rad — adequate for 8-bit
// shader output.
function tracePhi(b, uTurn) {
  if (uTurn <= 0) return 0;
  let u = 1e-9;
  let phi = 0;
  const dphiCoarse = 5e-4;
  // Coarse stepping until we get close to uTurn (within 5%).
  const uClose = uTurn * 0.95;
  let safety = 0;
  while (u < uClose) {
    const next = rk4Step(u, b, dphiCoarse);
    if (next <= u) break; // numerical stall — shouldn't happen but bail out
    u = next;
    phi += dphiCoarse;
    if (++safety > 200000) break;
  }
  // Final approach: ∫_uClose^uTurn du / √(1/b² - u² + 2u³). Near uTurn the
  // integrand has a 1/√(uTurn - u) singularity; use 256 substeps with the
  // RHS evaluated at u (not midpoint) and absorb the singularity in the
  // last step's analytic limit: dphi_last ≈ 2·√(uTurn - u_last)/√|f'(uTurn)|.
  const N = 256;
  const du = (uTurn - u) / N;
  for (let k = 0; k < N - 1; k++) {
    const ua = u + k * du;
    const ub = u + (k + 1) * du;
    const fa = duDphi(ua, b);
    const fb = duDphi(ub, b);
    if (fa > 0 && fb > 0) phi += du * 0.5 * (1 / fa + 1 / fb);
  }
  // Last segment with singularity correction. f(u) = 1/b² - u² + 2u³;
  // f'(u) = -2u + 6u². At uTurn, f(uTurn) = 0 so f(u) ≈ f'(uTurn)·(u - uTurn).
  // ∫ du/√(-f'·(uTurn - u)) from u_last to uTurn = 2·√(uTurn - u_last)/√(-f'(uTurn)).
  // f'(uTurn) at the inner turning point is negative (cubic crosses from + to −).
  const fpTurn = -2 * uTurn + 6 * uTurn * uTurn;
  const denom = Math.sqrt(Math.abs(fpTurn));
  if (denom > 1e-9) {
    phi += (2 * Math.sqrt(du)) / denom;
  }
  return phi;
}

// Bake.
const buf = new Float32Array(SAMPLES * 4);
let captured = 0;
for (let i = 0; i < SAMPLES; i++) {
  const b = bAtIndex(i);
  if (b < 1e-6) {
    // Pixel at the BH center: captured.
    buf[i * 4 + 0] = 0;
    buf[i * 4 + 1] = HORIZON_U;
    buf[i * 4 + 2] = 0;
    buf[i * 4 + 3] = 0;
    captured++;
    continue;
  }
  const uTurn = findTurningU(b);
  if (uTurn === null || uTurn >= HORIZON_U) {
    buf[i * 4 + 0] = 0;
    buf[i * 4 + 1] = HORIZON_U;
    buf[i * 4 + 2] = 0;
    buf[i * 4 + 3] = 0;
    captured++;
    continue;
  }
  const phiHalf = tracePhi(b, uTurn);
  // Cap at 4π. As b → b_c⁺ the trajectory winds infinitely (Δφ → ∞); the
  // exact count is visually indistinguishable past two full orbits, and the
  // unbounded values would interpolate badly between adjacent LUT samples.
  const phiTotal = Math.min(2 * phiHalf, 4 * Math.PI);
  const phiHalfCapped = phiTotal * 0.5;
  buf[i * 4 + 0] = phiTotal;
  buf[i * 4 + 1] = uTurn;
  buf[i * 4 + 2] = phiHalfCapped;
  buf[i * 4 + 3] = 1;
}

const outDir = resolve(__dirname, '../src/assets');
mkdirSync(outDir, { recursive: true });

const binPath = resolve(outDir, 'deflection-lut.bin');
writeFileSync(binPath, Buffer.from(buf.buffer));

const scriptSha = createHash('sha256').update(readFileSync(__filename)).digest('hex').slice(0, 16);

const meta = {
  description: 'Schwarzschild gravitational-lensing deflection LUT.',
  units: 'GM = c = 1; Schwarzschild radius Rs = 2M = 2; photon sphere at r = 1.5 Rs.',
  samples: SAMPLES,
  channels: 4,
  format: 'float32',
  byteLength: buf.byteLength,
  bMin: B_MIN,
  bMax: B_MAX,
  bCrit: B_CRIT,
  half: HALF,
  samplingFn:
    'piecewise: i < N/2 → b = b_c * i / (N/2 - 1); i ≥ N/2 → b = b_c + (B_MAX - b_c) * (i - N/2) / (N - 1 - N/2)',
  channelLayout: {
    r: 'totalDeflectionPhi (radians; π = no bend, > π = bent toward BH)',
    g: 'closestApproachU (1/r_min in units M=1; 0.5 = horizon)',
    b: 'phiToPerihelion (radians; half of R for symmetric orbit)',
    a: 'captureFlag (1.0 = ray escapes, 0.0 = captured by BH)',
  },
  capturedSamples: captured,
  bakedAt: new Date().toISOString(),
  scriptSha,
};
const metaPath = resolve(outDir, 'deflection-lut.meta.json');
writeFileSync(metaPath, JSON.stringify(meta, null, 2));

// Sanity print.
console.log(`Baked ${SAMPLES} samples → ${binPath}`);
console.log(`Metadata → ${metaPath}`);
console.log(`Captured: ${captured} / ${SAMPLES} samples`);
console.log(`b range [${B_MIN}, ${B_MAX}], b_crit ≈ ${B_CRIT.toFixed(4)}`);
console.log(`\nSpot checks:`);
const checks = [0.05, 0.2, 0.4, 0.49, 0.5, 0.51, 0.6, 0.8, 0.95];
for (const t of checks) {
  const i = Math.min(SAMPLES - 1, Math.floor(t * (SAMPLES - 1)));
  const b = bAtIndex(i);
  const tag = buf[i * 4 + 3] === 0 ? 'CAPTURED' : `Δφ=${buf[i * 4 + 0].toFixed(3)}`;
  console.log(
    `  i=${String(i).padStart(4)}  b=${b.toFixed(3).padStart(7)}  ${tag.padEnd(12)}  uMax=${buf[
      i * 4 + 1
    ].toFixed(3)}`,
  );
}
