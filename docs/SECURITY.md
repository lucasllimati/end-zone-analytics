# Segurança

## Medidas implementadas

| Área | Medida |
|---|---|
| Cabeçalhos | `@fastify/helmet`: CSP restritiva (`default-src 'self'`; imagens só de CDNs conhecidas; `connect-src` só `self` e api.github.com; `frame-ancestors 'none'`), `nosniff`, HSTS, referrer policy |
| Scripts | Nenhum script inline (o tema é aplicado por `public/theme-init.js`) |
| Entrada | Validação com zod em todos os parâmetros; IDs com regex; corpo limitado a 32 KB |
| Abuso | Rate limit: 600 req/min por IP; 5/min para login e sincronização; job único (single-flight). O IP só vem de `X-Forwarded-For` quando `TRUST_PROXY` indica proxies confiáveis (0 por padrão; 1 no docker-compose, atrás do Caddy) — exposta direto, a API ignora o cabeçalho e o limite não pode ser burlado forjando IP |
| Admin | Todas as rotas `/api/admin/*` (leitura e escrita) exigem autenticação no servidor: sessão criada por `POST /api/admin/login` (cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `Path=/api/admin`, expira em 8 h) ou `Authorization: Bearer ADMIN_TOKEN` (comparação em tempo constante). Acesso por `localhost` sem token **somente fora de produção**. Ações com cookie exigem o cabeçalho `X-EZA-Admin: 1` (anti-CSRF). Login limitado a 5 tentativas/min por IP **e** a uma trava global (20 falhas em 15 min, de qualquer IP, bloqueiam o login por 15 min, contra ataque distribuído). Em produção, `ADMIN_TOKEN` com menos de 24 caracteres desativa o login. Tentativas recusadas e bloqueios ficam na auditoria |
| Separação público × admin | A página pública `/data` só mostra fontes, cobertura, limitações e qualidade. `/admin` fica fora do menu, com `Disallow` no robots.txt, e é removida do build estático (`VITE_PUBLIC_STATIC=1`). Esconder a página não é a proteção: a autorização é sempre no servidor |
| Log operacional | `ops/` (fora de `data/`, que é público): execuções, alertas e auditoria, sem tokens ou segredos |
| Arquivos | Servidor estático restrito a `dist/` e `data/`; middleware de dev bloqueia path traversal |
| Erros | Mensagens genéricas em 500; detalhes só no log |
| Dependências | Poucas e conhecidas; rode `npm audit` periodicamente |
| Dados externos | Downloads com timeout, retry e escrita atômica; falha de rede mantém o cache anterior |

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
| Abuso do placar ao vivo | O Worker responde `/api/live/*` do cache da borda (30–60 s): uma rajada de acessos vira uma chamada à ESPN por janela, sem esgotar a cota do Worker |
| Dados versionados | `.gitignore` ancorado na raiz (`/data/`, `/data-raw/`, `/ops/`) — código em `src/data/` e `tests/data/` vai para o git |

## Checklist antes de publicar (19 pontos)

Auditoria de 14/10/2026. Repita a cada mudança grande; os itens marcados com teste são verificados automaticamente em `npm run qa`.

| # | Ponto | Situação | Como é garantido |
|---|---|---|---|
| 1 | `.env` exposto | ✅ | `.env` no `.gitignore`; histórico do git sem segredos (só exemplos como `um-token-longo`); variáveis `VITE_*` não carregam segredo |
| 2 | Validação no frontend | ✅ | Formulários do admin com campos obrigatórios e botão desativado; filtros e parâmetros da URL convertidos/limitados. É só conforto: a regra vale no servidor |
| 3 | Validação no backend | ✅ teste | zod em todos os parâmetros e corpos; IDs por regex; corpo ≤ 32 KB; Worker valida o ID do jogo |
| 4 | SQL injection | ✅ n/a | Não há banco nem SQL; os dados são JSON. Caminhos de arquivo nunca vêm do usuário sem validação (sem path traversal) |
| 5 | Autenticação fraca | ✅ teste | Token comparado em tempo constante; sessão aleatória de 256 bits; token < 24 caracteres desativa o login em produção |
| 6 | IDOR | ✅ n/a | Não há dados por usuário; todas as rotas `/api/admin/*` exigem autenticação no servidor |
| 7 | Senhas direto no banco | ✅ n/a | Não há contas nem senhas armazenadas; o único segredo é o `ADMIN_TOKEN`, em variável de ambiente |
| 8 | Força bruta | ✅ teste | 5 tentativas/min por IP + trava global; IP não pode ser forjado (ver `TRUST_PROXY`) |
| 9 | Envio duplicado | ✅ teste | Botões desativados durante o envio; carga de dados é single-flight (segunda chamada recebe 409) |
| 10 | CSRF | ✅ teste | Cookie `SameSite=Strict` + cabeçalho `X-EZA-Admin` obrigatório nas ações; sem CORS |
| 11 | Upload sem validação | ✅ n/a | Não há upload |
| 12 | Revelando informação | ✅ | Erros 500 genéricos; sem stack trace; sem source maps no site público; versão do Node só para admin autenticado |
| 13 | Dependências vulneráveis | ✅ | `npm audit`: 0 vulnerabilidades (14/10/2026). Rode `npm audit` antes de publicar |
| 14 | Tokens mal gerenciados | ✅ | Sessão expira em 8 h e some no logout; token nunca vai para log, URL ou `localStorage`; segredos do CI por passo |
| 15 | Rate limit | ✅ teste | Fastify: 600/min por IP; Worker: cache na borda para `/api/live/*` |
| 16 | Dados sensíveis expostos | ✅ | `data/` só tem dados públicos; log operacional (`ops/`) fora da pasta servida; admin fora do build público |
| 17 | SSRF | ✅ teste | Chamadas externas só para hosts fixos (ESPN, GitHub/nflverse); o usuário só escolhe um ID numérico validado |
| 18 | Cookies inseguros | ✅ teste | `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `Path=/api/admin` |
| 19 | CORS | ✅ | Nenhum cabeçalho CORS: só o próprio site lê a API |

Extras verificados: CSP sem script inline e sem `eval`; nenhum `dangerouslySetInnerHTML`; links externos com `rel="noopener noreferrer"`; contêiner roda como usuário `node`; API sem porta pública no docker-compose (só via Caddy, com HTTPS).

### Ainda depende de você

- Troque (*Roll*) o token da Cloudflare que apareceu em print anteriormente, se ainda não fez.
- No servidor próprio (opcional), gere `ADMIN_TOKEN` com `openssl rand -base64 32`.
- Ative no GitHub: *Settings → Code security* → **Dependabot alerts** e **Secret scanning** (gratuitos), para ser avisado de dependências vulneráveis e segredos enviados ao git por engano.
