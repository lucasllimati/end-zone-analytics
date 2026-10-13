import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/season', '/season?tab=schedule', '/season?tab=playoffs', '/season?tab=power', '/teams', '/teams/kc', '/players', '/players/00-0033873',
  '/compare', '/matchup', '/super-bowl', '/super-bowl/51', '/records', '/rankings', '/draft', '/hall-of-fame', '/history', '/stadiums',
  '/learn', '/rules', '/positions', '/playbook', '/strategy', '/glossary', '/explorer', '/data', '/games/2025_22_SEA_NE', '/admin',
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
  for (const url of ['/', '/season', '/teams/kc', '/players/00-0033873', '/learn', '/rules', '/positions', '/glossary', '/data', '/admin', '/compare', '/games/2025_22_SEA_NE']) {
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

  test('página pública de dados não expõe operações', async ({ page }) => {
    await page.goto('/data');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fontes e qualidade dos dados');
    await expect(page.getByRole('button', { name: /Iniciar carga|Verificar/ })).toHaveCount(0);
    await expect(page.getByText(/Token de administrador/)).toHaveCount(0);
    await expect(page.locator('header nav a[href="/admin"]')).toHaveCount(0);
  });

  test('admin (acesso local em desenvolvimento) mostra saúde, cargas e alertas', async ({ page }) => {
    test.skip(process.env.E2E_STATIC === '1', 'o build estático (Cloudflare) não inclui a área administrativa');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operação dos dados');
    await expect(page.getByText('Última publicação bem-sucedida')).toBeVisible();
    await page.getByRole('tab', { name: 'Fontes e cargas' }).click();
    await page.getByRole('radio', { name: /Completa/ }).check();
    await page.getByRole('button', { name: 'Iniciar carga completa…' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Confirmar carga completa?');
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('tab', { name: 'Logs e alertas' }).click();
    await expect(page.getByLabel('Severidade')).toBeVisible();
  });

  test('início: hero, jogos da semana e painéis com dados reais', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('O jogo em números');
    await expect(page.locator('.game-tile').first()).toBeVisible();
    // Jogo sem placar nunca aparece como 0 × 0.
    const scheduled = page.locator('.game-tile', { hasText: 'Agendado' });
    for (const t of await scheduled.all()) await expect(t.locator('.game-tile-score')).toHaveText('×');
    await expect(page.getByRole('heading', { name: 'Classificação' })).toBeVisible();
    await page.getByRole('button', { name: 'NFC', exact: true }).click();
    await expect(page.locator('.standings-mini tbody tr').first()).toBeVisible();
    await page.getByRole('button', { name: 'Próximo destaque' }).click();
    await expect(page.getByText(/Critério: maior total de jardas corridas/)).toBeVisible();
  });

  test('menus do cabeçalho: mouse chega até a subopção sem o menu sumir', async ({ page, isMobile }) => {
    test.skip(isMobile, 'menus suspensos são do desktop; no celular a navegação é pela gaveta');
    await page.goto('/');
    const trigger = page.locator('.nav-trigger', { hasText: 'Jogadores' });
    const tb = (await trigger.boundingBox())!;
    await page.mouse.move(tb.x + tb.width / 2, 2);
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 5 });
    const link = page.locator('.nav-menu a', { hasText: 'Hall of Fame' });
    const lb = (await link.boundingBox())!;
    // Movimento contínuo atravessando o espaço entre o botão e o menu.
    await page.mouse.move(lb.x + 24, lb.y + lb.height / 2, { steps: 30 });
    await expect(link).toBeVisible();
    await page.mouse.click(lb.x + 24, lb.y + lb.height / 2);
    await expect(page).toHaveURL(/\/hall-of-fame/);
  });

  test('menus do cabeçalho: passar o mouse e clicar no botão não fecha o menu', async ({ page, isMobile }) => {
    test.skip(isMobile, 'menus suspensos são do desktop');
    await page.goto('/');
    const trigger = page.locator('.nav-trigger', { hasText: 'Temporada' });
    await trigger.hover();
    await trigger.click();
    await expect(page.locator('.nav-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nav-menu')).toHaveCount(0);
  });

  test('página inexistente mostra 404 amigável', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByText('4th & 404')).toBeVisible();
  });
});
