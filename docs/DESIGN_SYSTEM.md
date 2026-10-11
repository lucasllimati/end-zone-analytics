# Design system

Minimalista, esportivo e orientado a dados: interface escura azul-marinho, azul elétrico como identidade, cartões discretos e tipografia condensada marcante.

## Identidade

- **Marca:** End Zone Analytics. Símbolo = bola oval minimalista com costura e um corte de trajetória (`BrandMark`); logotipo horizontal = símbolo + “END ZONE / ANALYTICS” (`BrandLogo`). Versões: colorida, monocromática (`mono`, usa a cor do texto) e arquivos em `public/logo.svg`, `logo-light.svg`, `logo-mono.svg`, `favicon.svg`; imagem de compartilhamento `public/og-image.png` (1200×630).
- **Cores:** azul-marinho profundo + azul elétrico. O azul marca ação, estado ativo e dado em destaque — não é cor de fundo de tudo. Verde/âmbar/vermelho só com significado (sucesso, atenção, erro), sempre com texto ou ícone.
- **Tipografia:** texto em fonte do sistema; títulos de página e números de destaque em **Barlow Condensed 700/800** (auto-hospedada via `@fontsource`, só o subconjunto latino, `font-display: swap`). Números com algarismos tabulares.

## Tokens (`src/styles/tokens.css`)

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `--bg` / `--bg-2` | `#050b16` / `#081426` | `#f4f7fc` / `#ffffff` | Fundo da página / cabeçalho e rodapé |
| `--surface-1` / `-2` / `-3` | `#0b1728` / `#101f34` / `#172a45` | `#ffffff` / `#eef3fa` / `#e1e9f4` | Cartões, hover/menus, elevação |
| `--border` / `--border-strong` | `#1b3553` / `#2a4d75` | `#d6e0ee` / `#b6c7dd` | Separadores |
| `--text` / `--text-2` / `--muted` | `#f4f7fc` / `#a7b6cc` / `#8396b1` | `#0a1628` / `#3a4a63` / `#586a85` | Hierarquia de texto |
| `--accent` | `#078bff` | `#0a6fd8` | Indicador ativo, eyebrow, ícones |
| `--accent-strong` | `#35b6ff` | `#0858b0` | Links e dados em destaque |
| `--accent-fill` | `#0a6fd8` | `#0a6fd8` | Fundo do botão primário (branco sobre ele passa AA: 4,9:1) |
| `--good` / `--warning` / `--critical` | `#24c78a` / `#f5b942` / `#ff5c69` | idem (texto em versões escuras) | Estados semânticos |
| `--series-1…8` | paleta categórica validada | idem | Séries de gráficos (validada contra `#0b1728`: todas as checagens passam) |
| `--turf`, `--endzone` | verdes | verdes | Diagramas de campo |

Espaçamento em escala de 4 px (`--space-1…8`), raios 8/12/14 px, container de até 1.400 px, cabeçalho de 68 px.

## Componentes

| Componente | Arquivo | Notas |
|---|---|---|
| `InfoTip` (ⓘ) | `components/InfoTip.tsx` | Hover/foco/toque; Esc fecha; texto muda com o modo |
| `DataTable` | `components/DataTable.tsx` | Ordenação com `aria-sort`, ⓘ por coluna, colunas `expertOnly`, exportação, “mostrar mais” |
| `ChartFrame` + gráficos | `components/charts/` | Título + ⓘ, legenda (≥ 2 séries), exportar PNG/SVG/CSV, “ver dados em tabela” |
| `Tabs` | `components/Tabs.tsx` | Padrão WAI-ARIA com setas/Home/End |
| `StatTile`, `Callout`, `ModeNote` | `components/Bits.tsx` | Números de destaque e notas por modo |
| `TeamLogo`, `TeamChip` | `components/TeamLogo.tsx` | Logo redimensionado pela CDN, versão para fundo escuro, monograma de fallback |
| `GameCard`, `GameTile`, `gameStatus` | `components/GameCard.tsx` | Estados: agendado, ao vivo, intervalo, finalizado, adiado, cancelado, resultado indisponível. “Ao vivo” só com confirmação da ESPN; horário convertido do fuso do Leste dos EUA para o local |
| `HeroArt` | `components/HeroArt.tsx` | Ilustração vetorial do hero (sem imagem raster) |
| `.segmented`, `.badge.*` | `styles/components.css` | Recortes compactos dentro de painéis; selos de estado |
| `DiagramField`, `HorizontalField` | `components/Field.tsx` | Campos para posições, playbook, simulador e faltas |

## Gráficos (regras)

- Forma escolhida pela tarefa: linha para tempo, barras horizontais para rankings, colunas para edições, radar para percentis (≤ 3 séries), dispersão para relação entre duas medidas.
- Paleta categórica em ordem fixa (nunca reciclada). Validada com o verificador de daltonismo: escuro — todas as checagens passam (ΔE CVD mínimo 8,4); claro — passa, com contraste < 3:1 em 3 tons compensado por legenda e tabela.
- Linhas 2 px; marcadores ≥ 8 px com anel da superfície; barras ≤ 24 px com ponta arredondada; grade em linha fina e discreta; um único eixo Y.
- Texto nunca usa a cor da série; cores de time passam por verificação de contraste (`useTeamColor`).

## Voz e texto

- Português claro, frases curtas, sem jargão no modo Iniciante; termos da NFL em inglês com tradução/explicação.
- Números no padrão brasileiro (`1.234,5`), exceto PCT no padrão da NFL (`.750`).
