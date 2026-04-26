import * as THREE from 'three';

// Subsolar-point computation: given UTC, return a unit vector pointing from
// Earth's center toward the sun in world space. The fragment shader uses this
// as the lambert direction.
//
// Approximation chosen for visual fidelity, not navigation:
//
//   declination (latitude of subsolar point):
//     δ ≈ -23.45° · sin(2π · (N - 80) / 365.25)
//   where N is day-of-year (Jan 1 = 1) and 80 is the spring-equinox offset.
//
//   hour angle (longitude of subsolar point):
//     λ ≈ -15° · (UTC_hour - 12)
//   so λ = 0° when it's noon UTC (sun over Greenwich), -90° (90°W) at 18:00
//   UTC. Sign convention: positive longitude east of prime meridian; negative
//   subsolar longitude as time advances (sun moves westward across the planet).
//
// We don't account for the equation of time (~±15 min seasonal correction) or
// orbital eccentricity. Casual viewers can't tell the difference; pilots can,
// but they don't fly portfolios.
//
// Coordinate system: Three.js right-handed, +Y up. Latitude rotates around the
// XZ plane (Y is the polar axis); longitude rotates around Y in the XZ plane.
// (lng=0, lat=0) maps to +X. With the Earth oriented so its rotation Y-axis
// points up (default sphereGeometry), lng=0 points along +X in local space.

export function getSunDirection(date: Date): THREE.Vector3 {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / (1000 * 60 * 60 * 24)) + 1;

  const declDeg = -23.45 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365.25);
  const declRad = (declDeg * Math.PI) / 180;

  const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lngDeg = -15 * (hourUtc - 12);
  const lngRad = (lngDeg * Math.PI) / 180;

  return new THREE.Vector3(
    Math.cos(declRad) * Math.cos(lngRad),
    Math.sin(declRad),
    Math.cos(declRad) * Math.sin(lngRad),
  );
}

// Convert a (lat, lng) target on the Earth's surface into the rotation we
// need to apply to the Earth's group so that the target faces the camera
// (i.e. ends up at the +Z side of the sphere, since the camera sits at
// positive Z relative to the Earth's anchor and looks toward -Z).
//
// Returns Euler angles {x, y} in radians, suitable for a gsap tween on
// `earthRef.current.rotation`.
export interface FocusRotation {
  readonly x: number;
  readonly y: number;
}

export function rotationForFocus(lat: number, lng: number): FocusRotation {
  // For lng=0 to face +Z (camera side), the local +X point on the sphere
  // (which corresponds to lng=0 by sphereGeometry's UV unwrap) must rotate to
  // +Z. That's a -π/2 Y rotation (right-hand rule). For arbitrary lng, we
  // rotate further by -lng·π/180.
  const y = (-lng * Math.PI) / 180 - Math.PI / 2;
  // Latitude rotates the sphere around the X axis so the target lat sits at
  // the equator from the camera's view. North-pole-up convention.
  const x = (lat * Math.PI) / 180;
  return { x, y };
}
