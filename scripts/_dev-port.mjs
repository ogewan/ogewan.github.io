// Shared helper for harness scripts (visual-test, capture-hero, probes, etc.)
// that target the portfolio's Vite dev server. Resolves which port the
// portfolio is actually on, since Vite auto-bumps 5173 → 5174 → … when the
// preferred port is taken by an unrelated project on the same machine.
//
// Resolution order:
//   1. --port=NNNN on argv
//   2. PORTFOLIO_DEV_PORT env var
//   3. Probe a small range of common Vite ports and identify the portfolio
//      by a stable marker in its served index.html (its <title>). Other
//      Vite-based apps return different HTML and are skipped.
//
// Returns the port number (or throws with a clear message). Designed for
// top-level await — call before opening Playwright / fetch.

const DEFAULT_PORT_RANGE = [5173, 5174, 5175, 5176, 5177];
const PORTFOLIO_TITLE_MARKER = 'Portfolio · console UX';

function parsePortFromArgv(argv) {
  for (const a of argv) {
    const m = a.match(/^--port=(\d+)$/);
    if (m) return Number(m[1]);
  }
  return null;
}

async function looksLikePortfolio(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const html = await res.text();
    return html.includes(PORTFOLIO_TITLE_MARKER);
  } catch {
    return false;
  }
}

export async function detectPortfolioPort({
  argv = process.argv.slice(2),
  range = DEFAULT_PORT_RANGE,
} = {}) {
  const fromArgv = parsePortFromArgv(argv);
  if (fromArgv) return fromArgv;
  const fromEnv = Number(process.env.PORTFOLIO_DEV_PORT);
  if (fromEnv) return fromEnv;

  for (const port of range) {
    if (await looksLikePortfolio(port)) return port;
  }

  throw new Error(
    `No portfolio dev server found on ports ${range.join(', ')}. ` +
      `Start it with \`unset ELECTRON_RUN_AS_NODE && pnpm dev\` first, ` +
      `or pass --port=NNNN / set PORTFOLIO_DEV_PORT if it's running elsewhere.`,
  );
}
