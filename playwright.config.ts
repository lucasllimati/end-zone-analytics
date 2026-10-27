import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + UX + acessibilidade + layout + visual. Por padrão usa o servidor de desenvolvimento (reaproveita
 * se já estiver rodando). No CI, testa o build estático real servido pelo Worker local:
 *   E2E_STATIC=1 E2E_BASE_URL=http://127.0.0.1:8788 E2E_SERVER="npx wrangler dev --port 8788 --ip 127.0.0.1"
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  // Capturas de referência do teste visual, separadas por sistema (a fonte renderiza diferente em cada um).
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.E2E_SERVER ?? 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
