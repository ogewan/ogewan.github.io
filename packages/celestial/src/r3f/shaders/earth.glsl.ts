// Earth day/night shader. Vertex passes world-space normal + view direction;
// fragment blends between two sphere textures across the terminator using a
// sun-direction uniform, then adds an atmospheric Fresnel rim.
//
// Sun direction is in world space and updated per frame by the host
// component: sunLocal (computed once from UTC at mount) is rotated by the
// earth group's current quaternion before being written into the uniform.
// That keeps the lambert correct as the planet rotates — for any focused
// city, lambert reduces to cityLocal · sunLocal, which is the time-correct
// illumination regardless of focus rotation.

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

// City-dot shader. The dots are tiny sphere meshes parented to the rotating
// earth group, but their own per-vertex normals point in every direction —
// no useful "this dot is on the day side" signal there. We pass the city's
// surface normal in earth-LOCAL frame as a uniform, transform it through
// mat3(modelMatrix) (which collapses to the earth group's rotation since the
// dot's own matrix is pure translation and the scene-anchor is pure
// translation), then lambert against the world-space sunDirection uniform
// shared with the earth shader. Dim red on day side; bright warm yellow on
// night side — reads as city lights through the dark hemisphere.

export const cityDotVertexShader = /* glsl */ `
uniform vec3 cityNormalLocal;
varying vec3 vCityNormalWorld;

void main() {
  vCityNormalWorld = normalize(mat3(modelMatrix) * cityNormalLocal);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const cityDotFragmentShader = /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 dayColor;
uniform vec3 nightColor;

varying vec3 vCityNormalWorld;

void main() {
  vec3 normal = normalize(vCityNormalWorld);
  vec3 sunDir = normalize(sunDirection);
  float lambert = dot(normal, sunDir);
  // Same ±0.2 lambert window the earth shader uses for its day/night seam.
  float nightFactor = smoothstep(0.2, -0.2, lambert);
  gl_FragColor = vec4(mix(dayColor, nightColor, nightFactor), 1.0);
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
