# Design system

Linguagem visual inspirada na Apple (Human Interface Guidelines e *Designing Fluid Interfaces*): tipografia do sistema, cores de sistema que se adaptam ao escuro/claro, materiais translúcidos na camada de navegação, contenção visual e feedback imediato. Os dados são o conteúdo; a interface recua.

## Princípios aplicados

| Princípio | Como aparece no site |
|---|---|
| **Tipografia do sistema** | `-apple-system`/SF Pro (Apple), Segoe UI Variable (Windows). Sem fonte externa. Tracking por tamanho: display `-0.045em`, títulos `-0.02em` a `-0.028em`, corpo `-0.006em`, textos pequenos levemente positivos. Entrelinha inversa ao tamanho (display `1.02`, corpo `1.5`). Tamanhos em `rem` |
| **Hierarquia por peso + tamanho** | Títulos 600–700, números de destaque 700 com algarismos tabulares; ícones decorativos removidos dos títulos de seção |
| **Cores de sistema** | Escuro: `#000` / `#1c1c1e` / `#2c2c2e`; claro: `#f5f5f7` / `#ffffff`. Azul de sistema como **única** cor de destaque (ações, links, estado ativo). Verde/laranja/vermelho só com significado |
| **Materiais** | Cabeçalho, menus, gaveta, busca, tooltips e menus de exportação são translúcidos (`backdrop-filter: saturate(180%) blur()`); o conteúdo é sólido |
| **Borda de rolagem** | O cabeçalho não tem linha fixa; a sombra só aparece quando há conteúdo passando por baixo (`.site-header.scrolled`) |
| **Resposta imediata** | Botões, chips, cards e jogos reagem ao **pressionar** (`:active` → `scale(0.97)`, 100 ms) |
| **Consistência espacial** | Menus nascem do gatilho (`transform-origin`); a gaveta entra **e sai** pela direita; a busca cresce a partir do topo |
| **Controles familiares** | Botões em pílula; controle segmentado estilo iOS (Iniciante/Expert, recortes de classificação); abas em pílula como navegação local; links de ação "Saiba mais ›" |
| **Contenção** | Cartões sem borda (sombra suave só no claro), cantos 14–20 px, espaços generosos entre seções, sem gradientes decorativos (exceto o título do hero) |
| **Acessibilidade** | `prefers-reduced-motion` (sem animação), `prefers-reduced-transparency` (materiais sólidos), `prefers-contrast: more` (bordas definidas, texto sólido); links em texto corrido sublinhados; contraste AA verificado com axe |

## Identidade

- **Marca:** End Zone Analytics. Símbolo = bola oval minimalista com costura (`BrandMark`); logotipo = símbolo + "**End Zone** Analytics" em fonte do sistema (`BrandLogo`). Arquivos: `public/logo.svg`, `logo-light.svg`, `logo-mono.svg`, `favicon.svg`.
- **Hero:** estilo página de produto — título grande centralizado com gradiente sutil, ilustração da bola abaixo (com feixes de estádio só no escuro), faixa de números grandes sem molduras.

## Tokens (`src/styles/tokens.css`)

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `--bg` | `#000000` | `#f5f5f7` | Fundo da página |
| `--surface-1` / `-2` / `-3` | `#1c1c1e` / `#2c2c2e` / `#3a3a3c` | `#ffffff` / `#f5f5f7` / `#e8e8ed` | Cartões, elementos internos, hover |
| `--fill` / `--fill-thumb` | `rgba(118,118,128,.24)` / `#636366` | `rgba(118,118,128,.12)` / `#fff` | Trilho e botão selecionado dos controles segmentados; fundo de botões secundários |
| `--material` / `--material-thick` | `rgba(22,22,23,.72)` / `rgba(30,30,32,.86)` | `rgba(245,245,247,.74)` / `rgba(255,255,255,.86)` | Camada de navegação translúcida |
| `--text` / `--text-2` / `--muted` | `#f5f5f7` / `#aeaeb2` / `#98989d` | `#1d1d1f` / `#424245` / `#6e6e73` | Hierarquia de texto |
| `--accent` | `#2997ff` | `#0066cc` | Links, eyebrow, estado ativo |
| `--accent-fill` | `#0071e3` | `#0071e3` | Botão primário (branco sobre ele: AA) |
| `--good` / `--warning` / `--critical` | `#30d158` / `#ff9f0a` / `#ff453a` | versões escuras para texto | Estados semânticos |
| `--series-1…8` | paleta categórica validada | idem | Gráficos — validada contra `#1c1c1e` (todas as checagens passam) e `#ffffff` (aviso de contraste compensado por legenda + tabela) |
| `--ease-out`, `--dur-press`, `--dur-fast`, `--dur` | `cubic-bezier(.25,1,.5,1)`, 100/180/280 ms | idem | Movimento sem overshoot (criticamente amortecido) |

Raios 10/14/20 px e pílula (`980px`); espaços em `rem` (`--space-1…8`); container de até 1.280 px; cabeçalho de 56 px.

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
