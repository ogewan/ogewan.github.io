// Earth day/night shader. Vertex passes world-space normal + view direction;
// fragment blends between two sphere textures across the terminator using a
// sun-direction uniform, then adds an atmospheric Fresnel rim.
//
// Sun direction is in world space (computed from UTC by the host component
// once at mount). The sphere rotates inside its parent group; because the
// vertex shader transforms `normal` through `modelMatrix`, the lambert dot
// stays correct as the planet rotates beneath the fixed sun. That's exactly
// the intent — continents rotate, terminator does not.

export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  // Normal in world space: rotates with the mesh's group transform so the
  // terminator stays fixed against the world-space sun direction.
  vNormal = normalize(mat3(modelMatrix) * normal);
  // View direction in world space, vertex → camera.
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// Earth test-mode shader: procedural UV checker grid + bold equator + bold
// prime meridian. No textures, no lighting. Used by EarthScene when
// useEarthTestMode().testMode is true to verify that city-marker meshes land
// at the expected lat/lng positions and that the focus-rotation pipeline
// brings the right city under the camera.
//
// Cell sizing: 24 columns × 12 rows ≈ 15° per cell.

export const earthTestVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const earthTestFragmentShader = /* glsl */ `
varying vec2 vUv;

void main() {
  // Checker pattern. Both cell colors are bright enough to read clearly
  // against the dark page background — the earth silhouette must be obvious
  // for the city dots to be positionally meaningful.
  float cu = floor(vUv.x * 24.0);
  float cv = floor(vUv.y * 12.0);
  float chk = mod(cu + cv, 2.0);
  vec3 base = mix(vec3(0.42, 0.46, 0.52), vec3(0.82, 0.85, 0.88), chk);

  // Equator (v=0.5) and prime meridian (u=0.5). Lines anti-aliased via
  // smoothstep so they look crisp at any zoom level. Cyan to match the
  // site's accent color.
  float equator = 1.0 - smoothstep(0.0, 0.004, abs(vUv.y - 0.5));
  float prime = 1.0 - smoothstep(0.0, 0.004, abs(vUv.x - 0.5));
  float seam = max(equator, prime);
  vec3 color = mix(base, vec3(0.36, 0.84, 0.92), seam);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const earthFragmentShader = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDirection;
uniform vec3 rimColor;
uniform float rimIntensity;
uniform float nightBoost;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewDir);
  vec3 sunDir = normalize(sunDirection);

  vec4 dayColor = texture2D(dayMap, vUv);
  vec4 nightColor = texture2D(nightMap, vUv);

  // Lambert across the terminator; smoothstep keeps the day/night seam from
  // being a hard line. Asymmetric range biases night slightly toward the
  // unlit hemisphere so city lights read well past the geometric edge.
  float lambert = dot(normal, sunDir);
  float dayMix = smoothstep(-0.10, 0.25, lambert);
  vec3 surface = mix(nightColor.rgb * nightBoost, dayColor.rgb, dayMix);

  // Atmospheric rim — Fresnel against the camera. Only visible from the day
  // side (lambert > -0.1), so the night silhouette stays dark.
  float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
  float rimMask = smoothstep(-0.1, 0.3, lambert);
  vec3 rim = rimColor * fresnel * rimIntensity * rimMask;

  gl_FragColor = vec4(surface + rim, 1.0);
}
`;
