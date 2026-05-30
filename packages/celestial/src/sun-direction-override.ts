// Sun-direction override. Module-level mutable read each frame by EarthScene
// so the dev console can lock the subsolar point for screenshots or
// debugging. Stored as a unit Vector3 in EARTH-LOCAL space (the same frame
// `getSunDirection` returns), so the per-frame `applyQuaternion(earth)` path
// continues to handle Earth's rotation correctly.
//
// Setters: takes either a (lat, lng) subsolar point or a (hourUtc, dayOfYear)
// pair — both convert to the same Vector3 using the existing math in
// sun-direction.ts. Passing null clears the override.

import * as THREE from 'three';
import { getSunDirection } from './r3f/sun-direction.js';

let _override: THREE.Vector3 | null = null;

export function getSunDirectionOverride(): THREE.Vector3 | null {
  return _override;
}

export function setSunDirectionOverride(v: THREE.Vector3 | null): void {
  _override = v ? v.clone().normalize() : null;
}

// Convenience: lat/lng of the subsolar point. (0, 0) puts the sun overhead
// Greenwich (noon UTC at equinox). lat is the solar declination (~±23.45° at
// solstices), lng is `-15° × (UTC_hour - 12)` if you want clock-equivalence.
export function setSunFromPosition(lat: number, lng: number): void {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  _override = new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lngRad),
    Math.sin(latRad),
    -Math.cos(latRad) * Math.sin(lngRad),
  );
}

// Convenience: UTC hour and (optional) day-of-year. Reuses `getSunDirection`
// so the math stays identical to the default UTC-driven path.
export function setSunFromTime(hourUtc: number, dayOfYear?: number): void {
  const now = new Date();
  const year = now.getUTCFullYear();
  if (dayOfYear !== undefined) {
    const d = new Date(Date.UTC(year, 0, 1));
    d.setUTCDate(dayOfYear);
    d.setUTCHours(Math.floor(hourUtc), Math.round((hourUtc % 1) * 60), 0, 0);
    _override = getSunDirection(d);
    return;
  }
  const d = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()));
  d.setUTCHours(Math.floor(hourUtc), Math.round((hourUtc % 1) * 60), 0, 0);
  _override = getSunDirection(d);
}
