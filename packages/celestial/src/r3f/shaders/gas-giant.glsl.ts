// Gas-giant body shader. Procedural Jupiter-like banded surface with
// per-band differential rotation (zonal flow), domain-warped FBM noise
// for turbulence, a Great-Red-Spot-style vortex anchored to a band, plus
// lambert against the shared world-space sunDirection uniform and an
// atmospheric Fresnel rim.
//
// Two normals are passed from the vertex stage:
//   - vNormal      — world-space, for the lambert dot against the sun
//                    direction (the same convention earth.glsl.ts uses).
//   - vLocalNormal — object-space, for sampling latitude/longitude in
//                    the body's own frame so bands stay anchored to the
//                    planet rather than smearing as the group rotates.
//
// The 7 latitude bands and their per-band rotation rate multipliers are
// passed as uniform arrays (vec3[7] / float[7]). Loop-counter indexing
// is used to look up adjacent bands, which is the GLSL ES 1.00-safe
// equivalent of `bandColors[bandLow]` (variable-index uniform-array
// access is officially undefined under GLSL 1.00, even though many
// drivers allow it).

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
uniform vec3 bandColors[7];
uniform float bandRates[7];
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

// Cheap 2D value noise. hash → grid corners → bilinear interp with
// quintic smoothstep (Perlin's improved curve, C2-continuous).
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash21(i),                hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 2-octave FBM. Cheap; gives enough variation for band edges without
// breaking the mobile path's frame budget.
float fbm2(vec2 p) {
  float v = 0.0;
  v += noise2(p) * 0.5;
  v += noise2(p * 2.13 + vec2(11.3, 7.7)) * 0.25;
  return v;
}

// Domain-warped 3-octave FBM. Used for the surface turbulence; the warp
// pre-displaces the sample point by another FBM evaluation so noise
// flows around itself in eddies rather than reading as straight stripes.
float fbmWarped(vec2 p) {
  vec2 q = p + vec2(fbm2(p), fbm2(p + vec2(5.2, 1.3))) * 0.6;
  float v = 0.0;
  v += noise2(q) * 0.5;
  v += noise2(q * 2.07 + vec2(3.7, 9.1)) * 0.25;
  v += noise2(q * 4.19 + vec2(8.2, 4.4)) * 0.125;
  return v;
}

void main() {
  vec3 nWorld  = normalize(vNormal);
  vec3 nLocal  = normalize(vLocalNormal);
  vec3 viewDir = normalize(vViewDir);
  vec3 sunDir  = normalize(sunDirection);

  // Latitude / longitude in body-local frame.
  // lat ∈ [-π/2, π/2]; lon ∈ [-π, π].
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);

  // Continuous band coordinate. 7 bands across the full -π/2..+π/2 range
  // → π/7 ≈ 0.4488 rad per band. bandCoord goes 0 (south pole) to 7
  // (north pole). The center of band i sits at bandCoord = i + 0.5.
  float bandCoord = clamp((lat + 1.5707963) / 0.4487989, 0.0, 7.0);
  int bandLow  = int(clamp(floor(bandCoord - 0.5), 0.0, 5.0));
  float bandFrac = bandCoord - 0.5 - float(bandLow);
  float blend = smoothstep(0.0, 1.0, clamp(bandFrac, 0.0, 1.0));

  // Look up the two adjacent bands' colors + rotation rates. Loop-counter
  // indexing keeps this GLSL 1.00-safe.
  vec3 cLow  = vec3(0.0);
  vec3 cHigh = vec3(0.0);
  float rLow  = 0.0;
  float rHigh = 0.0;
  for (int i = 0; i < 7; i++) {
    if (i == bandLow)     { cLow  = bandColors[i]; rLow  = bandRates[i]; }
    if (i == bandLow + 1) { cHigh = bandColors[i]; rHigh = bandRates[i]; }
  }

  // Per-band longitude offset for the differential rotation. Each band
  // scrolls at its own rate, so at the band boundary the warped noise
  // fields shear past each other — the eye reads that as the eddies and
  // turbulence Jupiter shows along its belt/zone seams.
  float lonLow  = lon + time * rLow;
  float lonHigh = lon + time * rHigh;

  // Sample warped FBM in each band's frame. Latitude scaled higher so
  // the noise has more vertical detail than horizontal (real bands stretch
  // longitudinally because of the planet's rotation).
  vec2 pLow  = vec2(lonLow  * 1.4, lat * 5.5);
  vec2 pHigh = vec2(lonHigh * 1.4, lat * 5.5);
  float tLow  = fbmWarped(pLow);
  float tHigh = fbmWarped(pHigh);

  // Each band's surface = base color modulated by the warped turbulence.
  // The 0.75..1.10 multiplier range keeps both the bright zones and the
  // dark belts within their own value range without crushing.
  vec3 surfLow  = cLow  * (0.75 + 0.35 * tLow);
  vec3 surfHigh = cHigh * (0.75 + 0.35 * tHigh);
  vec3 surface = mix(surfLow, surfHigh, blend);

  // Great-Red-Spot vortex. Anchored at vortexParams.xy in body-local
  // (lat, lon) and drifting with its host band's rotation rate
  // (vortexParams.z). Anisotropic gaussian — wider in longitude than
  // latitude — matches the real GRS's elongated oval.
  float vLat  = vortexParams.x;
  float vLon0 = vortexParams.y;
  float vRate = vortexParams.z;
  float vLon  = vLon0 + time * vRate;

  // Wrap dx into [-π, π] so the vortex doesn't pop at the seam.
  float dx = lon - vLon;
  dx = mod(dx + 3.14159265, 6.28318530) - 3.14159265;
  float dy = lat - vLat;
  float r2 = dx * dx * 0.45 + dy * dy * 1.6;
  float vortexFactor = exp(-r2 * 8.0) * vortexIntensity;
  // Tint AND swirl the noise around the vortex center. The local
  // turbulence already responds to the band's scroll; layering a deep
  // red-rust tint on top reads as the GRS.
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
