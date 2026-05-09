// Canonical cities used by the LocationRail (Phase 4) and Earth test mode
// (renders bright red position-marker meshes at each city's lat/lng so the
// rail → setFocus → rotationForFocus → earth.rotation pipeline can be
// visually verified).
//
// Lives in @portfolio/celestial so both shell (rail) and the R3F EarthScene
// can import without a circular dependency.

export interface CanonicalCity {
  readonly key: string;
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

export const CANONICAL_CITIES: ReadonlyArray<CanonicalCity> = [
  { key: 'houston', label: 'Houston', lat: 29.76, lng: -95.37 },
  { key: 'sf', label: 'San Francisco', lat: 37.77, lng: -122.42 },
  { key: 'nyc', label: 'New York', lat: 40.71, lng: -74.01 },
  { key: 'reykjavik', label: 'Reykjavik', lat: 64.13, lng: -21.82 },
  { key: 'london', label: 'London', lat: 51.51, lng: -0.13 },
  { key: 'stpetersburg', label: 'Saint Petersburg', lat: 59.93, lng: 30.34 },
  { key: 'beijing', label: 'Beijing', lat: 39.9, lng: 116.4 },
  { key: 'tokyo', label: 'Tokyo', lat: 35.69, lng: 139.69 },
  { key: 'sydney', label: 'Sydney', lat: -33.87, lng: 151.21 },
];

// Great-circle distance between two lat/lng points using the haversine
// formula. Used by findClosestCanonical to pick the nearest pin for visitor
// resolution. Earth radius (km) only matters for absolute results — relative
// comparisons would work with any constant.
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);
  const h = sa * sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb * sb;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Closest canonical to an arbitrary lat/lng. Used by useVisitorLocation when
// the timezone fallback fires (geolocation succeeded but the visitor's tz is
// not in our hand-curated table) to snap to a known reference point, and by
// LocationRail to auto-promote the nearest pin to the selected state on
// first visit when no manual selection has been made.
export function findClosestCanonical(lat: number, lng: number): CanonicalCity {
  let best = CANONICAL_CITIES[0]!;
  let bestDist = haversineKm(lat, lng, best.lat, best.lng);
  for (let i = 1; i < CANONICAL_CITIES.length; i++) {
    const c = CANONICAL_CITIES[i]!;
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
