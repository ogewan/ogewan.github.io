// Photo-driven volumetric raymarched nebula shader.
//
// Rendering model. Each variant is a back-face-rendered unit sphere
// (`side: THREE.BackSide`) scaled to the bounding radius via mesh
// transform. The vertex stage emits the local-frame position of the
// back-face point. The fragment stage computes the ray from the camera
// (in volume-local space) through that back-face point, intersects it
// with the unit sphere to find the [tNear, tFar] interval, and marches
// N steps through that interval accumulating emissive color × density.
//
// Density model. At each step's local-frame position p:
//   - Project p onto a virtual "photo plane" perpendicular to local -Z
//     at z=0; UV = (p.x * 0.5 + 0.5, -p.y * 0.5 + 0.5).
//   - Sample the nebula photo at that UV → photoColor, photoLum.
//   - Apply a small per-step UV warp driven by 3D noise so each depth
//     slice's photo alignment differs slightly — the photo's pattern
//     appears at varying depths inside the volume rather than as a
//     uniform extrusion. `warpAmplitude` controls the strength.
//   - Compute 3D FBM density at p (warped + variant-seeded for
//     per-nebula uniqueness): `fbm = fbmWarped3(p * noiseFreq + seed)`.
//   - Step density = `pow(photoLum, falloffPower) * fbm * densityScale`.
//     Photo's luminance dominates so the nebula's structure follows the
//     real photograph; FBM modulates depth so the same UV doesn't
//     repeat at every step.
//   - Accumulate emission front-to-back with premultiplied alpha:
//     `deltaA = density * stepSize * (1 - accum.a)`,
//     `accum.rgb += photoColor * deltaA; accum.a += deltaA;`.
//   - Early-out when alpha saturates (>0.98).
//
// 3D noise helpers (hash31 / noise3 / fbm3a / fbmWarped3) are copied
// verbatim from gas-giant.glsl.ts. 3D-not-2D is mandatory inside the
// raymarch (gotcha #38: 2D noise has a seam at lon=±π even when sampled
// on a sphere normal); the gas-giant precedent applies here too.
//
// GLSL ES 1.00 caveats. Loop bound is a compile-time constant
// (MAX_STEPS = 64). The `stepCount` uniform gates an early-out
// `if (float(i) >= stepCount) break;` so mobile can drop step count
// at runtime without a shader recompile (gotcha #40).

export const nebulaVertexShader = /* glsl */ `
varying vec3 vLocal;

void main() {
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const nebulaFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D nebulaPhoto;
uniform vec3 cameraLocal;       // camera position in volume's local frame
uniform float densityScale;     // overall density multiplier
uniform float noiseFreq;        // FBM frequency on the unit volume
uniform float warpAmplitude;    // per-step UV warp strength
uniform float falloffPower;     // photoLum^falloffPower → density curve
uniform vec3 variantSeed;       // FBM hash offset; differentiates variants
uniform float stepCount;        // marching step count (1..MAX_STEPS)
uniform float edgeFeather;      // radial UV mask threshold; <0.5 feathers
                                // density toward the silhouette so photo
                                // edges don't smear at the back-face's
                                // silhouette ring (where the raymarch
                                // grazes the sphere boundary at oblique
                                // angles, accumulating a lot of edge
                                // photo content into one ring of pixels).
uniform float saturation;       // 1.0 = neutral; >1 boosts color richness
                                // by widening RGB distance from luma.
uniform float glowAmount;       // 0 = off; >0 adds an HDR-style brighten
                                // to the brightest accumulated pixels.
uniform float diffuseStrength;  // 0 = off; >0 adds a soft mipmap-blurred
                                // photo sample additively per step, for
                                // a diffuse "haze" overlay on top of the
                                // crisp main sample.
uniform float diffuseLodBias;   // texture LOD bias for the diffuse sample
                                // (positive = blurrier; ~3-5 is a soft
                                // glow, ~6+ is heavy bloom).

varying vec3 vLocal;

// --- 3D noise (copied verbatim from gas-giant.glsl.ts; see gotcha #38)

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

float fbm3a(vec3 p) {
  float v = 0.0;
  v += noise3(p) * 0.5;
  v += noise3(p * 2.13 + vec3(11.3, 7.7, 4.1)) * 0.25;
  return v;
}

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

// --- main

void main() {
  // Ray in unit-sphere local frame: from cameraLocal toward vLocal
  vec3 rayDir = normalize(vLocal - cameraLocal);

  // Sphere intersection: |cameraLocal + t * rayDir|^2 = 1
  // (rayDir is unit so the t^2 coefficient is 1)
  float b = 2.0 * dot(cameraLocal, rayDir);
  float c = dot(cameraLocal, cameraLocal) - 1.0;
  float disc = b * b - 4.0 * c;
  if (disc < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float sqrtD = sqrt(disc);
  // Entry: clamp to camera position if camera is inside the sphere.
  float tNear = max(0.0, (-b - sqrtD) * 0.5);
  float tFar  = (-b + sqrtD) * 0.5;
  if (tFar <= tNear) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // March
  vec4 accum = vec4(0.0);
  const int MAX_STEPS = 64;
  // Lower bound 1.0 so the dev console can drop to 1 step for a
  // cost-floor test (context-loss debugging). Useful values are
  // 8 (ultra-conservative) → 32 (looks great).
  float steps = clamp(stepCount, 1.0, float(MAX_STEPS));
  float marchLen = tFar - tNear;
  float stepSize = marchLen / steps;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= steps) break;
    float t = tNear + (float(i) + 0.5) * stepSize;
    vec3 p = cameraLocal + t * rayDir;

    // Project onto the photo plane (local Z axis perpendicular).
    // Y flipped so local +Y (up) maps to UV.y=0 (top of image; three.js
    // textures default to flipY=true on load so image space is top-left).
    vec2 photoUV = vec2(p.x * 0.5 + 0.5, -p.y * 0.5 + 0.5);

    // Per-step UV warp by 3D noise: each depth slice samples a slightly
    // shifted region of the photo, so the volume reads as 3D-perturbed
    // photographic structure rather than a static photo extruded along Z.
    // One noise call (single hash) reused for both axes via swizzle —
    // costs ~1 noise eval per step instead of 2 (per-fragment savings
    // are large because we run this every step of every fragment).
    float warpN = noise3(p * (noiseFreq * 0.7));
    vec2 uvWarp = vec2(warpN - 0.5, fract(warpN * 2.71) - 0.5) * warpAmplitude;
    photoUV += uvWarp;

    // Out-of-bounds samples contribute nothing (photo is square but
    // we're sampling inside a unit sphere, so corners are unreachable).
    if (photoUV.x < 0.0 || photoUV.x > 1.0 || photoUV.y < 0.0 || photoUV.y > 1.0) {
      continue;
    }

    vec3 photoColor = texture2D(nebulaPhoto, photoUV).rgb;
    float photoLum = dot(photoColor, vec3(0.2126, 0.7152, 0.0722));

    // Diffuse layer — a heavily mipmap-blurred sample of the same photo.
    // Adds a soft haze overlay that "fills in" between the crisp main
    // structure. texture2D's third arg is an LOD bias; positive values
    // sample smaller mipmaps (blurrier). One extra sample per step.
    vec3 diffuseColor = texture2D(nebulaPhoto, photoUV, diffuseLodBias).rgb;
    vec3 emissive = photoColor + diffuseStrength * diffuseColor;

    // Radial edge feather. length(photoUV - 0.5) is 0 at center, ~0.7
    // at corners (sqrt(2)/2). Feather density to zero past edgeFeather
    // so the nebula reads as a soft round volume rather than a square
    // photo sliced by the bounding sphere's silhouette.
    float radial = length(photoUV - vec2(0.5)) * 2.0;
    float edgeMask = 1.0 - smoothstep(edgeFeather, edgeFeather + 0.15, radial);

    float fbm = fbmWarped3(p * noiseFreq + variantSeed);
    float density = pow(photoLum, falloffPower) * fbm * densityScale * edgeMask;

    float deltaA = density * stepSize * (1.0 - accum.a);
    accum.rgb += emissive * deltaA;
    accum.a += deltaA;

    if (accum.a > 0.98) break;
  }

  // Post-march color adjustments. Saturation widens RGB from luma;
  // glow boosts the brightest accumulated pixels for an HDR pop.
  float finalLum = dot(accum.rgb, vec3(0.2126, 0.7152, 0.0722));
  accum.rgb = mix(vec3(finalLum), accum.rgb, saturation);
  float glowMask = smoothstep(0.35, 0.85, finalLum);
  accum.rgb += accum.rgb * glowAmount * glowMask;

  gl_FragColor = accum;
}
`;
