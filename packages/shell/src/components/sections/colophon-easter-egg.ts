// Browser-console easter egg fired once per page load when the colophon mounts.
// Single styled console.log rendered as a monospace terminal block; brand cyan
// kept from the original implementation (oklch(0.84 0.12 210)).
//
// Module-level guard handles React StrictMode's dev-time double-invoke of
// effects without firing twice.

let _fired = false;

const WIDTH = 45;

const padInside = (s: string): string =>
  // Pad to (WIDTH - 1) so the row reads `│ ` + padded + `│` and lines up with
  // the (WIDTH)-dash top/bottom borders.
  s.padEnd(WIDTH - 1, ' ');

// import.meta.env.DEV is resolved at build time by Vite — true under
// `pnpm dev`, false in the production bundle. Surfaced in the console box
// so visitors (and future me reading transcripts) can tell at a glance
// which build is running.
const MODE_LINE = import.meta.env.DEV ? '> mode · dev' : '> mode · prod';

const BOX: readonly string[] = [
  '┌' + '─'.repeat(WIDTH) + '┐',
  '│ ' + padInside('$ seun-ogedengbe.portfolio') + '│',
  '│ ' + padInside('> /colophon · v' + __APP_VERSION__) + '│',
  '│ ' + padInside(MODE_LINE) + '│',
  //'│ ' + padInside('> if you\'re reading this, hi.') + '│',
  '└' + '─'.repeat(WIDTH) + '┘',
];

const TERMINAL_STYLE =
  'font-family: "JetBrains Mono", ui-monospace, monospace; ' +
  'font-size: 13px; line-height: 1.5; white-space: pre; ' +
  'color: oklch(0.84 0.12 210); ' +
  'text-shadow: 0 0 8px oklch(0.84 0.12 210 / 0.35); ' +
  'padding: 8px 0;' +
  'background: oklch(0.10 0.16 210);';

export function fireColophonEasterEgg(): void {
  if (_fired || typeof console === 'undefined') return;
  _fired = true;
  console.log('%c' + BOX.join('\n'), TERMINAL_STYLE);
}
