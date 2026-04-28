import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCelestialQuality, useEarthTestMode, type CelestialQuality } from '@portfolio/celestial';
import { registerDevAPI } from './dev-console';

// Bridges React-context state into the vanilla window.portfolio API installed
// by dev-console.ts. Mounted inside all relevant providers in App.tsx (dev
// builds only). Renders nothing.

export function DevConsoleBridge() {
  const navigate = useNavigate();
  const { setQuality } = useCelestialQuality();
  const { setTestMode } = useEarthTestMode();

  useEffect(() => {
    registerDevAPI({
      navigate: (path: string) => navigate(path),
      setQuality: (q: string) => setQuality(q as CelestialQuality),
      setEarthTestMode: (on: boolean) => setTestMode(on),
    });
  }, [navigate, setQuality, setTestMode]);

  return null;
}
