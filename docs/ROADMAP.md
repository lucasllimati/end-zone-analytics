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
| 9 — Profundidade dos dados | Perfil de franquia (história, técnicos, QBs, estádios, momentos, recordes, draft), estatísticas por jogo (jogo a jogo, box score), play-by-play resumido (3ª/4ª descida, red zone, sucesso, EPA cedido), elencos, linhas de aposta (zebras, contra a linha), descanso, árbitros, eficiência com ranking, times especiais, valor de draft | ✅ |
| 10 — Segurança | Checklist de 19 pontos, OWASP Top 10, teste de invasão (pentest), correções, actions por SHA, Dependabot | ✅ |
| 11 — Engajamento e operação | Meu time + aviso de pontuação, Game Center ao vivo (20 s), simulador de playoffs com desempates oficiais, fantasy (PPR), notícias/lesões/Wikipedia, divisões do jogador e comparador jogo a jogo, prêmios da AP, PWA, Sobre/Privacidade, metadados por rota + sitemap, relatos de erro, E2E/layout/visual no CI, Vite 8 | ✅ |

## Próximos passos

1. **Domínio próprio** e **medição de audiência** (Cloudflare Web Analytics: basta criar a variável `CF_ANALYTICS_TOKEN`), pré-requisitos para anúncios.
2. **Notificações com o site fechado** (Web Push com chaves VAPID e armazenamento de inscrições no Worker).
3. **Play-by-play completo**: mapas de calor de campo, taxa de passe em situação neutra e probabilidade de vitória própria (hoje vem da ESPN).
4. **SQLite/DuckDB opcional** como destino de publicação para consultas ad hoc.
5. **Consultas em linguagem natural** no explorador.
6. **Análises compartilháveis** (`/analysis/:id`) e páginas especiais (dinastias, viradas, defesas).
7. Dados pré-1999 (temporada a temporada) a partir de fonte aberta verificável.
8. **Pré-renderização do conteúdo** (não só do `<head>`) das páginas de times e Super Bowls, se o SEO pedir.
