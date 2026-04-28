import type { SceneName } from '../scenes.js';
import { useViewTransitionState } from '../useViewTransitionState.js';
import earthImg from '../screenshots/earth.png';
import aboutImg from '../screenshots/about.png';
import projectsImg from '../screenshots/projects.png';
import contactImg from '../screenshots/contact.png';
import colophonImg from '../screenshots/colophon.png';

// Static-mode backdrop. Renders ONE PNG at a time per the active scene,
// tagged with view-transition-name so the swap goes through the View
// Transitions API (theme.css owns the crossfade timing). Cheaper than
// keeping all five images mounted and toggling opacity, and the visible
// transition is smoother than a CSS opacity crossfade.
//
// Source images live at packages/celestial/src/screenshots/. Phase 9.0/9.1
// ships 1×1 transparent stubs; `pnpm capture:scenes` replaces them with
// real 1920×1080 captures of the live R3F output.

interface StaticBackdropProps {
  scene: SceneName;
}

const SCENES: Record<SceneName, { src: string; gradientVar: string; alt: string }> = {
  earth: { src: earthImg, gradientVar: '--bg-earth', alt: 'Earth' },
  about: { src: aboutImg, gradientVar: '--bg-about', alt: 'Earth and Moon' },
  projects: { src: projectsImg, gradientVar: '--bg-projects', alt: 'Gas giant with rings' },
  contact: { src: contactImg, gradientVar: '--bg-contact', alt: 'Distant nebula' },
  colophon: { src: colophonImg, gradientVar: '--bg-colophon', alt: 'Black hole' },
};

export function StaticBackdrop({ scene }: StaticBackdropProps) {
  // The local scene lags by one render so document.startViewTransition can
  // capture the OLD state before the new one mounts. In browsers without
  // the API the hook falls back to plain setState (no perceptible lag).
  const localScene = useViewTransitionState(scene);
  const cfg = SCENES[localScene];

  return (
    <div
      key={localScene}
      data-scene={localScene}
      data-mode="static"
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `var(${cfg.gradientVar})`,
        viewTransitionName: 'backdrop-scene',
      }}
    >
      <img
        src={cfg.src}
        alt=""
        data-scene-static={localScene}
        // Fill the viewport same as the canvas would. object-cover keeps
        // the captured aspect ratio while filling.
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
}
