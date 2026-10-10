# 🏈 End Zone Analytics

Dados, história, estatísticas e educação sobre a NFL — para quem nunca viu um jogo e para especialistas.

- **Liga:** classificação, calendário, placares ao vivo, playoffs, power ranking e força de tabela.
- **Times e jogadores:** 32 franquias com logos, carreiras desde 1999, percentis, jogadores semelhantes e comparador.
- **História:** todos os Super Bowls (I–LX), recordes, draft desde 1980, Hall of Fame e a evolução do jogo.
- **Aprenda:** a NFL em 10 minutos, simulador de down & distance, regras e faltas, posições interativas, playbook animado, estratégia e glossário.
- **Modo Iniciante / Expert** e o botão **ⓘ** em cada número, coluna e gráfico.
- **Dados reais e rastreáveis** (nflverse, CC-BY 4.0). Dado ausente aparece como “Não disponível”, nunca como zero.

## Início rápido

Requisitos: Node.js 20+.

```bash
npm install
npm run data:full      # baixa e processa os dados (~1 min, só na primeira vez)
npm run dev            # abre http://localhost:5173
```

## Atualizar os dados

| Comando | O que faz |
|---|---|
| `npm run data:check` | Verifica se há dados novos nas fontes (não baixa nada) |
| `npm run data:partial` | Carga parcial: baixa só o que mudou |
| `npm run data:partial -- --datasets games,playerStats --seasons 2026` | Força conjuntos/temporadas específicos |
| `npm run data:full` | Carga completa |

O site também verifica sozinho: quando há dados novos, aparece um aviso com o botão **Atualizar agora**. A página **Dados** (`/data`) mostra fontes, versões, qualidade e permite carga completa ou parcial.

## Qualidade

```bash
npm run qa         # tipos + testes unitários/API/dados + revisão ortográfica
npm run test:e2e   # navegação, UX e acessibilidade (Playwright + axe)
```

## Produção

```bash
npm run build && npm start      # API + site em http://localhost:8787
```

Mais detalhes: **[Guia completo](docs/GUIA_COMPLETO.md)** · [Arquitetura](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Fontes de dados](docs/DATA_SOURCES.md)

---
Projeto independente, sem afiliação com a NFL. Nomes e logos dos times são marcas de seus detentores e aparecem apenas para identificação.
