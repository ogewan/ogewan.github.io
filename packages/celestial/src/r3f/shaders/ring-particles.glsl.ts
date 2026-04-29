// Particle ring shader. Each particle is a single GL_POINT rendered as a
// circular dust grain. The vertex stage performs the per-particle
// Keplerian-ish orbit: each particle stores its inverse-sqrt-of-radius
// in `aOrbitFactor`, and the host advances `time` by
// `delta * getProjectsRingsRotationRate()` each frame, so the orbital
// angular velocity of every particle is K / sqrt(r) (Kepler's third law,
// with K = the user-controllable rotation rate).
//
// Per-particle lambert against the shared world-space sun-direction
// uniform. The "normal" for a flat ring particle is taken to be the
// direction from the gas-giant origin out to the particle — particles
// on the side facing the sun read brightly, particles on the anti-sun
// side fade to a dim ambient floor. Reads as the bright/dark sweep
// across the rings the eye expects from real Saturn imagery.
//
// Particles render as soft circles (smoothstep alpha falloff inside
// gl_PointCoord). depthWrite is off (set on the material) so the body's
// depth still occludes particles passing behind it but particles don't
// occlude each other unrealistically.

export const ringParticleVertexShader = /* glsl */ `
attribute float aOrbitFactor;
attribute vec3 aColor;
attribute float aSize;

uniform float time;
uniform vec3 sunDirection;
uniform float sizeAttenuation;
uniform float spokeIntensity;        // 0 = off, 1 = full effect
uniform float spokePhase;            // current rotation of the spoke pattern
uniform float sparkleThreshold;      // aSize > this is a sparkle (else dust)

varying vec3 vColor;
varying float vDistFade;
varying float vIsSparkle;            // 1.0 for sparkles, 0.0 for dust

void main() {
  // Recover initial polar coords from the baked position. r = orbit
  // radius, a0 = initial angle in the ring plane. y stays as-is (the
  // small Gaussian vertical jitter baked at buffer-build time).
  float r  = length(position.xz);
  float a0 = atan(position.z, position.x);
  float angle = a0 + aOrbitFactor * time;
  vec3 pos = vec3(r * cos(angle), position.y, r * sin(angle));

  // Sparkle / dust branch. We tell them apart by the per-particle
  // size — sparkles were assigned a noticeably larger size at buffer-
  // build time. The varying lets the fragment stage pick the right
  // alpha curve.
  float isSparkle = step(sparkleThreshold, aSize);
  vIsSparkle = isSparkle;

  // Per-particle lambert. Direction from group origin → particle, in
  // world space (vec4(pos, 0.0) strips translation so we get the
  // direction, not a world-space point). Floor at 0.25 so the anti-sun
  // arc still reads as something other than pitch black.
  vec3 worldDir = normalize((modelMatrix * vec4(pos, 0.0)).xyz);
  float lambert = max(0.25, dot(worldDir, normalize(sunDirection)));
  vec3 base = aColor * lambert;

  // Spoke effect (effect C). Periodic dark radial bars at four sectors
  // (every π/2) around the ring, the whole pattern rotating at
  // spokePhase. A particle inside a spoke sector has its color
  // attenuated. spokeIntensity=0 disables the effect entirely.
  float spokeMul = 1.0;
  if (spokeIntensity > 0.0) {
    float relAngle = angle - spokePhase;
    float modAngle = mod(relAngle, 1.5707963);
    float distFromNearest = min(modAngle, 1.5707963 - modAngle);
    // Narrow gaussian falloff around each spoke center — sharp dark
    // bars rather than wide bands.
    float spokeMask = exp(-distFromNearest * distFromNearest * 80.0);
    spokeMul = 1.0 - spokeIntensity * spokeMask * 0.75;
  }

  // Twinkle modulation — sparkles only. Each sparkle pulses
  // brightness using its own a0 as a phase seed, so the population
  // twinkles independently rather than synchronized. Quadratic
  // shaping gives sharp peaks and a gentle dim baseline.
  float twinkleSin = 0.5 + 0.5 * sin(time * 4.5 + a0 * 11.3);
  float twinkleMul = mix(1.0, 0.55 + 0.45 * twinkleSin * twinkleSin, isSparkle);

  vColor = base * spokeMul * twinkleMul;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Three.js point-size attenuation. The constant is tuned so a base
  // size of ~1 reads as one-or-two pixels at the projects camera
  // anchor's ~22-unit distance. Clamp the divisor so points that drift
  // very close to the camera don't blow up.
  gl_PointSize = aSize * (sizeAttenuation / max(1.0, -mvPosition.z));

  // Distance fade — particles at the inner edge of the rings near the
  // body's silhouette get a subtle additional fade so the ring inner
  // edge doesn't read as a hard line abutting the planet.
  vDistFade = smoothstep(7.0, 7.6, r);
}
`;

export const ringParticleFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vDistFade;
varying float vIsSparkle;

void main() {
  // Distance from the point's center (in [0,1] across the quad).
  vec2 d = gl_PointCoord - 0.5;
  float dist = length(d);
  if (dist > 0.5) discard;

  // Two alpha profiles. Dust gets a soft haze (smoothstep falloff
  // across most of the disc) so 120k overlapping points read as a
  // continuous medium. Sparkles get a sharp pinprick — tight bright
  // core, brief halo — so they read as crisp stars rather than fuzzy
  // blobs.
  float dustAlpha    = smoothstep(0.5, 0.18, dist);
  float sparkleAlpha = smoothstep(0.42, 0.06, dist);

  float alpha = mix(dustAlpha, sparkleAlpha, vIsSparkle) * vDistFade;
  gl_FragColor = vec4(vColor, alpha);
}
`;
