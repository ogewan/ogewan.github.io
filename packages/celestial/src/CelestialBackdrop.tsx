import { useLocation } from 'react-router';
import { sceneFromPathname, SCENE_ORDER, type SceneName } from './scenes.js';
import { Stars } from './scenes/Stars.js';
import { EarthScene } from './scenes/EarthScene.js';
import { AboutScene } from './scenes/AboutScene.js';
import { ProjectsScene } from './scenes/ProjectsScene.js';
import { ContactScene } from './scenes/ContactScene.js';
import { ColophonScene } from './scenes/ColophonScene.js';

// Persistent celestial backdrop. Fixed full-viewport, aria-hidden, lives behind
// all shell content. The route's scene is derived by sceneFromPathname; we render
// every scene layer simultaneously and crossfade their opacity for the 1200ms
// route transition. Heavy work (NASA textures, R3F shaders) is deferred to a
// later phase — this layer is intentionally cheap to keep transitions smooth
// and the visual layer swap clean.

interface SceneLayerProps {
  name: SceneName;
  active: boolean;
  scene: React.ReactNode;
  gradientVar: string;
}

function SceneLayer({ name, active, scene, gradientVar }: SceneLayerProps) {
  return (
    <div
      data-scene={name}
      aria-hidden="true"
      className="absolute inset-0 [transition-property:opacity] [transition-duration:var(--dur-route)] [transition-timing-function:var(--ease-smooth)]"
      style={{
        background: `var(${gradientVar})`,
        opacity: active ? 1 : 0,
      }}
    >
      <Stars />
      {scene}
    </div>
  );
}

// Driver allowed to receive a scene override — used by /_dev/celestial to
// cycle states manually without leaving the showcase route.
export interface CelestialBackdropProps {
  sceneOverride?: SceneName;
}

export function CelestialBackdrop({ sceneOverride }: CelestialBackdropProps = {}) {
  const location = useLocation();
  const scene = sceneOverride ?? sceneFromPathname(location.pathname);

  const layers: Record<SceneName, { node: React.ReactNode; gradientVar: string }> = {
    earth: { node: <EarthScene />, gradientVar: '--bg-earth' },
    about: { node: <AboutScene />, gradientVar: '--bg-about' },
    projects: { node: <ProjectsScene />, gradientVar: '--bg-projects' },
    contact: { node: <ContactScene />, gradientVar: '--bg-contact' },
    colophon: { node: <ColophonScene />, gradientVar: '--bg-colophon' },
  };

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {SCENE_ORDER.map((name) => (
        <SceneLayer
          key={name}
          name={name}
          active={scene === name}
          scene={layers[name].node}
          gradientVar={layers[name].gradientVar}
        />
      ))}
    </div>
  );
}
