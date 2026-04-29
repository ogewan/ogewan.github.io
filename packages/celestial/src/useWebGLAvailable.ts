import { useEffect, useState } from 'react';

// Probe for usable WebGL by attempting context creation on a throwaway canvas.
// Sandboxed environments (some Electron embeds, GPU-disabled Chrome flags,
// blocklisted drivers) report `webgl`/`webgl2` as unavailable here, in which
// case CelestialBackdrop downgrades to the static PNG fallback rather than
// rendering a broken canvas with no recovery path.
//
// SSR-safe: returns `null` (= unknown) on the server and during the first
// render, then resolves to true/false in a layout-effect. Treat `null` as
// "not yet determined" — keep showing the static fallback until we know.

export type WebGLState = boolean | null;

function probeWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const ctx =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    if (!ctx) return false;
    // Force-release the context so the probe doesn't hold GPU memory.
    const lose = (ctx as WebGLRenderingContext).getExtension?.('WEBGL_lose_context');
    lose?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}

export function useWebGLAvailable(): WebGLState {
  const [available, setAvailable] = useState<WebGLState>(null);

  useEffect(() => {
    setAvailable(probeWebGL());
  }, []);

  return available;
}
