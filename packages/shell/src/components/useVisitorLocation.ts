import { useEffect, useState } from 'react';

// Visitor location resolved via ipapi.co. Cached per session so the rail
// doesn't re-fetch on every navigation. Brief: on failure, default to Auto
// mode — never pick a fallback city, because guessing wrong is worse than
// admitting we don't know.

export interface VisitorLocation {
  readonly city: string;
  readonly region: string | null;
  readonly country: string;
  readonly lat: number;
  readonly lng: number;
}

const STORAGE_KEY = 'portfolio:visitor-location';

interface CachedEntry {
  readonly fetchedAt: number;
  readonly location: VisitorLocation | null; // null = fetch failed, don't retry this session
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

interface IpapiResponse {
  city?: string;
  region?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  error?: boolean;
}

async function fetchVisitorLocation(): Promise<VisitorLocation | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as IpapiResponse;
    if (data.error || !data.city || data.latitude == null || data.longitude == null) {
      return null;
    }
    return {
      city: data.city,
      region: data.region ?? null,
      country: data.country_name ?? '',
      lat: data.latitude,
      lng: data.longitude,
    };
  } catch {
    return null;
  }
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
