<!-- cspell:ignore minmax blitzam codigo -->
# Testes, QA, UX e revisão de texto

Como rodar:

```bash
npm run qa          # tipos + testes (unitários, componentes, API, pipeline, dados) + ortografia
npm run test:e2e    # E2E, UX e acessibilidade (Playwright + axe) — desktop e celular
node scripts/screenshots.mjs   # capturas de tela + detector de rolagem horizontal
```

## Última execução (27/10/2026, versão 1.4, dados até a semana 7 de 2026)

| Suíte | Resultado |
|---|---|
| TypeScript (app + servidor + Worker), modo estrito | ✅ sem erros |
| Vitest: 15 arquivos (unitários, componentes, conteúdo, novidades, consumo do ao vivo, API/admin, segurança, agendador, pipeline, dados publicados) | ✅ 172/172 |
| Desempates oficiais × história (`tests/data/playoffs.test.ts`) | ✅ 24/24 temporadas (2002–2025): mesmos classificados e mesmas folgas dos playoffs reais |
| Playwright contra o build publicado (`build:static` + `wrangler dev`, `E2E_STATIC=1`): fluxos, axe WCAG 2.1 AA, layout (`layout.spec.ts`), visual (`visual.spec.ts`), Meu time, simulador, fantasy, prêmios, recortes, SEO por rota, PWA, relato de erro | ✅ 194 passaram · 8 ignorados por design (admin não existe no site estático; atalho de teclado e seletor de temporada no celular) |
| Teste de usabilidade por agente de QA (34 URLs × desktop/celular, ~22 fluxos, 25 buscas, 79 links, axe em 10 páginas nos dois temas) | ✅ 0 erros de JS/console, 0 links quebrados, 0 rolagem lateral; 12 bugs e 10 pontos de UX encontrados (tabela abaixo) |
| cspell pt-BR + en: 149 arquivos | ✅ 0 ocorrências |
| Qualidade de dados (pipeline) | ✅ 25 ok · 0 alertas · 0 falhas |
| Bundle inicial | ✅ ≈ 97 KB gzip de JS (antes 125 KB) |

### Teste de usabilidade (27/10/2026): achados e correções

| Achado | Gravidade | Correção |
|---|---|---|
| Hall of Fame/Draft: Elway (1983) como Ravens e Bruce Matthews como Texans | Alta | `DraftTeamLogo`: franquia correta pelo ano (Baltimore Colts → IND, Houston Oilers → TEN) com o nome histórico na dica |
| Códigos do PFR (KAN, NOR, LVR…) estourando o logo | Média | Todos os códigos mapeados para a franquia (verificado: 0 sem mapa); monograma com fonte proporcional |
| Game Center antes do jogo: 2/3 da tela vazios, rótulos em inglês, "1,504", "a_turf", nota de drives | Média | Layout em grade larga sem coluna principal; médias da temporada traduzidas; números em pt-BR; nome do gramado; nota só com drives |
| Ano escolhido se perdia no F5 e não ia na URL | Média | `?season=` sincronizado com o seletor (sobrevive a links internos, recarregar e compartilhar) |
| "Trocar time" apagava o favorito | Média | Seletor já no time atual, com Cancelar e "Deixar de seguir" |
| Fantasy › Confrontos com "Todas" mostrava só WR | Média | Todas as posições, com a coluna Pos. |
| Aviso de pontuação falhava em silêncio com notificação bloqueada | Média | Mensagem explicando como liberar |
| Jogo encerrado no ao vivo ainda pendente na classificação e no simulador | Média | Placar final do ao vivo aplicado até o nflverse atualizar (`withLiveFinals`) |
| "sequência W2" em português | Baixa | V/D/E conforme o idioma dos termos |
| Esc no menu do cabeçalho mandava o foco para o `<body>` | Baixa | Foco volta ao botão do menu |
| Verde "bom" no tema claro com contraste 4,39:1 | Baixa | `#1e7a34` (5,4:1 no branco; 4,8:1 no fundo suave) |
| Tabelas no celular escondiam as colunas importantes | Alta (UX) | Coluna do nome fixa e degradê indicando mais colunas; no simulador, a chance vem logo após o time |
| Aba ativa fora da tela no celular | Média (UX) | A faixa de abas centraliza a aba ativa |
| Cabeçalho "pulava" quando o seletor Iniciante/Expert sumia | Média (UX) | Espaço reservado (continua invisível onde não muda nada, como pedido) |
| Busca: "EPA" abria um jogador; "allen" trazia Josh Allen em 6º; termos em português não achavam | Média (UX) | Jogadores na mesma ordenação (sobrenome, atividade, prêmios); sinônimos em português no glossário |
| "Divisões e recordes" confundia com divisão da NFL | Média (UX) | "Recortes e recordes", com aviso de que casa/fora incluem playoffs |
| "E se?" com pouco retorno | Média (UX) | Time escolhido em destaque e variação em pontos percentuais na coluna Playoffs |
| "Retorno do ano", datas com maiúsculas erradas, "venceu 1 seguido", "0 Super Bowls", dica de teclado no celular | Baixa (UX) | "Volta por cima do ano (Comeback)", "Quinta-feira, 22 de outubro", "venceu o último", selo só com títulos, dica escondida em telas de toque |
| Alvos de toque menores que 40 px | Baixa (UX) | Área mínima de ~40 px em telas de toque (o ⓘ mantém o desenho e ganha área em volta) |

**CI no Linux (28/10/2026):** o teste de layout passava no Windows e falhava no GitHub (Ubuntu), porque lá `system-ui` vira a DejaVu Sans, mais larga: rótulos com ⓘ vazavam das colunas de Estádios, Fantasy e Recortes, e as tabelas de Eficiência e do Ranking de QBs ganhavam rolagem lateral. Correções: Arial antes de `system-ui` na pilha de fontes, cabeçalhos de tabela que quebram linha e colunas de nome com quebra. Reproduzido e verificado localmente forçando Arial (mesmas medidas da Liberation Sans do runner): 31 rotas × desktop/celular sem achados.

Ficaram para depois (baixa prioridade): marcar a temporada em andamento como parcial nos gráficos de carreira; CSV no padrão do Excel brasileiro (`;` e vírgula decimal); PF/PA/DIFF e Casa/Fora no seletor PT/EN; nomes completos no seletor de times do comparador de temporadas.

## Execução anterior (16/10/2026, dados até a semana 6 de 2026)

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
