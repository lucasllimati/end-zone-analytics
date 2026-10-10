/**
 * Dicionário de métricas — fonte única para rótulos, tooltips (ⓘ), colunas de tabela e o Explorador.
 * `simple`: linguagem para iniciantes. `expert`: definição técnica. `formula`: como é calculado.
 */
export interface MetricDef {
  label: string;
  short?: string;
  simple: string;
  expert: string;
  formula?: string;
  digits?: number;
  /** true quando valor menor é melhor (ex.: interceptações lançadas). */
  lowerIsBetter?: boolean;
  format?: 'pct' | 'signed';
}

export const METRICS: Record<string, MetricDef> = {
  games: { label: 'Jogos', short: 'J', simple: 'Quantidade de partidas em que o jogador atuou.', expert: 'Jogos com pelo menos um snap registrado no play-by-play.' },
  cmp: { label: 'Passes completos', short: 'CMP', simple: 'Passes que foram pegos por um companheiro.', expert: 'Completions.' },
  att: { label: 'Tentativas de passe', short: 'ATT', simple: 'Quantas vezes o jogador lançou a bola.', expert: 'Pass attempts (exclui sacks e scrambles).' },
  cmpPct: { label: '% de passes completos', short: 'CMP%', simple: 'De cada 100 passes, quantos chegaram às mãos do recebedor.', expert: 'Completion percentage.', formula: 'completos ÷ tentativas', format: 'pct' },
  passYds: { label: 'Jardas de passe', short: 'YDS', simple: 'Distância total ganha com passes completos (1 jarda ≈ 0,91 m).', expert: 'Gross passing yards (inclui jardas após a recepção).' },
  passTd: { label: 'TDs de passe', short: 'TD', simple: 'Passes que resultaram em touchdown (6 pontos).', expert: 'Passing touchdowns.' },
  int: { label: 'Interceptações lançadas', short: 'INT', simple: 'Passes pegos pela defesa adversária — o ataque perde a bola.', expert: 'Interceptions thrown. Altamente voláteis de um ano para outro.', lowerIsBetter: true },
  sacked: { label: 'Sacks sofridos', short: 'SK', simple: 'Vezes em que o QB foi derrubado antes de lançar.', expert: 'Sacks taken; parte reflete a linha ofensiva, parte o próprio QB (tempo com a bola).', lowerIsBetter: true },
  ypa: { label: 'Jardas por tentativa', short: 'Y/A', simple: 'Média de jardas a cada passe lançado.', expert: 'Yards per attempt.', formula: 'jardas de passe ÷ tentativas', digits: 1 },
  rating: {
    label: 'Passer rating',
    short: 'RATE',
    simple: 'Nota oficial da NFL para quarterbacks (0 a 158,3). Acima de 100 é excelente.',
    expert: 'Combina % de completos, jardas por tentativa, TD% e INT%, cada componente limitado a [0; 2,375].',
    formula: '((a+b+c+d)/6)×100; a=(CMP%−0,3)×5; b=(Y/A−3)×0,25; c=TD/ATT×20; d=2,375−INT/ATT×25',
    digits: 1,
  },
  passEpa: {
    label: 'EPA de passe',
    short: 'EPA',
    simple: 'Quantos pontos os passes do jogador "adicionaram" ao time em relação ao esperado.',
    expert: 'Expected Points Added total em dropbacks. EPA = EP depois da jogada − EP antes, usando o modelo de pontos esperados do nflfastR (down, distância, posição, tempo).',
    formula: 'Σ (EP_depois − EP_antes) nas jogadas de passe',
    digits: 1,
    format: 'signed',
  },
  epaPerDb: {
    label: 'EPA por dropback',
    short: 'EPA/DB',
    simple: 'Média de pontos adicionados a cada vez que o QB recua para passar. Acima de +0,15 é elite.',
    expert: 'EPA de passe ÷ (tentativas + sacks). Uma das métricas de eficiência mais preditivas para QBs.',
    formula: 'EPA de passe ÷ (ATT + SK)',
    digits: 3,
    format: 'signed',
  },
  cpoe: {
    label: 'CPOE',
    short: 'CPOE',
    simple: 'Quanto o QB completa acima (ou abaixo) do que um QB médio completaria nos mesmos passes.',
    expert: 'Completion Percentage Over Expected: % real − % esperado pelo modelo (profundidade do alvo, local, pressão etc.).',
    formula: 'CMP% real − CMP% esperado',
    digits: 1,
    format: 'signed',
  },
  airYds: { label: 'Air yards', short: 'AIR', simple: 'Jardas que a bola viajou no ar até o recebedor (antes da corrida após a recepção).', expert: 'Soma da profundidade do alvo (intended air yards) em todas as tentativas.' },
  carries: { label: 'Corridas', short: 'ATT', simple: 'Quantas vezes o jogador correu com a bola.', expert: 'Rushing attempts.' },
  rushYds: { label: 'Jardas corridas', short: 'YDS', simple: 'Distância total ganha correndo.', expert: 'Rushing yards.' },
  rushTd: { label: 'TDs corridos', short: 'TD', simple: 'Touchdowns marcados correndo.', expert: 'Rushing touchdowns.' },
  ypc: { label: 'Jardas por corrida', short: 'Y/C', simple: 'Média de jardas a cada corrida. 4,5+ é muito bom.', expert: 'Yards per carry; muito dependente da linha ofensiva e do contexto.', formula: 'jardas corridas ÷ corridas', digits: 1 },
  rushEpa: { label: 'EPA de corrida', short: 'EPA', simple: 'Pontos adicionados pelas corridas em relação ao esperado.', expert: 'Expected Points Added total em corridas. Corridas costumam ter EPA médio negativo na NFL moderna.', digits: 1, format: 'signed' },
  rec: { label: 'Recepções', short: 'REC', simple: 'Passes que o jogador pegou.', expert: 'Receptions.' },
  tgt: { label: 'Alvos', short: 'TGT', simple: 'Quantas vezes um passe foi lançado na direção do jogador.', expert: 'Targets. Medida de volume/oportunidade.' },
  recYds: { label: 'Jardas recebidas', short: 'YDS', simple: 'Distância total ganha após pegar passes.', expert: 'Receiving yards (air yards completados + YAC).' },
  recTd: { label: 'TDs recebidos', short: 'TD', simple: 'Touchdowns marcados recebendo passes.', expert: 'Receiving touchdowns.' },
  ypr: { label: 'Jardas por recepção', short: 'Y/R', simple: 'Média de jardas a cada passe pego.', expert: 'Yards per reception.', formula: 'jardas recebidas ÷ recepções', digits: 1 },
  catchRate: { label: 'Taxa de recepção', short: 'CATCH%', simple: 'De cada 100 passes na direção dele, quantos ele pegou.', expert: 'Catch rate; depende muito da profundidade dos alvos.', formula: 'recepções ÷ alvos', format: 'pct' },
  yac: { label: 'Jardas após a recepção', short: 'YAC', simple: 'Jardas ganhas correndo depois de pegar a bola.', expert: 'Yards after catch.' },
  recEpa: { label: 'EPA de recepção', short: 'EPA', simple: 'Pontos adicionados nas jogadas em que foi alvo.', expert: 'Receiving EPA total.', digits: 1, format: 'signed' },
  tackles: { label: 'Tackles', short: 'TKL', simple: 'Vezes em que o jogador derrubou (ou ajudou a derrubar) quem estava com a bola.', expert: 'Tackles combinados = solo + assistências.' },
  tfl: { label: 'Tackles para perda', short: 'TFL', simple: 'Tackles atrás da linha de scrimmage — o ataque perde jardas.', expert: 'Tackles for loss.' },
  sacks: { label: 'Sacks', short: 'SACK', simple: 'Derrubar o quarterback antes que ele lance a bola.', expert: 'Sacks (meio sack quando dividido). Estatística oficial desde 1982.' },
  qbHits: { label: 'Hits no QB', short: 'QBH', simple: 'Vezes em que o defensor atingiu o QB no momento do passe.', expert: 'Quarterback hits.' },
  defInt: { label: 'Interceptações', short: 'INT', simple: 'Passes do adversário que o defensor pegou.', expert: 'Interceptions (defesa).' },
  pd: { label: 'Passes defendidos', short: 'PD', simple: 'Passes desviados ou bloqueados pelo defensor.', expert: 'Passes defensed (inclui interceptações).' },
  ff: { label: 'Fumbles forçados', short: 'FF', simple: 'Vezes em que o defensor fez o adversário soltar a bola.', expert: 'Forced fumbles.' },
  defTd: { label: 'TDs defensivos', short: 'TD', simple: 'Touchdowns marcados pela defesa (ex.: pick-six).', expert: 'Defensive touchdowns.' },
  fgm: { label: 'Field goals convertidos', short: 'FGM', simple: 'Chutes de 3 pontos acertados.', expert: 'Field goals made.' },
  fga: { label: 'Field goals tentados', short: 'FGA', simple: 'Chutes de 3 pontos tentados.', expert: 'Field goals attempted.' },
  fgPct: { label: '% de field goals', short: 'FG%', simple: 'Aproveitamento nos chutes de 3 pontos.', expert: 'Field goal percentage; compare sempre considerando a distância média.', formula: 'FGM ÷ FGA', format: 'pct' },
  fgLong: { label: 'FG mais longo', short: 'LNG', simple: 'Distância do field goal mais longo convertido.', expert: 'Longest field goal made (jardas).' },
  xpm: { label: 'Pontos extras', short: 'XPM', simple: 'Chutes de 1 ponto após touchdown convertidos.', expert: 'Extra points made.' },
  punts: { label: 'Punts', short: 'PUNT', simple: 'Chutes para devolver a bola ao adversário longe da própria end zone.', expert: 'Punts.' },
  puntAvg: { label: 'Média por punt', short: 'AVG', simple: 'Distância média de cada punt.', expert: 'Gross punting average.', formula: 'jardas de punt ÷ punts', digits: 1 },
  fumLost: { label: 'Fumbles perdidos', short: 'FL', simple: 'Vezes em que o jogador soltou a bola e o adversário recuperou.', expert: 'Fumbles lost.', lowerIsBetter: true },
  fpts: { label: 'Pontos de fantasy', short: 'FPTS', simple: 'Pontuação padrão de fantasy football.', expert: 'Fantasy points (standard, sem PPR).', digits: 1 },
  fptsPpr: { label: 'Pontos de fantasy (PPR)', short: 'PPR', simple: 'Pontuação de fantasy com 1 ponto por recepção.', expert: 'Fantasy points, PPR.', digits: 1 },
  scrimYds: { label: 'Jardas de scrimmage', short: 'SCRIM', simple: 'Jardas corridas + jardas recebidas.', expert: 'Scrimmage yards.', formula: 'rushYds + recYds' },
  totalTd: { label: 'TDs totais', short: 'TD', simple: 'Todos os touchdowns (passe, corrida e recepção).', expert: 'Passing + rushing + receiving TDs.' },

  // Classificação
  w: { label: 'Vitórias', short: 'W', simple: 'Jogos vencidos (W = win).', expert: 'Wins.' },
  l: { label: 'Derrotas', short: 'L', simple: 'Jogos perdidos (L = loss).', expert: 'Losses.' },
  t: { label: 'Empates', short: 'T', simple: 'Jogos empatados após a prorrogação (T = tie). São raros.', expert: 'Ties. Na temporada regular, a prorrogação dura 10 minutos.' },
  pct: { label: 'Aproveitamento', short: 'PCT', simple: 'Percentual de vitórias. 1.000 = venceu todas.', expert: 'Win percentage; empate conta como meia vitória.', formula: '(W + T/2) ÷ jogos' },
  pf: { label: 'Pontos marcados', short: 'PF', simple: 'Total de pontos que o time marcou (points for).', expert: 'Points for.' },
  pa: { label: 'Pontos sofridos', short: 'PA', simple: 'Total de pontos que o time sofreu (points against).', expert: 'Points against.', lowerIsBetter: true },
  diff: { label: 'Saldo de pontos', short: 'DIFF', simple: 'Pontos marcados menos sofridos. Mostra o domínio real do time.', expert: 'Point differential; melhor preditor do desempenho futuro que o próprio recorde de vitórias.', formula: 'PF − PA', format: 'signed' },
  home: { label: 'Em casa', short: 'CASA', simple: 'Campanha jogando no próprio estádio.', expert: 'Home record (W-L-T).' },
  away: { label: 'Fora', short: 'FORA', simple: 'Campanha jogando no estádio do adversário.', expert: 'Road record (W-L-T).' },
  div: { label: 'Na divisão', short: 'DIV', simple: 'Campanha contra times da mesma divisão (cada time enfrenta os 3 rivais 2 vezes).', expert: 'Division record; é critério de desempate.' },
  conf: { label: 'Na conferência', short: 'CONF', simple: 'Campanha contra times da mesma conferência (AFC ou NFC).', expert: 'Conference record; critério de desempate e de vaga de wild card.' },
  streak: { label: 'Sequência', short: 'STRK', simple: 'Sequência atual. W3 = três vitórias seguidas; L2 = duas derrotas seguidas.', expert: 'Current streak.' },
  last5: { label: 'Últimos 5', short: 'ÚLT. 5', simple: 'Resultados dos 5 jogos mais recentes (W vitória, L derrota, T empate).', expert: 'Last five results.' },
  sos: { label: 'Força de tabela', short: 'SOS', simple: 'Aproveitamento médio dos adversários enfrentados. Quanto maior, mais difícil foi o caminho.', expert: 'Strength of schedule = média do PCT dos oponentes (jogos disputados).', formula: 'média(PCT dos adversários)' },
  epaPlay: { label: 'EPA por jogada (ataque)', short: 'EPA/P', simple: 'Quantos pontos o ataque adiciona, em média, a cada jogada.', expert: '(EPA de passe + EPA de corrida) ÷ (dropbacks + corridas).', digits: 3, format: 'signed' },
  ppg: { label: 'Pontos por jogo', short: 'PPG', simple: 'Média de pontos marcados por partida.', expert: 'Points per game.', digits: 1 },
  papg: { label: 'Pontos sofridos por jogo', short: 'PA/G', simple: 'Média de pontos que o time sofre por partida.', expert: 'Points allowed per game.', digits: 1, lowerIsBetter: true },
  passRate: { label: 'Taxa de passe', short: 'PASS%', simple: 'De cada 100 jogadas do ataque, quantas foram de passe.', expert: 'Dropbacks ÷ (dropbacks + corridas). Inclui sacks.', format: 'pct' },
  takeaways: { label: 'Interceptações da defesa', short: 'INT', simple: 'Passes do adversário interceptados pela defesa.', expert: 'Defensive interceptions (o dataset de times não traz fumbles recuperados).' },
  giveaways: { label: 'Turnovers cometidos', short: 'TO', simple: 'Vezes em que o ataque perdeu a bola (interceptação ou fumble perdido).', expert: 'Giveaways = INT lançadas + fumbles perdidos.', lowerIsBetter: true },
  homeWinPct: { label: 'Vitórias do mandante', short: 'CASA%', simple: 'Percentual de jogos vencidos pelo time da casa.', expert: 'Home win% (exclui campos neutros e empates). Mede a vantagem de jogar em casa.', format: 'pct' },
  carAv: { label: 'Approximate Value (carreira)', short: 'AV', simple: 'Nota única do Pro Football Reference que resume o valor de qualquer jogador na carreira.', expert: 'Approximate Value (PFR): pontos de valor distribuídos por time e posição a cada temporada; permite comparar posições diferentes de forma aproximada.' },
  drAv: { label: 'AV pelo time que draftou', short: 'DrAV', simple: 'Valor que o jogador gerou para o time que o escolheu no draft.', expert: 'Approximate Value acumulado somente pelo time que o selecionou.' },
};

export const metric = (k: string): MetricDef => METRICS[k] ?? { label: k, simple: k, expert: k };
