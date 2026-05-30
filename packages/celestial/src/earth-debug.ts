// Dev-only EarthScene overrides — ephemeral (not persisted) since these are
// purely for inspecting the moon texture / lighting at runtime. EarthScene's
// useFrame polls these each frame; the dev console writes them via
// window.portfolio.earth.hide() / moonFocus() / moonLight().
//
// No subscribe pattern — readers poll per-frame; writers mutate directly.

let _earthHidden = false;
let _moonAmbient: number | null = null;
let _moonCameraFocus = false;

export function getEarthHidden(): boolean {
  return _earthHidden;
}

export function setEarthHidden(v: boolean): void {
  _earthHidden = v;
}

export function getMoonAmbientOverride(): number | null {
  return _moonAmbient;
}

export function setMoonAmbientOverride(v: number | null): void {
  _moonAmbient = v;
}

export function getMoonCameraFocus(): boolean {
  return _moonCameraFocus;
}

export function setMoonCameraFocus(v: boolean): void {
  _moonCameraFocus = v;
}
