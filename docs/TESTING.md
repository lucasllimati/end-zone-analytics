<!-- cspell:ignore minmax blitzam codigo -->
# Testes, QA, UX e revisão de texto

Como rodar:

```bash
npm run qa          # tipos + testes (unitários, componentes, API, pipeline, dados) + ortografia
npm run test:e2e    # E2E, UX e acessibilidade (Playwright + axe) — desktop e celular
node scripts/screenshots.mjs   # capturas de tela + detector de rolagem horizontal
```

## Última execução (16/10/2026, dados até a semana 6 de 2026)

| Suíte | Resultado |
|---|---|
| TypeScript (app + servidor + Worker), modo estrito | ✅ sem erros |
| Vitest — 11 arquivos (unitários, componentes, conteúdo, análises, API/admin, segurança, agendador/alertas, pipeline, dados publicados) | ✅ 125/125 |
| Playwright com servidor (`npm run dev`) — rotas × desktop/celular, abas novas (eficiência, mercado, elenco, jogo a jogo, box score), seletor de modo, admin, separação público × admin | ✅ 128 passaram · 4 ignorados por design (atalho de teclado e seletor de modo no celular) |
| Teste de invasão (pentest) — site publicado + servidor em modo produção + XSS no navegador | ✅ 7 achados corrigidos e reverificados (ver [SECURITY.md](SECURITY.md#relatório-do-teste-de-invasão-16102026)) |
| Playwright contra o site publicado localmente (`build:static` + `wrangler dev`, `E2E_STATIC=1`) | ✅ 105 passaram · 3 ignorados por design (admin não existe no site estático) |
| axe-core WCAG 2.1 AA — 12 páginas × 2 dispositivos, sem violações sérias/críticas | ✅ |
| cspell pt-BR + en — 130 arquivos | ✅ 0 ocorrências |
| Paleta de gráficos (verificador de daltonismo) contra `#1c1c1e` (escuro) e `#ffffff` (claro) | ✅ escuro: todas passam · claro: aviso de contraste compensado por legenda + tabela |
| Qualidade de dados (pipeline) | ✅ 19 ok · 0 alertas · 0 falhas |
| CI em checkout limpo (só arquivos versionados): `npm ci`, `qa`, `build`, `npm audit` | ✅ 0 vulnerabilidades |
| Produção (`end-zone-analytics.nfldata.workers.dev`) | ✅ `/data/*.json` em JSON, `/api/live/scoreboard` em JSON com cache na borda (`CF-Cache-Status: HIT`), páginas novas sem erros, sem source maps, cabeçalhos CSP/HSTS, `/api/admin/*` → 404 |

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
| Técnico da temporada era o do último jogo (interino “levava” o ano) | Dado | Técnico = quem dirigiu mais jogos; perfis calculam técnicos jogo a jogo |
| Estádios duplicados por nome de patrocínio | Dado | Agrupados pelo identificador do estádio, com os outros nomes listados |
| Análises de valor do draft vazias: a fonte deixou de preencher `car_av` | Dado | Uso de `w_av` (AV ponderado) + verificação de qualidade `draft-av` |
| Red zone inflada: ponto extra/2 pontos (da 15/2) contavam como chegada à red zone | Cálculo | Só snaps de scrimmage/FG; teste com o caso; resumo com versão de lógica (cache refeito ao mudar) |
| Quatro cartões de eficiência em 3 colunas deixavam um sozinho | Layout | Grade fixa 2 × 2 |
| Listas de “melhores jogos” e “zebras” quebradas no layout de referência | Layout | Estrutura de link com valor, descrição e detalhe |
| Seletor Iniciante/Expert aparecia em páginas onde nada muda | UX | Só aparece quando a página tem conteúdo que depende do modo (teste e2e) |
| Após nova publicação, quem estava com o site aberto quebrava ao abrir outra página (arquivo antigo inexistente) | Bug | Recarga automática única no erro de carregamento de módulo |
| Sete achados de segurança (força bruta via IP forjado e via Bearer, source maps públicos, segredos no job inteiro do CI, abuso do placar, CSV injection, propriedades herdadas) | Segurança | Corrigidos com testes — ver [SECURITY.md](SECURITY.md) |

## Itens que exigem atenção humana

- O texto educativo (regras, estratégia, história) foi revisado, mas regras da NFL mudam todo ano — confira a cada temporada.
- Os dados ao vivo dependem de uma API pública não oficial.
