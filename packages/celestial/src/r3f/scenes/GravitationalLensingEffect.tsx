import { useMemo, forwardRef } from 'react';
import { Effect, BlendFunction } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

// Screen-space gravitational lensing effect for Phase 9.5.
//
// Uses a Schwarzschild weak-field approximation to compute where each
// screen pixel's photon originated: pixels near the black hole are
// deflected outward from the shadow center in proportion to 1/r².
// This correctly bends the rendered starfield / accretion disk around
// the shadow — not a painted ring, but actual UV redistribution.
//
// Photon ring: at r ≈ shadow edge, photons graze the photon sphere and
// loop around once. The shader samples the "wrap-around" UV (opposite
// side of BH) and blends it at that radius to produce the thin bright ring.
//
// uBhCenter  — screen-space UV [0,1]² of the BH center (updated per frame).
// uBhRadius  — screen-space UV radius of the shadow (updated per frame).
// uDistortion — lensing strength; 0.0 = passthrough blit (other scenes).
// uVignette  — edge-fade strength for contact→colophon transition masking.
// uAspect    — canvas aspect ratio (corrects circular distortion).
// uPhotonRing — 1.0 = render photon ring, 0.0 = skip.

const FRAGMENT_SHADER = /* glsl */ `
uniform vec2  uBhCenter;
uniform float uBhRadius;
uniform float uDistortion;
uniform float uVignette;
uniform float uAspect;
uniform float uPhotonRing;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Early exit: no distortion, no vignette — pure passthrough.
  if (uDistortion < 0.001 && uVignette < 0.001) {
    outputColor = inputColor;
    return;
  }

  // Aspect-corrected distance from the BH center.
  vec2 delta = uv - uBhCenter;
  vec2 deltaA = vec2(delta.x * uAspect, delta.y);
  float r = length(deltaA);

  // Weak-field Schwarzschild deflection: ∝ rs² / r².
  // Scale by uBhRadius so the distortion is screen-size-independent.
  float rSafe = max(r, uBhRadius * 0.01);
  float deflection = uDistortion * uBhRadius * uBhRadius / (rSafe * rSafe);

  // Direction from pixel toward BH center (normalized, aspect-corrected).
  vec2 dir = (r > 0.0001) ? normalize(deltaA) : vec2(0.0);
  // Undo aspect on the UV offset so we move in UV space.
  vec2 uvOffset = vec2(dir.x / uAspect, dir.y) * deflection;

  // Lensed sample.
  vec2 lensedUv = clamp(uv + uvOffset, vec2(0.0), vec2(1.0));
  vec4 lensed = texture2D(inputBuffer, lensedUv);

  // Photon ring: at r ≈ 1.05–1.20 × shadow radius, wrap-around sample
  // (from the "other side" of the BH) produces the bright thin ring.
  float ringInner = uBhRadius * 1.05;
  float ringOuter = uBhRadius * 1.20;
  float ringBlend = smoothstep(ringInner, (ringInner + ringOuter) * 0.5, r)
                  * (1.0 - smoothstep((ringInner + ringOuter) * 0.5, ringOuter, r));
  ringBlend *= uPhotonRing;

  vec2 ringOffset = -uvOffset * 2.5;
  vec2 ringUv = clamp(uv + ringOffset, vec2(0.0), vec2(1.0));
  vec4 ringColor = texture2D(inputBuffer, ringUv);

  // Event horizon shadow: black disk inside shadow radius.
  float shadowMask = smoothstep(uBhRadius * 0.90, uBhRadius, r);

  // Composite: lensed + photon ring, then shadow blacks out the interior.
  vec4 result = mix(lensed, lensed + ringColor * 1.5, ringBlend * shadowMask);
  result *= shadowMask;

  // Edge vignette: darkens screen periphery during contact→colophon transition,
  // masking nebula billboard edges as camera zooms out.
  vec2 centred = uv - 0.5;
  float vigR = length(vec2(centred.x * uAspect, centred.y));
  float vignette = uVignette * smoothstep(0.25, 0.65, vigR);
  result = mix(result, vec4(0.0, 0.0, 0.0, 1.0), vignette);

  outputColor = result;
}
`;

export class GravitationalLensingEffectImpl extends Effect {
  constructor() {
    super('GravitationalLensingEffect', FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uBhCenter', new Uniform(new Vector2(0.5, 0.5))],
        ['uBhRadius', new Uniform(0.0)],
        ['uDistortion', new Uniform(0.0)],
        ['uVignette', new Uniform(0.0)],
        ['uAspect', new Uniform(1.0)],
        ['uPhotonRing', new Uniform(1.0)],
      ]),
    });
  }
}

// forwardRef + <primitive> avoids wrapEffect's JSON.stringify(props) dep,
// which crashes in React 19 when a ref prop containing a Three.js object
// (with circular __r3f parent/children links) is serialized on every render.
export const GravitationalLensing = forwardRef<GravitationalLensingEffectImpl>(
  function GravitationalLensing(_, ref) {
    const effect = useMemo(() => new GravitationalLensingEffectImpl(), []);
    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);
