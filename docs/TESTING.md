<!-- cspell:ignore minmax blitzam codigo -->
# Testes, QA, UX e revisão de texto

Como rodar:

```bash
npm run qa          # tipos + testes (unitários, componentes, API, pipeline, dados) + ortografia
npm run test:e2e    # E2E, UX e acessibilidade (Playwright + axe) — desktop e celular
node scripts/screenshots.mjs   # capturas de tela + detector de rolagem horizontal
```

## Última execução (11/10/2026, dados até a semana 5 de 2026)

| Suíte | Resultado |
|---|---|
| TypeScript (app + servidor + Worker), modo estrito | ✅ sem erros |
| Vitest — 9 arquivos (unitários, componentes, conteúdo, API/admin, agendador/alertas, pipeline, dados publicados) | ✅ 107/107 |
| Playwright com servidor (`npm run dev`) — 29 rotas × desktop/celular, fluxos de UX, admin, separação público × admin | ✅ 107 passaram · 1 ignorado por design (atalho de teclado no celular) |
| Playwright contra o site publicado localmente (`build:static` + `wrangler dev`, `E2E_STATIC=1`) | ✅ 105 passaram · 3 ignorados por design (admin não existe no site estático) |
| axe-core WCAG 2.1 AA — 12 páginas × 2 dispositivos, sem violações sérias/críticas | ✅ |
| cspell pt-BR + en — 117 arquivos | ✅ 0 ocorrências |
| Paleta de gráficos (verificador de daltonismo) contra o novo fundo `#0b1728` | ✅ todas as checagens passam |
| Qualidade de dados (pipeline) | ✅ 18 ok · 0 alertas · 0 falhas |
| CI em checkout limpo (só arquivos versionados): `npm ci`, `qa`, `build`, `npm audit` | ✅ 0 vulnerabilidades |
| Produção (`end-zone-analytics.nfldata.workers.dev`) | ✅ `/data/*.json` em JSON, `/api/live/scoreboard` em JSON, rotas diretas, cabeçalhos CSP/HSTS, `/api/admin/*` → 404 |

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
| nflverse: Brees 2011 com 5.535 jardas (oficial: 5.476) | Divergência entre fontes | Recorde oficial exibido; divergência documentada na curadoria (`knownDivergences`), sem alerta repetido |
| nflverse: 53 temporadas (2003–2008) com recepções > alvos (alvos = 1) | Dado inconsistente na fonte | Alvos viram “Não disponível” (sem aproveitamento calculado); verificação própria |
| Carga parcial com a API do GitHub em HTTP 403 terminava como “sucesso” sem atualizar | Bug | Erro explícito com horário de liberação e ação recomendada; ETag; cache de versões renovado a cada execução |
| `/api/admin/check` e `/api/admin/jobs` abertos ao público | Segurança | Todas as rotas admin autenticadas no servidor; sessão HttpOnly + anti-CSRF; acesso local só fora de produção |
| Cada carga criava uma “versão” nova mesmo sem mudanças | UX/dados | Nova publicação só quando o conteúdo muda; histórico legível (“o que mudou”) |
| Página do time quebrava no build de produção (ordem de hooks do React) | Bug | `useMemo` antes dos returns condicionais; varredura nas demais páginas |
| Página 404 sem `<h1>` | Acessibilidade | Título “4th & 404” passou a ser `<h1>` |
| Selo “Ao vivo” com contraste insuficiente; lista de números do hero com `dl` inválida; painel do admin sem `tabpanel` | Acessibilidade | Cor do selo, lista semântica e `TabPanel` |
| `.gitignore` com `data/` ignorava `src/data/` e `tests/data/` (CI falhava com “Cannot find module”) | Build | Padrões ancorados na raiz (`/data/`) |
| Site publicado pelo build automático da Cloudflare sem a pasta de dados | Publicação | Publicação feita só pelo GitHub Actions (gera os dados antes); guia documenta desligar o build da Cloudflare |
| Placar ao vivo no formato Pages Functions não rodava no Worker | Publicação | `worker/index.ts` com `run_worker_first` só para `/api/*` |

## Itens que exigem atenção humana

- O texto educativo (regras, estratégia, história) foi revisado, mas regras da NFL mudam todo ano — confira a cada temporada.
- Os dados ao vivo dependem de uma API pública não oficial.
