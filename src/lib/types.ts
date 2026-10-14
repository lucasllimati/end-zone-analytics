/**
 * Contrato de dados compartilhado entre o pipeline (server/etl), a API (server/) e o frontend (src/).
 * Todo arquivo em data/ segue estes tipos. Veja docs/DATA_MODEL.md.
 */

export type GameType = 'REG' | 'WC' | 'DIV' | 'CON' | 'SB';
export type SeasonType = 'REG' | 'POST';
export type Conference = 'AFC' | 'NFC';

export interface Team {
  /** Abreviação usada nos dados (ex.: KC). */
  abbr: string;
  name: string;
  nick: string;
  conf: Conference;
  division: string;
  color: string;
  color2: string;
  logo: string;
  logoDark: string;
  wordmark: string | null;
  /** Franquia atual (OAK → LV, SD → LAC, STL → LA). */
  franchise: string;
  /** true para as 32 franquias atuais. */
  active: boolean;
}

export interface Game {
  id: string;
  season: number;
  type: GameType;
  week: number;
  date: string;
  time: string | null;
  weekday: string | null;
  away: string;
  home: string;
  awayScore: number | null;
  homeScore: number | null;
  ot: boolean;
  neutral: boolean;
  divGame: boolean;
  roof: string | null;
  surface: string | null;
  temp: number | null;
  wind: number | null;
  awayQb: string | null;
  homeQb: string | null;
  awayCoach: string | null;
  homeCoach: string | null;
  referee: string | null;
  stadium: string | null;
  stadiumId: string | null;
  espn: string | null;
  /** Linha de aposta de fechamento: margem esperada do mandante (positivo = mandante favorito). */
  spread: number | null;
  /** Total de pontos esperado (over/under). */
  total: number | null;
  homeMl: number | null;
  awayMl: number | null;
  /** Dias de descanso desde o jogo anterior. */
  homeRest: number | null;
  awayRest: number | null;
}

/** Linha de estatística de um jogador em uma temporada (REG ou POST). */
export interface PlayerSeasonLine {
  id: string;
  name: string;
  pos: string;
  season: number;
  st: SeasonType;
  team: string;
  games: number;
  cmp: number;
  att: number;
  passYds: number;
  passTd: number;
  int: number;
  sacked: number;
  passEpa: number | null;
  cpoe: number | null;
  airYds: number;
  carries: number;
  rushYds: number;
  rushTd: number;
  rushEpa: number | null;
  rec: number;
  /** Alvos. null quando a fonte é inconsistente (ex.: recepções > alvos em 2003–2008). */
  tgt: number | null;
  recYds: number;
  recTd: number;
  yac: number;
  recEpa: number | null;
  tackles: number;
  tfl: number;
  sacks: number;
  qbHits: number;
  defInt: number;
  pd: number;
  ff: number;
  defTd: number;
  fgm: number;
  fga: number;
  fgLong: number | null;
  xpm: number;
  xpa: number;
  punts: number;
  puntYds: number;
  fumLost: number;
  fpts: number;
  fptsPpr: number;
  passFd: number;
  rushFd: number;
  recFd: number;
  /** Jogadas longas: passes completos / corridas / recepções de 20+ e 40+ jardas. */
  pass20: number;
  pass40: number;
  rush20: number;
  rush40: number;
  rec20: number;
  rec40: number;
  /** Participação nos alvos e nas jardas aéreas do time; WOPR = 1,5×alvos + 0,7×aéreas. Só por temporada. */
  tgtShare: number | null;
  airShare: number | null;
  wopr: number | null;
  /** FGs certos/errados por faixa: 0–19, 20–29, 30–39, 40–49, 50–59, 60+. null para quem não chutou. */
  fgMade: number[] | null;
  fgMiss: number[] | null;
  /** FGs da vitória (game-winning). */
  gwfgm: number;
  gwfga: number;
  ptIn20: number;
  ptTb: number;
  ptNet: number;
  pr: number;
  prYds: number;
  kr: number;
  krYds: number;
  stTd: number;
}

export interface TeamSeasonLine {
  team: string;
  season: number;
  st: SeasonType;
  games: number;
  cmp: number;
  att: number;
  passYds: number;
  passTd: number;
  int: number;
  sacked: number;
  passEpa: number | null;
  carries: number;
  rushYds: number;
  rushTd: number;
  rushEpa: number | null;
  sacks: number;
  defInt: number;
  ff: number;
  fumLost: number;
  penalties: number;
  penaltyYds: number;
  fgm: number;
  fga: number;
  xpm: number;
  xpa: number;
  punts: number;
  puntYds: number;
  stTd: number;
  passFd: number;
  rushFd: number;
  pass20: number;
  pass40: number;
  rush20: number;
  rush40: number;
  tfl: number;
  qbHits: number;
  pd: number;
  fgMade: number[] | null;
  fgMiss: number[] | null;
  fgLong: number | null;
  gwfgm: number;
  gwfga: number;
  ptIn20: number;
  ptTb: number;
  ptNet: number;
  prYds: number;
  krYds: number;
  /** Cedido pela defesa (soma do ataque dos adversários, estatísticas por jogo). null sem dados semanais. */
  passYdsAllowed: number | null;
  rushYdsAllowed: number | null;
  passEpaAllowed: number | null;
  rushEpaAllowed: number | null;
  /*
   * Situacionais do play-by-play (ausentes quando a temporada ainda não tem pbp publicado).
   * plays/epa/success = jogadas de scrimmage do ataque; prefixo d = o que a defesa cedeu.
   * fourthOpp = 4ª descidas com decisão (corrida, passe, punt ou FG); fourthAtt = tentativas de conversão.
   */
  plays?: number;
  epa?: number;
  success?: number;
  thirdAtt?: number;
  thirdConv?: number;
  fourthOpp?: number;
  fourthAtt?: number;
  fourthConv?: number;
  rzTrips?: number;
  rzTd?: number;
  dPlays?: number;
  dEpa?: number;
  dSuccess?: number;
  dThirdAtt?: number;
  dThirdConv?: number;
  dRzTrips?: number;
  dRzTd?: number;
}

export interface PlayerBio {
  id: string;
  name: string;
  pos: string;
  posGroup: string | null;
  team: string | null;
  first: number | null;
  last: number | null;
  headshot: string | null;
  college: string | null;
  height: number | null;
  weight: number | null;
  birth: string | null;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  draftTeam: string | null;
  jersey: number | null;
  status: string | null;
  espnId: string | null;
  yearsExp: number | null;
}

/** Entrada leve para busca. */
export interface PlayerIndexEntry {
  id: string;
  name: string;
  pos: string;
  team: string | null;
  first: number | null;
  last: number | null;
}

/** Jogador no elenco de um time em uma temporada (nflverse/rosters). */
export interface RosterEntry {
  id: string | null;
  name: string;
  team: string;
  pos: string;
  depth: string | null;
  jersey: number | null;
  status: string | null;
  birth: string | null;
  height: number | null;
  weight: number | null;
  college: string | null;
  exp: number | null;
  draftPick: number | null;
}

/** Linha de um jogador em um jogo (estatísticas semanais da nflverse). */
export interface PlayerGameLine {
  id: string;
  name: string;
  pos: string;
  season: number;
  week: number;
  st: SeasonType;
  game: string;
  team: string;
  opp: string;
  cmp: number;
  att: number;
  passYds: number;
  passTd: number;
  int: number;
  sacked: number;
  passEpa: number | null;
  carries: number;
  rushYds: number;
  rushTd: number;
  rushEpa: number | null;
  rec: number;
  tgt: number;
  recYds: number;
  recTd: number;
  recEpa: number | null;
  tackles: number;
  sacks: number;
  qbHits: number;
  defInt: number;
  pd: number;
  ff: number;
  fgm: number;
  fga: number;
  fgLong: number | null;
  xpm: number;
  xpa: number;
  punts: number;
  puntYds: number;
  prYds: number;
  krYds: number;
  fumLost: number;
  fptsPpr: number;
}

/** Ataque de um time em um jogo (usado para calcular o que cada defesa cedeu). */
export interface TeamGameLine {
  team: string;
  opp: string;
  season: number;
  week: number;
  st: SeasonType;
  game: string;
  passYds: number;
  rushYds: number;
  passEpa: number | null;
  rushEpa: number | null;
}

export interface PlayerCareer {
  bio: PlayerBio;
  lines: PlayerSeasonLine[];
  similar: SimilarEntry[];
}

export interface DraftPick {
  season: number;
  round: number;
  pick: number;
  team: string;
  name: string;
  id: string | null;
  pos: string;
  college: string | null;
  age: number | null;
  to: number | null;
  allPro: number;
  proBowls: number;
  starts: number;
  carAv: number | null;
  drAv: number | null;
  games: number | null;
  hof: boolean;
}

export interface SuperBowl {
  number: number;
  roman: string;
  season: number;
  date: string;
  stadium: string;
  city: string;
  winner: string;
  winnerName: string;
  loser: string;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  ot: boolean;
  mvp: string;
  winnerCoach: string | null;
  loserCoach: string | null;
  winnerQb: string | null;
  loserQb: string | null;
  gameId: string | null;
  source: string;
}

export interface CuratedRecord {
  id: string;
  category: 'career' | 'season' | 'game' | 'team';
  label: string;
  holder: string;
  value: number;
  unit: string;
  detail: string;
  asOf: string;
  source: string;
}

export interface LeagueTrend {
  season: number;
  games: number;
  ppg: number;
  homeWinPct: number;
  avgMargin: number;
  otRate: number;
  passYdsPg: number | null;
  rushYdsPg: number | null;
  passAttPg: number | null;
  carriesPg: number | null;
  passRate: number | null;
  sacksPg: number | null;
  turnoversPg: number | null;
  fgPct: number | null;
  xpPct: number | null;
}

export interface Stadium {
  id: string;
  name: string;
  teams: string[];
  roof: string | null;
  surface: string | null;
  games: number;
  first: number;
  last: number;
  superBowls: number;
  /** Pontos por jogo (soma dos dois times). */
  avgPts?: number | null;
  /** Aproveitamento do mandante (jogos não neutros, sem empates). */
  homeWinPct?: number | null;
  /** Médias de temperatura (°F) e vento (mph) nos jogos com medição (céu aberto). */
  avgTemp?: number | null;
  avgWind?: number | null;
  /** Aproveitamento de field goals no estádio (estatísticas por jogo). */
  fgPct?: number | null;
  fgAtt?: number;
}

/** Árbitro principal (referee) e o perfil dos jogos que apitou. */
export interface RefereeSummary {
  name: string;
  games: number;
  from: number;
  to: number;
  playoffs: number;
  superBowls: number;
  avgPts: number;
  homeWinPct: number | null;
  /** Fração de jogos acima do total de pontos esperado pelo mercado. */
  overPct: number | null;
  ot: number;
}

/** Resumo de um time em uma temporada (gerado pelo pipeline a partir de jogos + estatísticas). */
export interface TeamSeason {
  team: string;
  abbr: string;
  season: number;
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
  playoffW: number;
  playoffL: number;
  madePlayoffs: boolean;
  sbWin: boolean;
  sbLoss: boolean;
  passYds: number | null;
  rushYds: number | null;
  passEpa: number | null;
  rushEpa: number | null;
  plays: number | null;
  sacks: number | null;
  takeaways: number | null;
  giveaways: number | null;
  penaltyYds: number | null;
  coach: string | null;
  qb: string | null;
}

/** Componentes brutos do modelo de QBs (pesos aplicados no cliente). */
export interface QbModelEntry {
  id: string;
  name: string;
  first: number;
  last: number;
  seasons: number;
  games: number;
  att: number;
  passYds: number;
  passTd: number;
  int: number;
  rating: number | null;
  epaPerDb: number | null;
  /** Passer rating da carreira menos a média da liga nas mesmas temporadas, ponderado por tentativas. */
  eraRating: number | null;
  regW: number;
  regL: number;
  playoffW: number;
  playoffL: number;
  sbWins: number;
  sbApps: number;
  proBowls: number | null;
  allPro: number | null;
}

export interface SimilarEntry {
  id: string;
  name: string;
  score: number;
}

export interface DatasetMeta {
  key: string;
  label: string;
  source: string;
  sourceUrl: string;
  license: string;
  remoteVersion: string | null;
  /** Versão remota de cada arquivo baixado (nome do asset → updated_at). */
  assets?: Record<string, string>;
  retrievedAt: string;
  sha256: string;
  rows: number;
  seasons: number[] | null;
}

export interface QualityCheck {
  id: string;
  dataset: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface Manifest {
  schemaVersion: number;
  app: string;
  generatedAt: string;
  ingestionVersion: number;
  lastMode: 'full' | 'partial';
  coverage: {
    firstSeason: number;
    lastSeason: number;
    currentSeason: number;
    currentWeek: number | null;
    lastCompletedGame: string | null;
  };
  datasets: Record<string, DatasetMeta>;
  quality: { pass: number; warn: number; fail: number; checkedAt: string };
  /** Última verificação das fontes (mesmo quando nada mudou e a publicação foi mantida). */
  lastCheckedAt?: string;
}

export interface UpdateCheckItem {
  key: string;
  label: string;
  localVersion: string | null;
  remoteVersion: string | null;
  hasUpdate: boolean;
  /** Temporadas com arquivos novos (apenas fontes por temporada). */
  seasons?: number[];
  error?: string;
}

export interface UpdateCheckResult {
  checkedAt: string;
  hasUpdates: boolean;
  items: UpdateCheckItem[];
}

export interface StandingRow {
  team: string;
  conf: Conference;
  division: string;
  w: number;
  l: number;
  t: number;
  pct: number;
  pf: number;
  pa: number;
  diff: number;
  home: [number, number, number];
  away: [number, number, number];
  div: [number, number, number];
  confRec: [number, number, number];
  streak: string;
  last5: string;
  gamesPlayed: number;
}

/** Vitórias, derrotas e empates. */
export type WLT = [number, number, number];

export interface TeamGameRef {
  id: string;
  season: number;
  date: string;
  type: string;
  opp: string;
  home: boolean;
  pf: number;
  pa: number;
}

export interface TeamDraftRef {
  season: number;
  round: number;
  pick: number;
  name: string;
  id: string | null;
  pos: string;
  college: string | null;
  drAv: number | null;
  proBowls: number;
  allPro: number;
  hof: boolean;
}

/** Perfil completo de uma franquia (data/teams/{CODE}.json), calculado no pipeline a partir dos dados publicados. */
export interface TeamProfile {
  team: string;
  coverage: { first: number; last: number };
  identities: { abbr: string; from: number; to: number }[];
  /** Nome mais recente; `names` = outros nomes usados (patrocínio). */
  stadiums: { name: string; names: string[]; from: number; to: number; games: number }[];
  coaches: { name: string; from: number; to: number; seasons: number; record: WLT; playoff: [number, number] }[];
  qbs: { name: string; from: number; to: number; starts: number; record: WLT }[];
  splits: { label: string; record: WLT; note?: string }[];
  h2h: { opp: string; record: WLT; pf: number; pa: number; games: number; last: string }[];
  extremes: {
    best: { season: number; record: WLT } | null;
    worst: { season: number; record: WLT } | null;
    biggestWins: TeamGameRef[];
    worstLosses: TeamGameRef[];
    winStreak: { length: number; from: string; to: string } | null;
    lossStreak: { length: number; from: string; to: string } | null;
  };
  leaders: {
    career: { stat: string; entries: { id: string; name: string; value: number; from: number; to: number }[] }[];
    season: { stat: string; entries: { id: string; name: string; value: number; season: number }[] }[];
  };
  draft: { picks: number; firstRound: number; proBowlers: number; hof: TeamDraftRef[]; best: TeamDraftRef[]; recent: TeamDraftRef[] };
  /**
   * Desempenho contra a expectativa do mercado (linhas de fechamento). ats/ou = [acima, abaixo, push];
   * favored/underdog = campanha (V-D-E) quando favorito/azarão.
   */
  betting: {
    games: number;
    ats: WLT;
    ou: WLT;
    favored: WLT;
    underdog: WLT;
    bySeason: { season: number; ats: WLT; ou: WLT; favored: WLT; underdog: WLT }[];
    upsets: (TeamGameRef & { line: number })[];
  };
}
