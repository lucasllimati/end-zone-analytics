/**
 * Formato colunar compacto para arquivos grandes: { cols: [...], rows: [[...], ...] }.
 * Reduz ~70% do tamanho em relação a uma lista de objetos com chaves repetidas.
 */
export interface Packed {
  cols: string[];
  rows: unknown[][];
}

export function pack<T extends object>(items: T[], cols: (keyof T)[]): Packed {
  return {
    cols: cols as string[],
    rows: items.map((it) => cols.map((c) => (it as Record<string, unknown>)[c as string] ?? null)),
  };
}

export function unpack<T>(p: Packed): T[] {
  return p.rows.map((r) => {
    const o: Record<string, unknown> = {};
    p.cols.forEach((c, i) => (o[c] = r[i]));
    return o as T;
  });
}

export const PLAYER_LINE_COLS = [
  'id', 'name', 'pos', 'season', 'st', 'team', 'games', 'cmp', 'att', 'passYds', 'passTd', 'int', 'sacked', 'passEpa',
  'cpoe', 'airYds', 'carries', 'rushYds', 'rushTd', 'rushEpa', 'rec', 'tgt', 'recYds', 'recTd', 'yac', 'recEpa',
  'tackles', 'tfl', 'sacks', 'qbHits', 'defInt', 'pd', 'ff', 'defTd', 'fgm', 'fga', 'fgLong', 'xpm', 'xpa', 'punts',
  'puntYds', 'fumLost', 'fpts', 'fptsPpr', 'passFd', 'rushFd', 'recFd', 'pass20', 'pass40', 'rush20', 'rush40', 'rec20',
  'rec40', 'tgtShare', 'airShare', 'wopr', 'fgMade', 'fgMiss', 'gwfgm', 'gwfga', 'ptIn20', 'ptTb', 'ptNet', 'pr', 'prYds',
  'kr', 'krYds', 'stTd',
] as const;

/** Jogo a jogo de um jogador (id, nome e posição ficam no perfil). */
export const GAME_LOG_COLS = [
  'season', 'week', 'st', 'game', 'team', 'opp', 'cmp', 'att', 'passYds', 'passTd', 'int', 'sacked', 'passEpa', 'carries',
  'rushYds', 'rushTd', 'rushEpa', 'rec', 'tgt', 'recYds', 'recTd', 'recEpa', 'tackles', 'sacks', 'qbHits', 'defInt', 'pd',
  'ff', 'fgm', 'fga', 'fgLong', 'xpm', 'xpa', 'punts', 'puntYds', 'prYds', 'krYds', 'fumLost', 'fptsPpr',
] as const;

/** Box score: linhas de todos os jogadores de uma rodada. */
export const BOX_COLS = ['id', 'name', 'pos', ...GAME_LOG_COLS] as const;

export const TEAM_LINE_COLS = [
  'team', 'season', 'st', 'games', 'cmp', 'att', 'passYds', 'passTd', 'int', 'sacked', 'passEpa', 'carries', 'rushYds',
  'rushTd', 'rushEpa', 'sacks', 'defInt', 'ff', 'fumLost', 'penalties', 'penaltyYds', 'fgm', 'fga', 'xpm', 'xpa', 'punts',
  'puntYds', 'stTd', 'passFd', 'rushFd', 'pass20', 'pass40', 'rush20', 'rush40', 'tfl', 'qbHits', 'pd', 'fgMade', 'fgMiss',
  'fgLong', 'gwfgm', 'gwfga', 'ptIn20', 'ptTb', 'ptNet', 'prYds', 'krYds', 'passYdsAllowed', 'rushYdsAllowed',
  'passEpaAllowed', 'rushEpaAllowed', 'plays', 'epa', 'success', 'thirdAtt', 'thirdConv', 'fourthOpp', 'fourthAtt', 'fourthConv',
  'rzTrips', 'rzTd', 'dPlays', 'dEpa', 'dSuccess', 'dThirdAtt', 'dThirdConv', 'dRzTrips', 'dRzTd',
] as const;

export const DRAFT_COLS = [
  'season', 'round', 'pick', 'team', 'name', 'id', 'pos', 'college', 'age', 'to', 'allPro', 'proBowls', 'starts', 'carAv',
  'drAv', 'games', 'hof',
] as const;

export const ROSTER_COLS = [
  'id', 'name', 'team', 'pos', 'depth', 'jersey', 'status', 'birth', 'height', 'weight', 'college', 'exp', 'draftPick',
] as const;

export const INDEX_COLS = ['id', 'name', 'pos', 'team', 'first', 'last'] as const;

export const GAME_COLS = [
  'id', 'season', 'type', 'week', 'date', 'time', 'weekday', 'away', 'home', 'awayScore', 'homeScore', 'ot', 'neutral',
  'divGame', 'roof', 'surface', 'temp', 'wind', 'awayQb', 'homeQb', 'awayCoach', 'homeCoach', 'referee', 'stadium',
  'stadiumId', 'espn', 'spread', 'total', 'homeMl', 'awayMl', 'homeRest', 'awayRest',
] as const;

export const TEAM_SEASON_COLS = [
  'team', 'abbr', 'season', 'w', 'l', 't', 'pf', 'pa', 'playoffW', 'playoffL', 'madePlayoffs', 'sbWin', 'sbLoss',
  'passYds', 'rushYds', 'passEpa', 'rushEpa', 'plays', 'sacks', 'takeaways', 'giveaways', 'penaltyYds', 'coach', 'qb',
] as const;

export const isPacked = (v: unknown): v is Packed =>
  typeof v === 'object' && v !== null && Array.isArray((v as Packed).cols) && Array.isArray((v as Packed).rows);
