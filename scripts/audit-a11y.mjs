#!/usr/bin/env node
/**
 * Automated a11y audit:
 *   1. axe  — WCAG 2.1 AA violations
 *   2. keyboard — tab traversal, focus indicators, trap detection
 *   3. contrast — screenshot-based WCAG contrast for bare headings on the canvas
 *   4. Lighthouse — a11y / perf / SEO / best-practices
 *
 *   pnpm audit:a11y
 *   pnpm audit:a11y --url=http://localhost:5175 --out=./a11y-report
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── WCAG contrast helpers ─────────────────────────────────────────────────────

function relativeLuminance(r, g, b) {
  return [r, g, b].reduce((sum, c, i) => {
    const s = c / 255;
    const linear = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return sum + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function contrastRatio(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const eq = a.indexOf('=');
      return eq === -1 ? [a.slice(2), true] : [a.slice(2, eq), a.slice(eq + 1)];
    }),
);

const BASE_URL = args.url ?? 'http://localhost:5175';
const OUT_DIR = resolve(process.cwd(), args.out ?? './a11y-report');
const DEBUG_PORT = 9222;
const VIEWPORT = { width: 1280, height: 720 };

const ROUTES = [
  { name: 'earth', path: '/en/' },
  { name: 'about', path: '/en/about' },
  { name: 'projects', path: '/en/projects' },
  { name: 'contact', path: '/en/contact' },
  { name: 'colophon', path: '/en/colophon' },
];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [`--remote-debugging-port=${DEBUG_PORT}`],
});
const ctx = await browser.newContext({ viewport: VIEWPORT });
const results = [];

for (const route of ROUTES) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`\naudit: ${route.name} (${url})`);

  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // ── 1. axe ─────────────────────────────────────────────────────────────────
  console.log('  axe...');
  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const violations = axeResults.violations.map((v) => ({
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => n.target.join(', ')),
  }));
  console.log(`  axe: ${violations.length} violation(s)`);

  // ── 2. Keyboard tab traversal ───────────────────────────────────────────────
  console.log('  keyboard...');
  await page.focus('body');
  const keyboardIssues = [];
  const visitedDomIndices = new Set();
  let prevDomIndex = null;
  let trapCount = 0;

  for (let i = 0; i < 150; i++) {
    await page.keyboard.press('Tab');
    const el = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return null;
      const st = window.getComputedStyle(active);
      const rect = active.getBoundingClientRect();
      const id = active.id ? '#' + active.id : null;
      const testid = active.getAttribute('data-testid');
      const cls =
        active.classList.length
          ? active.tagName.toLowerCase() + '.' + [...active.classList].join('.')
          : active.tagName.toLowerCase();
      const selector = id ?? (testid ? '[data-testid="' + testid + '"]' : cls);
      const domIndex = [...document.querySelectorAll('*')].indexOf(active);
      return {
        domIndex,
        selector,
        tag: active.tagName,
        role: active.getAttribute('role'),
        label:
          active.getAttribute('aria-label') ??
          active.getAttribute('title') ??
          (active.textContent ? active.textContent.trim().slice(0, 60) : null),
        outlineWidth: st.outlineWidth,
        outlineStyle: st.outlineStyle,
        boxShadow: st.boxShadow,
        visible: rect.width > 0 && rect.height > 0,
      };
    });

    if (!el) break;

    if (el.domIndex === prevDomIndex) {
      trapCount++;
      if (trapCount >= 3) {
        keyboardIssues.push({ type: 'trap', selector: el.selector, tag: el.tag });
        break;
      }
    } else if (visitedDomIndices.has(el.domIndex)) {
      break;
    } else {
      trapCount = 0;
    }
    prevDomIndex = el.domIndex;
    visitedDomIndices.add(el.domIndex);

    const hasOutline =
      el.outlineStyle !== 'none' && el.outlineWidth !== '0px' && el.outlineWidth !== '';
    const hasBoxShadow = el.boxShadow !== 'none' && el.boxShadow !== '';
    if (!hasOutline && !hasBoxShadow && el.visible) {
      keyboardIssues.push({
        type: 'no-focus-indicator',
        selector: el.selector,
        tag: el.tag,
        label: el.label,
      });
    }
  }

  const seenSelectors = new Set();
  const dedupedKeyboard = keyboardIssues.filter((issue) => {
    const key = issue.type + ':' + issue.selector;
    if (seenSelectors.has(key)) return false;
    seenSelectors.add(key);
    return true;
  });
  console.log(`  keyboard: ${dedupedKeyboard.length} issue(s)`);

  // ── 3. Screenshot-based contrast for bare headings ─────────────────────────
  // axe can't see through the WebGL canvas. For h1–h4 that have no glass/panel
  // backing, we hide the element, screenshot to reveal the canvas pixels behind
  // it, average those pixels, then compute the WCAG contrast ratio against the
  // element's CSS text color.
  console.log('  contrast...');
  const contrastIssues = [];

  const headings = await page.evaluate(() => {
    // Canvas-based color normalizer: converts any CSS color (oklch, hsl, etc.)
    // to an [r, g, b] array. getComputedStyle may return oklch() on Chrome 111+;
    // naive regex parsing would extract the wrong numbers from that format.
    function toRgb(cssColor) {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const ctx = c.getContext('2d');
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    }

    return [...document.querySelectorAll('h1, h2, h3, h4')]
      .map((el, idx) => {
        const st = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        if (st.display === 'none' || st.visibility === 'hidden') return null;

        // Walk ancestors (stopping before body) to find a non-transparent backing.
        // Checks both background-color and backdrop-filter (glass panels use both).
        let hasBacking = false;
        let cursor = el.parentElement;
        while (cursor && cursor !== document.body && cursor !== document.documentElement) {
          const cst = window.getComputedStyle(cursor);
          const bg = cst.backgroundColor;
          const hasOpaqueBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
          const hasBackdrop =
            cst.backdropFilter && cst.backdropFilter !== 'none' && cst.backdropFilter !== '';
          if (hasOpaqueBg || hasBackdrop) {
            hasBacking = true;
            break;
          }
          cursor = cursor.parentElement;
        }

        const fontSize = parseFloat(st.fontSize);
        const fontWeight = parseInt(st.fontWeight, 10);
        // WCAG large text: >=24px normal OR >=18.67px bold
        const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);

        return {
          idx,
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 60) ?? '',
          colorRgb: toRgb(st.color),
          fontSize,
          fontWeight,
          isLargeText,
          hasBacking,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        };
      })
      .filter(Boolean);
  });

  for (const h of headings.filter((x) => !x.hasBacking)) {
    // Hide element by DOM index so we don't confuse same-text duplicates
    await page.evaluate((idx) => {
      const el = document.querySelectorAll('h1, h2, h3, h4')[idx];
      if (el) el.style.visibility = 'hidden';
    }, h.idx);

    const screenshot = await page.screenshot({ type: 'png' });

    await page.evaluate((idx) => {
      const el = document.querySelectorAll('h1, h2, h3, h4')[idx];
      if (el) el.style.visibility = '';
    }, h.idx);

    // Clamp bbox to viewport bounds
    const x = Math.max(0, Math.round(h.rect.x));
    const y = Math.max(0, Math.round(h.rect.y));
    const w = Math.min(Math.round(h.rect.width), VIEWPORT.width - x);
    const wh = Math.min(Math.round(h.rect.height), VIEWPORT.height - y);
    if (w <= 0 || wh <= 0) continue;

    // Average RGB of the canvas pixels behind the heading
    const { data, info } = await sharp(screenshot)
      .extract({ left: x, top: y, width: w, height: wh })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sr = 0,
      sg = 0,
      sb = 0,
      count = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      sr += data[i];
      sg += data[i + 1];
      sb += data[i + 2];
      count++;
    }
    const bg = [Math.round(sr / count), Math.round(sg / count), Math.round(sb / count)];
    const fg = h.colorRgb;
    if (!fg) continue;

    const ratio = contrastRatio(
      relativeLuminance(...fg),
      relativeLuminance(...bg),
    );
    const threshold = h.isLargeText ? 3.0 : 4.5;

    const status = ratio >= threshold ? 'pass' : 'fail';
    console.log(
      `    ${h.tag} "${h.text.slice(0, 30)}" — ${ratio.toFixed(2)}:1 (need ${threshold}:1) [${status}]`,
    );

    if (status === 'fail') {
      contrastIssues.push({
        tag: h.tag,
        text: h.text,
        ratio: ratio.toFixed(2),
        threshold,
        fg: `rgb(${fg.join(',')})`,
        bg: `rgb(${bg.join(',')})`,
        isLargeText: h.isLargeText,
      });
    }
  }

  console.log(`  contrast: ${contrastIssues.length} issue(s)`);

  // ── 4. Lighthouse ───────────────────────────────────────────────────────────
  console.log('  lighthouse...');
  let lhScores = { accessibility: null, performance: null, seo: null, 'best-practices': null };
  let lhHtmlFile = null;
  try {
    const lhResult = await lighthouse(url, {
      port: DEBUG_PORT,
      output: ['html', 'json'],
      logLevel: 'error',
      onlyCategories: ['accessibility', 'performance', 'seo', 'best-practices'],
      disableFullPageScreenshot: true,
    });
    if (lhResult?.lhr) {
      for (const [cat, data] of Object.entries(lhResult.lhr.categories)) {
        lhScores[cat] = Math.round((data.score ?? 0) * 100);
      }
    }
    if (lhResult?.report?.[0]) {
      lhHtmlFile = `lighthouse-${route.name}.html`;
      writeFileSync(resolve(OUT_DIR, lhHtmlFile), lhResult.report[0]);
    }
    console.log(
      `  lighthouse: a11y=${lhScores.accessibility} perf=${lhScores.performance} seo=${lhScores.seo} bp=${lhScores['best-practices']}`,
    );
  } catch (err) {
    console.warn(`  lighthouse failed: ${err.message}`);
  }

  await page.close();
  results.push({
    route,
    violations,
    keyboard: dedupedKeyboard,
    contrast: contrastIssues,
    lhScores,
    lhHtmlFile,
  });
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────────

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
const totalAxe = results.reduce((s, r) => s + r.violations.length, 0);
const totalKb = results.reduce((s, r) => s + r.keyboard.length, 0);
const totalContrast = results.reduce((s, r) => s + r.contrast.length, 0);

const lines = [
  '# a11y audit report',
  '',
  `**Generated:** ${ts}  `,
  `**Base URL:** ${BASE_URL}  `,
  `**axe violations:** ${totalAxe}  `,
  `**Keyboard issues:** ${totalKb}  `,
  `**Contrast failures:** ${totalContrast}`,
  '',
  '## Summary',
  '',
  '| Route | axe | keyboard | contrast | LH a11y | LH perf | LH seo | LH bp | Report |',
  '|-------|-----|----------|----------|---------|---------|--------|-------|--------|',
];

for (const { route, violations, keyboard, contrast, lhScores, lhHtmlFile } of results) {
  const lhLink = lhHtmlFile ? `[open](${lhHtmlFile})` : 'n/a';
  lines.push(
    `| ${route.name} | ${violations.length} | ${keyboard.length} | ${contrast.length} | ${lhScores.accessibility ?? 'n/a'} | ${lhScores.performance ?? 'n/a'} | ${lhScores.seo ?? 'n/a'} | ${lhScores['best-practices'] ?? 'n/a'} | ${lhLink} |`,
  );
}

for (const { route, violations, keyboard, contrast } of results) {
  lines.push('', `## ${route.name}`, '');

  if (violations.length === 0) {
    lines.push('**axe:** no violations');
  } else {
    lines.push(`### axe violations (${violations.length})`, '');
    for (const v of violations) {
      lines.push(`#### [${v.impact?.toUpperCase() ?? 'UNKNOWN'}] ${v.help}`);
      lines.push('', v.description, `-> ${v.helpUrl}`, '');
      lines.push('Failing nodes:');
      for (const n of v.nodes.slice(0, 5)) lines.push('- `' + n + '`');
      if (v.nodes.length > 5) lines.push(`- _(${v.nodes.length - 5} more)_`);
      lines.push('');
    }
  }

  if (keyboard.length === 0) {
    lines.push('**Keyboard:** no issues');
  } else {
    lines.push('', `### Keyboard issues (${keyboard.length})`, '');
    for (const k of keyboard) {
      if (k.type === 'trap') {
        lines.push('- **TRAP** `' + k.selector + '` -- Tab key did not advance focus');
      } else {
        lines.push(
          '- **no-focus-indicator** `' + k.selector + '`' + (k.label ? ` -- "${k.label}"` : ''),
        );
      }
    }
  }

  if (contrast.length === 0) {
    lines.push('**Contrast:** no failures');
  } else {
    lines.push('', `### Contrast failures (${contrast.length})`, '');
    for (const c of contrast) {
      lines.push(
        `- **${c.tag}** "${c.text}" — **${c.ratio}:1** (need ${c.threshold}:1, ${c.isLargeText ? 'large' : 'normal'} text)`,
      );
      lines.push(`  - fg: \`${c.fg}\`  bg: \`${c.bg}\``);
    }
  }
}

lines.push('', '---', '_Generated by scripts/audit-a11y.mjs_', '');

const reportPath = resolve(OUT_DIR, 'index.md');
writeFileSync(reportPath, lines.join('\n'));
console.log(`\ndone. report -> ${reportPath}`);
if (totalAxe > 0 || totalKb > 0 || totalContrast > 0) {
  console.log(
    `  ${totalAxe} axe, ${totalKb} keyboard, ${totalContrast} contrast issue(s) -- see index.md`,
  );
}
