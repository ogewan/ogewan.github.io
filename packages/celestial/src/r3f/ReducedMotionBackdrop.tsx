import type { SceneName } from '../scenes.js';
import { Stars } from '../scenes/Stars.js';

// Reduced-motion (and forced-static) fallback for the celestial canvas. When
// prefers-reduced-motion is on, we don't mount the R3F canvas at all — too
// much shader work, too much background motion. Instead we render the same
// CSS placeholder layers Phase 3 shipped with, opacity-crossfaded between
// scenes via the existing `--dur-route` token (which is already 1ms under
// reduced motion, so the swap is effectively instant).
//
// Phase 9.6 will swap this CSS-placeholder content for committed WebP captures
// of the live R3F scenes — same crossfade pattern, prettier visuals. For now
// the placeholders are the right scaffolding: they look identical to what
// reduced-motion users already see, and they exercise the swap mechanism so
// 9.6's PNG drop-in is purely a content change.

import { EarthScene as EarthPlaceholder } from '../scenes/EarthScene.js';
import { AboutScene as AboutPlaceholder } from '../scenes/AboutScene.js';
import { ProjectsScene as ProjectsPlaceholder } from '../scenes/ProjectsScene.js';
import { ContactScene as ContactPlaceholder } from '../scenes/ContactScene.js';
import { ColophonScene as ColophonPlaceholder } from '../scenes/ColophonScene.js';

interface ReducedMotionBackdropProps {
  scene: SceneName;
}

const SCENES: Array<{ name: SceneName; node: React.ReactNode; gradientVar: string }> = [
  { name: 'earth', node: <EarthPlaceholder />, gradientVar: '--bg-earth' },
  { name: 'about', node: <AboutPlaceholder />, gradientVar: '--bg-about' },
  { name: 'projects', node: <ProjectsPlaceholder />, gradientVar: '--bg-projects' },
  { name: 'contact', node: <ContactPlaceholder />, gradientVar: '--bg-contact' },
  { name: 'colophon', node: <ColophonPlaceholder />, gradientVar: '--bg-colophon' },
];

export function ReducedMotionBackdrop({ scene }: ReducedMotionBackdropProps) {
  return (
    <>
      {SCENES.map((s) => (
        <div
          key={s.name}
          data-scene={s.name}
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
