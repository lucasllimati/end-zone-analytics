# Segurança

## Medidas implementadas

| Área | Medida |
|---|---|
| Cabeçalhos | `@fastify/helmet`: CSP restritiva (`default-src 'self'`; imagens só de CDNs conhecidas; `connect-src` só `self` e api.github.com; `frame-ancestors 'none'`), `nosniff`, HSTS, referrer policy |
| Scripts | Nenhum script inline (o tema é aplicado por `public/theme-init.js`) |
| Entrada | Validação com zod em todos os parâmetros; IDs com regex; corpo limitado a 32 KB |
| Abuso | Rate limit: 600 req/min por IP; 5/min para sincronização; job único (single-flight) |
| Admin | Todas as rotas `/api/admin/*` (leitura e escrita) exigem autenticação no servidor: sessão criada por `POST /api/admin/login` (cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `Path=/api/admin`, expira em 8 h) ou `Authorization: Bearer ADMIN_TOKEN` (comparação em tempo constante). Acesso por `localhost` sem token **somente fora de produção**. Ações com cookie exigem o cabeçalho `X-EZA-Admin: 1` (anti-CSRF). Login limitado a 5 tentativas/min; tentativas recusadas ficam na auditoria |
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
| Publicação | Só o GitHub Actions publica (o build automático da Cloudflare deve ficar desligado); o portão de qualidade impede publicar dados reprovados |
| Dados versionados | `.gitignore` ancorado na raiz (`/data/`, `/data-raw/`, `/ops/`) — código em `src/data/` e `tests/data/` vai para o git |
