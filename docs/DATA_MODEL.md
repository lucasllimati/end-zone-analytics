# Modelo de dados

Fonte da verdade: [`src/lib/types.ts`](../src/lib/types.ts). Arquivos grandes usam formato colunar `{ "cols": [...], "rows": [[...]] }` (ver `src/lib/pack.ts`); o cliente e a API convertem de volta para objetos.

## Entidades e relações

```mermaid
erDiagram
    TEAM ||--o{ GAME : "home/away"
    TEAM ||--o{ TEAM_SEASON : "por temporada"
    TEAM ||--o{ PLAYER_SEASON_LINE : "recent_team"
    PLAYER ||--o{ PLAYER_SEASON_LINE : "temporadas (REG/POST)"
    PLAYER ||--o| DRAFT_PICK : "gsis_id"
    GAME ||--o| SUPER_BOWL : "gameId (1999+)"
    TEAM ||--o{ SUPER_BOWL : "winner/loser"
    STADIUM ||--o{ GAME : "stadiumId"
```

## IDs estáveis

| Entidade | ID | Exemplo |
|---|---|---|
| Time | abreviação nflverse; `franchise` = franquia atual | `OAK` → franquia `LV` |
| Jogo | `game_id` nflverse | `2025_22_SEA_NE` |
| Jogador | GSIS ID | `00-0033873` (Patrick Mahomes) |
| Super Bowl | número | `60` |
| Estádio | `stadium_id` nflverse | `SFO01` |

## Arquivos

| Arquivo | Tipo | Conteúdo |
|---|---|---|
| `manifest.json` | `Manifest` | Cobertura, versões por arquivo de origem, sha256, linhas, resumo de qualidade |
| `quality.json` | `QualityCheck[]` | Resultado das validações |
| `teams.json` | `Team[]` | Nome, apelido, conferência, divisão, cores, logo claro/escuro, franquia, ativo |
| `games/all.json`, `games/{ano}.json` | `Game[]` | Placar, tipo (REG/WC/DIV/CON/SB), semana, data, local, teto, gramado, clima, QBs, técnicos, árbitro, estádio, ID ESPN |
| `stats/players-{ano}.json` | `PlayerSeasonLine[]` | 44 colunas por jogador/temporada/fase (REG/POST) |
| `stats/teams-{ano}.json` | `TeamSeasonLine[]` | Totais ofensivos/defensivos/times especiais |
| `players/index.json` | `PlayerIndexEntry[]` | Busca: id, nome, posição, último time, primeira/última temporada |
| `players/careers/NN.json` | `Record<id, PlayerCareer>` | Bio + temporadas + jogadores semelhantes (bucket = FNV-1a(id) mod 64) |
| `team-seasons.json` | `TeamSeason[]` | W-L-T, PF, PA, playoffs, título, EPA, técnico, QB principal |
| `trends.json` | `LeagueTrend[]` | Médias da liga por temporada |
| `superbowls.json` | `SuperBowl[]` | I–LX, curadoria + enriquecimento nflverse |
| `records-curated.json` | `CuratedRecord[]` | Recordes oficiais de todos os tempos |
| `records-computed.json` | — | Top 10 por estatística (temporada, carreira, playoffs), times e jogos (1999+) |
| `draft.json` | `DraftPick[]` | 1980+, AV, Pro Bowls, All-Pro, HOF |
| `stadiums.json` | `Stadium[]` | Teto, gramado, jogos, Super Bowls |
| `models/qb-model.json` | `QbModelEntry[]` | Componentes brutos do ranking de QBs |
| `history/` | — | Manifests anteriores e log de ingestões |

## Convenções

- Ausência de dado = `null`. Contagens vazias (ex.: sacks em um jogo sem sacks) = `0`.
- EPA/CPOE arredondados (2 casas); valores derivados (rating, percentuais) são calculados no consumo.
- Temporada = ano de início (o Super Bowl LX, em fevereiro de 2026, pertence à temporada 2025).
