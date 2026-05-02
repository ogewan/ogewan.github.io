// Procedural nebula skybox shader — used in two places:
//   1. SharedStarField mounts a giant inverted sphere with this material so
//      every scene (earth / projects / contact / colophon) has a faint
//      nebula behind the stars instead of pitch black.
//   2. StarfieldCubemap renders the same shader on a sphere centered at the
//      black hole, captured into the cubemap that the geodesic lensing
//      shader samples by deflected world-direction. Sharing the shader keeps
//      the lensed background visually consistent with the un-lensed sky in
//      the rest of the frame — without this, the lensing region looked like
//      a "bubble" of nebula against an otherwise pitch-black sky.
//
// The shader uses 3D FBm in the surface-position direction (a unit vector
// from the sphere center to each fragment). This makes the nebula content
// rotationally consistent — both call sites use sphere-local position as
// input, so the nebula content depends only on direction, not on the sphere
// center. Two camera/BH viewpoints separated by a small distance see
// essentially the same nebula features.

export const SKYBOX_NEBULA_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  // Sphere is centered at its own origin; surface position IS the direction
  // we want to feed the noise function.
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKYBOX_NEBULA_FRAG = /* glsl */ `
varying vec3 vWorldDir;
uniform float uBrightness;   // multiplier on emitted RGB
uniform float uSaturation;   // 0 = grayscale, 1 = full palette


float hash3(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yxz + 19.19);
  return fract(p.x * p.y * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), u.x),
      mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
      mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x),
      u.y
    ),
    u.z
  );
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p = p * 2.13 + vec3(1.7, 9.2, 5.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = vWorldDir;

  // Two octave layers at different scales — coarse cool base + finer warm
  // highlights — give the nebula a "patchy clouds in front of duskier dust"
  // depth feel without being recognisable as any specific real object.
  float nCoarse = fbm3(d * 1.6);
  float nFine   = fbm3(d * 4.5 + vec3(13.0, 17.0, 7.0));
  float nWarm   = fbm3(d * 2.8 + vec3(-9.1, 3.3, -11.5));

  // Slight blue/violet bias — subtle enough to read as a faint nebula tint
  // rather than a saturated colour wash. Coolest highlights get the strongest
  // violet push; the base is a deep indigo-leaning navy.
  vec3 base    = vec3(0.010, 0.012, 0.026);   // near-black indigo
  vec3 cool    = vec3(0.09, 0.07, 0.22);      // violet
  vec3 teal    = vec3(0.05, 0.10, 0.20);      // blue-leaning teal
  vec3 warm    = vec3(0.16, 0.08, 0.08);      // ember rust (kept warmer for contrast)

  vec3 col = base;
  col += cool * smoothstep(0.50, 0.95, nCoarse) * 0.55;
  col += teal * smoothstep(0.45, 0.90, nFine)   * 0.35;
  col += warm * smoothstep(0.65, 0.95, nWarm)   * 0.35;

  // Subtle high-frequency dust grain so flat regions don't look perfectly smooth.
  col += vec3(0.012) * (nFine - 0.5);

  col = max(col, 0.0);
  // Saturation: lerp toward luminance. BT.709 weights.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, uSaturation);
  // Brightness scales the final emission; clamp slightly above 1 so over-
  // bright user values don't blow into fully-saturated white instantly.
  col *= uBrightness;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
