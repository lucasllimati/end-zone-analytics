# Arquitetura

Resumo técnico. Os diagramas completos (macro, micro e sequência) estão no [Guia completo](GUIA_COMPLETO.md#2-arquitetura-macro).

## Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite 6 + React Router 6 | SPA com divisão de código por rota, tipagem forte |
| Estilo | CSS com design tokens (sem framework) | Identidade própria, tema escuro/claro por variáveis, zero runtime |
| Gráficos | SVG próprio (`src/components/charts`) | Leve, acessível, exportável, sem dependências |
| API | Fastify 5 + zod | Rápido, logs estruturados (pino), validação declarativa |
| Pipeline | TypeScript (tsx) + csv-parse | Mesma linguagem e mesmos tipos do frontend |
| Armazenamento | JSON versionados em `data/` | Leitura pura, cacheável, funciona sem servidor |
| Testes | Vitest, Testing Library, Playwright, axe-core, cspell | Unitários a E2E, acessibilidade e ortografia |

## Fluxo

```
SOURCE (nflverse, curadoria) → RAW (data-raw) → NORMALIZED → ANALYTICS → QUALITY → data/ (publicado)
                                                                                     ├─ API /api/*
                                                                                     └─ Frontend /data/*
ESPN (ao vivo) → API /api/live/* (cache) → Frontend
```

## Princípios

1. **Contrato único:** `src/lib/types.ts` define todos os formatos publicados. Pipeline, API e frontend importam os mesmos tipos.
2. **Lógica pura compartilhada:** `src/lib/*` não acessa rede nem DOM (exceto `export.ts`), e é testada isoladamente.
3. **Dados imutáveis por ingestão:** cada carga gera nova `ingestionVersion`; o manifest anterior vai para `data/history/`.
4. **Degradação elegante:** sem API, o site usa os JSON estáticos; sem dados ao vivo, o Game Center mostra o que existe e avisa.
5. **Transparência:** toda métrica derivada declara fórmula (ⓘ) e todo modelo, seus pesos.

## Dívida técnica conhecida / evolução incremental

| Item | Situação | Próximo passo |
|---|---|---|
| Banco relacional | JSON atende ao volume (≈35 MB) | Adicionar publicação opcional em PostgreSQL (migrations + índices) quando houver play-by-play |
| Cache distribuído | Cache em memória por processo | Redis apenas se houver múltiplas instâncias da API |
| SSR/SEO | SPA com título, descrição, OpenGraph e canonical por página | Pré-renderização (SSG) das páginas de times, jogadores e Super Bowls |
| Desempates | Simplificados e sinalizados | Implementar as regras oficiais completas |
