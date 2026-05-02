// Module-scoped pub/sub store for the EffectComposer mount gate.
//
// `lensingActive` controls whether Canvas3D mounts the post-processing
// EffectComposer (gravitational lensing). Default behavior: Canvas3D's
// scene-transition logic flips it on when the colophon camera tween
// completes, off as soon as the camera leaves colophon.
//
// This store exposes the same boolean to the dev console
// (`portfolio.blackhole.effectComposer.show/hide/toggle`), so the user
// can manually mount/unmount EffectComposer for debugging without
// having to navigate. Manual writes win until the next scene transition,
// at which point the auto-logic in Canvas3D takes over again — that's
// the intended behavior; the override is a temporary diagnostic, not a
// persistent setting.
//
// `colophonSceneActive` is a separate, simpler flag: true whenever the
// colophon scene is the active destination (set immediately on scene
// change, no tween delay). SharedStarField polls this each frame to pick
// the right background config set (colophon vs global) independently of
// when the EffectComposer actually mounts.

let value = false;
const listeners = new Set<() => void>();

export function getLensingActive(): boolean {
  return value;
}

export function setLensingActive(next: boolean): void {
  if (next === value) return;
  value = next;
  listeners.forEach((l) => l());
}

export function subscribeLensingActive(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let colophonScene = false;

export function getColophonSceneActive(): boolean {
  return colophonScene;
}

export function setColophonSceneActive(next: boolean): void {
  colophonScene = next;
}
