// Cloud-layer shader. World-space normal + view direction in the vertex pass;
// fragment combines four effects on top of the sampled texture to make the
// composite read as moving weather rather than a uniform skin:
//
//   1. Albedo / contrast — cloudBrightness scales RGB above 1.0 so day-side
//      clouds push into the bright end of ACES tone-mapping. cloudContrast
//      applies pow() to density so thin coverage drops out and thick patches
//      stay bright.
//   2. Coverage mask — low-frequency fbm noise multiplied into alpha with a
//      soft threshold (cloudCoverage). Breaks the uniform sheet into broken
//      weather; layerSeed offsets each layer's noise so they don't mask in
//      lockstep.
//   3. Detail erosion — higher-frequency fbm eroding the edges so the cutout
//      reads as wispy instead of texture-shaped.
//   4. Silver lining — pow(dot(viewDir, sunDir), n) brightening lobe near the
//      sun, additive into RGB. Cheap forward-scatter approximation; gives the
//      bright rim that real daytime clouds have when backlit.
//
// Cloud density base read from the texture:
//   Procedural canvas (RGBA): uses the alpha channel directly.
//   NASA webp (opaque RGB):   uses RGB luminance as density.
// The 0.99 alpha threshold distinguishes them without a separate mode uniform.

export const cloudVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const cloudFragmentShader = /* glsl */ `
uniform sampler2D cloudMap;
uniform vec3 sunDirection;
uniform float cloudOpacity;
uniform float cloudBrightness;
uniform float cloudContrast;
uniform float cloudCoverage;
uniform vec2 layerSeed;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPos;

// 3D value-noise + 3-octave fbm. Sampled by world position so the field is
// seamless on a sphere — the 2D vUv variant produced a visible vertical seam
// at the equirectangular wrap (lng = ±180). hash() avoids the classic
// sin-based hash which is unstable on some GPUs.
float hash(vec3 p) {
  p = fract(p * vec3(123.34, 456.21, 789.12));
  p += dot(p, p.yzx + 45.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a000 = hash(i);
  float a100 = hash(i + vec3(1.0, 0.0, 0.0));
  float a010 = hash(i + vec3(0.0, 1.0, 0.0));
  float a110 = hash(i + vec3(1.0, 1.0, 0.0));
  float a001 = hash(i + vec3(0.0, 0.0, 1.0));
  float a101 = hash(i + vec3(1.0, 0.0, 1.0));
  float a011 = hash(i + vec3(0.0, 1.0, 1.0));
  float a111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(a000, a100, u.x), mix(a010, a110, u.x), u.y),
    mix(mix(a001, a101, u.x), mix(a011, a111, u.x), u.y),
    u.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(p);
    p *= 2.07;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec4 cloud = texture2D(cloudMap, vUv);

  float baseDensity = cloud.a < 0.99
    ? cloud.a
    : dot(cloud.rgb, vec3(0.299, 0.587, 0.114));

  // Coverage mask sampled in 3D by world position so the field tiles
  // seamlessly across the lng=±180 wrap. Soft threshold via smoothstep —
  // values below cloudCoverage drop to 0, above ramp up over a small band.
  // Higher cloudCoverage → less coverage; lower → denser fields. layerSeed
  // is a per-layer offset (treated as a 3D translation) so layers don't mask
  // in lockstep.
  vec3 seed3 = vec3(layerSeed.x, layerSeed.y, layerSeed.x - layerSeed.y);
  float mask = fbm(vWorldPos * 4.0 + seed3);
  float coverage = smoothstep(cloudCoverage, cloudCoverage + 0.25, mask);

  // Detail erosion: higher-frequency noise nibbling at the edges of the now
  // broken-up alpha. Scaled down so it only meaningfully changes values near
  // the smoothstep ramp's mid-band — interiors stay solid.
  float detail = fbm(vWorldPos * 18.0 + seed3 * 2.7);
  float density = baseDensity * coverage * mix(0.55, 1.0, detail);

  // Contrast curve. pow > 1 = sharper transition (more sky, brighter peaks).
  density = pow(clamp(density, 0.0, 1.0), cloudContrast);

  // Lighting. lambert against world-space sun; ambient floor keeps the
  // unlit edge from going pitch-black.
  vec3 nrm = normalize(vNormal);
  vec3 sun = normalize(sunDirection);
  float lambert = max(0.0, dot(nrm, sun));
  float ambient = 0.15;
  float light = ambient + (1.0 - ambient) * lambert;

  // Silver lining / forward scatter: brighten where the view direction lines
  // up with the sun direction. Cheap pow lobe; ~8 power gives a tight rim.
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float forward = pow(max(0.0, dot(viewDir, sun)), 8.0) * 0.6;

  vec3 rgb = vec3(light * cloudBrightness + forward);

  // Alpha fades by light too so night-side clouds disappear instead of
  // leaving dark silhouettes against the unlit hemisphere.
  float alpha = density * cloudOpacity * light;

  gl_FragColor = vec4(rgb, alpha);
}
`;
