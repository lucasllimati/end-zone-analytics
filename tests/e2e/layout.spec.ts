/**
 * Regressão de layout: percorre as páginas (e todas as abas) e falha se aparecer
 *  - rolagem lateral na página (ou, no desktop, dentro de uma tabela);
 *  - colunas com larguras diferentes entre tabelas iguais (ex.: as três tabelas da classificação);
 *  - cabeçalho numérico desalinhado dos números da coluna;
 *  - grade de 3+ colunas com um cartão sozinho na última linha.
 * Regras de docs/DESIGN_SYSTEM.md ("Alinhamento").
 */
import { expect, test, type Page } from '@playwright/test';

const ROUTES = ['/', '/season', '/teams', '/teams/buf', '/players', '/compare', '/matchup?a=BUF&b=MIA', '/stadiums', '/referees', '/super-bowl', '/super-bowl/60', '/records', '/draft', '/hall-of-fame', '/history', '/rankings', '/explorer', '/learn', '/rules', '/positions', '/playbook', '/strategy', '/glossary', '/data', '/about', '/privacy'];

const audit = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const vis = (el: Element) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().width > 0;
    const tables = [...document.querySelectorAll('table.data')].filter(vis);
    const sig = (t: Element) => [...t.querySelectorAll('thead th')].map((th) => th.textContent!.trim()).join('|');
    const groups: Record<string, Element[]> = {};
    for (const t of tables) (groups[sig(t)] ??= []).push(t);
    for (const [s, ts] of Object.entries(groups)) {
      if (ts.length < 2) continue;
      const base = [...ts[0].querySelectorAll('thead th')].map((th) => th.getBoundingClientRect().width);
      let worst = 0;
      for (const t of ts.slice(1)) [...t.querySelectorAll('thead th')].forEach((th, i) => (worst = Math.max(worst, Math.abs(th.getBoundingClientRect().width - base[i]))));
      if (worst > 1.5) out.push(`largura de colunas diferente (${worst.toFixed(0)}px) entre ${ts.length} tabelas [${s.slice(0, 50)}]`);
    }
    for (const t of tables) {
      const row = t.querySelector('tbody tr');
      if (!row) continue;
      [...t.querySelectorAll('thead th')].forEach((th, i) => {
        const td = row.children[i];
        if (!th.classList.contains('num') || !td?.classList.contains('num') || !td.textContent!.trim()) return;
        const inner = th.querySelector('.sort-btn') ?? th.querySelector('.th-inner');
        const range = (el: Element) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          return r.getBoundingClientRect().right;
        };
        const thRight = inner ? inner.getBoundingClientRect().right : range(th);
        if (Math.abs(range(td) - thRight) > 3) out.push(`coluna "${th.textContent!.trim()}": rótulo e números desalinhados`);
      });
    }
    for (const g of [...document.querySelectorAll('.grid, .tiles, .split-grid')].filter(vis)) {
      const items = [...g.children].filter((i) => vis(i) && !i.classList.contains('span-all'));
      if (items.length < 2 || g.classList.contains('balance')) continue;
      const top = (i: Element) => Math.round(i.getBoundingClientRect().top);
      const tops = [...new Set(items.map(top))];
      const perRow = items.filter((i) => top(i) === tops[0]).length;
      const last = items.filter((i) => top(i) === tops[tops.length - 1]).length;
      if (tops.length > 1 && perRow >= 3 && last === 1) out.push(`grade ${g.className}: ${items.length} itens em ${perRow} colunas, 1 sozinho`);
    }
    const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (ov > 0) out.push(`rolagem lateral da página (${ov}px)`);
    if (innerWidth >= 1280) for (const w of document.querySelectorAll('.table-wrap')) if (vis(w) && w.scrollWidth - w.clientWidth > 2) out.push(`tabela com rolagem lateral (${w.getAttribute('aria-label')})`);
    return [...new Set(out)];
  });

async function auditWithTabs(page: Page, route: string): Promise<string[]> {
  const found: string[] = [];
  const tabs = page.locator('[role="tablist"]').first().getByRole('tab');
  const n = await tabs.count();
  for (const i of n ? [...Array(n).keys()] : [null]) {
    let label = '';
    if (i !== null) {
      label = (await tabs.nth(i).innerText()).trim();
      await tabs.nth(i).click();
      await page.waitForLoadState('networkidle');
    }
    for (const msg of await audit(page)) found.push(`${route}${label ? ` [${label}]` : ''}: ${msg}`);
  }
  return found;
}

test.describe('layout', () => {
  test.setTimeout(240_000);

  test('páginas e abas sem desalinhamento nem rolagem lateral', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Um jogador e um jogo reais da base (os IDs mudam com os dados).
    await page.goto('/players', { waitUntil: 'networkidle' });
    const player = await page.locator('main a[href^="/players/"]').first().getAttribute('href');
    await page.goto('/season?tab=schedule', { waitUntil: 'networkidle' });
    const game = await page.locator('main a[href^="/games/"]').first().getAttribute('href');
    const found: string[] = [];
    for (const route of [...ROUTES, player, game].filter((r): r is string => !!r)) {
      await page.goto(route, { waitUntil: 'networkidle' });
      found.push(...(await auditWithTabs(page, route)));
    }
    expect(found, found.join('\n')).toEqual([]);
    expect(errors).toEqual([]);
  });
});
