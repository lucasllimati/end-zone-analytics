# Roadmap

| Fase | Escopo | Estado |
|---|---|---|
| 1 — Fundação | Arquitetura, modelo de dados, pipeline, API, times, jogadores, temporadas, jogos | ✅ |
| 2 — NFL atual | Calendário, classificação, placares ao vivo, líderes | ✅ |
| 3 — Histórico | Super Bowls I–LX, recordes, história por eras, draft, Hall of Fame (draftados 1980+) | ✅ |
| 4 — Analytics | Gráficos, comparador, percentis, ajuste de era, similaridade, explorador | ✅ |
| 5 — Educação | Regras, faltas, posições, glossário, estratégia, simulador de down | ✅ |
| 6 — Playbook | Formações e 29 jogadas/coberturas animadas | ✅ |
| 7 — Avançado | Rankings configuráveis e power ranking | ✅ parcial |
| 8 — Produto e operação | Redesign (linguagem Apple: tipografia do sistema, materiais translúcidos, controles segmentados; símbolo da bola oval), área `/admin` protegida, log operacional e alertas, agendador, publicação grátis no Cloudflare com cron e portão de qualidade | ✅ |

## Próximos passos

1. **Play-by-play (nflverse `pbp`)**: success rate, EPA defensivo, heatmaps de campo, taxa de passe em situação neutra, recordes por jogo de jogadores.
2. **Simulador de playoffs (“what-if”)** e probabilidades por Monte Carlo, com desempates oficiais completos.
3. **Prêmios** (MVP, OPOY, DPOY, novatos, técnico) a partir de fonte com licença adequada.
4. **SQLite/DuckDB opcional** como destino de publicação para consultas ad hoc (PostgreSQL só com várias instâncias).
5. **Pré-renderização (SSG)** de páginas de times, jogadores e Super Bowls para SEO.
6. **Consultas em linguagem natural** no explorador (“mais jardas recebidas por jogadores com 30+ anos entre 2000 e 2025”).
7. **Análises compartilháveis** (`/analysis/:id`) e páginas especiais (maiores dinastias, viradas, defesas).
8. Dados pré-1999 (temporada a temporada) a partir de fonte aberta verificável.
9. **E2E no CI** (hoje roda localmente; o CI roda tipos, testes, ortografia, build e auditoria).
10. **Regressão visual automatizada** por screenshot.
