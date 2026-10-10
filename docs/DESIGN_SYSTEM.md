# Design system

Minimalista, profissional e orientado a dados. Uma única cor de destaque (dourado “troféu”); os dados são a única coisa “alta” na tela.

## Tokens (`src/styles/tokens.css`)

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `--bg` | `#0b0c0e` | `#f6f6f3` | Fundo da página |
| `--surface-1` | `#131417` | `#ffffff` | Cards, superfície de gráficos |
| `--surface-2` | `#1a1c20` | `#f1f0ec` | Hover, campos |
| `--text` / `--text-2` / `--muted` | `#f3f3f1` / `#bdbcb5` / `#8f8e88` | `#111110` / `#4b4a46` / `#6b6a65` | Hierarquia de texto |
| `--accent` | `#e0ad4b` | `#8f6410` | Ação primária, aba ativa, eyebrow |
| `--focus` | `#7cb4ff` | `#1f6fd6` | Anel de foco |
| `--series-1…8` | paleta categórica validada | idem | Séries de gráficos |
| `--turf`, `--endzone` | verdes | verdes | Diagramas de campo |

Espaçamento em escala de 4 px (`--space-1…7`), raios 6/10/16 px.

## Componentes

| Componente | Arquivo | Notas |
|---|---|---|
| `InfoTip` (ⓘ) | `components/InfoTip.tsx` | Hover/foco/toque; Esc fecha; texto muda com o modo |
| `DataTable` | `components/DataTable.tsx` | Ordenação com `aria-sort`, ⓘ por coluna, colunas `expertOnly`, exportação, “mostrar mais” |
| `ChartFrame` + gráficos | `components/charts/` | Título + ⓘ, legenda (≥ 2 séries), exportar PNG/SVG/CSV, “ver dados em tabela” |
| `Tabs` | `components/Tabs.tsx` | Padrão WAI-ARIA com setas/Home/End |
| `StatTile`, `Callout`, `ModeNote` | `components/Bits.tsx` | Números de destaque e notas por modo |
| `TeamLogo`, `TeamChip` | `components/TeamLogo.tsx` | Logo redimensionado pela CDN, versão para fundo escuro, monograma de fallback |
| `GameCard` | `components/GameCard.tsx` | Placar com “AO VIVO” |
| `DiagramField`, `HorizontalField` | `components/Field.tsx` | Campos para posições, playbook, simulador e faltas |

## Gráficos (regras)

- Forma escolhida pela tarefa: linha para tempo, barras horizontais para rankings, colunas para edições, radar para percentis (≤ 3 séries), dispersão para relação entre duas medidas.
- Paleta categórica em ordem fixa (nunca reciclada). Validada com o verificador de daltonismo: escuro — todas as checagens passam (ΔE CVD mínimo 8,4); claro — passa, com contraste < 3:1 em 3 tons compensado por legenda e tabela.
- Linhas 2 px; marcadores ≥ 8 px com anel da superfície; barras ≤ 24 px com ponta arredondada; grade em linha fina e discreta; um único eixo Y.
- Texto nunca usa a cor da série; cores de time passam por verificação de contraste (`useTeamColor`).

## Voz e texto

- Português claro, frases curtas, sem jargão no modo Iniciante; termos da NFL em inglês com tradução/explicação.
- Números no padrão brasileiro (`1.234,5`), exceto PCT no padrão da NFL (`.750`).
