/** Fluxos das novidades: Meu time, simulador, fantasy, prêmios, divisões do jogador, PWA e SEO por rota. */
import { expect, test } from '@playwright/test';

test.describe('Meu time', () => {
  test('escolher o time na página inicial mostra o cartão e o botão na página do time', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Meu time' }) });
    await card.getByRole('combobox').selectOption('BUF');
    await expect(card.getByText('Buffalo Bills')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Trocar time' })).toBeVisible();
    await page.goto('/teams/buf');
    await expect(page.getByRole('button', { name: /Meu time/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Meu time/ }).click();
    await expect(page.getByRole('button', { name: /Seguir time/ })).toBeVisible();
  });
});

test.describe('simulador de playoffs', () => {
  test('mostra a classificação de hoje, as chances e reage ao "e se?"', async ({ page }) => {
    await page.goto('/season?tab=simulator', { waitUntil: 'networkidle' });
    await expect(page.getByRole('tab', { name: 'Classificação' })).toBeVisible();
    const tab = page.getByRole('tab', { name: 'Simulador' });
    test.skip(!(await tab.isVisible()), 'temporada sem jogos restantes: o simulador não aparece');
    await expect(page.getByRole('heading', { name: 'AFC: se a temporada acabasse hoje' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Chances de playoffs na AFC' })).toBeVisible({ timeout: 15_000 });
    const auto = page.locator('.whatif-list li').first().getByRole('button').first();
    await auto.click();
    await expect(page.getByRole('button', { name: /Limpar 1 escolha/ })).toBeVisible();
  });
});

test.describe('fantasy e prêmios', () => {
  test('fantasy: ranking da semana, filtro por posição e confrontos', async ({ page }) => {
    await page.goto('/fantasy');
    await expect(page.getByRole('heading', { level: 1, name: /Fantasy/ })).toBeVisible();
    await page.getByRole('button', { name: 'QB', exact: true }).click();
    const first = page.locator('table tbody tr').first();
    await expect(first.locator('td').nth(2)).toHaveText('QB');
    await page.getByRole('tab', { name: 'Confrontos' }).click();
    await expect(page.getByRole('table', { name: /cedidos por defesa/ })).toBeVisible();
  });

  test('prêmios: Josh Allen é o MVP de 2024 e o perfil mostra o selo', async ({ page }) => {
    await page.goto('/awards');
    const row = page.getByRole('row', { name: /2024/ }).first();
    await expect(row).toContainText('Josh Allen');
    await row.getByRole('link', { name: 'Josh Allen' }).click();
    await expect(page.getByRole('link', { name: 'MVP 2024' })).toBeVisible();
  });
});

test.describe('jogador e comparador', () => {
  test('divisões e recordes do jogador', async ({ page }) => {
    await page.goto('/players/00-0034857');
    await page.getByRole('tab', { name: 'Recortes e recordes' }).click();
    await expect(page.getByRole('table', { name: /Recortes de Josh Allen na carreira/ })).toContainText('Em casa');
    await expect(page.getByText('Recordes pessoais em um jogo (carreira)')).toBeVisible();
  });

  test('comparador jogo a jogo com temporada de cada jogador', async ({ page }) => {
    await page.goto('/compare?type=players&a=00-0034857&b=00-0033873');
    await expect(page.getByText(/jogo a jogo/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('Temporada de Josh Allen')).toBeVisible();
  });
});

test.describe('build publicado (estático)', () => {
  test.skip(process.env.E2E_STATIC !== '1', 'só no build estático (metadados por rota, service worker)');

  test('cada rota tem título e descrição próprios no HTML', async ({ request }) => {
    const html = await (await request.get('/teams/buf')).text();
    expect(html).toContain('<title>Buffalo Bills · End Zone Analytics</title>');
    expect(html).toMatch(/<meta name="description" content="Buffalo Bills:/);
    const home = await (await request.get('/')).text();
    expect(home).not.toContain('rel="canonical"');
  });

  test('app instalável: manifest e service worker', async ({ page, request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    await page.goto('/');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
  });

  test('erro no navegador vira relato em /api/report', async ({ page }) => {
    await page.goto('/');
    const sent = page.waitForRequest((r) => r.url().endsWith('/api/report') && r.method() === 'POST');
    await page.evaluate(() => setTimeout(() => {
      throw new Error('teste e2e de relato');
    }));
    const req = await sent;
    expect(req.postDataJSON()).toMatchObject({ message: expect.stringContaining('teste e2e de relato'), path: '/', source: 'window' });
  });
});

test.describe('correções do teste de usabilidade', () => {
  test('Hall of Fame: Elway foi draftado pelos Baltimore Colts (não pelos Ravens)', async ({ page }) => {
    await page.goto('/hall-of-fame');
    const row = page.getByRole('row', { name: /John Elway/ });
    await expect(row.getByTitle('Baltimore Colts, hoje Indianapolis Colts')).toBeAttached();
  });

  test('temporada escolhida fica na URL e sobrevive à navegação e ao recarregar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'o seletor de temporada do celular fica no menu lateral');
    await page.goto('/season');
    await page.getByLabel('Temporada', { exact: true }).selectOption('2019');
    await expect(page).toHaveURL(/season=2019/);
    await page.goto('/teams?season=2019');
    await page.reload();
    await expect(page.getByLabel('Temporada', { exact: true })).toHaveValue('2019');
  });

  test('"Trocar time" não apaga o favorito antes de escolher outro', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eza-team', 'BUF'));
    await page.goto('/');
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Meu time' }) });
    await card.getByRole('button', { name: 'Trocar time' }).click();
    await card.getByRole('button', { name: 'Cancelar' }).click();
    await page.reload();
    await expect(card.getByText('Buffalo Bills')).toBeVisible();
  });

  test('busca: "EPA" leva ao glossário, não a um jogador', async ({ page, isMobile }) => {
    test.skip(isMobile, 'atalho de teclado');
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Buscar' }).fill('epa');
    await expect(page.getByRole('dialog').getByRole('option').first()).toContainText('EPA (Expected Points Added)');
  });
});
