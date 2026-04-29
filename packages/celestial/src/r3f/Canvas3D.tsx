import { Canvas } from '@react-three/fiber';
import type { SceneName } from '../scenes.js';
import { CameraDriver } from './CameraDriver.js';
import { SharedStarField } from './SharedStarField.js';
import { MobileSettingsProvider } from './MobileSettings.js';
import { EarthScene } from './scenes/EarthScene.js';
import { ProjectsScene } from './scenes/ProjectsScene.js';
import { ContactScene } from './scenes/ContactScene.js';
import { ColophonScene } from './scenes/ColophonScene.js';

// The R3F slice of the celestial backdrop, factored out so it can be
// React.lazy-loaded by CelestialBackdrop. Three.js + R3F + drei + gsap
// together are ~270 KB gz; reduced-motion users (who get the static
// fallback) never download any of it because this module is dynamic-
// imported only inside the non-reduced-motion branch.
//
// Scenes mount once and stay mounted; only the camera moves on route swap.

interface Canvas3DProps {
  scene: SceneName;
}

export default function Canvas3D({ scene }: Canvas3DProps) {
  return (
    <MobileSettingsProvider>
      <Canvas
        // High-DPI cap — a backdrop doesn't need 3× pixel ratio. Capping at
        // 2 keeps fragment shader cost bounded for 9.4 (nebula) and 9.5
        // (raymarched black hole).
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        // Far defaults to 1000 in R3F; tour line reaches z = -340 plus a
        // 400-unit star sphere, so 2000 is the safe horizon.
        camera={{ position: [0, 0, 4], fov: 45, near: 0.1, far: 2000 }}
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
            Earth + Moon system here is what About frames at wider focal. */}
        <EarthScene />
        <ProjectsScene />
        <ContactScene />
        <ColophonScene />
      </Canvas>
    </MobileSettingsProvider>
  );
}
