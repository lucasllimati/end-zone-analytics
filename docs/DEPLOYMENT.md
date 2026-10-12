# Deploy

> **Para publicar na internet de graça (Oracle Cloud + HTTPS + cargas automáticas + alertas), siga o guia passo a passo: [PUBLICACAO.md](PUBLICACAO.md)** (Cloudflare Workers + GitHub Actions, sem servidor). Com servidor próprio e `/admin` online: [PUBLICACAO_SERVIDOR.md](PUBLICACAO_SERVIDOR.md). As opções abaixo são referências técnicas.

## Opção 1 — Node (recomendada)

```bash
npm ci
npm run data:full
npm run build
HOST=0.0.0.0 API_PORT=8787 ADMIN_TOKEN=um-token-longo npm start
```

O processo serve o site (`dist/`), os dados (`/data`) e a API. Coloque atrás de um proxy reverso (nginx/Caddy) com HTTPS. Agende a atualização:

```cron
# a cada hora (domingo, segunda e quinta durante a temporada)
0 * * * 0,1,4  cd /srv/end-zone-analytics && npm run data:partial >> /var/log/eza-data.log 2>&1
# completa semanal
30 6 * * 2     cd /srv/end-zone-analytics && npm run data:full >> /var/log/eza-data.log 2>&1
```

A API recarrega os dados automaticamente quando o manifest muda (sem reiniciar).

## Opção 2 — Docker

```bash
docker build -t end-zone-analytics .
docker run -p 8787:8787 -e ADMIN_TOKEN=um-token-longo -v eza-data:/app/data end-zone-analytics
```

Na primeira execução o contêiner roda a carga completa se `data/` estiver vazio.

## Opção 3 — Site estático (sem API)

```bash
npm run data:full && npm run build:static   # gera dist/ com dist/data
```

Publique `dist/` em qualquer hospedagem estática (configure fallback de SPA para `index.html`). Funciona tudo, exceto placar ao vivo, detalhes do Game Center e sincronização pelo navegador (a verificação de dados novos continua, consultando o GitHub direto). Reconstrua e republique para atualizar os dados.

## Checklist

- [ ] `ADMIN_TOKEN` definido (em produção, sem ele não há acesso ao `/admin`)
- [ ] `SYNC_PARTIAL_EVERY_HOURS` definido (agendador interno; dispensa o cron abaixo)
- [ ] `ALERT_WEBHOOK_URL` definido (alertas de falha no celular)
- [ ] HTTPS no proxy
- [ ] `/ready` monitorado
- [ ] Agendamento da carga parcial
- [ ] `npm run qa` e `npm run test:e2e` verdes antes do deploy
