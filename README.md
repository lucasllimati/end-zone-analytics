# 🏈 End Zone Analytics

> 🌐 **Site no ar:** <https://end-zone-analytics.nfldata.workers.dev>
> 🚀 **Publicar / atualizar o site (grátis, automático, sem servidor):** **[docs/PUBLICACAO.md](docs/PUBLICACAO.md)**
> 🛠️ **Operar o servidor no Cloudflare (jobs, logs, alertas, rollback):** [docs/PUBLICACAO_SERVIDOR.md](docs/PUBLICACAO_SERVIDOR.md)

Dados, história, estatísticas e educação sobre a NFL — para quem nunca viu um jogo e para especialistas.

- **Temporada:** classificação, calendário, placares ao vivo, playoffs, líderes, power ranking, força de tabela, **eficiência dos 32 times** (ataque, defesa, times especiais e situações — 3ª/4ª descida, red zone — com ranking na liga) e **zebras e expectativa do mercado**.
- **Game Center:** placar por quarto, drives, probabilidade de vitória, **box score completo**, linha de aposta e resultado contra ela, descanso de cada time e o perfil do árbitro.
- **Times:** perfil de cada franquia com últimos jogos, eficiência, **elenco completo**, recordes da franquia, história (técnicos, QBs, estádios, momentos marcantes), confrontos e desempenho por situação, contra a linha e draft.
- **Jogadores:** carreira desde 1999, **jogo a jogo** e melhores jogos, percentis (inclusive kickers e punters), FGs por distância, retornos, métricas de recebedor (participação nos alvos, WOPR) e valor de draft.
- **História e liga:** todos os Super Bowls (I–LX), recordes (inclusive times especiais e maiores zebras), draft desde 1980 (quem drafta melhor, valor por posição), Hall of Fame, estádios (clima, mandante, FG%), **árbitros** e a evolução do jogo.
- **Aprenda:** a NFL em 10 minutos, simulador de down & distance, regras e faltas, posições interativas, playbook animado, estratégia e glossário.
- **Modo Iniciante / Expert** (só aparece onde muda algo) e o botão **ⓘ** em cada número, coluna e gráfico.
- **Dados reais e rastreáveis** (nflverse, CC-BY 4.0: calendário, estatísticas por temporada e por jogo, play-by-play, elencos, draft). Dado ausente aparece como “Não disponível”, nunca como zero. Fontes, cobertura e qualidade em `/data`.
- **Segurança revisada** com teste de invasão (pentest) e checklist OWASP — ver [SECURITY.md](docs/SECURITY.md).

## Início rápido (no seu computador)

Requisitos: Node.js 20+ (CI usa 22).

```bash
npm install
npm run data:full      # baixa e processa os dados (5–15 min só na primeira vez; ~850 MB em fluxo)
npm run dev            # site em http://localhost:5173 (API em :8787)
```

Área administrativa local: <http://localhost:5173/admin>. Em desenvolvimento, o acesso a partir do próprio computador é liberado sem token.

## Atualizar os dados

| Comando | O que faz |
|---|---|
| `npm run data:check` | Verifica se há dados novos nas fontes (não baixa nada) |
| `npm run data:partial` | Carga parcial: baixa só o que mudou |
| `npm run data:partial -- --datasets games,playerStats --seasons 2026` | Força conjuntos/temporadas específicos |
| `npm run data:full` | Carga completa |

- Uma nova publicação de dados só é criada quando o conteúdo muda; cargas sem mudança apenas registram a verificação.
- **No site publicado**, as cargas são automáticas: GitHub Actions a cada 6 h. Veja [PUBLICACAO.md](docs/PUBLICACAO.md).
- **Localmente** (`npm run dev`), as cargas também podem ser feitas pelo `/admin` (verificar, carga parcial ou completa, logs e alertas).

## Qualidade

```bash
npm run qa         # tipos + testes unitários/API/segurança/dados + revisão ortográfica
npm run test:e2e   # navegação, UX e acessibilidade (Playwright + axe), desktop e celular
```

## Publicação

| Caminho | Comando / guia |
|---|---|
| **Configurar a publicação (Cloudflare + GitHub Actions)** | [docs/PUBLICACAO.md](docs/PUBLICACAO.md) |
| **Operar o servidor no Cloudflare** (jobs, logs, alertas, rollback, limites) | [docs/PUBLICACAO_SERVIDOR.md](docs/PUBLICACAO_SERVIDOR.md) |
| Testar a versão publicada localmente | `npm run build:static && npx wrangler@4.144.0 dev --port 8788` |
| API completa + `/admin` com Node (local ou hospedagem própria) | `npm run build && npm start` (em <http://localhost:8787>) · [DEPLOYMENT.md](docs/DEPLOYMENT.md) |

## Documentação

[Especificação funcional](ESPECIFICACAO.md) · [Guia completo](docs/GUIA_COMPLETO.md) · [Arquitetura](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Modelo de dados](docs/DATA_MODEL.md) · [Fontes de dados](docs/DATA_SOURCES.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Segurança](docs/SECURITY.md) · [Testes](docs/TESTING.md) · [Desenvolvimento](docs/DEVELOPMENT.md) · [Deploy (referência técnica)](docs/DEPLOYMENT.md) · [Roadmap](docs/ROADMAP.md) · [Contribuindo](docs/CONTRIBUTING.md)

---
Projeto independente, sem afiliação com a NFL. Nomes e logos dos times são marcas de seus detentores e aparecem apenas para identificação.
