# Arquitetura

Resumo técnico. Os diagramas completos (macro, micro e sequência) estão no [Guia completo](GUIA_COMPLETO.md#2-arquitetura-macro).

## Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite 6 + React Router 7 | SPA com divisão de código por rota, tipagem forte |
| Estilo | CSS com design tokens (sem framework) + Barlow Condensed auto-hospedada | Identidade própria (azul-marinho/azul elétrico), tema escuro/claro por variáveis, zero runtime |
| Gráficos | SVG próprio (`src/components/charts`) | Leve, acessível, exportável, sem dependências |
| API | Fastify 5 + zod | Rápido, logs estruturados (pino), validação declarativa |
| Pipeline | TypeScript (tsx) + csv-parse | Mesma linguagem e mesmos tipos do frontend |
| Armazenamento | JSON versionados em `data/` | Leitura pura, cacheável, funciona sem servidor |
| Testes | Vitest, Testing Library, Playwright, axe-core, cspell | Unitários a E2E, acessibilidade e ortografia |
| Publicação | Cloudflare Workers (static assets) + GitHub Actions | Grátis, sem servidor; cron de dados com portão de qualidade |
| Operação (servidor) | Docker + Caddy, agendador interno, log operacional (`ops/`), webhooks | Alternativa com `/admin` e API completa online |

## Fluxo

```
SOURCE (nflverse, curadoria) → RAW (data-raw) → NORMALIZED → ANALYTICS → QUALITY → data/ (publicado)
                                                                                     ├─ API /api/*
                                                                                     └─ Frontend /data/*
ESPN (ao vivo) → API /api/live/* (cache) → Frontend
```

### Publicação (em uso)

```
GitHub Actions (cron 6 h · push · manual)
  → npm run data:partial|full → portão de qualidade (tests/data/published.test.ts)
  → npm run build:static (dist/ + dist/data, sem /admin)
  → wrangler deploy → Cloudflare Worker
        ├─ static assets: site + /data/*.json (CDN, SPA fallback, public/_headers)
        └─ worker/index.ts: só /api/live/* (ESPN, cache 30–60 s)
```

Na versão com servidor (`docs/PUBLICACAO_SERVIDOR.md`), a API Fastify serve tudo e o agendador interno (`server/services/scheduler.ts`) roda as cargas; execuções e eventos ficam em `ops/` e aparecem no `/admin`.

## Princípios

1. **Contrato único:** `src/lib/types.ts` define todos os formatos publicados. Pipeline, API e frontend importam os mesmos tipos.
2. **Lógica pura compartilhada:** `src/lib/*` não acessa rede nem DOM (exceto `export.ts`), e é testada isoladamente.
3. **Publicação só quando há mudança:** uma carga cria nova publicação (e guarda o manifest anterior em `data/history/`) apenas se o conteúdo mudou; caso contrário, só registra a verificação (`lastCheckedAt`). Falhas nunca são reportadas como sucesso.
4. **Degradação elegante:** sem API, o site usa os JSON estáticos; sem dados ao vivo, o Game Center mostra o que existe e avisa.
5. **Transparência:** toda métrica derivada declara fórmula (ⓘ) e todo modelo, seus pesos.
6. **Público × administração:** operações (verificar, carregar, jobs, logs) só existem no `/admin`, autorizado no servidor; o build público estático nem inclui esse código.

## Dívida técnica conhecida / evolução incremental

| Item | Situação | Próximo passo |
|---|---|---|
| Banco de dados | JSON atende ao volume (≈35 MB) e permite publicar sem servidor | SQLite/DuckDB como destino do ETL quando houver play-by-play ou consultas livres; PostgreSQL só com várias instâncias |
| Cache distribuído | Cache em memória por processo; sessões do admin em memória (expiram ao reiniciar) | Redis apenas se houver múltiplas instâncias da API |
| SSR/SEO | SPA com título, descrição, OpenGraph e canonical por página | Pré-renderização (SSG) das páginas de times, jogadores e Super Bowls |
| Desempates | Simplificados e sinalizados | Implementar as regras oficiais completas |
