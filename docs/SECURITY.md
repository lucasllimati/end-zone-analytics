# Segurança

## Medidas implementadas

| Área | Medida |
|---|---|
| Cabeçalhos | `@fastify/helmet`: CSP restritiva (`default-src 'self'`; imagens só de CDNs conhecidas; `connect-src` só `self` e api.github.com; `frame-ancestors 'none'`), `nosniff`, HSTS, referrer policy, `X-Frame-Options: DENY`, `Permissions-Policy` |
| Exportação | CSV com proteção contra injeção de fórmulas: texto que começa com `=`, `+`, `-`, `@`, tab ou CR recebe `'` na frente (números ficam intactos) |
| Scripts | Nenhum script inline (o tema é aplicado por `public/theme-init.js`) |
| Entrada | Validação com zod em todos os parâmetros; IDs com regex; corpo limitado a 32 KB |
| Abuso | Rate limit: 600 req/min por IP; 5/min para login e sincronização; job único (single-flight); `/api/stats/leaders` só aceita colunas numéricas próprias; `/api/live/game/:id` só IDs de jogos da base. O IP só vem de `X-Forwarded-For` quando `TRUST_PROXY` indica proxies confiáveis (0 por padrão; 1 no docker-compose, atrás do Caddy) — exposta direto, a API ignora o cabeçalho e o limite não pode ser burlado forjando IP |
| Admin | Todas as rotas `/api/admin/*` (leitura e escrita) exigem autenticação no servidor: sessão criada por `POST /api/admin/login` (cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `Path=/api/admin`, expira em 8 h) ou `Authorization: Bearer ADMIN_TOKEN` (comparação em tempo constante). Acesso por `localhost` sem token **somente fora de produção**. Ações com cookie exigem o cabeçalho `X-EZA-Admin: 1` (anti-CSRF). Login limitado a 5 tentativas/min por IP **e** a uma trava global (20 falhas em 15 min, de qualquer IP — por login ou por `Authorization: Bearer` —, bloqueiam toda autenticação por token por 15 min, contra ataque distribuído; cada requisição conta uma tentativa só). Em produção, `ADMIN_TOKEN` com menos de 24 caracteres desativa o login. Tentativas recusadas e bloqueios ficam na auditoria |
| Separação público × admin | A página pública `/data` só mostra fontes, cobertura, limitações e qualidade. `/admin` fica fora do menu, com `Disallow` no robots.txt, e é removida do build estático (`VITE_PUBLIC_STATIC=1`). Esconder a página não é a proteção: a autorização é sempre no servidor |
| Log operacional | `ops/` (fora de `data/`, que é público): execuções, alertas e auditoria, sem tokens ou segredos |
| Arquivos | Servidor estático restrito a `dist/` e `data/`; middleware de dev bloqueia path traversal |
| Erros | Mensagens genéricas em 500; detalhes só no log |
| Dependências | Poucas e conhecidas; rode `npm audit` periodicamente |
| Dados externos | Downloads com timeout, retry e escrita atômica; falha de rede mantém o cache anterior |

### Novidades da versão 1.4

| Superfície | Proteção |
|---|---|
| `POST /api/report` (erros do navegador) | Validação estrita (`server/services/clientReport.ts`: só campos conhecidos, tamanhos máximos, caracteres de controle removidos contra injeção em log, query string descartada), corpo de até 4 KB e 10 por minuto por IP; no Worker, só `Content-Type: application/json` e `Origin` do próprio site. Sem dados pessoais |
| `GET /api/news/:abbr` | Lista fechada das 32 siglas (sem proxy para buscas arbitrárias), cache de 15 min na borda, links só para `https://www.espn.com/`, abertos com `rel="noopener noreferrer"` |
| Service worker | Mesma origem; nunca guarda `/api/*`; caches com limite de tamanho e versão |
| Analytics | O script de terceiro só entra na CSP quando `CF_ANALYTICS_TOKEN` existe |
| Fontes externas no pipeline | Wikipedia com User-Agent identificado, pausa entre consultas e respeito ao `Retry-After`; prêmios só são publicados se conferirem com fatos conhecidos |

## Reportar vulnerabilidades

Não abra issue pública. Envie os detalhes ao mantenedor do projeto por canal privado, com passos para reproduzir. Resposta em até 7 dias.

## Recomendações de produção

- Sempre defina `ADMIN_TOKEN` longo e aleatório (`openssl rand -hex 32`).
- Rode atrás de HTTPS.
- Não exponha a porta da API diretamente se houver proxy.
- `GITHUB_TOKEN`, se usado, deve ter **somente** permissão de leitura pública.

## Site publicado (Cloudflare)

| Item | Como |
|---|---|
| Superfície | Só arquivos estáticos + `worker/index.ts`, que responde apenas `/api/live/*` (GET); o resto de `/api/*` devolve 404. Não há `/admin` nem login no site público |
| Cabeçalhos | `public/_headers`: CSP (`default-src 'self'`, imagens só da ESPN/NFL), HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Segredos | `CLOUDFLARE_API_TOKEN` (modelo *Edit Cloudflare Workers*) e `CLOUDFLARE_ACCOUNT_ID` só em *GitHub → Secrets*. Token vazado → *Roll* na Cloudflare e atualize o segredo |
| Publicação | Só o GitHub Actions publica (o build automático da Cloudflare deve ficar desligado); o portão de qualidade impede publicar dados reprovados. Cada segredo fica só no passo que o usa (o `npm ci` e as dependências não veem o token da Cloudflare) e o `wrangler` tem versão exata |
| Código-fonte | O build público não gera source maps (`VITE_PUBLIC_STATIC=1`): o repositório é privado e os `.map` entregariam o código inteiro |
| Abuso do placar ao vivo | O Worker responde `/api/live/*` do cache da borda (30–60 s): uma rajada de acessos vira uma chamada à ESPN por janela, sem esgotar a cota do Worker. Detalhe de jogo só para IDs da base (`data/live-ids.json`); sem a lista, recusa (falha fechada) |
| Cabeçalhos da API do Worker | `Content-Security-Policy: default-src 'none'`, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`, HSTS, `nosniff`, `Referrer-Policy: no-referrer` |
| Cadeia de suprimentos | Actions fixadas por SHA (com a versão no comentário), `persist-credentials: false` no checkout, `wrangler` com versão exata, `npm audit --audit-level=high` no CI e na publicação, Dependabot mensal e agrupado (no máximo 3 PRs: npm minor/patch, npm major, actions) |
| Atualização segura do front | Após nova publicação, erro de carregamento de módulo antigo recarrega a página uma vez (sem laço) |
| Dados versionados | `.gitignore` ancorado na raiz (`/data/`, `/data-raw/`, `/ops/`) — código em `src/data/` e `tests/data/` vai para o git |

## Checklist antes de publicar (19 pontos)

Auditoria de 14/10/2026, revista no teste de invasão de 16/10/2026. Repita a cada mudança grande; os itens marcados com teste são verificados automaticamente em `npm run qa`.

| # | Ponto | Situação | Como é garantido |
|---|---|---|---|
| 1 | `.env` exposto | ✅ | `.env` no `.gitignore`; histórico do git sem segredos (só exemplos como `um-token-longo`); variáveis `VITE_*` não carregam segredo |
| 2 | Validação no frontend | ✅ | Formulários do admin com campos obrigatórios e botão desativado; filtros e parâmetros da URL convertidos/limitados. É só conforto: a regra vale no servidor |
| 3 | Validação no backend | ✅ teste | zod em todos os parâmetros e corpos; IDs por regex; corpo ≤ 32 KB; `stat` só coluna numérica própria; Worker e servidor só aceitam IDs de jogos da base |
| 4 | SQL injection | ✅ n/a | Não há banco nem SQL; os dados são JSON. Caminhos de arquivo nunca vêm do usuário sem validação (sem path traversal) |
| 5 | Autenticação fraca | ✅ teste | Token comparado em tempo constante; sessão aleatória de 256 bits; token < 24 caracteres desativa o login em produção |
| 6 | IDOR | ✅ n/a | Não há dados por usuário; todas as rotas `/api/admin/*` exigem autenticação no servidor |
| 7 | Senhas direto no banco | ✅ n/a | Não há contas nem senhas armazenadas; o único segredo é o `ADMIN_TOKEN`, em variável de ambiente |
| 8 | Força bruta | ✅ teste | 5 tentativas/min por IP + trava global compartilhada por login e Bearer; IP não pode ser forjado (ver `TRUST_PROXY`) |
| 9 | Envio duplicado | ✅ teste | Botões desativados durante o envio; carga de dados é single-flight (segunda chamada recebe 409) |
| 10 | CSRF | ✅ teste | Cookie `SameSite=Strict` + cabeçalho `X-EZA-Admin` obrigatório nas ações; sem CORS |
| 11 | Upload sem validação | ✅ n/a | Não há upload |
| 12 | Revelando informação | ✅ | Erros 500 genéricos; sem stack trace; sem source maps no site público; versão do Node só para admin autenticado |
| 13 | Dependências vulneráveis | ✅ | `npm audit`: 0 vulnerabilidades (16/10/2026); CI e publicação falham com vulnerabilidade alta; Dependabot mensal e agrupado, alertas de segurança na hora |
| 14 | Tokens mal gerenciados | ✅ | Sessão expira em 8 h e some no logout; token nunca vai para log, URL ou `localStorage`; segredos do CI por passo |
| 15 | Rate limit | ✅ teste | Fastify: 600/min por IP; Worker: cache na borda para `/api/live/*` |
| 16 | Dados sensíveis expostos | ✅ | `data/` só tem dados públicos; log operacional (`ops/`) fora da pasta servida; admin fora do build público |
| 17 | SSRF | ✅ teste | Chamadas externas só para hosts fixos (ESPN, GitHub/nflverse); o usuário só escolhe um ID de jogo que exista na base |
| 18 | Cookies inseguros | ✅ teste | `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `Path=/api/admin` |
| 19 | CORS | ✅ | Nenhum cabeçalho CORS: só o próprio site lê a API |

Extras verificados: CSV sem injeção de fórmulas; CSP sem script inline e sem `eval`; nenhum `dangerouslySetInnerHTML`; links externos com `rel="noopener noreferrer"`; contêiner roda como usuário `node`; API sem porta pública no docker-compose (só via Caddy, com HTTPS).

## Relatório do teste de invasão (16/10/2026)

**Escopo:** site publicado (`end-zone-analytics.nfldata.workers.dev`: arquivos estáticos + Worker), servidor Fastify em modo produção (`NODE_ENV=production`, `ADMIN_TOKEN` forte, porta local), frontend no navegador (Chromium/Playwright) e configuração de CI/CD. Teste autorizado pelo dono do projeto.

**Método:** caixa-preta seguida de revisão do código (caixa-branca), guiada pelo OWASP Top 10:2025 e pelo checklist de 19 pontos acima. Cada achado foi reproduzido, corrigido, coberto por teste automatizado e reverificado contra o servidor real.

### Ataques executados

| Área | Ataques | Resultado |
|---|---|---|
| Reconhecimento | `/.env`, `/.git/config`, `/.git/HEAD`, `ops/`, `data-raw/`, `package.json`, código-fonte, workflows, manifests do histórico, `security.txt`, `robots.txt`, `sitemap.xml` | Nada exposto (fallback para a página do site); `robots.txt` só cita `/admin`, que não existe no site público |
| Cabeçalhos e métodos | CSP, HSTS, clickjacking, MIME sniffing; `POST/PUT/DELETE/OPTIONS/TRACE/PATCH` | Corretos; métodos de escrita → 405 |
| CORS | Origem maliciosa | Nenhum `Access-Control-Allow-Origin` |
| Injeção na URL | SQL (`' OR '1'='1`), path traversal (`../`, `%2e%2e`, `%2f`, `%5c`), CRLF/header injection (`%0d%0a`), números gigantes, XSS no ID | Recusados (400/403/404) |
| Parâmetros | Duplicados (`season=…&season=…`), arrays (`season[]`), limites estourados, bytes nulos, notação científica, propriedades do protótipo (`stat=constructor`) | Validados — exceto propriedades herdadas (**achado 6**) |
| Autenticação | Rotas admin sem credencial (inclusive de localhost em produção), cookie forjado, Bearer errado/vazio, força bruta com IP forjado, força bruta via Bearer, CSRF por formulário, corpo de 100 KB, `__proto__` no JSON | Bloqueados — exceto IP forjado (**achado 1**) e Bearer (**achado 2**) |
| XSS no navegador | `"><img onerror><svg onload>` em 10 rotas/parâmetros e na busca global | Nenhum script executado nem elemento injetado (React escapa o texto; CSP sem inline) |
| Exportação | Valores começando com `=`, `+`, `@` nos CSV | Viravam fórmula (**achado 5**) |
| Artefatos publicados | Source maps, código do admin no bundle | Source maps públicos (**achado 3**); admin fora do build |
| Abuso de custo | Rajadas no placar ao vivo; IDs de jogo arbitrários | Sem cache e sem lista de IDs (**achado 4**) |
| CI/CD | Escopo dos segredos, versões de actions e ferramentas, injeção via `inputs` | Segredos no job inteiro e versões flutuantes (**achado 7**) |

### Achados

| # | Severidade | OWASP 2025 | Onde | Achado | Correção |
|---|---|---|---|---|---|
| 1 | Alta | A07 Falhas de autenticação | `server/app.ts` (`trustProxy: true`) | Com a API exposta direto, `X-Forwarded-For` forjado trocava o “IP” a cada tentativa e anulava o limite de login | `TRUST_PROXY` (0 por padrão; 1 atrás do Caddy) + trava global de 20 falhas/15 min + token ≥ 24 caracteres em produção |
| 2 | Média | A07 Falhas de autenticação | `server/services/auth.ts` | Tokens errados via `Authorization: Bearer` não passavam pela trava do login (só pelo limite geral de 600/min) | Trava compartilhada login + Bearer, auditada; durante o bloqueio nem o token certo entra; uma tentativa por requisição |
| 3 | Média | A02 Configuração incorreta | `vite.config.ts` | 54 source maps publicados entregavam todo o código-fonte de um repositório privado | Sem source maps no build público |
| 4 | Média | A06 Design inseguro | `worker/index.ts` | Cada acesso ao placar ia à ESPN (cota de 100 mil/dia); qualquer ID numérico virava uma chamada externa | Cache na borda + lista de IDs da base (falha fechada) |
| 5 | Média | A05 Injeção | `src/lib/export.ts` | CSV injection: textos vindos das fontes externas que começam com `=`, `+`, `-`, `@` viravam fórmula no Excel/Sheets | Prefixo `'` (recomendação OWASP), números preservados; teste |
| 6 | Baixa | A05 Injeção / A10 Condições excepcionais | `server/app.ts` (`/api/stats/leaders`, `/api/live/game`) | `stat=constructor`/`toString` aceitos (propriedades herdadas); sem dados, `/api/live/game` respondia 500 | Só colunas numéricas próprias (`Object.hasOwn`); erro de leitura tratado como 404 |
| 7 | Média | A03 Cadeia de suprimentos | `.github/workflows/*.yml` | Token da Cloudflare visível a todos os passos (inclusive scripts de instalação do `npm ci`); `wrangler@4` e actions por tag flutuante; `inputs.mode` interpolado no script | Segredos por passo, `wrangler@4.144.0`, actions por SHA, `persist-credentials: false`, entrada por variável de ambiente, Dependabot e `npm audit` na publicação |

Todos os achados foram corrigidos e reverificados: o servidor em produção passou a responder 400 para `stat=constructor`, 404 para ID de jogo fora da base, 413 para corpo de 100 KB e 401 até para o token certo após 20 tentativas via Bearer (com evento `auth` de severidade *error* na auditoria).

### Riscos residuais e recomendações

| Item | Situação | Recomendação |
|---|---|---|
| Rotas inexistentes respondem 200 com a página do site (fallback de SPA) | Aceito: é o comportamento padrão de SPA e não expõe nada | — |
| `style-src 'unsafe-inline'` na CSP | Aceito: estilos dinâmicos (cores de time, larguras de barras); scripts continuam sem inline | Migrar para variáveis CSS por classe se um dia houver conteúdo de terceiros |
| Sessões do admin em memória | Aceito para uma instância (expiram ao reiniciar) | Store compartilhado (ex.: Redis) só com várias instâncias |
| Limite de taxa global na borda | O plano grátis permite 1 regra de *Rate limiting* na Cloudflare | Opcional: *Security → WAF → Rate limiting rules* → `/api/` com 60 requisições/10 s por IP |
| `security.txt` (RFC 9116) | Não publicado: exige um contato público para relatos | Ao ter um e-mail ou formulário público de contato, publique `public/.well-known/security.txt` |
| API da ESPN não oficial | Fora do nosso controle | Já tratada como opcional: falha → mensagem e o resto do site funciona |

### Ainda depende de você

- Troque (*Roll*) o token da Cloudflare que apareceu em print anteriormente, se ainda não fez.
- No servidor próprio (opcional), gere `ADMIN_TOKEN` com `openssl rand -base64 32`.
- Ative no GitHub: *Settings → Code security* → **Dependabot alerts** e **Secret scanning** (gratuitos), para ser avisado de dependências vulneráveis e segredos enviados ao git por engano.
