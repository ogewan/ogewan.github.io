import type { SceneName } from '../scenes.js';
import { useViewTransitionState } from '../useViewTransitionState.js';
import { Stars } from '../scenes/Stars.js';
import { EarthScene as EarthPlaceholder } from '../scenes/EarthScene.js';
import { AboutScene as AboutPlaceholder } from '../scenes/AboutScene.js';
import { ProjectsScene as ProjectsPlaceholder } from '../scenes/ProjectsScene.js';
import { ContactScene as ContactPlaceholder } from '../scenes/ContactScene.js';
import { ColophonScene as ColophonPlaceholder } from '../scenes/ColophonScene.js';

// Simple-mode backdrop — CSS-only placeholders. Renders ONE scene at a time
// per the active scene name, tagged with view-transition-name so the swap
// goes through the View Transitions API (theme.css owns the crossfade
// timing). Used as the lowest-bandwidth / lowest-power option AND as the
// Suspense fallback while the lazy R3F chunk loads in `quality` mode.

interface SimpleBackdropProps {
  scene: SceneName;
}

const SCENES: Record<SceneName, { node: React.ReactNode; gradientVar: string }> = {
  earth: { node: <EarthPlaceholder />, gradientVar: '--bg-earth' },
  about: { node: <AboutPlaceholder />, gradientVar: '--bg-about' },
  projects: { node: <ProjectsPlaceholder />, gradientVar: '--bg-projects' },
  contact: { node: <ContactPlaceholder />, gradientVar: '--bg-contact' },
  colophon: { node: <ColophonPlaceholder />, gradientVar: '--bg-colophon' },
};

export function SimpleBackdrop({ scene }: SimpleBackdropProps) {
  // The local scene lags by one render so document.startViewTransition can
  // capture the OLD state before the new one mounts.
  const localScene = useViewTransitionState(scene);
  const cfg = SCENES[localScene];

  return (
    <div
      key={localScene}
      data-scene={localScene}
      data-mode="simple"
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `var(${cfg.gradientVar})`,
        viewTransitionName: 'backdrop-scene',
      }}
    >
      <Stars />
      {cfg.node}
    </div>
  );
}
