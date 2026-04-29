// Gas-giant body shader. Procedural Jupiter-like banded surface with
// per-band differential rotation (zonal flow), domain-warped FBM noise
// for turbulence, a Great-Red-Spot-style vortex anchored to a band, plus
// lambert against the shared world-space sunDirection uniform and an
// atmospheric Fresnel rim.
//
// Two normals are passed from the vertex stage:
//   - vNormal      — world-space, for the lambert dot against the sun
//                    direction (the same convention earth.glsl.ts uses).
//   - vLocalNormal — object-space, for sampling latitude in the body's
//                    own frame so bands stay anchored to the planet
//                    rather than smearing as the group rotates. Also
//                    serves as the 3D noise sample point — sampling
//                    in 3D on the sphere normal eliminates the
//                    longitude-±π seam that 2D (lon, lat) noise has.
//
// 66 fine latitude bands and their per-band rotation rate multipliers
// are passed as uniform arrays (vec3[66] / float[66]). Loop-counter
// indexing is used to look up adjacent bands, which is the GLSL ES
// 1.00-safe equivalent of `bandColors[bandLow]` (variable-index
// uniform-array access is officially undefined under GLSL 1.00, even
// though many drivers allow it). The 66 fine bands are generated
// procedurally on the JS side from an 11-element macro palette
// (zone/belt alternation) with sub-band brightness oscillation —
// same Jupiter primary structure, ~6× finer striation than the macro.

export const gasGiantVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocalNormal;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vLocalNormal = normal;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const gasGiantFragmentShader = /* glsl */ `
uniform float time;
uniform vec3 sunDirection;
uniform vec3 bandColors[66];
uniform float bandRates[66];
uniform vec3 rimColor;
uniform float rimIntensity;
uniform vec3 vortexParams;   // .x = lat, .y = lon@t=0, .z = host band rate
uniform vec3 vortexColor;
uniform float vortexIntensity;
uniform float ambient;       // night-side floor so the dark hemisphere
                             // doesn't go fully black (no city lights here,
                             // just atmospheric scattering reading)

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocalNormal;

// 3D value noise. Sampling at 3D positions on the sphere instead of
// 2D (lon, lat) eliminates the lon=±π seam — the sphere is closed in
// 3D space, so noise at any unit vector is naturally continuous.
float hash31(vec3 p) {
  p = fract(p * vec3(123.34, 456.21, 789.45));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);  // quintic
  float c000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float c100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float c010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float c110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float c001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float c101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float c011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float c111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y),
    mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y),
    u.z
  );
}

// 2-octave FBM in 3D. Used as the warp seed for the higher-detail pass.
float fbm3a(vec3 p) {
  float v = 0.0;
  v += noise3(p) * 0.5;
  v += noise3(p * 2.13 + vec3(11.3, 7.7, 4.1)) * 0.25;
  return v;
}

// Domain-warped 3-octave 3D FBM. Pre-displaces the sample point by
// another FBM evaluation so noise flows around itself in eddies
// rather than reading as straight stripes.
float fbmWarped3(vec3 p) {
  vec3 q = p + vec3(
    fbm3a(p),
    fbm3a(p + vec3(5.2, 1.3, 6.7)),
    fbm3a(p + vec3(2.4, 8.1, 3.9))
  ) * 0.6;
  float v = 0.0;
  v += noise3(q) * 0.5;
  v += noise3(q * 2.07 + vec3(3.7, 9.1, 5.5)) * 0.25;
  v += noise3(q * 4.19 + vec3(8.2, 4.4, 1.7)) * 0.125;
  return v;
}

// Rotate a 3D vector around the Y axis by angle a. Used to scroll the
// noise sample frame at each band's differential rate without ever
// touching longitude as a number — keeps the noise input continuous
// across the lon=±π seam.
vec3 rotateY(vec3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
}

void main() {
  vec3 nWorld  = normalize(vNormal);
  vec3 nLocal  = normalize(vLocalNormal);
  vec3 viewDir = normalize(vViewDir);
  vec3 sunDir  = normalize(sunDirection);

  // Latitude / longitude in body-local frame. Latitude is used for the
  // band-coordinate lookup; longitude is used only by the GRS vortex
  // (which already wraps cleanly via mod). Noise sampling no longer
  // uses longitude directly — it uses the rotated 3D normal instead.
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);

  // Latitude perturbation. We shift the lat used for band lookup by a
  // 3D-noise sample, so band BOUNDARIES wobble across longitude. Two
  // visual effects from this single perturbation:
  //   - Apparent band widths vary along longitude (no straight stripes)
  //   - Boundaries undulate like real Jupiter, not painted-on lines
  // Amplitude 0.04 rad ≈ 2.3° — about one band-width of wobble.
  vec3 perturbSample = nLocal * 3.5;
  float latPerturb = (fbm3a(perturbSample) - 0.5) * 0.08;
  float latForBand = lat + latPerturb;

  // Continuous band coordinate. 66 bands across the full -π/2..+π/2
  // range → π/66 ≈ 0.0476 rad per band (~2.73°). bandCoord goes 0
  // (south pole) to 66 (north pole). Each band's center sits at i + 0.5.
  float bandCoord = clamp((latForBand + 1.5707963) / 0.0475988, 0.0, 66.0);
  int bandLow  = int(clamp(floor(bandCoord - 0.5), 0.0, 64.0));
  float bandFrac = bandCoord - 0.5 - float(bandLow);
  // Wide smoothstep window (0..1 spanning the whole inter-band region)
  // gives soft, fuzzy edges. Combined with the noise perturbation
  // above, transitions look like atmospheric mixing rather than
  // discrete painted boundaries.
  float blend = smoothstep(0.0, 1.0, clamp(bandFrac, 0.0, 1.0));

  // Look up the two adjacent bands' colors + rotation rates. Loop-counter
  // indexing keeps this GLSL 1.00-safe.
  vec3 cLow  = vec3(0.0);
  vec3 cHigh = vec3(0.0);
  float rLow  = 0.0;
  float rHigh = 0.0;
  for (int i = 0; i < 66; i++) {
    if (i == bandLow)     { cLow  = bandColors[i]; rLow  = bandRates[i]; }
    if (i == bandLow + 1) { cHigh = bandColors[i]; rHigh = bandRates[i]; }
  }

  // Sample warped 3D FBM in each band's rotated sphere frame. Rotating
  // the local normal around Y by (time * rate) is the 3D equivalent of
  // adding (time * rate) to the longitude — but stays continuous across
  // the seam because we never touch longitude as a number. The 11.0
  // scale factor controls noise frequency on the unit sphere
  // (~11 cycles around the body, comparable to the previous lat * 11
  // setting).
  vec3 nLowRot  = rotateY(nLocal, time * rLow);
  vec3 nHighRot = rotateY(nLocal, time * rHigh);
  float tLow  = fbmWarped3(nLowRot * 11.0);
  float tHigh = fbmWarped3(nHighRot * 11.0);

  // Each band's surface = base color modulated by the warped turbulence.
  // The 0.85..1.10 multiplier range keeps the band's own color clearly
  // dominant — noise contributes texture, not a wash.
  vec3 surfLow  = cLow  * (0.85 + 0.25 * tLow);
  vec3 surfHigh = cHigh * (0.85 + 0.25 * tHigh);
  vec3 surface = mix(surfLow, surfHigh, blend);

  // Great-Red-Spot vortex. Anchored at vortexParams.xy in body-local
  // (lat, lon) and drifting with its host band's rotation rate
  // (vortexParams.z). Anisotropic gaussian — wider in longitude than
  // latitude — matches the real GRS's elongated oval. The mod() wrap
  // already handles the lon seam, so the vortex stays seamless too.
  float vLat  = vortexParams.x;
  float vLon0 = vortexParams.y;
  float vRate = vortexParams.z;
  float vLon  = vLon0 + time * vRate;
  float dx = lon - vLon;
  dx = mod(dx + 3.14159265, 6.28318530) - 3.14159265;
  float dy = lat - vLat;
  float r2 = dx * dx * 0.45 + dy * dy * 1.6;
  float vortexFactor = exp(-r2 * 8.0) * vortexIntensity;
  surface = mix(surface, vortexColor, clamp(vortexFactor, 0.0, 0.85));

  // Lambert with a smooth terminator. Floor at 'ambient' so the night
  // side isn't pure black — a thin atmospheric glow reads better against
  // the starfield than a sharp silhouette.
  float lambert = dot(nWorld, sunDir);
  float dayMix = smoothstep(-0.10, 0.30, lambert);
  vec3 lit = surface * (ambient + (1.0 - ambient) * dayMix);

  // Atmospheric Fresnel rim, day-side only.
  float fresnel = pow(1.0 - max(0.0, dot(nWorld, viewDir)), 3.0);
  float rimMask = smoothstep(-0.1, 0.4, lambert);
  vec3 rim = rimColor * fresnel * rimIntensity * rimMask;

  gl_FragColor = vec4(lit + rim, 1.0);
}
`;
