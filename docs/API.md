# API

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
| GET | `/api/stats/leaders?season&stat&type&limit` | Líderes de qualquer estatística |
| GET | `/api/super-bowls`, `/api/super-bowls/{n}` | Super Bowls |
| GET | `/api/records` | Recordes oficiais e calculados |
| GET | `/api/draft?season` | Escolhas do draft |
| GET | `/api/rankings/qb?championships=20&…` | Ranking de QBs com pesos |
| GET | `/api/live/scoreboard` | Placar da semana (ao vivo) |
| GET | `/api/live/game/{espnId}` | Quartos, drives, pontuações, probabilidade de vitória |
| GET | `/api/admin/check?force=1` | Há dados novos nas fontes? |
| POST | `/api/admin/sync` | Inicia carga `full` ou `partial` (local ou `Authorization: Bearer ADMIN_TOKEN`) |
| GET | `/api/admin/jobs`, `/api/admin/jobs/{id}` | Status e log dos jobs |

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
| 401 | `/api/admin/sync` sem acesso local nem token válido |
| 404 | Recurso inexistente |
| 409 | Já existe uma sincronização em andamento |
| 429 | Limite de requisições (600/min geral; 5/min para sync) |
| 502 | Fonte externa (ESPN/GitHub) indisponível |
| 503 | Sem dados publicados (`npm run data:full`) |
