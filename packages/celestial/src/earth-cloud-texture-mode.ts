import { useState, useEffect } from 'react';

export type CloudTextureMode = 'nasa' | null;

const EVENT = 'portfolio:cloud-texture-mode';
let _current: CloudTextureMode = null;

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
