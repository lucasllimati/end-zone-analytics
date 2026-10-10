import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/season', '/season?tab=schedule', '/season?tab=playoffs', '/season?tab=power', '/teams', '/teams/kc', '/players', '/players/00-0033873',
  '/compare', '/matchup', '/super-bowl', '/super-bowl/51', '/records', '/rankings', '/draft', '/hall-of-fame', '/history', '/stadiums',
  '/learn', '/rules', '/positions', '/playbook', '/strategy', '/glossary', '/explorer', '/data', '/games/2025_22_SEA_NE',
];

/** Falha o teste se houver erro de JavaScript ou erro de console. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test.describe('todas as páginas', () => {
  for (const url of PAGES) {
    test(`carrega sem erros e sem rolagem horizontal: ${url}`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(url);
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 15_000 });
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page).toHaveTitle(/End Zone Analytics/);
    });
  }
});

test.describe('acessibilidade (axe, WCAG 2.1 AA)', () => {
  for (const url of ['/', '/season', '/teams/kc', '/players/00-0033873', '/learn', '/rules', '/positions', '/glossary', '/data']) {
    test(`sem violações sérias ou críticas: ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
});

test.describe('fluxos de UX', () => {
  test('busca global por teclado leva ao jogador', async ({ page, isMobile }) => {
    test.skip(isMobile, 'atalho de teclado é para desktop');
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: 'Buscar' });
    await expect(input).toBeFocused();
    await input.fill('mahomes');
    await expect(page.getByRole('option', { name: /Patrick Mahomes/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/players\/00-0033873/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Patrick Mahomes');
  });

  test('modo Expert muda as explicações e persiste', async ({ page }) => {
    await page.goto('/glossary#epa');
    const card = page.locator('#epa');
    await expect(card).toContainText('Em palavras simples');
    const expert = page.getByRole('button', { name: 'Expert' }).first();
    if (!(await expert.isVisible())) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Expert' }).first().click();
    await expect(card).toContainText('Definição avançada');
    await page.reload();
    await expect(page.locator('#epa')).toContainText('Definição avançada');
  });

  test('ⓘ explica a coluna da classificação', async ({ page }) => {
    await page.goto('/season');
    await page.getByRole('button', { name: 'O que é Aproveitamento?' }).first().click();
    await expect(page.getByRole('tooltip')).toContainText('Percentual de vitórias');
  });

  test('alternância de tema claro/escuro', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('logos dos times carregam', async ({ page }) => {
    await page.goto('/teams');
    const logos = page.locator('img.team-logo');
    await expect(logos.first()).toBeVisible();
    expect(await logos.count()).toBeGreaterThanOrEqual(32);
    await page.waitForLoadState('networkidle');
    const broken = await logos.evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length);
    expect(broken).toBe(0);
  });

  test('simulador de down explica 4th & 1', async ({ page }) => {
    await page.goto('/learn#simulador');
    await page.getByRole('button', { name: '4th & 1' }).click();
    await expect(page.getByRole('heading', { name: '4th & 1' })).toBeVisible();
    await expect(page.getByText('recomendado').first()).toBeVisible();
  });

  test('campo de posições responde ao teclado', async ({ page }) => {
    await page.goto('/positions');
    await page.getByRole('button', { name: 'Defesa', exact: true }).click();
    await page.getByRole('button', { name: /^FS: Free safety/ }).focus();
    await expect(page.getByRole('heading', { level: 2, name: /FS — Free safety/ })).toBeVisible();
  });

  test('ranking de QBs reage aos pesos', async ({ page }) => {
    await page.goto('/rankings');
    const first = page.locator('table.data tbody tr').first();
    await expect(first).toContainText(/\w/);
    await page.getByRole('button', { name: 'Só eficiência' }).click();
    await expect(page.locator('table.data tbody tr').first()).toBeVisible();
  });

  test('Super Bowl: 60 edições e detalhe', async ({ page }) => {
    await page.goto('/super-bowl/60');
    await expect(page.getByRole('heading', { level: 2, name: 'Ficha' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Kenneth Walker III');
  });

  test('página inexistente mostra 404 amigável', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByText('4th & 404')).toBeVisible();
  });
});
