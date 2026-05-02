import { useEffect, useMemo, forwardRef } from 'react';
import { Effect, BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Gravitational lensing post-process for the colophon scene.
//
// Per-pixel Schwarzschild geodesic raytrace driven by a precomputed deflection
// LUT (b → Δφ). Replaces the screen-space approximation that lives in
// `.legacy.tsx` (still used as the degraded-mode fallback).
//
// Algorithm.
//   1. Reconstruct the world-space ray for this fragment from uv + uInvViewProj.
//   2. Compute impact parameter b = |ro × rayDir| / uRs (in Schwarzschild units).
//   3. Convert to LUT axis (M=1 units): bM = 2·b/uRs. Early-out at bM > 12
//      (negligible deflection — sample cubemap with undeflected ray).
//   4. Sample LUT for (Δφ_total, uMax, φ_peri, capture).
//   5. If captured: output black (event horizon).
//   6. Build the geodesic-plane basis (xHat = −rayDir, yHat perpendicular in
//      plane, oriented so impact-parameter offset is +yHat-side). Trajectory
//      lives in this plane; ψ runs from ≈0 (camera) through Δφ_total (escape).
//   7. Disk-plane crossings: the disk plane intersects the geodesic plane in a
//      line through origin. Compute the two ψ values where the trajectory
//      crosses (ψ_line, ψ_line + π); for each, approximate r(ψ) = 1 / (uMax ·
//      sin(π ψ / Δφ_total)) (sin-shape closed form — exact for the straight-
//      line limit, approximate for bent trajectories; sufficient for the
//      stage-1 disk-RT bridge). If r ∈ [diskInner, diskOuter] sample uDiskRT
//      in disk-plane polar coords.
//   8. Escape direction: rotate −rayDir by −Δφ_total in the geodesic plane,
//      sample uStarfield (cubemap of the BH-centered background).
//   9. Composite primary disk over secondary disk over cubemap background.
//   10. Lerp from inputColor to lensed result by uDistortion (master tween),
//       then composite the vignette.
//
// Uniforms.
//   uDeflectionLut    sampler2D — 2048×1 RGBA float, b → (Δφ, uMax, φ_peri, capture)
//   uStarfield        samplerCube — background light at infinity
//   uDiskRT           sampler2D — polar disk emission: u=φ/2π (wraps), v=normalised r
//   uBhWorld          vec3      — BH world position
//   uCamPos           vec3      — camera world position
//   uInvViewProj      mat4      — UV → world unprojection
//   uDiskNormal       vec3      — unit normal of disk plane (world)
//   uDiskRefDir       vec3      — unit reference dir in disk plane (disk-azimuth φ=0)
//   uRs               float     — Schwarzschild radius (world units)
//   uDiskInner        float     — inner disk radius (world units)
//   uDiskOuter        float     — outer disk radius (world units)
//   uBhScreenCenter   vec2      — BH center in UV (bounding-box early-out)
//   uBhScreenRadius   float     — shadow radius in UV (bounding circle)
//   uAspect           float     — canvas aspect (bounding-box only)
//   uDistortion       float     — master tween scaler; 0 = passthrough
//   uVignette         float     — edge-fade for transition mask
//   uPhotonRing       float     — currently unused; reserved for unit-B brightening tweak
//
// Lifecycle. The deflection LUT, starfield cubemap, and disk RT texture are
// supplied async by parent components; the shader runs in passthrough until
// real textures arrive (early return at uDistortion < 0.001). All three sampler
// uniforms bind to 1×1 placeholder textures at construction so the GLSL
// samplers always have a valid binding.
//
// React 19 + @react-three/postprocessing: forwardRef + <primitive> (not
// wrapEffect) — see ARCHITECTURE.md gotcha #46.

const PLACEHOLDER_2D = (() => {
  const t = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 0]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  t.needsUpdate = true;
  return t;
})();

const PLACEHOLDER_CUBE = (() => {
  // CubeTexture's images array must contain real upload-able sources (ImageData,
  // HTMLImageElement, ImageBitmap, etc) — passing raw Uint8Array would silently
  // fail at GPU upload time. ImageData is the lightest valid option.
  if (typeof ImageData === 'undefined') {
    // SSR fallback — Canvas3D isn't rendered in SSR but the module still loads.
    const t = new THREE.CubeTexture();
    return t;
  }
  const px = new Uint8ClampedArray([0, 0, 0, 255]);
  const face = new ImageData(px, 1, 1);
  const t = new THREE.CubeTexture([face, face, face, face, face, face]);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.needsUpdate = true;
  return t;
})();

// LUT axis constants — must match the bake script's piecewise sampling.
const B_CRIT = '5.196152422706632';
const B_MAX_LUT = '12.0';
const HALF_FRAC = '0.49975586'; // (HALF - 1) / (SAMPLES - 1) = 1023/2047
const SECOND_HALF_BASE = '0.50024414'; // HALF / (SAMPLES - 1) = 1024/2047
const SECOND_HALF_SPAN = '0.49975586'; // (SAMPLES - 1 - HALF) / (SAMPLES - 1) = 1023/2047

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D   uDeflectionLut;
uniform samplerCube uStarfield;
uniform sampler2D   uDiskRT;
uniform vec3        uBhWorld;
uniform vec3        uCamPos;
uniform mat4        uInvViewProj;
uniform vec3        uDiskNormal;
uniform vec3        uDiskRefDir;
uniform float       uRs;
uniform float       uDiskInner;
uniform float       uDiskOuter;
uniform vec2        uBhScreenCenter;
uniform float       uBhScreenRadius;
uniform float       uAspect;
uniform float       uDistortion;
uniform float       uVignette;
uniform float       uPhotonRing;

// Local consts — postprocessing's EffectMaterial wrapper doesn't reliably
// pull in three.js's common chunk that #defines PI/PI2, so use locally-scoped
// names with the K_ prefix to avoid undefined-reference errors and any
// potential collision with built-ins.
#define K_PI 3.14159265358979323846
#define K_PI2 6.28318530717958647692

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Passthrough fast path — disabled / pre-tween / pre-asset.
  if (uDistortion < 0.001 && uVignette < 0.001) {
    outputColor = inputColor;
    return;
  }

  // --- Bounding-box early-out ---
  // Skip the geodesic math entirely for pixels far from the BH. The disk's
  // outer apparent radius is ~2.5× the shadow radius (gargantua: diskOuter
  // 6.5·Rs vs shadow 2.6·Rs); the secondary image arc + lensed background
  // stars extend significantly further. 6× covers the whole BH-affected
  // region of the frame at the colophon anchor's geometry.
  vec2 bbDelta = (uv - uBhScreenCenter) * vec2(uAspect, 1.0);
  if (length(bbDelta) > uBhScreenRadius * 6.0) {
    // Outside BH region — show the unmodified input (starfield / other scenes).
    // Apply the vignette separately so the contact→colophon mask still works
    // outside the BH region.
    vec4 result = inputColor;
    vec2 centred = uv - 0.5;
    float vigR = length(vec2(centred.x * uAspect, centred.y));
    float edgeVig = smoothstep(0.25, 0.65, vigR);
    float vignette = uVignette * max(edgeVig, uVignette);
    outputColor = mix(result, vec4(0.0, 0.0, 0.0, 1.0), vignette);
    return;
  }

  // --- Reconstruct world-space ray from this fragment's UV ---
  vec4 nearH = uInvViewProj * vec4(uv * 2.0 - 1.0, -1.0, 1.0);
  vec4 farH  = uInvViewProj * vec4(uv * 2.0 - 1.0,  1.0, 1.0);
  vec3 rayOrigin = nearH.xyz / nearH.w;
  vec3 rayDir = normalize(farH.xyz / farH.w - rayOrigin);

  // BH-centric coords; |ro| is the camera distance from the BH.
  vec3 ro = rayOrigin - uBhWorld;

  // Angular momentum vector (geodesic plane normal, before normalization) and
  // the dimensionless impact parameter b (in units of M = uRs/2).
  vec3 L = cross(ro, rayDir);
  float bWorld = length(L);
  float bM = 2.0 * bWorld / uRs;

  // Negligible deflection — sample cubemap with the undeflected ray and skip.
  if (bM > ${B_MAX_LUT}) {
    vec4 result = vec4(textureCube(uStarfield, rayDir).rgb, 1.0);
    // Lerp toward inputColor by (1 - uDistortion) so transitions still cross-fade.
    result = mix(inputColor, result, uDistortion);
    vec2 centred = uv - 0.5;
    float vigR = length(vec2(centred.x * uAspect, centred.y));
    float edgeVig = smoothstep(0.25, 0.65, vigR);
    float vignette = uVignette * max(edgeVig, uVignette);
    outputColor = mix(result, vec4(0.0, 0.0, 0.0, 1.0), vignette);
    return;
  }

  // --- LUT lookup ---
  // Inline because postprocessing's EffectMaterial wrapping has historically
  // had trouble with helper-function declarations alongside mainImage.
  // Inverts the bake script's piecewise b mapping:
  //   i ∈ [0, HALF):    b = B_CRIT * i / (HALF - 1)
  //   i ∈ [HALF, N):    b = B_CRIT + (B_MAX - B_CRIT) * (i - HALF) / (N - 1 - HALF)
  // LUT u coordinate = i / (SAMPLES - 1).
  float lutU;
  if (bM <= ${B_CRIT}) {
    lutU = (bM / ${B_CRIT}) * ${HALF_FRAC};
  } else {
    float lutT = (bM - ${B_CRIT}) / (${B_MAX_LUT} - ${B_CRIT});
    lutU = ${SECOND_HALF_BASE} + lutT * ${SECOND_HALF_SPAN};
  }
  vec4 lut = texture2D(uDeflectionLut, vec2(lutU, 0.5));
  float deltaPhi = lut.r;  // total deflection in radians
  float uMax     = lut.g;  // closest-approach 1/r in M units (0.5 = horizon)
  float captured = lut.a;  // 1 = escapes, 0 = captured

  // --- Captured: event horizon shadow (pure black) ---
  if (captured < 0.5) {
    vec4 result = vec4(0.0, 0.0, 0.0, 1.0);
    result = mix(inputColor, result, uDistortion);
    vec2 centred = uv - 0.5;
    float vigR = length(vec2(centred.x * uAspect, centred.y));
    float edgeVig = smoothstep(0.25, 0.65, vigR);
    float vignette = uVignette * max(edgeVig, uVignette);
    outputColor = mix(result, vec4(0.0, 0.0, 0.0, 1.0), vignette);
    return;
  }

  // --- Geodesic plane basis ---
  // xHat = -rayDir (incoming asymptote direction). yHat is in-plane perp,
  // oriented so the impact-parameter offset is on the +yHat side. ψ is
  // measured CCW from +xHat in (xHat, yHat).
  vec3 nGeo = normalize(L);
  vec3 xHat = -rayDir;
  vec3 yHat = normalize(cross(nGeo, xHat));

  // --- Disk-plane crossings ---
  // The disk plane and the geodesic plane intersect along a line through
  // origin with direction lineDir = nGeo × uDiskNormal. In the (xHat, yHat)
  // basis, that line sits at angle ψ_line; the trajectory crosses it at
  // ψ_line and ψ_line + π.
  vec3 lineDir = cross(nGeo, uDiskNormal);
  float lineLen = length(lineDir);

  vec4 diskAccum = vec4(0.0); // composited disk emission (front-to-back over)

  // Skip disk math if the geodesic plane is (near-)coplanar with the disk:
  // the line direction degenerates, the geodesic and disk share a plane and
  // we'd hit every point on the trajectory's path through the disk.
  // In the limit, fall through to the cubemap-only result.
  if (lineLen > 0.001) {
    lineDir /= lineLen;
    float lineX = dot(lineDir, xHat);
    float lineY = dot(lineDir, yHat);
    float psiLine = atan(lineY, lineX);
    if (psiLine < 0.0) psiLine += K_PI2;

    // The line crosses the trajectory at every ψ ≡ psiLine (mod π). For the
    // capped Δφ_total ≤ 4π that means up to 5 candidate crossings:
    //   k = -1 covers psiLine - π (relevant when psiLine > π)
    //   k = 0..3 cover psiLine + 0π..3π
    // Iterating in increasing k automatically gives front-to-back order
    // (camera at ψ ≈ 0; crossings closer to camera have smaller ψ and
    // therefore composite on top under standard "over" blending).
    //
    // sampleDiskAt: closed-form r(ψ) ≈ 1 / (uMax · sin(π ψ / deltaPhi))
    // (sin-shape; exact for the straight-line limit, approximate for bent
    // trajectories). Stage 2 should replace with an inverse LUT or in-shader
    // RK4 for accurate r near the photon sphere.
    vec3 diskTangent = normalize(cross(uDiskNormal, uDiskRefDir));
    for (int k = -1; k <= 3; k++) {
      float psi = psiLine + float(k) * K_PI;
      if (psi <= 0.0001 || psi >= deltaPhi - 0.0001) continue;
      float u_at_psi = uMax * sin(K_PI * psi / deltaPhi);
      if (u_at_psi <= 0.00001) continue;
      // r in M=1 units → world units: r_world = r_M · M = r_M · uRs / 2.
      float rWorld = (1.0 / u_at_psi) * (uRs * 0.5);
      if (rWorld < uDiskInner || rWorld > uDiskOuter) continue;

      // Crossing position in 3D (BH-centered) → disk-plane azimuth for the
      // RT lookup.
      vec3 hit = rWorld * (cos(psi) * xHat + sin(psi) * yHat);
      float dx = dot(hit, uDiskRefDir);
      float dy = dot(hit, diskTangent);
      float phiDisk = atan(dy, dx);
      if (phiDisk < 0.0) phiDisk += K_PI2;

      vec2 diskUv = vec2(
        phiDisk / K_PI2,
        clamp((rWorld - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0)
      );
      vec4 diskSample = texture2D(uDiskRT, diskUv);

      // Over composition: result += (1 - dst.a) · src.
      diskAccum.rgb += (1.0 - diskAccum.a) * diskSample.rgb * diskSample.a;
      diskAccum.a   += (1.0 - diskAccum.a) * diskSample.a;
    }
  }

  // --- Background (deflected escape direction → cubemap) ---
  // Outgoing asymptote direction in (xHat, yHat) plane: at ψ = deltaPhi the
  // trajectory's *position* points in (cos(Δφ), sin(Δφ)). The *direction of
  // motion* there is tangent to the curve, which for a far asymptote is
  // perpendicular to position, in the direction of further motion. Because
  // ψ increases monotonically along the trajectory, the tangent at ψ = Δφ
  // is (−sin(Δφ), cos(Δφ)) in plane (rotated +90° from position).
  vec3 escapeDir = normalize(-sin(deltaPhi) * xHat + cos(deltaPhi) * yHat);
  vec3 bgColor = textureCube(uStarfield, escapeDir).rgb;

  // --- Composite: disk over background ---
  vec3 lensed = diskAccum.rgb + (1.0 - diskAccum.a) * bgColor;
  vec4 result = vec4(lensed, 1.0);

  // Master tween scaler — fades from inputColor (no lensing) to lensed.
  result = mix(inputColor, result, uDistortion);

  // Edge vignette — masks nebula billboard during the contact→colophon
  // transition. uVignette = 1 = full black; uVignette = 0 = no mask.
  vec2 centred = uv - 0.5;
  float vigR = length(vec2(centred.x * uAspect, centred.y));
  float edgeVig = smoothstep(0.25, 0.65, vigR);
  float vignette = uVignette * max(edgeVig, uVignette);
  result = mix(result, vec4(0.0, 0.0, 0.0, 1.0), vignette);

  outputColor = result;
}
`;

export class GravitationalLensingEffectImpl extends Effect {
  constructor() {
    super('GravitationalLensingEffect', FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uDeflectionLut', new THREE.Uniform(PLACEHOLDER_2D)],
        ['uStarfield', new THREE.Uniform(PLACEHOLDER_CUBE)],
        ['uDiskRT', new THREE.Uniform(PLACEHOLDER_2D)],
        ['uBhWorld', new THREE.Uniform(new THREE.Vector3())],
        ['uCamPos', new THREE.Uniform(new THREE.Vector3())],
        ['uInvViewProj', new THREE.Uniform(new THREE.Matrix4())],
        ['uDiskNormal', new THREE.Uniform(new THREE.Vector3(0, 1, 0))],
        ['uDiskRefDir', new THREE.Uniform(new THREE.Vector3(1, 0, 0))],
        ['uRs', new THREE.Uniform(1.5)],
        ['uDiskInner', new THREE.Uniform(3.3)],
        ['uDiskOuter', new THREE.Uniform(9.0)],
        ['uBhScreenCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uBhScreenRadius', new THREE.Uniform(0.0)],
        ['uAspect', new THREE.Uniform(1.0)],
        ['uDistortion', new THREE.Uniform(0.0)],
        // Starts at 1.0 — full black on first mount frame, hides the one-frame
        // outputColorSpace flash when EffectComposer mounts.
        ['uVignette', new THREE.Uniform(1.0)],
        ['uPhotonRing', new THREE.Uniform(1.0)],
      ]),
    });
  }

  setDeflectionLut(texture: THREE.DataTexture | null): void {
    const u = this.uniforms.get('uDeflectionLut');
    if (u) u.value = texture ?? PLACEHOLDER_2D;
  }

  setStarfieldCubemap(texture: THREE.CubeTexture | null): void {
    const u = this.uniforms.get('uStarfield');
    if (u) u.value = texture ?? PLACEHOLDER_CUBE;
  }

  setDiskRenderTarget(texture: THREE.Texture | null): void {
    const u = this.uniforms.get('uDiskRT');
    if (u) u.value = texture ?? PLACEHOLDER_2D;
  }
}

interface GravitationalLensingProps {
  /** The async-loaded deflection LUT. Null until loaded; passes the placeholder
   *  texture to the shader uniform until it's ready. */
  readonly deflectionLut: THREE.DataTexture | null;
  /** The async-rendered starfield cubemap. Null until rendered. */
  readonly starfieldCubemap: THREE.CubeTexture | null;
  /** The polar-parameterised disk emission RT. Null until first render. */
  readonly diskRenderTarget: THREE.Texture | null;
}

// forwardRef + <primitive> avoids wrapEffect's JSON.stringify(props) dep,
// which crashes in React 19 when a ref prop containing a Three.js object
// (with circular __r3f parent/children links) is serialized on every render.
// See ARCHITECTURE.md gotcha #46.
export const GravitationalLensing = forwardRef<
  GravitationalLensingEffectImpl,
  GravitationalLensingProps
>(function GravitationalLensing({ deflectionLut, starfieldCubemap, diskRenderTarget }, ref) {
  const effect = useMemo(() => new GravitationalLensingEffectImpl(), []);

  useEffect(() => {
    effect.setDeflectionLut(deflectionLut);
  }, [effect, deflectionLut]);

  useEffect(() => {
    effect.setStarfieldCubemap(starfieldCubemap);
  }, [effect, starfieldCubemap]);

  useEffect(() => {
    effect.setDiskRenderTarget(diskRenderTarget);
  }, [effect, diskRenderTarget]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});
