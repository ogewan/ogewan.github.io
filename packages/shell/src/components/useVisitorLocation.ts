import { useEffect, useState } from 'react';

// Visitor location resolved without third-party services. Two-tier:
//   1. navigator.geolocation (precise; requires user permission)
//   2. Intl IANA timezone → known-city lookup (no prompt; rough)
// On both failures, surface the existing `failed` state and the rail falls
// back to Auto mode. Result is cached per session so the geolocation prompt
// only fires once.

export interface VisitorLocation {
  readonly city: string;
  readonly region: string | null;
  readonly country: string;
  readonly lat: number;
  readonly lng: number;
}

const STORAGE_KEY = 'portfolio:visitor-location';
const GEO_TIMEOUT_MS = 5000;
const GEO_MAX_AGE_MS = 600_000;

interface CachedEntry {
  readonly fetchedAt: number;
  readonly location: VisitorLocation | null; // null = resolved-as-failed; don't retry this session
}

function readCache(): CachedEntry | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedEntry): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // QuotaExceeded or storage disabled; silently degrade.
  }
}

// IANA timezone → representative city. Each entry pins lat/lng + a display
// label suitable for the contact section's "near {city}" line. Used both as
// the no-permission fallback and to label coordinates returned by the
// Geolocation API (which gives no city name). Unknown timezones fall
// through to null and the rail shows Auto.
//
// Cities are the timezone's anchor population center, NOT necessarily one of
// the 9 canonical rail cities — the visitor pin is meant to be distinct from
// the canonical pins, and lat/lng equality with 0.5° tolerance dedups onto
// the canonical when the visitor is genuinely near one.
const TZ_TO_LOCATION: Readonly<Record<string, VisitorLocation>> = {
  // UK + Ireland
  'Europe/London': {
    city: 'London',
    region: null,
    country: 'United Kingdom',
    lat: 51.51,
    lng: -0.13,
  },
  'Europe/Dublin': { city: 'Dublin', region: null, country: 'Ireland', lat: 53.35, lng: -6.26 },
  // Western/Central Europe
  'Europe/Paris': { city: 'Paris', region: null, country: 'France', lat: 48.86, lng: 2.35 },
  'Europe/Berlin': { city: 'Berlin', region: null, country: 'Germany', lat: 52.52, lng: 13.4 },
  'Europe/Madrid': { city: 'Madrid', region: null, country: 'Spain', lat: 40.42, lng: -3.7 },
  'Europe/Rome': { city: 'Rome', region: null, country: 'Italy', lat: 41.9, lng: 12.5 },
  'Europe/Amsterdam': {
    city: 'Amsterdam',
    region: null,
    country: 'Netherlands',
    lat: 52.37,
    lng: 4.9,
  },
  'Europe/Stockholm': {
    city: 'Stockholm',
    region: null,
    country: 'Sweden',
    lat: 59.33,
    lng: 18.07,
  },
  // Eastern Europe
  'Europe/Moscow': {
    city: 'Saint Petersburg',
    region: null,
    country: 'Russia',
    lat: 59.93,
    lng: 30.34,
  },
  // North Atlantic
  'Atlantic/Reykjavik': {
    city: 'Reykjavik',
    region: null,
    country: 'Iceland',
    lat: 64.13,
    lng: -21.82,
  },
  // North America
  'America/New_York': {
    city: 'New York',
    region: null,
    country: 'United States',
    lat: 40.71,
    lng: -74.01,
  },
  'America/Toronto': { city: 'Toronto', region: null, country: 'Canada', lat: 43.65, lng: -79.38 },
  'America/Chicago': {
    city: 'Houston',
    region: null,
    country: 'United States',
    lat: 29.76,
    lng: -95.37,
  },
  'America/Denver': {
    city: 'Denver',
    region: null,
    country: 'United States',
    lat: 39.74,
    lng: -104.99,
  },
  'America/Los_Angeles': {
    city: 'San Francisco',
    region: null,
    country: 'United States',
    lat: 37.77,
    lng: -122.42,
  },
  'America/Vancouver': {
    city: 'Vancouver',
    region: null,
    country: 'Canada',
    lat: 49.28,
    lng: -123.12,
  },
  // Asia
  'Asia/Tokyo': { city: 'Tokyo', region: null, country: 'Japan', lat: 35.69, lng: 139.69 },
  'Asia/Seoul': { city: 'Seoul', region: null, country: 'South Korea', lat: 37.57, lng: 126.98 },
  'Asia/Shanghai': { city: 'Beijing', region: null, country: 'China', lat: 39.9, lng: 116.4 },
  'Asia/Hong_Kong': { city: 'Hong Kong', region: null, country: 'China', lat: 22.32, lng: 114.17 },
  'Asia/Singapore': {
    city: 'Singapore',
    region: null,
    country: 'Singapore',
    lat: 1.35,
    lng: 103.82,
  },
  // Oceania
  'Australia/Sydney': {
    city: 'Sydney',
    region: null,
    country: 'Australia',
    lat: -33.87,
    lng: 151.21,
  },
  'Australia/Melbourne': {
    city: 'Melbourne',
    region: null,
    country: 'Australia',
    lat: -37.81,
    lng: 144.96,
  },
};

function getTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function tryTimezone(): VisitorLocation | null {
  const tz = getTimezone();
  if (!tz) return null;
  return TZ_TO_LOCATION[tz] ?? null;
}

function tryGeolocationApi(): Promise<VisitorLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // We have precise coordinates but no city name. Borrow the timezone
        // mapping for a recognizable label so the contact line reads
        // naturally ("near London"). If the timezone is unknown we fall back
        // to a generic placeholder rather than failing — the precise
        // coordinates are still useful for the map marker.
        const tzMatch = tryTimezone();
        resolve({
          city: tzMatch?.city ?? 'Your location',
          region: null,
          country: tzMatch?.country ?? '',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      {
        timeout: GEO_TIMEOUT_MS,
        maximumAge: GEO_MAX_AGE_MS,
        enableHighAccuracy: false,
      },
    );
  });
}

async function fetchVisitorLocation(): Promise<VisitorLocation | null> {
  const fromGeo = await tryGeolocationApi();
  if (fromGeo) return fromGeo;
  return tryTimezone();
}

export type VisitorLocationStatus =
  | { state: 'loading'; location: null }
  | { state: 'resolved'; location: VisitorLocation }
  | { state: 'failed'; location: null };

export function useVisitorLocation(): VisitorLocationStatus {
  const [status, setStatus] = useState<VisitorLocationStatus>(() => {
    const cached = readCache();
    if (!cached) return { state: 'loading', location: null };
    if (cached.location) return { state: 'resolved', location: cached.location };
    return { state: 'failed', location: null };
  });

  useEffect(() => {
    if (status.state !== 'loading') return;
    let cancelled = false;
    void fetchVisitorLocation().then((location) => {
      if (cancelled) return;
      writeCache({ fetchedAt: Date.now(), location });
      setStatus(location ? { state: 'resolved', location } : { state: 'failed', location: null });
    });
    return () => {
      cancelled = true;
    };
  }, [status.state]);

  return status;
}
