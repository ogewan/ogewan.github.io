import { transformWithEsbuild, type Plugin } from 'vite';

// Build-time comment stripper for index.html.
//
// Vite does not minify index.html: it rewrites asset URLs and substitutes
// %ENV% tokens, but the markup (and the bodies of inline <script>/<style>)
// ship byte-for-byte as authored. index.html carries a lot of deliberate
// prose — the overlay's readiness-gate rationale, the STATE_VERSION
// migration notes, the earthPos storage convention — which is worth keeping
// in source and not worth shipping to visitors.
//
// Why esbuild via Vite's re-export and not `esbuild` directly: esbuild is a
// transitive dep of Vite, and pnpm's strict node_modules layout makes it
// unresolvable from @portfolio/shell. `transformWithEsbuild` is the same
// transform reached through a package we do depend on, so this adds no
// dependency.
//
// Build-only (`apply: 'build'`) — dev keeps every comment intact.

// Inline blocks only. The negative lookahead skips <script src=...>, whose
// body is empty anyway and whose module graph Vite already minifies.
const INLINE_SCRIPT_RE = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const INLINE_STYLE_RE = /<style([^>]*)>([\s\S]*?)<\/style>/gi;

// Preserve IE conditional comments (`<!--[if`) and bang-marked comments
// (`<!--!`), the conventional "keep this one" marker for licence banners.
// `<!doctype html>` starts `<!d` and can never match.
const HTML_COMMENT_RE = /<!--(?!\[if|!)[\s\S]*?-->/g;

// Runs `replacer` over every match in source order. A plain String.replace
// can't await, and the esbuild transform is async.
async function replaceAsync(
  input: string,
  re: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
  re.lastIndex = 0;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) matches.push(match);
  if (matches.length === 0) return input;

  const parts: string[] = [];
  let cursor = 0;
  for (const m of matches) {
    parts.push(input.slice(cursor, m.index));
    parts.push(await replacer(m));
    cursor = m.index + m[0].length;
  }
  parts.push(input.slice(cursor));
  return parts.join('');
}

async function minifyInline(
  code: string,
  filename: string,
  loader: 'js' | 'css',
): Promise<string | null> {
  if (!code.trim()) return null;
  // CSS gets whitespace-only minification. esbuild's *syntax* pass rewrites
  // colors — `oklch(0.06 0.02 275)` becomes `#000103` — which silently
  // defeats the deliberate `background: <hex>; background: <oklch>`
  // progressive-enhancement pairs in index.html and drifts the overlay off
  // --color-backdrop-base. Whitespace-only still strips every comment and
  // costs ~145 bytes across the file. JS has no equivalent hazard.
  const options =
    loader === 'css'
      ? { minifyWhitespace: true, minifySyntax: false, minifyIdentifiers: false, loader }
      : { minify: true, loader };
  try {
    const result = await transformWithEsbuild(code, filename, options);
    return result.code.trim();
  } catch (err) {
    // Never fail a deploy over cosmetics — keep the block verbatim and say so.
    console.warn(`[strip-comments] skipped an inline <${loader}> block:`, err);
    return null;
  }
}

export function stripCommentsPlugin(): Plugin {
  return {
    name: 'portfolio:strip-comments',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      // 'post' so Vite's core HTML transform has already resolved %MODE% and
      // friends — esbuild then constant-folds the resulting comparisons.
      order: 'post',
      async handler(html) {
        let out = await replaceAsync(html, INLINE_STYLE_RE, async (m) => {
          const [full, attrs = '', css = ''] = m;
          const min = await minifyInline(css, 'inline.css', 'css');
          return min === null ? full : `<style${attrs}>${min}</style>`;
        });

        out = await replaceAsync(out, INLINE_SCRIPT_RE, async (m) => {
          const [full, attrs = '', js = ''] = m;
          // Leave non-JS payloads (JSON-LD, importmaps, templates) alone.
          if (/\stype\s*=\s*["']?(?!module|text\/javascript)/i.test(attrs)) return full;
          const min = await minifyInline(js, 'inline.js', 'js');
          return min === null ? full : `<script${attrs}>${min}</script>`;
        });

        // Safe only because the inline bodies are minified first: esbuild has
        // already removed any `<!--` that lived inside a JS string or comment.
        out = out.replace(HTML_COMMENT_RE, '');

        // Comment removal leaves whitespace-only lines behind; collapse runs.
        out = out.replace(/(\r?\n)[ \t]*(?:\r?\n[ \t]*)+/g, '$1');

        return out;
      },
    },
  };
}
