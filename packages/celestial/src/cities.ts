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
