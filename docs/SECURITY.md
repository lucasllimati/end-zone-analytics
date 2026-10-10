# Segurança

## Medidas implementadas

| Área | Medida |
|---|---|
| Cabeçalhos | `@fastify/helmet`: CSP restritiva (`default-src 'self'`; imagens só de CDNs conhecidas; `connect-src` só `self` e api.github.com; `frame-ancestors 'none'`), `nosniff`, HSTS, referrer policy |
| Scripts | Nenhum script inline (o tema é aplicado por `public/theme-init.js`) |
| Entrada | Validação com zod em todos os parâmetros; IDs com regex; corpo limitado a 32 KB |
| Abuso | Rate limit: 600 req/min por IP; 5/min para sincronização; job único (single-flight) |
| Admin | `POST /api/admin/sync` só a partir de `localhost` (sem proxy) ou com `Authorization: Bearer ADMIN_TOKEN`, comparado em tempo constante |
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
