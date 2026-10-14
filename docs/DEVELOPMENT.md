# Desenvolvimento

## Ambiente

- Node.js 20+ (testado com 22 no CI e 24 localmente) e npm.
- Copie `.env.example` para `.env` se quiser mudar porta, host ou definir `ADMIN_TOKEN`/`GITHUB_TOKEN`.

```bash
npm install
npm run data:full     # primeira vez
npm run dev           # API (8787) + Vite (5173) juntos
```

`npm run dev:web` sozinho também funciona: o Vite serve `/data` direto da pasta `data/` (sem placar ao vivo nem área administrativa).

Área administrativa local: <http://localhost:5173/admin> (em desenvolvimento, o acesso a partir do próprio computador dispensa token).

Para ver **exatamente a versão publicada** (site estático + Worker):

```bash
npm run build:static
npx wrangler@4.144.0 dev --port 8788    # http://localhost:8788
E2E_STATIC=1 E2E_BASE_URL=http://localhost:8788 npm run test:e2e
```

## Scripts

| Script | Função |
|---|---|
| `dev`, `dev:web`, `dev:api` | Desenvolvimento |
| `build`, `start`, `preview` | Produção (API servindo o site) |
| `build:static` | Site estático (sem `/admin`) com os dados em `dist/data`; gera `sitemap.xml` se `SITE_URL` estiver definido |
| `data:full`, `data:partial`, `data:check`, `data:quality` | Pipeline |
| `typecheck`, `test`, `test:watch`, `test:e2e`, `spell`, `qa` | Qualidade |

## Como adicionar…

**Uma métrica:** inclua em `src/content/metrics.ts` (rótulo, `simple`, `expert`, `formula`). Ela ganha ⓘ automático em tabelas, explorador e tiles. Se for derivada, adicione em `derived()` (`src/lib/stats.ts`) com teste.

**Uma fonte de dados:** declare em `src/lib/sources.ts`, normalize em `server/etl/transform.ts`, publique em `pipeline.ts`, adicione verificações em `quality.ts` e documente em `DATA_SOURCES.md`. A verificação de atualizações passa a cobri-la automaticamente.

**Uma página:** crie `src/pages/Nome.tsx` (export default), registre a rota lazy em `App.tsx` e o item em `src/content/nav.ts` (o teste de conteúdo garante que a rota existe). Use `Seo`, `PageHeader`, `ModeNote` e `ChartFrame`.

**Uma jogada no playbook:** adicione em `src/content/playbook.ts` (coordenadas 600×380, linha de scrimmage em y=218). O teste valida 11 jogadores de ataque e caminhos dentro do campo.

## Convenções

- Interface em português (pt-BR); termos técnicos da NFL em inglês com explicação.
- Nunca exibir `0` para dado ausente: use `null` e `format.ts` (“Não disponível”).
- Cores apenas por tokens CSS (`var(--…)`); cores de time sempre via `useTeamColor()` (contraste garantido).
- Componentes acessíveis: botões reais, `aria-*` corretos, navegação por teclado.
