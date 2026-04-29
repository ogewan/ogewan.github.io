// Ring band shader. Replaces the static MeshBasicMaterial on each
// continuous ring band with a custom material that overlays a low-
// frequency FBM noise pattern, scrolled angularly at the band's mean
// Keplerian orbital rate. Effect: each band's tinted haze appears to
// flow around the ring rather than reading as a static painted layer.
//
// Per-band uniforms drive the tint, opacity, and scroll rate. A shared
// `time` uniform (advanced by the host useFrame at delta * K) lets all
// bands stay in lockstep with the particle system. A shared
// `flowIntensity` uniform fades the noise modulation in and out so the
// effect can be toggled live without rebuilding materials.

export const ringBandVertexShader = /* glsl */ `
varying vec2 vBandPolar;  // .x = angle [-π,π], .y = radius (object-space)

void main() {
  // Object-space xy plane: that's the ring's own plane before the
  // host group's [π/2, 0, 0] rotation lifts it into world XZ.
  vBandPolar.x = atan(position.y, position.x);
  vBandPolar.y = length(position.xy);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringBandFragmentShader = /* glsl */ `
uniform float time;
uniform float flowIntensity;   // 0 = solid band; 1 = full flow
uniform vec3 bandColor;
uniform float bandOpacity;
uniform float scrollRate;      // band's Keplerian rate (1/sqrt(meanR))

varying vec2 vBandPolar;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i),                   hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)),  hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm2(vec2 p) {
  float v = 0.0;
  v += noise2(p) * 0.5;
  v += noise2(p * 2.13 + vec2(11.3, 7.7)) * 0.25;
  return v;
}

void main() {
  // Scroll the noise's angular axis with time*rate so the pattern
  // travels around the ring at the band's own orbital rate. Radial
  // axis stays fixed (radial structure doesn't rotate; only the
  // angular wave packet does).
  float angleScroll = vBandPolar.x + time * scrollRate;
  vec2 noiseSample = vec2(angleScroll * 6.0, vBandPolar.y * 9.0);
  float n = fbm2(noiseSample);

  // Brightness + opacity both modulate, scaled by flowIntensity. When
  // flowIntensity = 0, both reduce to 1.0 (band reads as solid).
  float brightness = mix(1.0, 0.65 + 0.7 * n, flowIntensity);
  float opacityMul = mix(1.0, 0.55 + 0.9 * n, flowIntensity);

  gl_FragColor = vec4(bandColor * brightness, bandOpacity * opacityMul);
}
`;
