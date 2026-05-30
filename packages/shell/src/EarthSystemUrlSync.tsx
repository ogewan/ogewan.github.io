import { useEffect } from 'react';
import { useLocation } from 'react-router';
import {
  setCloudTextureMode,
  useCloudTextureMode,
  useEarthTextureMode,
  type EarthTextureMode,
} from '@portfolio/celestial';

// `?earthSystem=` URL sync. The query param is the source of truth for the
// combined earth/moon/clouds texture mode:
//   ?earthSystem=nasa       → earth+moon load NASA webps, cloud layer on
//   ?earthSystem=procedural → canvas placeholders, cloud layer off
//
// Initial resolution (URL → localStorage → cloud module init) runs in an
// inline script in index.html BEFORE React mounts, so the first render
// already sees the correct mode and the URL already has the param. This
// component handles the *reactive* side — re-stamping the URL after every
// dev-API change, every React Router navigation, and keeping cloud mode
// reconciled when earth mode flips.
//
// Mounted inside the EarthTextureModeProvider in App.tsx so the React-side
// setter is reachable; renders nothing.

const URL_QUERY_KEY = 'earthSystem';

function writeModeToUrl(mode: EarthTextureMode): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(URL_QUERY_KEY) === mode) return;
    params.set(URL_QUERY_KEY, mode);
    const q = params.toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  } catch {
    // best-effort
  }
}

export function EarthSystemUrlSync() {
  const { textureMode } = useEarthTextureMode();
  const cloudMode = useCloudTextureMode();
  const location = useLocation();

  // When earth textureMode changes (dev console, system.textureMode, or
  // anything else), push the new value to the URL and re-sync clouds.
  useEffect(() => {
    writeModeToUrl(textureMode);
    const desiredCloud = textureMode === 'nasa' ? 'nasa' : null;
    if (cloudMode !== desiredCloud) setCloudTextureMode(desiredCloud);
  }, [textureMode, cloudMode]);

  // React Router navigation drops the query string from new paths by
  // default. Re-stamp earthSystem after every location change.
  useEffect(() => {
    writeModeToUrl(textureMode);
  }, [location.pathname, textureMode]);

  return null;
}
