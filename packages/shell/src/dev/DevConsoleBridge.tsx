import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  useBackgroundConfig,
  useBlackHoleConfig,
  useCelestialQuality,
  useEarthPlaceholderMode,
  useEarthTestMode,
  useNebulaeConfig,
  useRingsClockMarkers,
  useRingsEffects,
  useRingsVisibility,
  type CelestialQuality,
  type NebulaVariant,
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
  const nebulae = useNebulaeConfig();
  const bh = useBlackHoleConfig();
  const bg = useBackgroundConfig();

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
      setNebulaVariant: (v) => nebulae.setVariant(v as NebulaVariant),
      getNebulaVariant: () => nebulae.variant,
      setNebulaVisible: (on) => nebulae.setVisible(on),
      getNebulaVisible: () => nebulae.visible,
      setBillboardsVisible: (on) => nebulae.setBillboardsVisible(on),
      getBillboardsVisible: () => nebulae.billboardsVisible,
      setBillboardLayerCount: (n) => nebulae.setBillboardLayerCount(n),
      getBillboardLayerCount: () => nebulae.billboardLayerCount,
      setBillboardJitter: (n) => nebulae.setBillboardJitter(n),
      getBillboardJitter: () => nebulae.billboardJitter,
      setBillboardScale: (n) => nebulae.setBillboardScale(n),
      getBillboardScale: () => nebulae.billboardScale,
      setBillboardBrightness: (n) => nebulae.setBillboardBrightness(n),
      getBillboardBrightness: () => nebulae.billboardBrightness,
      setBillboardSaturation: (n) => nebulae.setBillboardSaturation(n),
      getBillboardSaturation: () => nebulae.billboardSaturation,
      setBillboardGlow: (n) => nebulae.setBillboardGlow(n),
      getBillboardGlow: () => nebulae.billboardGlow,
      setBillboardDrift: (on) => nebulae.setBillboardDrift(on),
      getBillboardDrift: () => nebulae.billboardDrift,
      setParticlesVisible: (on) => nebulae.setParticlesVisible(on),
      getParticlesVisible: () => nebulae.particlesVisible,
      setParticleCount: (n) => nebulae.setParticleCount(n),
      getParticleCount: () => nebulae.particleCount,
      setParticleSize: (n) => nebulae.setParticleSize(n),
      getParticleSize: () => nebulae.particleSize,
      setParticleJitter: (n) => nebulae.setParticleJitter(n),
      getParticleJitter: () => nebulae.particleJitter,
      setParticleBrightness: (n) => nebulae.setParticleBrightness(n),
      getParticleBrightness: () => nebulae.particleBrightness,
      setParticleSaturation: (n) => nebulae.setParticleSaturation(n),
      getParticleSaturation: () => nebulae.particleSaturation,
      setParticleGlow: (n) => nebulae.setParticleGlow(n),
      getParticleGlow: () => nebulae.particleGlow,
      setParticleDrift: (on) => nebulae.setParticleDrift(on),
      getParticleDrift: () => nebulae.particleDrift,
      // Black hole
      setBhVisible: (on) => bh.setVisible(on),
      getBhVisible: () => bh.visible,
      setBhSchwarschildRadius: (n) => bh.setSchwarschildRadius(n),
      getBhSchwarschildRadius: () => bh.schwarzschildRadius,
      setBhDiskTilt: (n) => bh.setDiskTilt(n),
      getBhDiskTilt: () => bh.diskTilt,
      setBhDiskInnerFactor: (n) => bh.setDiskInnerFactor(n),
      getBhDiskInnerFactor: () => bh.diskInnerFactor,
      setBhDiskOuterFactor: (n) => bh.setDiskOuterFactor(n),
      getBhDiskOuterFactor: () => bh.diskOuterFactor,
      setBhDiskBrightness: (n) => bh.setDiskBrightness(n),
      getBhDiskBrightness: () => bh.diskBrightness,
      setBhDiskSaturation: (n) => bh.setDiskSaturation(n),
      getBhDiskSaturation: () => bh.diskSaturation,
      setBhDiskTurbulence: (n) => bh.setDiskTurbulence(n),
      getBhDiskTurbulence: () => bh.diskTurbulence,
      setBhDiskDrift: (on) => bh.setDiskDrift(on),
      getBhDiskDrift: () => bh.diskDrift,
      setBhDiskRotationSpeed: (n) => bh.setDiskRotationSpeed(n),
      getBhDiskRotationSpeed: () => bh.diskRotationSpeed,
      setBhDopplerStrength: (n) => bh.setDopplerStrength(n),
      getBhDopplerStrength: () => bh.dopplerStrength,
      setBhDistortionStrength: (n) => bh.setDistortionStrength(n),
      getBhDistortionStrength: () => bh.distortionStrength,
      setBhPhotonRing: (on) => bh.setPhotonRing(on),
      getBhPhotonRing: () => bh.photonRing,
      setBhDiskClock: (on) => bh.setDiskClock(on),
      getBhDiskClock: () => bh.diskClock,
      setBhCameraElevation: (n) => bh.setCameraElevation(n),
      getBhCameraElevation: () => bh.cameraElevation,
      setBhBloomIntensity: (n) => bh.setBloomIntensity(n),
      getBhBloomIntensity: () => bh.bloomIntensity,
      // Background sky — three independent sets.
      getBgGlobal: () => bg.global,
      setBgGlobal: (partial) => bg.setSet('global', partial),
      getBgColophon: () => bg.colophon,
      setBgColophon: (partial) => bg.setSet('colophon', partial),
      getBgCubemap: () => bg.cubemap,
      setBgCubemap: (partial) => bg.setSet('cubemap', partial),
      resetBackgroundConfig: () => bg.reset(),
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
    nebulae,
    bh,
    bg,
  ]);

  return null;
}
