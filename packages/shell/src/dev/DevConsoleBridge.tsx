import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  useCelestialQuality,
  useEarthPlaceholderMode,
  useEarthTestMode,
  useRingsClockMarkers,
  useRingsEffects,
  useRingsVisibility,
  type CelestialQuality,
} from '@portfolio/celestial';
import { registerDevAPI } from './dev-console';

// Bridges React-context state into the vanilla window.portfolio API installed
// by dev-console.ts. Mounted inside all relevant providers in App.tsx (dev
// builds only). Renders nothing.

export function DevConsoleBridge() {
  const navigate = useNavigate();
  const { setQuality } = useCelestialQuality();
  const { setTestMode } = useEarthTestMode();
  const { setPlaceholderMode } = useEarthPlaceholderMode();
  const { visible: ringsVisible, setVisible: setRingsVisible } = useRingsVisibility();
  const { clockVisible, setClockVisible } = useRingsClockMarkers();
  const {
    sparkles,
    clumps,
    spokes,
    bandFlow,
    scenePreserveTilt,
    setSparkles,
    setClumps,
    setSpokes,
    setBandFlow,
    setScenePreserveTilt,
  } = useRingsEffects();

  useEffect(() => {
    registerDevAPI({
      navigate: (path: string) => navigate(path),
      setQuality: (q: string) => setQuality(q as CelestialQuality),
      setEarthTestMode: (on: boolean) => setTestMode(on),
      setEarthPlaceholderMode: (on: boolean) => setPlaceholderMode(on),
      setRingsVisible: (on: boolean) => setRingsVisible(on),
      getRingsVisible: () => ringsVisible,
      setRingsClockVisible: (on: boolean) => setClockVisible(on),
      getRingsClockVisible: () => clockVisible,
      setRingsSparkles: (on: boolean) => setSparkles(on),
      getRingsSparkles: () => sparkles,
      setRingsClumps: (on: boolean) => setClumps(on),
      getRingsClumps: () => clumps,
      setRingsSpokes: (on: boolean) => setSpokes(on),
      getRingsSpokes: () => spokes,
      setRingsBandFlow: (on: boolean) => setBandFlow(on),
      getRingsBandFlow: () => bandFlow,
      setRingsScenePreserveTilt: (on: boolean) => setScenePreserveTilt(on),
      getRingsScenePreserveTilt: () => scenePreserveTilt,
    });
  }, [
    navigate,
    setQuality,
    setTestMode,
    setPlaceholderMode,
    setRingsVisible,
    ringsVisible,
    setClockVisible,
    clockVisible,
    setSparkles,
    sparkles,
    setClumps,
    clumps,
    setSpokes,
    spokes,
    setBandFlow,
    bandFlow,
    setScenePreserveTilt,
    scenePreserveTilt,
  ]);

  return null;
}
