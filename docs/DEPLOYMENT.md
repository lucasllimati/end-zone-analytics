# Deploy

> **O site é publicado no Cloudflare (Workers + GitHub Actions), de graça e sem servidor:** configuração em [PUBLICACAO.md](PUBLICACAO.md), operação em [PUBLICACAO_SERVIDOR.md](PUBLICACAO_SERVIDOR.md).
> Este documento é referência técnica: como o build publicado funciona e como rodar a versão completa (API + `/admin`) em hospedagem própria, se um dia for necessário.

## Publicação em uso — site estático + Cloudflare Worker

```bash
npm run data:full && npm run build:static   # dist/ com dist/data, sem /admin (VITE_PUBLIC_STATIC=1)
npx wrangler@4.144.0 dev --port 8788              # testa localmente exatamente o que vai ao ar
npx wrangler@4.144.0 deploy                       # publica (normalmente feito pelo GitHub Actions)
```

`wrangler.jsonc` serve `dist/` como *static assets* (com fallback de SPA e `public/_headers`) e executa `worker/index.ts` só em `/api/*` (placar ao vivo). O GitHub Actions (`publish.yml`) faz carga, portão de qualidade, build e deploy a cada 6 h e a cada push. Passo a passo: [PUBLICACAO.md](PUBLICACAO.md).

O `build:static` termina com `scripts/prerender-meta.ts`, que grava um HTML por rota pública (`dist/teams/buf.html`, `dist/super-bowl/60.html` etc., 118 rotas) com título, descrição, OpenGraph e canonical próprios. A Cloudflare serve `/teams/buf` a partir desse arquivo, e o Fastify faz o mesmo. Variáveis do build:

| Variável (GitHub → Settings → Variables) | Efeito |
|---|---|
| `SITE_URL` (definida: `https://end-zone-analytics.nfldata.workers.dev`) | URLs absolutas em `og:image`, `og:url` e canonical; gera o `sitemap.xml` e a linha `Sitemap:` do `robots.txt` |
| `CF_ANALYTICS_TOKEN` (opcional) | Inclui o Cloudflare Web Analytics (sem cookies) e libera o script dele na CSP de `_headers` |

O site também é um **PWA**: `public/manifest.webmanifest`, ícones em `public/icons/` e `public/sw.js` (páginas e `/data` com rede primeiro e cópia offline; `/assets` com cache primeiro; `/api` nunca em cache). `sw.js` e o manifest saem com `Cache-Control: no-cache`.

Em outra hospedagem estática, publique `dist/` com fallback de SPA para `index.html`; funciona tudo, exceto placar ao vivo e detalhes do Game Center.

## Hospedagem própria (avançado)

Necessária só para ter a API REST completa e o `/admin` online (servidor Node.js rodando sem parar — fora do plano grátis da Cloudflare). Funciona em qualquer VPS Linux ou serviço de containers.

### Node

```bash
npm ci
npm run data:full
npm run build
HOST=0.0.0.0 API_PORT=8787 ADMIN_TOKEN="$(openssl rand -base64 32)" npm start   # token com 24+ caracteres
```

O processo serve o site (`dist/`), os dados (`/data`) e a API. Coloque atrás de um proxy reverso (nginx/Caddy) com HTTPS e informe quantos proxies há na frente com `TRUST_PROXY` (ex.: `TRUST_PROXY=1`). Sem isso, a API ignora `X-Forwarded-For` — o correto quando ela está exposta direto, porque o cabeçalho pode ser forjado por qualquer cliente.

Atualização dos dados: prefira o **agendador interno** (`SYNC_PARTIAL_EVERY_HOURS=6`, `SYNC_FULL_WEEKDAY`, `SYNC_FULL_HOUR_UTC`), que registra cada execução no `/admin`. Se preferir o cron do sistema (as execuções pelo terminal também são registradas):

```cron
# a cada hora (domingo, segunda e quinta durante a temporada)
0 * * * 0,1,4  cd /srv/end-zone-analytics && npm run data:partial >> /var/log/eza-data.log 2>&1
# completa semanal
30 6 * * 2     cd /srv/end-zone-analytics && npm run data:full >> /var/log/eza-data.log 2>&1
```

A API recarrega os dados automaticamente quando o manifest muda (sem reiniciar).

### Docker Compose (Caddy + HTTPS)

```bash
cp .env.example .env   # preencha DOMAIN, ADMIN_TOKEN, GITHUB_TOKEN, SYNC_*, ALERT_*
docker compose up -d --build
```

O contêiner roda como usuário sem privilégios, faz a carga completa na primeira execução (volume vazio) e o Caddy emite o certificado para o `DOMAIN` do `.env` (o DNS do domínio precisa apontar para o IP do servidor, com as portas 80 e 443 abertas).

Scripts de apoio em `deploy/`: `setup-server.sh` (Ubuntu: Docker, firewall, SSH só com chave, atualizações automáticas, swap), `update.sh` (`git pull` + rebuild, só termina quando `/ready` responde) e `backup.sh` (log operacional `ops/` + `.env`). Monitore `/ready` e use `ALERT_WEBHOOK_URL` para alertas. Nesta modalidade, **desative** o workflow `publish.yml` do Cloudflare (Actions → Disable workflow) para não haver dois publicadores.

## Checklist da hospedagem própria

- [ ] `ADMIN_TOKEN` com 24+ caracteres aleatórios (`openssl rand -base64 32`); mais curto, o login fica desativado
- [ ] `TRUST_PROXY` igual ao número de proxies na frente da API (1 com o Caddy do docker-compose; 0 se exposta direto)
- [ ] `SYNC_PARTIAL_EVERY_HOURS` definido (agendador interno; dispensa o cron mostrado acima)
- [ ] `ALERT_WEBHOOK_URL` definido (alertas de falha no celular)
- [ ] HTTPS no proxy
- [ ] `/ready` monitorado
- [ ] Agendamento da carga parcial (interno ou cron do sistema)
- [ ] Workflow `publish.yml` do Cloudflare desativado (um único publicador)
- [ ] `npm run qa` e `npm run test:e2e` verdes antes do deploy
