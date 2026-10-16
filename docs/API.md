# API

> **Site publicado (Cloudflare):** apenas `/api/live/scoreboard` e `/api/live/game/{id}` existem (servidos por `worker/index.ts`); o restante da API e o `/admin` só existem na versão com servidor. No site publicado, os dados ficam abertos em `/data/*.json` (a partir de `/data/manifest.json`).

Base: `http://localhost:8787` (desenvolvimento: também via proxy em `http://localhost:5173`). Especificação completa: **`GET /api/openapi.json`** (OpenAPI 3.1).

Todas as respostas são JSON. Valores ausentes são `null`. Erros seguem `{ "error": "código", "message": "texto" }`.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Processo vivo |
| GET | `/ready` | Dados carregados (503 se não houver) |
| GET | `/api/meta` | Manifest: cobertura, fontes, versões, qualidade |
| GET | `/api/quality` | Relatório de qualidade |
| GET | `/api/changes` | Histórico de ingestões |
| GET | `/api/teams` | 32 franquias |
| GET | `/api/teams/{abbr}` | Time + temporadas + Super Bowls |
| GET | `/api/games?season&week&team&type&limit` | Jogos filtrados |
| GET | `/api/games/{id}` | Um jogo |
| GET | `/api/standings?season` | Classificação calculada |
| GET | `/api/players?q&pos&limit` | Busca (sem acentos, sem diferenciar maiúsculas) |
| GET | `/api/players/{id}` | Carreira completa |
| GET | `/api/stats/leaders?season&stat&type&limit` | Líderes de qualquer estatística numérica da linha do jogador |
| GET | `/api/super-bowls`, `/api/super-bowls/{n}` | Super Bowls |
| GET | `/api/records` | Recordes oficiais e calculados |
| GET | `/api/draft?season` | Escolhas do draft |
| GET | `/api/rankings/qb?championships=20&…` | Ranking de QBs com pesos |
| GET | `/api/live/scoreboard` | Placar da semana (ao vivo) |
| GET | `/api/live/game/{espnId}` | Quartos, drives, pontuações, probabilidade de vitória. Só IDs de jogos da base (`/data/live-ids.json`); outros → 404 sem consultar a ESPN |
| GET | `/api/admin/session` | Estado da sessão (`authenticated`, `method`, `tokenConfigured`) — público, sem segredos |
| POST | `/api/admin/login`, `/api/admin/logout` | Login com `{ token }` (cookie de sessão) / encerrar sessão |
| GET | `/api/admin/check?force=1` | Há dados novos nas fontes? 🔒 |
| POST | `/api/admin/sync` | Inicia carga `full` ou `partial` 🔒 (cookie + `X-EZA-Admin: 1`, ou Bearer) |
| GET | `/api/admin/jobs`, `/api/admin/jobs/{id}` | Status e log dos jobs 🔒 |
| GET | `/api/admin/overview` | Saúde, arquivos publicados, última publicação, última tentativa, execuções 🔒 |
| GET | `/api/admin/events?severity&component&jobId&days` | Logs e alertas com ação recomendada e estado de resolução 🔒 |

🔒 = exige sessão administrativa, `Authorization: Bearer ADMIN_TOKEN` ou (somente fora de produção) acesso local.

**Proteções de autenticação:** login limitado a 5 tentativas/min por IP; trava global após 20 tokens errados em 15 min (login **ou** Bearer, de qualquer IP), durante a qual nem o token certo é aceito; IP real só lido de `X-Forwarded-For` quando `TRUST_PROXY` > 0. Todas as tentativas recusadas e bloqueios ficam na auditoria (`/api/admin/events?component=auth`).

**Site publicado (Worker):** as respostas de `/api/live/*` levam `Content-Security-Policy: default-src 'none'`, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`, HSTS e `nosniff`, e são servidas do cache da borda (30 s placar, 60 s jogo).

## Exemplos

```bash
curl "http://localhost:8787/api/standings?season=2025"
curl "http://localhost:8787/api/stats/leaders?season=2025&stat=sacks&limit=3"
curl "http://localhost:8787/api/rankings/qb?championships=50&efficiency=50&production=0"

# carga parcial forçando jogos e estatísticas de 2026 (fora do servidor, exige token)
curl -X POST http://servidor:8787/api/admin/sync \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"mode":"partial","datasets":["games","playerStats"],"seasons":[2026]}'
```

Resposta de `/api/admin/check`:

```json
{
  "checkedAt": "2026-10-10T01:11:22.480Z",
  "hasUpdates": true,
  "items": [{ "key": "playerStats", "label": "Estatísticas de jogadores por temporada", "hasUpdate": true, "seasons": [2026],
              "localVersion": "2026-10-09T16:11:23Z", "remoteVersion": "2026-10-10T16:02:11Z" }]
}
```

## Erros comuns

| Código | Quando |
|---|---|
| 400 | Parâmetro inválido (validação zod; detalhes em `issues`) |
| 401 | Rota administrativa sem sessão, token válido ou acesso local permitido |
| 403 | Ação administrativa por cookie sem o cabeçalho `X-EZA-Admin` |
| 404 | Recurso inexistente |
| 409 | Já existe uma sincronização em andamento |
| 413 | Corpo da requisição acima de 32 KB |
| 415 | Corpo que não é JSON (ex.: formulário de outro site) |
| 429 | Limite de requisições (600/min geral; 5/min para login e sync) ou trava global do login (cabeçalho `Retry-After`) |
| 502 | Fonte externa (ESPN/GitHub) indisponível |
| 503 | Sem dados publicados (`npm run data:full`) |
