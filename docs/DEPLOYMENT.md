# Deploy

> **Para publicar na internet de graça, siga o guia passo a passo: [PUBLICACAO.md](PUBLICACAO.md)** (Cloudflare Workers + GitHub Actions, sem servidor — em uso). Com servidor próprio e `/admin` online: [PUBLICACAO_SERVIDOR.md](PUBLICACAO_SERVIDOR.md). As opções abaixo são referências técnicas.

## Opção 1 — Node

```bash
npm ci
npm run data:full
npm run build
HOST=0.0.0.0 API_PORT=8787 ADMIN_TOKEN=um-token-longo npm start
```

O processo serve o site (`dist/`), os dados (`/data`) e a API. Coloque atrás de um proxy reverso (nginx/Caddy) com HTTPS.

Atualização dos dados: prefira o **agendador interno** (`SYNC_PARTIAL_EVERY_HOURS=6`, `SYNC_FULL_WEEKDAY`, `SYNC_FULL_HOUR_UTC`), que registra cada execução no `/admin`. Se preferir o cron do sistema (as execuções pelo terminal também são registradas):

```cron
# a cada hora (domingo, segunda e quinta durante a temporada)
0 * * * 0,1,4  cd /srv/end-zone-analytics && npm run data:partial >> /var/log/eza-data.log 2>&1
# completa semanal
30 6 * * 2     cd /srv/end-zone-analytics && npm run data:full >> /var/log/eza-data.log 2>&1
```

A API recarrega os dados automaticamente quando o manifest muda (sem reiniciar).

## Opção 2 — Docker Compose (Caddy + HTTPS)

```bash
cp .env.example .env   # preencha DOMAIN, ADMIN_TOKEN, GITHUB_TOKEN, SYNC_*, ALERT_*
docker compose up -d --build
```

O contêiner roda como usuário sem privilégios, faz a carga completa na primeira execução (volume vazio) e o Caddy emite o certificado. Passo a passo completo: [PUBLICACAO_SERVIDOR.md](PUBLICACAO_SERVIDOR.md).

## Opção 3 — Site estático + Cloudflare Worker (em uso)

```bash
npm run data:full && npm run build:static   # dist/ com dist/data, sem /admin (VITE_PUBLIC_STATIC=1)
npx wrangler@4 dev --port 8788              # testa localmente exatamente o que vai ao ar
npx wrangler@4 deploy                       # publica (normalmente feito pelo GitHub Actions)
```

`wrangler.jsonc` serve `dist/` como *static assets* (com fallback de SPA e `public/_headers`) e executa `worker/index.ts` só em `/api/*` (placar ao vivo). O GitHub Actions (`publish.yml`) faz carga, portão de qualidade, build e deploy a cada 6 h e a cada push. Passo a passo: [PUBLICACAO.md](PUBLICACAO.md).

Em outra hospedagem estática, publique `dist/` com fallback de SPA para `index.html`; funciona tudo, exceto placar ao vivo e detalhes do Game Center.

## Checklist

- [ ] `ADMIN_TOKEN` definido (em produção, sem ele não há acesso ao `/admin`)
- [ ] `SYNC_PARTIAL_EVERY_HOURS` definido (agendador interno; dispensa o cron abaixo)
- [ ] `ALERT_WEBHOOK_URL` definido (alertas de falha no celular)
- [ ] HTTPS no proxy
- [ ] `/ready` monitorado
- [ ] Agendamento da carga parcial (interno, cron do sistema ou GitHub Actions)
- [ ] `npm run qa` e `npm run test:e2e` verdes antes do deploy
