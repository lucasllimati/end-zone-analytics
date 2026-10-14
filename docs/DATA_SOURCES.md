# Fontes de dados e direitos

| Conjunto | Fonte | Arquivo(s) | Licença | Atualização |
|---|---|---|---|---|
| Times, cores, logos | nflverse `teams` | `teams_colors_logos.csv` | CC-BY 4.0 (dados); logos são marcas dos times | rara |
| Jogos e resultados (inclui linhas de aposta de fechamento e dias de descanso) | nflverse `schedules` | `games.csv` (1999+) | CC-BY 4.0 | várias vezes por semana na temporada |
| Jogadores | nflverse `players` | `players.csv` | CC-BY 4.0 | diária |
| Estatísticas de jogadores | nflverse `stats_player` | `stats_player_{reg,post}_{ano}.csv` | CC-BY 4.0 | diária na temporada |
| Estatísticas de times | nflverse `stats_team` | `stats_team_{reg,post}_{ano}.csv` | CC-BY 4.0 | diária na temporada |
| Estatísticas de jogadores por jogo | nflverse `stats_player` | `stats_player_week_{ano}.csv` (~8 MB por temporada) | CC-BY 4.0 | diária na temporada |
| Estatísticas de times por jogo | nflverse `stats_team` | `stats_team_week_{ano}.csv` | CC-BY 4.0 | diária na temporada |
| Play-by-play (resumo situacional) | nflverse `pbp` | `play_by_play_{ano}.csv.gz` (~19 MB por temporada, lido em fluxo; só o resumo por time fica em cache) | CC-BY 4.0 (EPA: nflfastR) | diária na temporada |
| Elencos por temporada | nflverse `rosters` | `roster_{ano}.csv` | CC-BY 4.0 | diária na temporada |
| Draft | nflverse `draft_picks` (origem: Pro Football Reference) | `draft_picks.csv` (1980+) | CC-BY 4.0 via nflverse | semanal |
| Super Bowls I–LX, recordes oficiais | Curadoria a partir do NFL Record & Fact Book | `data-curated/*.json` | Fatos históricos; texto próprio | manual |
| Placar ao vivo, drives, probabilidade de vitória | API pública do site da ESPN | `/apis/site/v2/sports/football/nfl/*` | Uso informativo; sem garantia de disponibilidade | em tempo real (cache 30–60 s) |
| Imagens de logos e fotos | CDN da ESPN / NFL (via nflverse) | URLs | Marcas e imagens dos detentores; exibidas apenas para identificação | — |

Releases: <https://github.com/nflverse/nflverse-data/releases>. Documentação: <https://nflreadr.nflverse.com/>.

## Atribuição

- Dados: **nflverse** (Lee Sharpe, Sebastian Carl, Ben Baldwin, Tan Ho e colaboradores), licença CC-BY 4.0.
- EPA e CPOE: modelos do **nflfastR**.
- Approximate Value: **Pro Football Reference**.

## Regras do projeto

1. Não fazer scraping frágil como base da aplicação: fontes são arquivos versionados e APIs estáveis.
2. Separar dados, imagens/logos/marcas e conteúdo editorial (o texto educativo do site é próprio).
3. Toda informação factual tem fonte registrada no manifest ou na curadoria.
4. Divergências entre fontes não são “corrigidas” em silêncio: aparecem como alerta de qualidade em `/data`.

## Observações sobre os campos

- **Linhas de aposta** (`spread_line`, `total_line`, moneylines): linhas de fechamento publicadas pela nflverse. O site usa esses números só como medida da expectativa do mercado (zebras, “cobriu a linha”); não há recomendação de aposta nem links para casas de apostas.
- **AV de carreira do draft:** a coluna `car_av` passou a vir vazia; o pipeline usa `w_av` (AV ponderado de carreira do PFR). A verificação de qualidade `draft-av` falha se o AV sumir de novo.
- **Play-by-play:** cada temporada é baixada e reduzida a um resumo por time (3ª e 4ª descidas, red zone, taxa de sucesso, EPA por jogada no ataque e na defesa), guardado em `data-raw/pbp_summary_{ano}.json`. A primeira carga processa ~530 MB (alguns minutos); depois, só a temporada cuja versão remota mudou.
