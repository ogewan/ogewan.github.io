// Cloud-layer shader. Mirrors the earth shader's vertex pass to produce a
// world-space normal, then applies a clamped lambert against the same
// sunDirection uniform — so the cloud layer darkens on the night side the
// same way the earth surface does.
//
// Cloud density is read from the texture:
//   Procedural canvas (RGBA): uses the alpha channel directly.
//   NASA webp (opaque RGB):   uses RGB luminance as density.
// The 0.99 alpha threshold distinguishes them without a separate mode uniform.

export const cloudVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const cloudFragmentShader = /* glsl */ `
uniform sampler2D cloudMap;
uniform vec3 sunDirection;
uniform float cloudOpacity;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec4 cloud = texture2D(cloudMap, vUv);

  // Procedural canvas: white blobs drawn with variable alpha → a < 0.99.
  // NASA texture: opaque RGB image, cloud coverage in luminance.
  float density = cloud.a < 0.99
    ? cloud.a
    : dot(cloud.rgb, vec3(0.299, 0.587, 0.114));

  float lambert = max(0.0, dot(normalize(vNormal), normalize(sunDirection)));
  float ambient = 0.15;
  float light = ambient + (1.0 - ambient) * lambert;

  gl_FragColor = vec4(vec3(light), density * cloudOpacity);
}
`;
