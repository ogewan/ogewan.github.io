// Moon shader. Mirrors the earth shader's vertex pass to produce a world-space
// normal, then runs a clamped lambert against the same `sunDirection` uniform
// the earth shader reads (single source of sun truth across the scene). A
// `shadowFactor` uniform (JS-driven) darkens the moon when it enters Earth's
// umbra — see EarthScene's useFrame for the cone test that produces it.
//
// The moon has no day/night map; we use a single tinted base color and let
// the lambert + shadow factor do all the visual work.

export const moonVertexShader = /* glsl */ `
varying vec3 vNormal;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const moonFragmentShader = /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 baseColor;
uniform float ambient;
uniform float shadowFactor;

varying vec3 vNormal;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 sunDir = normalize(sunDirection);
  // Clamp at zero so the unlit hemisphere doesn't go negative (which would
  // make the night side darker than the ambient floor).
  float lambert = max(0.0, dot(normal, sunDir));
  vec3 lit = baseColor * (ambient + (1.0 - ambient) * lambert);
  // Earth's umbra: shadowFactor in [0..1], 1 = fully shadowed. Cap the
  // attenuation at 0.85 so a fully-eclipsed moon reads as a dim red-ish
  // disc rather than disappearing entirely.
  gl_FragColor = vec4(lit * (1.0 - shadowFactor * 0.85), 1.0);
}
`;
