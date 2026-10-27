/**
 * Teste visual por captura de tela: compara as páginas com uma imagem de referência e falha se mais de
 * 1% dos pixels mudar. Só páginas cujo conteúdo não depende dos dados (que mudam a cada 6 h); o rodapé,
 * que mostra a data da atualização, fica mascarado.
 *
 * Referências em tests/e2e/__screenshots__/<sistema>/<projeto>/. No CI (Linux), a referência é a da main:
 * cada publicação grava as capturas no cache, e os pull requests (inclusive os do Dependabot) são comparados
 * com ela. Para aceitar uma mudança visual intencional localmente: npx playwright test visual --update-snapshots
 */
import { expect, test } from '@playwright/test';

const PAGES = ['/learn', '/rules', '/positions', '/glossary', '/strategy', '/about', '/privacy'];

test.describe('visual', () => {
  for (const route of PAGES) {
    test(`aparência de ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${route.slice(1)}.png`, { mask: [page.locator('.site-footer')], animations: 'disabled' });
    });
  }
});
