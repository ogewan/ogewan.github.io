import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from '@react-three/postprocessing';
import type { SceneName } from '../scenes.js';
import { CAMERA_TWEEN_DURATION_SEC, CameraDriver } from './CameraDriver.js';
import { SharedStarField } from './SharedStarField.js';
import { MobileSettingsProvider } from './MobileSettings.js';
import { EarthScene } from './scenes/EarthScene.js';
import { ProjectsScene } from './scenes/ProjectsScene.js';
import { ContactScene } from './scenes/ContactScene.js';
import { ColophonScene } from './scenes/ColophonScene.js';
import {
  GravitationalLensing,
  type GravitationalLensingEffectImpl,
} from './scenes/GravitationalLensingEffect.js';
import { getSunDirection } from './sun-direction.js';

// The R3F slice of the celestial backdrop, factored out so it can be
// React.lazy-loaded by CelestialBackdrop. Three.js + R3F + drei + gsap
// together are ~270 KB gz; reduced-motion users (who get the static
// fallback) never download any of it because this module is dynamic-
// imported only inside the non-reduced-motion branch.
//
// Scenes mount once and stay mounted; only the camera moves on route swap.
// During a route tween, the previous scene stays visible until the
// tween completes — so the user sees the previous scene smoothly recede
// as the camera carries them to the next anchor, rather than the
// previous scene popping out of existence at the start of the warp.

interface Canvas3DProps {
  scene: SceneName;
}

export default function Canvas3D({ scene }: Canvas3DProps) {
  // Shared sun-direction uniform. Lifted out of EarthScene so ProjectsScene
  // (and future scenes) can read the same world-space sun vector. EarthScene
  // owns the per-frame mutation: each frame it transforms its earth-local
  // sun vector by the earth group's quaternion and writes the world-space
  // result here (gotcha #27 + #28). Other scenes read but never mutate.
  // Initial value is the world-space sun direction at mount; identity
  // quaternion on first frame means this is correct until EarthScene's
  // first useFrame fires.
  const sunDirection = useMemo(
    () => ({ value: new THREE.Vector3().copy(getSunDirection(new Date())) }),
    [],
  );

  // previousScene retains the prior scene for the duration of the route
  // tween. When `scene` changes, we capture the outgoing name and schedule
  // a clear after CAMERA_TWEEN_DURATION_SEC. Each scene component checks
  // both `scene` and `previousScene` to decide whether to render itself.
  const lensingEffectRef = useRef<GravitationalLensingEffectImpl | null>(null);

  const [previousScene, setPreviousScene] = useState<SceneName | null>(null);
  const lastSceneRef = useRef(scene);

  // EffectComposer mounts only when colophon is active, and only AFTER the
  // camera tween completes (CAMERA_TWEEN_DURATION_SEC delay on enter). This
  // prevents EffectComposer's LinearSRGBColorSpace side-effect from brightening
  // other scenes or flashing during the contact→colophon transition. On exit,
  // it stays mounted for the same duration to cover the exit animation, then
  // unmounts — restoring SRGBColorSpace for all subsequent scenes.
  // Cold-load on colophon: activate immediately (no transition to hide).
  // Navigation to colophon delays activation via setTimeout in useLayoutEffect.
  const [lensingActive, setLensingActive] = useState(scene === 'colophon');

  // useLayoutEffect (not useEffect) so the previousScene state update commits
  // before the browser paints. useEffect fires after paint, leaving one frame
  // where scene has changed but previousScene is still null — the outgoing
  // scene's visibility gate sees (newScene || null) = false and blinks out.
  // useLayoutEffect fires synchronously after DOM mutations; React resolves
  // the re-render before yielding to the browser, so the blink never shows.
  useLayoutEffect(() => {
    if (lastSceneRef.current === scene) return undefined;
    const outgoing = lastSceneRef.current;
    setPreviousScene(outgoing);
    lastSceneRef.current = scene;

    const tweenMs = CAMERA_TWEEN_DURATION_SEC * 1000;
    let lensingTimer: number | undefined;

    if (scene === 'colophon') {
      // Delay EffectComposer mount until the camera has fully arrived — mirrors
      // the exit: just as the nebula is hidden behind EffectComposer on enter,
      // EffectComposer is gone before the nebula reappears on exit.
      lensingTimer = window.setTimeout(() => setLensingActive(true), tweenMs);
    } else if (outgoing === 'colophon') {
      // Unmount immediately so EffectComposer's LinearSRGBColorSpace effect is
      // gone before the camera starts moving toward the contact nebula.
      setLensingActive(false);
    }

    const handle = window.setTimeout(() => {
      setPreviousScene(null);
    }, tweenMs);

    return () => {
      window.clearTimeout(handle);
      if (lensingTimer !== undefined) window.clearTimeout(lensingTimer);
    };
  }, [scene]);

  return (
    <MobileSettingsProvider>
      <Canvas
        // High-DPI cap — a backdrop doesn't need 3× pixel ratio. Capping at
        // 2 keeps fragment shader cost bounded for 9.4 (nebula) and 9.5
        // (raymarched black hole).
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        // Far plane sized to comfortably cover the colophon anchor at
        // z=7800. 9000 leaves ~1200 units of margin and keeps depth-buffer
        // precision acceptable (no shadows, no z-fighting cases). The
        // starfield is camera-followed (see SharedStarField.tsx) so it
        // doesn't factor into the far-plane budget.
        camera={{ position: [0, 0, 4], fov: 45, near: 0.1, far: 9000 }}
        // Transparent so the body's design-token gradient shows through
        // behind the canvas.
        style={{ background: 'transparent' }}
      >
        {/* Ambient + directional lighting drives the placeholder material's
            shading. Earth scene in 9.1 will take over its own sun direction
            from UTC; until then this is the global fill. */}
        <ambientLight intensity={0.18} />
        <directionalLight position={[5, 3, 5]} intensity={0.9} />

        {/* Lensing post-process — mounted only after the colophon camera tween
            completes (lensingActive), so EffectComposer's LinearSRGBColorSpace
            side-effect never touches other scenes or flashes during the
            contact→colophon transition. Stays mounted for the full exit-tween
            window so the distortion fade-out completes before unmount. */}
        {lensingActive && (
          <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
            <GravitationalLensing ref={lensingEffectRef} />
          </EffectComposer>
        )}

        <SharedStarField />
        <CameraDriver scene={scene} />

        {/* About no longer mounts a separate scene — its camera anchor in
            scene-anchors.ts shares the Earth lookAt, just pulled back. The
            Earth + Moon system here is what About frames at wider focal.
            EarthScene takes the active `scene` so its root group can hide
            (visible={false}) once the camera leaves earth/about — keeps
            Earth from rendering as a stray dot in the projects framing.
            sunDirection is the shared world-space sun-direction uniform;
            EarthScene mutates it per frame, every other scene reads it. */}
        <EarthScene scene={scene} previousScene={previousScene} sunDirection={sunDirection} />
        <ProjectsScene scene={scene} previousScene={previousScene} sunDirection={sunDirection} />
        <ContactScene scene={scene} previousScene={previousScene} />
        <ColophonScene
          scene={scene}
          previousScene={previousScene}
          lensingEffectRef={lensingEffectRef}
        />
      </Canvas>
    </MobileSettingsProvider>
  );
}
