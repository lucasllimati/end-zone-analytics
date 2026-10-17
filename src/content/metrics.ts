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
  /** Nome original em inglês (como aparece em sites e transmissões da NFL); exibido no ⓘ. */
  en?: string;
}

export const METRICS: Record<string, MetricDef> = {
  games: { label: 'Jogos', en: 'Games played', short: 'J', simple: 'Quantidade de partidas em que o jogador atuou.', expert: 'Jogos com pelo menos um snap registrado no play-by-play.' },
  cmp: { label: 'Passes completos', en: 'Completions', short: 'CMP', simple: 'Passes que foram pegos por um companheiro.', expert: 'Completions.' },
  att: { label: 'Tentativas de passe', en: 'Pass attempts', short: 'ATT', simple: 'Quantas vezes o jogador lançou a bola.', expert: 'Pass attempts (exclui sacks e scrambles).' },
  cmpPct: { label: '% de passes completos', en: 'Completion percentage', short: 'CMP%', simple: 'De cada 100 passes, quantos chegaram às mãos do recebedor.', expert: 'Completion percentage.', formula: 'completos ÷ tentativas', format: 'pct' },
  passYds: { label: 'Jardas de passe', en: 'Passing yards', short: 'YDS', simple: 'Distância total ganha com passes completos (1 jarda ≈ 0,91 m).', expert: 'Gross passing yards (inclui jardas após a recepção).' },
  passTd: { label: 'TDs de passe', en: 'Passing touchdowns', short: 'TD', simple: 'Passes que resultaram em touchdown (6 pontos).', expert: 'Passing touchdowns.' },
  int: { label: 'Interceptações lançadas', en: 'Interceptions thrown', short: 'INT', simple: 'Passes pegos pela defesa adversária — o ataque perde a bola.', expert: 'Interceptions thrown. Altamente voláteis de um ano para outro.', lowerIsBetter: true },
  sacked: { label: 'Sacks sofridos', en: 'Sacks taken', short: 'SK', simple: 'Vezes em que o QB foi derrubado antes de lançar.', expert: 'Sacks taken; parte reflete a linha ofensiva, parte o próprio QB (tempo com a bola).', lowerIsBetter: true },
  ypa: { label: 'Jardas por tentativa', en: 'Yards per attempt', short: 'Y/A', simple: 'Média de jardas a cada passe lançado.', expert: 'Yards per attempt.', formula: 'jardas de passe ÷ tentativas', digits: 1 },
  rating: {
    en: 'Passer rating',
    label: 'Passer rating',
    short: 'RATE',
    simple: 'Nota oficial da NFL para quarterbacks (0 a 158,3). Acima de 100 é excelente.',
    expert: 'Combina % de completos, jardas por tentativa, TD% e INT%, cada componente limitado a [0; 2,375].',
    formula: '((a+b+c+d)/6)×100; a=(CMP%−0,3)×5; b=(Y/A−3)×0,25; c=TD/ATT×20; d=2,375−INT/ATT×25',
    digits: 1,
  },
  passEpa: {
    en: 'Passing EPA (Expected Points Added)',
    label: 'EPA de passe',
    short: 'EPA',
    simple: 'Quantos pontos os passes do jogador "adicionaram" ao time em relação ao esperado.',
    expert: 'Expected Points Added total em dropbacks. EPA = EP depois da jogada − EP antes, usando o modelo de pontos esperados do nflfastR (down, distância, posição, tempo).',
    formula: 'Σ (EP_depois − EP_antes) nas jogadas de passe',
    digits: 1,
    format: 'signed',
  },
  epaPerDb: {
    en: 'EPA per dropback',
    label: 'EPA por dropback',
    short: 'EPA/DB',
    simple: 'Média de pontos adicionados a cada vez que o QB recua para passar. Acima de +0,15 é elite.',
    expert: 'EPA de passe ÷ (tentativas + sacks). Uma das métricas de eficiência mais preditivas para QBs.',
    formula: 'EPA de passe ÷ (ATT + SK)',
    digits: 3,
    format: 'signed',
  },
  cpoe: {
    en: 'Completion percentage over expected',
    label: 'CPOE',
    short: 'CPOE',
    simple: 'Quanto o QB completa acima (ou abaixo) do que um QB médio completaria nos mesmos passes.',
    expert: 'Completion Percentage Over Expected: % real − % esperado pelo modelo (profundidade do alvo, local, pressão etc.).',
    formula: 'CMP% real − CMP% esperado',
    digits: 1,
    format: 'signed',
  },
  airYds: { label: 'Air yards', en: 'Air yards', short: 'AIR', simple: 'Jardas que a bola viajou no ar até o recebedor (antes da corrida após a recepção).', expert: 'Soma da profundidade do alvo (intended air yards) em todas as tentativas.' },
  carries: { label: 'Corridas', en: 'Carries (rushing attempts)', short: 'ATT', simple: 'Quantas vezes o jogador correu com a bola.', expert: 'Rushing attempts.' },
  rushYds: { label: 'Jardas corridas', en: 'Rushing yards', short: 'YDS', simple: 'Distância total ganha correndo.', expert: 'Rushing yards.' },
  rushTd: { label: 'TDs corridos', en: 'Rushing touchdowns', short: 'TD', simple: 'Touchdowns marcados correndo.', expert: 'Rushing touchdowns.' },
  ypc: { label: 'Jardas por corrida', en: 'Yards per carry', short: 'Y/C', simple: 'Média de jardas a cada corrida. 4,5+ é muito bom.', expert: 'Yards per carry; muito dependente da linha ofensiva e do contexto.', formula: 'jardas corridas ÷ corridas', digits: 1 },
  rushEpa: { label: 'EPA de corrida', en: 'Rushing EPA', short: 'EPA', simple: 'Pontos adicionados pelas corridas em relação ao esperado.', expert: 'Expected Points Added total em corridas. Corridas costumam ter EPA médio negativo na NFL moderna.', digits: 1, format: 'signed' },
  rec: { label: 'Recepções', en: 'Receptions', short: 'REC', simple: 'Passes que o jogador pegou.', expert: 'Receptions.' },
  tgt: { label: 'Alvos', en: 'Targets', short: 'TGT', simple: 'Quantas vezes um passe foi lançado na direção do jogador.', expert: 'Targets. Medida de volume/oportunidade.' },
  recYds: { label: 'Jardas recebidas', en: 'Receiving yards', short: 'YDS', simple: 'Distância total ganha após pegar passes.', expert: 'Receiving yards (air yards completados + YAC).' },
  recTd: { label: 'TDs recebidos', en: 'Receiving touchdowns', short: 'TD', simple: 'Touchdowns marcados recebendo passes.', expert: 'Receiving touchdowns.' },
  ypr: { label: 'Jardas por recepção', en: 'Yards per reception', short: 'Y/R', simple: 'Média de jardas a cada passe pego.', expert: 'Yards per reception.', formula: 'jardas recebidas ÷ recepções', digits: 1 },
  catchRate: { label: 'Taxa de recepção', en: 'Catch rate', short: 'CATCH%', simple: 'De cada 100 passes na direção dele, quantos ele pegou.', expert: 'Catch rate; depende muito da profundidade dos alvos.', formula: 'recepções ÷ alvos', format: 'pct' },
  yac: { label: 'Jardas após a recepção', en: 'Yards after catch', short: 'YAC', simple: 'Jardas ganhas correndo depois de pegar a bola.', expert: 'Yards after catch.' },
  recEpa: { label: 'EPA de recepção', en: 'Receiving EPA', short: 'EPA', simple: 'Pontos adicionados nas jogadas em que foi alvo.', expert: 'Receiving EPA total.', digits: 1, format: 'signed' },
  tackles: { label: 'Tackles', en: 'Tackles', short: 'TKL', simple: 'Vezes em que o jogador derrubou (ou ajudou a derrubar) quem estava com a bola.', expert: 'Tackles combinados = solo + assistências.' },
  tfl: { label: 'Tackles para perda', en: 'Tackles for loss', short: 'TFL', simple: 'Tackles atrás da linha de scrimmage — o ataque perde jardas.', expert: 'Tackles for loss.' },
  sacks: { label: 'Sacks', en: 'Sacks', short: 'SACK', simple: 'Derrubar o quarterback antes que ele lance a bola.', expert: 'Sacks (meio sack quando dividido). Estatística oficial desde 1982.' },
  qbHits: { label: 'Hits no QB', en: 'QB hits', short: 'QBH', simple: 'Vezes em que o defensor atingiu o QB no momento do passe.', expert: 'Quarterback hits.' },
  defInt: { label: 'Interceptações', en: 'Interceptions', short: 'INT', simple: 'Passes do adversário que o defensor pegou.', expert: 'Interceptions (defesa).' },
  pd: { label: 'Passes defendidos', en: 'Passes defended', short: 'PD', simple: 'Passes desviados ou bloqueados pelo defensor.', expert: 'Passes defensed (inclui interceptações).' },
  ff: { label: 'Fumbles forçados', en: 'Forced fumbles', short: 'FF', simple: 'Vezes em que o defensor fez o adversário soltar a bola.', expert: 'Forced fumbles.' },
  defTd: { label: 'TDs defensivos', en: 'Defensive touchdowns', short: 'TD', simple: 'Touchdowns marcados pela defesa (ex.: pick-six).', expert: 'Defensive touchdowns.' },
  fgm: { label: 'Field goals convertidos', en: 'Field goals made', short: 'FGM', simple: 'Chutes de 3 pontos acertados.', expert: 'Field goals made.' },
  fga: { label: 'Field goals tentados', en: 'Field goals attempted', short: 'FGA', simple: 'Chutes de 3 pontos tentados.', expert: 'Field goals attempted.' },
  fgPct: { label: '% de field goals', en: 'Field goal percentage', short: 'FG%', simple: 'Aproveitamento nos chutes de 3 pontos.', expert: 'Field goal percentage; compare sempre considerando a distância média.', formula: 'FGM ÷ FGA', format: 'pct' },
  fgLong: { label: 'FG mais longo', en: 'Longest field goal', short: 'LNG', simple: 'Distância do field goal mais longo convertido.', expert: 'Longest field goal made (jardas).' },
  xpm: { label: 'Pontos extras', en: 'Extra points made', short: 'XPM', simple: 'Chutes de 1 ponto após touchdown convertidos.', expert: 'Extra points made.' },
  punts: { label: 'Punts', en: 'Punts', short: 'PUNT', simple: 'Chutes para devolver a bola ao adversário longe da própria end zone.', expert: 'Punts.' },
  puntAvg: { label: 'Média por punt', en: 'Gross punting average', short: 'AVG', simple: 'Distância média de cada punt.', expert: 'Gross punting average.', formula: 'jardas de punt ÷ punts', digits: 1 },
  fumLost: { label: 'Fumbles perdidos', en: 'Fumbles lost', short: 'FL', simple: 'Vezes em que o jogador soltou a bola e o adversário recuperou.', expert: 'Fumbles lost.', lowerIsBetter: true },
  fpts: { label: 'Pontos de fantasy', en: 'Fantasy points', short: 'FPTS', simple: 'Pontuação padrão de fantasy football.', expert: 'Fantasy points (standard, sem PPR).', digits: 1 },
  fptsPpr: { label: 'Pontos de fantasy (PPR)', en: 'Fantasy points (PPR)', short: 'PPR', simple: 'Pontuação de fantasy com 1 ponto por recepção.', expert: 'Fantasy points, PPR.', digits: 1 },
  scrimYds: { label: 'Jardas de scrimmage', en: 'Scrimmage yards', short: 'SCRIM', simple: 'Jardas corridas + jardas recebidas.', expert: 'Scrimmage yards.', formula: 'rushYds + recYds' },
  totalTd: { label: 'TDs totais', en: 'Total touchdowns', short: 'TD', simple: 'Todos os touchdowns (passe, corrida e recepção).', expert: 'Passing + rushing + receiving TDs.' },

  // Classificação
  w: { label: 'Vitórias', en: 'Wins', short: 'W', simple: 'Jogos vencidos (W = win).', expert: 'Wins.' },
  l: { label: 'Derrotas', en: 'Losses', short: 'L', simple: 'Jogos perdidos (L = loss).', expert: 'Losses.' },
  t: { label: 'Empates', en: 'Ties', short: 'T', simple: 'Jogos empatados após a prorrogação (T = tie). São raros.', expert: 'Ties. Na temporada regular, a prorrogação dura 10 minutos.' },
  pct: { label: 'Aproveitamento', en: 'Win percentage', short: 'PCT', simple: 'Percentual de vitórias. 1.000 = venceu todas.', expert: 'Win percentage; empate conta como meia vitória.', formula: '(W + T/2) ÷ jogos' },
  pf: { label: 'Pontos marcados', en: 'Points for', short: 'PF', simple: 'Total de pontos que o time marcou (points for).', expert: 'Points for.' },
  pa: { label: 'Pontos sofridos', en: 'Points against', short: 'PA', simple: 'Total de pontos que o time sofreu (points against).', expert: 'Points against.', lowerIsBetter: true },
  diff: { label: 'Saldo de pontos', en: 'Point differential', short: 'DIFF', simple: 'Pontos marcados menos sofridos. Mostra o domínio real do time.', expert: 'Point differential; melhor preditor do desempenho futuro que o próprio recorde de vitórias.', formula: 'PF − PA', format: 'signed' },
  home: { label: 'Em casa', en: 'Home record', short: 'CASA', simple: 'Campanha jogando no próprio estádio.', expert: 'Home record (W-L-T).' },
  away: { label: 'Fora', en: 'Road record', short: 'FORA', simple: 'Campanha jogando no estádio do adversário.', expert: 'Road record (W-L-T).' },
  div: { label: 'Na divisão', en: 'Division record', short: 'DIV', simple: 'Campanha contra times da mesma divisão (cada time enfrenta os 3 rivais 2 vezes).', expert: 'Division record; é critério de desempate.' },
  conf: { label: 'Na conferência', en: 'Conference record', short: 'CONF', simple: 'Campanha contra times da mesma conferência (AFC ou NFC).', expert: 'Conference record; critério de desempate e de vaga de wild card.' },
  streak: { label: 'Sequência', en: 'Streak', short: 'STRK', simple: 'Sequência atual. W3 = três vitórias seguidas; L2 = duas derrotas seguidas.', expert: 'Current streak.' },
  last5: { label: 'Últimos 5', en: 'Last 5 games', short: 'ÚLT. 5', simple: 'Resultados dos 5 jogos mais recentes (W vitória, L derrota, T empate).', expert: 'Last five results.' },
  sos: { label: 'Força de tabela', en: 'Strength of schedule', short: 'SOS', simple: 'Aproveitamento médio dos adversários enfrentados. Quanto maior, mais difícil foi o caminho.', expert: 'Strength of schedule = média do PCT dos oponentes (jogos disputados).', formula: 'média(PCT dos adversários)' },
  epaPlay: { label: 'EPA por jogada (ataque)', en: 'EPA per play', short: 'EPA/P', simple: 'Quantos pontos o ataque adiciona, em média, a cada jogada.', expert: '(EPA de passe + EPA de corrida) ÷ (dropbacks + corridas).', digits: 3, format: 'signed' },
  ppg: { label: 'Pontos por jogo', en: 'Points per game', short: 'PPG', simple: 'Média de pontos marcados por partida.', expert: 'Points per game.', digits: 1 },
  papg: { label: 'Pontos sofridos por jogo', en: 'Points allowed per game', short: 'PA/G', simple: 'Média de pontos que o time sofre por partida.', expert: 'Points allowed per game.', digits: 1, lowerIsBetter: true },
  passRate: { label: 'Taxa de passe', en: 'Pass rate', short: 'PASS%', simple: 'De cada 100 jogadas do ataque, quantas foram de passe.', expert: 'Dropbacks ÷ (dropbacks + corridas). Inclui sacks.', format: 'pct' },
  takeaways: { label: 'Interceptações da defesa', en: 'Takeaways (interceptions)', short: 'INT', simple: 'Passes do adversário interceptados pela defesa.', expert: 'Defensive interceptions (o dataset de times não traz fumbles recuperados).' },
  giveaways: { label: 'Turnovers cometidos', en: 'Giveaways', short: 'TO', simple: 'Vezes em que o ataque perdeu a bola (interceptação ou fumble perdido).', expert: 'Giveaways = INT lançadas + fumbles perdidos.', lowerIsBetter: true },
  homeWinPct: { label: 'Vitórias do mandante', en: 'Home win percentage', short: 'CASA%', simple: 'Percentual de jogos vencidos pelo time da casa.', expert: 'Home win% (exclui campos neutros e empates). Mede a vantagem de jogar em casa.', format: 'pct' },
  carAv: { label: 'Approximate Value (carreira)', en: 'Approximate Value (career)', short: 'AV', simple: 'Nota única do Pro Football Reference que resume o valor de qualquer jogador na carreira.', expert: 'Approximate Value ponderado de carreira (PFR, “weighted AV”: 100% do melhor ano, 95% do segundo…); permite comparar posições diferentes de forma aproximada.' },
  drAv: { label: 'AV pelo time que draftou', en: 'Approximate Value for drafting team', short: 'DrAV', simple: 'Valor que o jogador gerou para o time que o escolheu no draft.', expert: 'Approximate Value acumulado somente pelo time que o selecionou.' },

  // Recebedores e jogadas longas
  tgtShare: { label: 'Participação nos alvos', en: 'Target share', short: 'TGT%', simple: 'De cada 100 passes do time, quantos foram para este jogador.', expert: 'Target share: alvos do jogador ÷ alvos do time na temporada.', format: 'pct' },
  airShare: { label: 'Participação nas jardas aéreas', en: 'Air yards share', short: 'AIR%', simple: 'Fatia das jardas lançadas no ar pelo time que foram na direção deste jogador.', expert: 'Air yards share: air yards dos alvos do jogador ÷ air yards do time.', format: 'pct' },
  wopr: { label: 'WOPR', en: 'Weighted Opportunity Rating', short: 'WOPR', simple: 'Nota de “oportunidade” do recebedor: quanto o ataque depende dele. Acima de 0,6 é elite.', expert: 'Weighted Opportunity Rating = 1,5 × target share + 0,7 × air yards share.', formula: '1,5 × TGT% + 0,7 × AIR%', digits: 2 },
  pass20: { label: 'Passes de 20+ jardas', en: 'Completions of 20+ yards', short: '20+', simple: 'Passes completos que ganharam 20 jardas ou mais.', expert: 'Completions of 20+ yards.' },
  pass40: { label: 'Passes de 40+ jardas', en: 'Completions of 40+ yards', short: '40+', simple: 'Passes completos que ganharam 40 jardas ou mais.', expert: 'Completions of 40+ yards.' },
  rush20: { label: 'Corridas de 20+ jardas', en: 'Rushes of 20+ yards', short: '20+', simple: 'Corridas que ganharam 20 jardas ou mais.', expert: 'Rushes of 20+ yards.' },
  rush40: { label: 'Corridas de 40+ jardas', en: 'Rushes of 40+ yards', short: '40+', simple: 'Corridas que ganharam 40 jardas ou mais.', expert: 'Rushes of 40+ yards.' },
  rec20: { label: 'Recepções de 20+ jardas', en: 'Receptions of 20+ yards', short: '20+', simple: 'Recepções que ganharam 20 jardas ou mais.', expert: 'Receptions of 20+ yards.' },
  rec40: { label: 'Recepções de 40+ jardas', en: 'Receptions of 40+ yards', short: '40+', simple: 'Recepções que ganharam 40 jardas ou mais.', expert: 'Receptions of 40+ yards.' },
  passFd: { label: 'First downs de passe', en: 'Passing first downs', short: '1D', simple: 'Passes que renovaram a série de descidas.', expert: 'Passing first downs.' },
  rushFd: { label: 'First downs de corrida', en: 'Rushing first downs', short: '1D', simple: 'Corridas que renovaram a série de descidas.', expert: 'Rushing first downs.' },
  recFd: { label: 'First downs de recepção', en: 'Receiving first downs', short: '1D', simple: 'Recepções que renovaram a série de descidas.', expert: 'Receiving first downs.' },

  // Times especiais
  gwfgm: { label: 'FGs da vitória', en: 'Game-winning field goals', short: 'GWFG', simple: 'Field goals que colocaram o time na frente no fim do jogo e garantiram a vitória.', expert: 'Game-winning field goals made (definição nflverse).' },
  fg50: { label: 'FGs de 50+ jardas', en: 'Field goals of 50+ yards', short: '50+', simple: 'Field goals convertidos de 50 jardas ou mais — os chutes mais difíceis.', expert: 'Field goals made from 50+ yards.' },
  ptIn20: { label: 'Punts dentro da 20', en: 'Punts inside the 20', short: 'IN20', simple: 'Punts que deixaram o adversário começando perto da própria end zone (dentro da linha de 20).', expert: 'Punts downed/returned inside the opponent 20.' },
  ptTb: { label: 'Touchbacks de punt', en: 'Punt touchbacks', short: 'TB', simple: 'Punts que entraram na end zone — o adversário começa na linha de 20.', expert: 'Punt touchbacks.', lowerIsBetter: true },
  puntNet: { label: 'Média líquida de punt', en: 'Net punting average', short: 'NET', simple: 'Distância média do punt já descontando o retorno do adversário. Mede o resultado real do chute.', expert: 'Net punting average = (jardas de punt − jardas de retorno − 20 × touchbacks) ÷ punts.', digits: 1 },
  prYds: { label: 'Jardas em retornos de punt', en: 'Punt return yards', short: 'PR YDS', simple: 'Jardas ganhas devolvendo punts do adversário.', expert: 'Punt return yards.' },
  krYds: { label: 'Jardas em retornos de kickoff', en: 'Kickoff return yards', short: 'KR YDS', simple: 'Jardas ganhas devolvendo kickoffs do adversário.', expert: 'Kickoff return yards.' },
  stTd: { label: 'TDs de times especiais', en: 'Special teams touchdowns', short: 'ST TD', simple: 'Touchdowns em retornos de punt/kickoff ou em chutes bloqueados.', expert: 'Special teams touchdowns.' },

  // Defesa do time e mercado
  epaAllowed: { label: 'EPA cedido por jogo', en: 'EPA allowed per game', short: 'EPA DEF', simple: 'Quantos pontos o ataque adversário adiciona, em média, por jogo contra esta defesa. Menor (negativo) é melhor.', expert: '(EPA de passe + EPA de corrida dos adversários, somados jogo a jogo) ÷ jogos.', digits: 2, format: 'signed', lowerIsBetter: true },
  ydsAllowedPg: { label: 'Jardas cedidas por jogo', en: 'Yards allowed per game', short: 'YDS/J DEF', simple: 'Jardas que o adversário ganha, em média, contra esta defesa.', expert: 'Passing + rushing yards allowed ÷ jogos.', digits: 1, lowerIsBetter: true },
  ats: { label: 'Contra a linha (ATS)', en: 'Against the spread (ATS)', short: 'ATS', simple: 'Quantas vezes o time superou a expectativa do mercado: venceu por mais (ou perdeu por menos) do que o previsto.', expert: 'Against the spread: margem real > linha de fechamento. Push = exatamente na linha.' },
  overPct: { label: 'Jogos acima do total', en: 'Over percentage', short: 'OVER%', simple: 'Percentual de jogos em que a soma dos pontos passou do total esperado pelo mercado.', expert: 'Over rate vs. linha de total de fechamento (exclui pushes).', format: 'pct' },
  thirdPct: { label: 'Conversão na 3ª descida', en: 'Third down conversion rate', short: '3RD%', simple: 'De cada 100 terceiras descidas, quantas viraram first down. É o momento em que o ataque mais precisa resolver.', expert: '3rd down conversions ÷ tentativas (play-by-play; jogadas anuladas por falta não contam).', format: 'pct' },
  fourthPct: { label: 'Conversão na 4ª descida', en: 'Fourth down conversion rate', short: '4TH%', simple: 'Quando o time tentou a 4ª descida (em vez de chutar), quantas vezes conseguiu o first down.', expert: '4th down conversions ÷ tentativas de corrida/passe na 4ª descida.', format: 'pct' },
  goRate: { label: 'Decisão de ir na 4ª descida', en: 'Fourth down go rate', short: 'GO%', simple: 'Em quantas 4ªs descidas o técnico mandou tentar (correr ou passar) em vez de chutar punt ou field goal. Times modernos arriscam mais.', expert: 'Tentativas de conversão ÷ (tentativas + punts + FGs) na 4ª descida.', format: 'pct' },
  rzPct: { label: 'TD% na red zone', en: 'Red zone TD percentage', short: 'RZ%', simple: 'Quando o time chega perto da end zone (dentro da linha de 20), quantas vezes sai com touchdown em vez de só um field goal.', expert: 'Drives que alcançaram a 20 do adversário e terminaram em TD ÷ drives que alcançaram a 20.', format: 'pct' },
  successRate: { label: 'Taxa de sucesso', en: 'Success rate', short: 'SR', simple: 'Percentual de jogadas que deixaram o ataque em situação melhor (EPA positivo). Mede consistência, não só jogadas grandes.', expert: 'Jogadas de scrimmage com EPA > 0 ÷ jogadas de scrimmage (nflfastR).', format: 'pct' },
  epaPlayAllowed: { label: 'EPA por jogada cedido', en: 'EPA per play allowed', short: 'EPA/P DEF', simple: 'Quantos pontos o adversário adiciona, em média, a cada jogada contra esta defesa. Negativo = defesa forte.', expert: 'Σ EPA das jogadas de scrimmage dos adversários ÷ jogadas (play-by-play).', digits: 3, format: 'signed', lowerIsBetter: true },
  rest: { label: 'Dias de descanso', en: 'Rest days', short: 'DESC.', simple: 'Dias desde o jogo anterior. Uma semana normal tem 7; após a folga (bye), 13 ou 14.', expert: 'Rest days (nflverse/schedules).' },
};

export const metric = (k: string): MetricDef => METRICS[k] ?? { label: k, simple: k, expert: k };
