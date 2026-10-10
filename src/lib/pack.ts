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
  'puntYds', 'fumLost', 'fpts', 'fptsPpr',
] as const;

export const TEAM_LINE_COLS = [
  'team', 'season', 'st', 'games', 'cmp', 'att', 'passYds', 'passTd', 'int', 'sacked', 'passEpa', 'carries', 'rushYds',
  'rushTd', 'rushEpa', 'sacks', 'defInt', 'ff', 'fumLost', 'penalties', 'penaltyYds', 'fgm', 'fga', 'xpm', 'xpa', 'punts',
  'puntYds', 'stTd',
] as const;

export const DRAFT_COLS = [
  'season', 'round', 'pick', 'team', 'name', 'id', 'pos', 'college', 'age', 'to', 'allPro', 'proBowls', 'starts', 'carAv',
  'drAv', 'games', 'hof',
] as const;

export const INDEX_COLS = ['id', 'name', 'pos', 'team', 'first', 'last'] as const;

export const GAME_COLS = [
  'id', 'season', 'type', 'week', 'date', 'time', 'weekday', 'away', 'home', 'awayScore', 'homeScore', 'ot', 'neutral',
  'divGame', 'roof', 'surface', 'temp', 'wind', 'awayQb', 'homeQb', 'awayCoach', 'homeCoach', 'referee', 'stadium',
  'stadiumId', 'espn',
] as const;

export const TEAM_SEASON_COLS = [
  'team', 'abbr', 'season', 'w', 'l', 't', 'pf', 'pa', 'playoffW', 'playoffL', 'madePlayoffs', 'sbWin', 'sbLoss',
  'passYds', 'rushYds', 'passEpa', 'rushEpa', 'plays', 'sacks', 'takeaways', 'giveaways', 'penaltyYds', 'coach', 'qb',
] as const;

export const isPacked = (v: unknown): v is Packed =>
  typeof v === 'object' && v !== null && Array.isArray((v as Packed).cols) && Array.isArray((v as Packed).rows);
