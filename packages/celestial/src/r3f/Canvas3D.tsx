import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneName } from '../scenes.js';
import { CAMERA_TWEEN_DURATION_SEC, CameraDriver } from './CameraDriver.js';
import { SharedStarField } from './SharedStarField.js';
import { MobileSettingsProvider } from './MobileSettings.js';
import { EarthScene } from './scenes/EarthScene.js';
import { ProjectsScene } from './scenes/ProjectsScene.js';
import { ContactScene } from './scenes/ContactScene.js';
import { ColophonScene } from './scenes/ColophonScene.js';
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
  const [previousScene, setPreviousScene] = useState<SceneName | null>(null);
  const lastSceneRef = useRef(scene);

  useEffect(() => {
    if (lastSceneRef.current === scene) return undefined;
    setPreviousScene(lastSceneRef.current);
    lastSceneRef.current = scene;
    const handle = window.setTimeout(() => {
      setPreviousScene(null);
    }, CAMERA_TWEEN_DURATION_SEC * 1000);
    return () => window.clearTimeout(handle);
  }, [scene]);

  return (
    <MobileSettingsProvider>
      <Canvas
        // High-DPI cap — a backdrop doesn't need 3× pixel ratio. Capping at
        // 2 keeps fragment shader cost bounded for 9.4 (nebula) and 9.5
        // (raymarched black hole).
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        // Far plane sized to comfortably cover the contact anchor at
        // z=4025. 5000 leaves ~975 units of margin and keeps depth-buffer
        // precision acceptable (no shadows, no z-fighting cases). The
        // starfield is now camera-followed (see SharedStarField.tsx) so
        // it doesn't factor into the far-plane budget.
        camera={{ position: [0, 0, 4], fov: 45, near: 0.1, far: 5000 }}
        // Transparent so the body's design-token gradient shows through
        // behind the canvas.
        style={{ background: 'transparent' }}
      >
        {/* Ambient + directional lighting drives the placeholder material's
            shading. Earth scene in 9.1 will take over its own sun direction
            from UTC; until then this is the global fill. */}
        <ambientLight intensity={0.18} />
        <directionalLight position={[5, 3, 5]} intensity={0.9} />

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
        <ColophonScene scene={scene} previousScene={previousScene} />
      </Canvas>
    </MobileSettingsProvider>
  );
}
