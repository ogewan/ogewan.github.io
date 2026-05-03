#!/usr/bin/env node
/**
 * Automated a11y audit: axe (WCAG 2.1 AA) + keyboard tab traversal + Lighthouse.
 * Runs against all 5 routes and writes a combined Markdown report + per-route
 * Lighthouse HTML files.
 *
 *   pnpm audit:a11y
 *   pnpm audit:a11y --url=http://localhost:5175 --out=./a11y-report
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const results = [];

for (const route of ROUTES) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`\naudit: ${route.name} (${url})`);

  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // 1. axe scan
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

  // 2. Keyboard tab traversal
  console.log('  keyboard...');
  await page.focus('body');
  const keyboardIssues = [];
  const visitedSelectors = new Set();
  let prevSelector = null;
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
      return {
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

    if (el.selector === prevSelector) {
      // Same element as immediately previous — genuine focus trap
      trapCount++;
      if (trapCount >= 3) {
        keyboardIssues.push({ type: 'trap', selector: el.selector, tag: el.tag });
        break;
      }
    } else if (visitedSelectors.has(el.selector)) {
      // Selector seen before but not immediately — Tab has wrapped around, done
      break;
    } else {
      trapCount = 0;
    }
    prevSelector = el.selector;
    visitedSelectors.add(el.selector);

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

  // 3. Lighthouse
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
  results.push({ route, violations, keyboard: dedupedKeyboard, lhScores, lhHtmlFile });
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────────

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
const totalAxe = results.reduce((s, r) => s + r.violations.length, 0);
const totalKb = results.reduce((s, r) => s + r.keyboard.length, 0);

const lines = [
  '# a11y audit report',
  '',
  `**Generated:** ${ts}  `,
  `**Base URL:** ${BASE_URL}  `,
  `**axe violations:** ${totalAxe}  `,
  `**Keyboard issues:** ${totalKb}`,
  '',
  '## Summary',
  '',
  '| Route | axe violations | keyboard issues | LH a11y | LH perf | LH seo | LH best-practices | Report |',
  '|-------|---------------|----------------|---------|---------|--------|-------------------|--------|',
];

for (const { route, violations, keyboard, lhScores, lhHtmlFile } of results) {
  const lhLink = lhHtmlFile ? `[open](${lhHtmlFile})` : 'n/a';
  lines.push(
    `| ${route.name} | ${violations.length} | ${keyboard.length} | ${lhScores.accessibility ?? 'n/a'} | ${lhScores.performance ?? 'n/a'} | ${lhScores.seo ?? 'n/a'} | ${lhScores['best-practices'] ?? 'n/a'} | ${lhLink} |`,
  );
}

for (const { route, violations, keyboard } of results) {
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
}

lines.push('', '---', '_Generated by scripts/audit-a11y.mjs_', '');

const reportPath = resolve(OUT_DIR, 'index.md');
writeFileSync(reportPath, lines.join('\n'));
console.log(`\ndone. report -> ${reportPath}`);
if (totalAxe > 0 || totalKb > 0) {
  console.log(`  ${totalAxe} axe violation(s), ${totalKb} keyboard issue(s) -- see index.md`);
}
