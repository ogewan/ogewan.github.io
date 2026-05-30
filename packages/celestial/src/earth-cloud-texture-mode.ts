import { useState, useEffect } from 'react';

export type CloudTextureMode = 'nasa' | null;

const EVENT = 'portfolio:cloud-texture-mode';

// Initial value bridged from the index.html pre-React script
// (window.__earthSystemCloudInit), which derives it from ?earthSystem=. Lets
// the cloud layer mount in the correct mode on first render — no need to
// wait for EarthSystemUrlSync's mount effect.
function readInitial(): CloudTextureMode {
  if (typeof window === 'undefined') return 'nasa';
  const w = window as unknown as { __earthSystemCloudInit?: CloudTextureMode };
  if (w.__earthSystemCloudInit === 'nasa' || w.__earthSystemCloudInit === null) {
    return w.__earthSystemCloudInit;
  }
  return 'nasa';
}

let _current: CloudTextureMode = readInitial();

export function getCloudTextureMode(): CloudTextureMode {
  return _current;
}

export function setCloudTextureMode(mode: CloudTextureMode): void {
  _current = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
  }
}

export function useCloudTextureMode(): CloudTextureMode {
  const [mode, setMode] = useState<CloudTextureMode>(_current);
  useEffect(() => {
    const handler = (e: Event) => setMode((e as CustomEvent<CloudTextureMode>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return mode;
}
