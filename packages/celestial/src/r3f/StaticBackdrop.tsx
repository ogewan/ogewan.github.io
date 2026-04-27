import type { SceneName } from '../scenes.js';
import earthImg from '../screenshots/earth.png';
import aboutImg from '../screenshots/about.png';
import projectsImg from '../screenshots/projects.png';
import contactImg from '../screenshots/contact.png';
import colophonImg from '../screenshots/colophon.png';

// Static-mode backdrop. Five PNGs (one per scene) layered on top of the body
// gradient. The active scene's <img> fades in, others fade out — same
// `--dur-route` opacity transition the original Phase-3 placeholder used,
// just with bitmap content instead of CSS gradients.
//
// No R3F, no shaders, no per-frame work. Cheaper than `quality` after first
// scene change because each <img> is HTTP-cached after first paint.
//
// Source images live at packages/celestial/src/screenshots/. Phase 9.0/9.1
// ships 1×1 transparent stubs; `pnpm capture:scenes` replaces them with
// real 1920×1080 captures of the live R3F output.

interface StaticBackdropProps {
  scene: SceneName;
}

const SCENES: Array<{ name: SceneName; src: string; gradientVar: string; alt: string }> = [
  { name: 'earth', src: earthImg, gradientVar: '--bg-earth', alt: 'Earth' },
  { name: 'about', src: aboutImg, gradientVar: '--bg-about', alt: 'Earth and Moon' },
  { name: 'projects', src: projectsImg, gradientVar: '--bg-projects', alt: 'Gas giant with rings' },
  { name: 'contact', src: contactImg, gradientVar: '--bg-contact', alt: 'Distant nebula' },
  { name: 'colophon', src: colophonImg, gradientVar: '--bg-colophon', alt: 'Black hole' },
];

export function StaticBackdrop({ scene }: StaticBackdropProps) {
  return (
    <>
      {SCENES.map((s) => (
        <div
          key={s.name}
          data-scene={s.name}
          data-mode="static"
          aria-hidden="true"
          className="absolute inset-0 [transition-property:opacity] [transition-duration:var(--dur-route)] [transition-timing-function:var(--ease-smooth)]"
          style={{
            background: `var(${s.gradientVar})`,
            opacity: scene === s.name ? 1 : 0,
          }}
        >
          <img
            src={s.src}
            alt=""
            data-scene-static={s.name}
            // Fill the viewport same as the canvas would. object-cover keeps
            // the captured aspect ratio while filling.
            className="absolute inset-0 w-full h-full object-cover"
            // Loading hint: only the active scene's image needs to be
            // network-priority. Others can wait.
            loading={scene === s.name ? 'eager' : 'lazy'}
          />
        </div>
      ))}
    </>
  );
}
