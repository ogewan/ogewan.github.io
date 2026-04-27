import type { SceneName } from '../scenes.js';
import { Stars } from '../scenes/Stars.js';
import { EarthScene as EarthPlaceholder } from '../scenes/EarthScene.js';
import { AboutScene as AboutPlaceholder } from '../scenes/AboutScene.js';
import { ProjectsScene as ProjectsPlaceholder } from '../scenes/ProjectsScene.js';
import { ContactScene as ContactPlaceholder } from '../scenes/ContactScene.js';
import { ColophonScene as ColophonPlaceholder } from '../scenes/ColophonScene.js';

// Simple-mode backdrop — CSS-only placeholder layers from Phase 3. Zero
// extra fetch (already in the main bundle), zero runtime cost. Looks
// intentionally low-fi: gradient spheres + radial-gradient star dots.
//
// Used for the lowest-bandwidth / lowest-power option AND as the Suspense
// fallback while the lazy R3F chunk loads in `quality` mode (so the page
// is never blank during the canvas fetch).

interface SimpleBackdropProps {
  scene: SceneName;
}

const SCENES: Array<{ name: SceneName; node: React.ReactNode; gradientVar: string }> = [
  { name: 'earth', node: <EarthPlaceholder />, gradientVar: '--bg-earth' },
  { name: 'about', node: <AboutPlaceholder />, gradientVar: '--bg-about' },
  { name: 'projects', node: <ProjectsPlaceholder />, gradientVar: '--bg-projects' },
  { name: 'contact', node: <ContactPlaceholder />, gradientVar: '--bg-contact' },
  { name: 'colophon', node: <ColophonPlaceholder />, gradientVar: '--bg-colophon' },
];

export function SimpleBackdrop({ scene }: SimpleBackdropProps) {
  return (
    <>
      {SCENES.map((s) => (
        <div
          key={s.name}
          data-scene={s.name}
          data-mode="simple"
          aria-hidden="true"
          className="absolute inset-0 [transition-property:opacity] [transition-duration:var(--dur-route)] [transition-timing-function:var(--ease-smooth)]"
          style={{
            background: `var(${s.gradientVar})`,
            opacity: scene === s.name ? 1 : 0,
          }}
        >
          <Stars />
          {s.node}
        </div>
      ))}
    </>
  );
}
