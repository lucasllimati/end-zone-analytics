<!-- cspell:ignore minmax blitzam codigo -->
# Testes, QA, UX e revisão de texto

Como rodar:

```bash
npm run qa          # tipos + testes (unitários, componentes, API, pipeline, dados) + ortografia
npm run test:e2e    # E2E, UX e acessibilidade (Playwright + axe) — desktop e celular
node scripts/screenshots.mjs   # capturas de tela + detector de rolagem horizontal
```

## Última execução (10/10/2026, dados até a semana 5 de 2026)

| Suíte | Resultado |
|---|---|
| TypeScript (app + servidor), modo estrito | ✅ sem erros |
| Vitest — 8 arquivos (unitários, componentes, conteúdo, API, pipeline, dados publicados) | ✅ 95/95 |
| Playwright — 28 rotas × desktop/celular sem erro de console e sem rolagem lateral | ✅ |
| axe-core WCAG 2.1 AA — 9 páginas × 2 dispositivos, sem violações sérias/críticas | ✅ |
| Fluxos de UX (busca Ctrl+K, modo Expert persistente, ⓘ, tema, logos, simulador, campo por teclado, ranking, Super Bowl, 404) | ✅ (1 ignorado por design: atalho de teclado no celular) |
| cspell pt-BR + en — 107 arquivos | ✅ 0 ocorrências |
| Paleta de gráficos (verificador de daltonismo) | ✅ escuro: todas passam · claro: passa com aviso de contraste compensado por legenda + tabela |
| Qualidade de dados (pipeline) | ✅ 15 ok · 2 alertas · 0 falhas |
| Carga parcial real via API (`POST /api/admin/sync`) | ✅ 1 arquivo baixado, 9,4 s, ingestão v3, API recarregou sozinha |
| Build de produção + servidor (`npm start`) | ✅ SPA, `/data`, `/api` |

## O que a revisão encontrou e corrigiu

| Achado | Tipo | Correção |
|---|---|---|
| Glossário apontava para termo inexistente (“slant”) | Conteúdo | Relação corrigida; teste de integridade passou a cobrir |
| Radar de percentis “comparado a 0 jogadores” no início da temporada | Bug | Mínimo de jogos proporcional ao andamento da temporada |
| Cores de time escuras invisíveis no tema escuro (ex.: Seahawks) | Contraste | `useTeamColor`: cor primária → secundária → paleta, com contraste ≥ 2:1 |
| Rolagem lateral no Game Center (celular) e no cabeçalho a 1366 px | Layout | Grid com `minmax(0, 1fr)`; cabeçalho compacto entre 1100 e 1480 px |
| Botão longo estourando a largura no celular | Layout | Variante `.btn.wrap` |
| Logos de 4096 px (~490 KB) atrasando a página | Performance | Redimensionamento pela CDN (~4 KB por logo) |
| Páginas sem `<h1>`, SVG interativo com `role="img"`, tabelas roláveis sem foco | Acessibilidade | `<h1>` em todas, `role="group"`, regiões focáveis |
| Chave React duplicada nas estatísticas da ESPN | Bug | Chave por índice |
| Rótulos das zonas cobertos pelos jogadores no playbook | UX | Rótulo no topo de cada zona |
| Cabeçalhos de CSV sem acento; “blitzam”; “codigo” | Texto | Corrigidos |
| BUF/CIN 2022 com 16 jogos | Dado real (jogo cancelado) | Exceção documentada na verificação |
| nflverse: Brees 2011 com 5.535 jardas (oficial: 5.476) | Divergência entre fontes | Recorde oficial exibido; divergência visível em `/data` |

## Itens que exigem atenção humana

- O texto educativo (regras, estratégia, história) foi revisado, mas regras da NFL mudam todo ano — confira a cada temporada.
- Os dados ao vivo dependem de uma API pública não oficial.
