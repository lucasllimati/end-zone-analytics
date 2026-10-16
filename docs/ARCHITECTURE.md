# Arquitetura

Resumo técnico. Os diagramas completos (macro, micro e sequência) estão no [Guia completo](GUIA_COMPLETO.md#2-arquitetura-macro).

## Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript 7 + Vite 6 + React Router 7 | SPA com divisão de código por rota, tipagem forte |
| Estilo | CSS com design tokens (sem framework), fonte do sistema | Linguagem inspirada na Apple (cores de sistema, materiais translúcidos), tema escuro/claro por variáveis, zero runtime |
| Gráficos | SVG próprio (`src/components/charts`) | Leve, acessível, exportável, sem dependências |
| API | Fastify 5 + zod 4 | Rápido, logs estruturados (pino), validação declarativa |
| Pipeline | TypeScript (tsx) + csv-parse (síncrono e em fluxo) + zlib | Mesma linguagem e mesmos tipos do frontend; o play-by-play (~19 MB comprimidos por temporada) é lido em fluxo e reduzido a um resumo por time |
| Armazenamento | JSON versionados em `data/` | Leitura pura, cacheável, funciona sem servidor |
| Testes | Vitest, Testing Library, Playwright, axe-core, cspell | Unitários a E2E, acessibilidade e ortografia |
| Publicação | Cloudflare Workers (static assets) + GitHub Actions | Grátis, sem servidor; cron de dados com portão de qualidade |
| Operação (servidor Node) | Agendador interno, log operacional (`ops/`), webhooks; Docker + Caddy para hospedagem própria | `/admin` e API completa (local ou hospedagem própria) |

## Fluxo

```
SOURCE (nflverse, curadoria) → RAW (data-raw) → NORMALIZED → ANALYTICS → QUALITY → data/ (publicado)
                                                                                     ├─ API /api/*
                                                                                     └─ Frontend /data/*
ESPN (ao vivo) → API /api/live/* (cache) → Frontend
```

Conjuntos da nflverse usados: times, calendário (com linhas de aposta de fechamento e dias de descanso), cadastro de jogadores, estatísticas de jogadores e de times por temporada e **por jogo**, **play-by-play** (só o resumo situacional por time fica em cache: `data-raw/pbp_summary_{ano}.json`), **elencos** e draft.

Módulos do ETL: `transform.ts` (CSV → tipos), `analytics.ts` (temporadas, tendências, Super Bowls, QBs, similaridade, recordes, estádios), `teamProfiles.ts` (perfil de cada franquia), `insights.ts` (árbitros, zebras, times especiais, defesa cedida, detalhes de estádios), `pbp.ts` (resumo do play-by-play em fluxo), `quality.ts` (19 verificações).

### Publicação (em uso)

```
GitHub Actions (cron 6 h · push · manual)
  → npm run data:partial|full → portão de qualidade (tests/data/published.test.ts)
  → npm run build:static (dist/ + dist/data, sem /admin)
  → wrangler deploy → Cloudflare Worker
        ├─ static assets: site + /data/*.json (CDN, SPA fallback, public/_headers)
        └─ worker/index.ts: só /api/live/* (ESPN, cache na borda 30–60 s,
                              só IDs de jogos da base — data/live-ids.json)
```

Operação em produção: `docs/PUBLICACAO_SERVIDOR.md`. Rodando o servidor Node (localmente ou em hospedagem própria — `docs/DEPLOYMENT.md`), a API Fastify serve tudo, inclusive o `/admin`, e o agendador interno (`server/services/scheduler.ts`) roda as cargas; execuções e eventos ficam em `ops/`.

## Princípios

1. **Contrato único:** `src/lib/types.ts` define todos os formatos publicados. Pipeline, API e frontend importam os mesmos tipos.
2. **Lógica pura compartilhada:** `src/lib/*` não acessa rede nem DOM (exceto `export.ts`), e é testada isoladamente.
3. **Publicação só quando há mudança:** uma carga cria nova publicação (e guarda o manifest anterior em `data/history/`) apenas se o conteúdo mudou; caso contrário, só registra a verificação (`lastCheckedAt`). Falhas nunca são reportadas como sucesso.
4. **Degradação elegante:** sem API, o site usa os JSON estáticos; sem dados ao vivo, o Game Center mostra o que existe e avisa.
5. **Transparência:** toda métrica derivada declara fórmula (ⓘ) e todo modelo, seus pesos.
6. **Público × administração:** operações (verificar, carregar, jobs, logs) só existem no `/admin`, autorizado no servidor; o build público estático nem inclui esse código.
7. **Seguro por padrão:** validação de toda entrada no servidor, falha fechada (na dúvida, recusa), segredos só em variáveis de ambiente e só no passo do CI que os usa, dependências e actions fixadas por versão/SHA. Ver [SECURITY.md](SECURITY.md).
8. **Carregamento sob demanda:** dados pesados (jogo a jogo, box score, elencos, perfis de franquia) ficam em arquivos pequenos baixados só quando a seção é aberta.

## Dívida técnica conhecida / evolução incremental

| Item | Situação | Próximo passo |
|---|---|---|
| Banco de dados | JSON atende ao volume (≈190 MB em ~960 arquivos, a maior parte carregada sob demanda) e permite publicar sem servidor | SQLite/DuckDB como destino do ETL para consultas livres; PostgreSQL só com várias instâncias |
| Play-by-play | Só o resumo situacional por time é publicado | Jogada a jogada (mapas de campo, probabilidade de vitória própria) exigiria banco ou arquivos por jogo |
| Cache distribuído | Cache em memória por processo; sessões do admin em memória (expiram ao reiniciar) | Redis apenas se houver múltiplas instâncias da API |
| SSR/SEO | SPA com título, descrição, OpenGraph e canonical por página | Pré-renderização (SSG) das páginas de times, jogadores e Super Bowls |
| Desempates | Simplificados e sinalizados | Implementar as regras oficiais completas |
