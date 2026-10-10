// Captura telas das páginas principais (revisão visual de UX). Uso: node scripts/screenshots.mjs [baseURL] [pasta]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/screens';
fs.mkdirSync(out, { recursive: true });
const pages = [
  ['home', '/'],
  ['season', '/season'],
  ['team', '/teams/kc'],
  ['player', '/players/00-0033873'],
  ['compare', '/compare?type=players&a=00-0019596&b=00-0033873'],
  ['superbowl', '/super-bowl'],
  ['game', '/games/2025_22_SEA_NE'],
  ['records', '/records'],
  ['learn', '/learn'],
  ['positions', '/positions'],
  ['playbook', '/playbook?play=cover-3'],
  ['rules', '/rules'],
  ['explorer', '/explorer'],
  ['data', '/data'],
  ['history', '/history'],
  ['rankings', '/rankings'],
  ['draft', '/draft'],
  ['matchup', '/matchup?a=GB&b=CHI'],
  ['teams', '/teams'],
];
const browser = await chromium.launch();
const errors = [];
for (const [vw, suffix] of [[1366, ''], [390, '-mobile']]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${page.url()} ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()} console: ${m.text()}`));
  for (const [name, url] of pages) {
    if (suffix && !['home', 'season', 'team', 'player', 'positions', 'game'].includes(name)) continue;
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(name === 'playbook' ? 4500 : 900);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) errors.push(`${name}${suffix}: overflow horizontal de ${overflow}px`);
    await page.screenshot({ path: path.join(out, `${name}${suffix}.png`), fullPage: !suffix });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'Sem erros de console/overflow.');
