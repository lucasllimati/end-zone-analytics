import type { Conference } from './types';

/** Abreviações históricas → franquia atual. */
export const FRANCHISE_ALIAS: Record<string, string> = {
  OAK: 'LV',
  SD: 'LAC',
  STL: 'LA',
  LAR: 'LA',
};

export const franchiseOf = (abbr: string): string => FRANCHISE_ALIAS[abbr] ?? abbr;

/** Abreviações das 32 franquias atuais. */
export const ACTIVE_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LA', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const;

/**
 * Divisões antes do realinhamento de 2002 (temporadas 1999–2001).
 * Fonte: realinhamento oficial da NFL de 2002 (Houston Texans entra em 2002).
 */
const DIVISIONS_1999_2001: Record<string, string> = {
  BUF: 'AFC East', IND: 'AFC East', MIA: 'AFC East', NE: 'AFC East', NYJ: 'AFC East',
  BAL: 'AFC Central', CIN: 'AFC Central', CLE: 'AFC Central', JAX: 'AFC Central', PIT: 'AFC Central', TEN: 'AFC Central',
  DEN: 'AFC West', KC: 'AFC West', LV: 'AFC West', LAC: 'AFC West', SEA: 'AFC West',
  ARI: 'NFC East', DAL: 'NFC East', NYG: 'NFC East', PHI: 'NFC East', WAS: 'NFC East',
  CHI: 'NFC Central', DET: 'NFC Central', GB: 'NFC Central', MIN: 'NFC Central', TB: 'NFC Central',
  ATL: 'NFC West', CAR: 'NFC West', NO: 'NFC West', SF: 'NFC West', LA: 'NFC West',
};

/** Divisões desde 2002 (estáveis até hoje). */
export const DIVISIONS_CURRENT: Record<string, string> = {
  BUF: 'AFC East', MIA: 'AFC East', NE: 'AFC East', NYJ: 'AFC East',
  BAL: 'AFC North', CIN: 'AFC North', CLE: 'AFC North', PIT: 'AFC North',
  HOU: 'AFC South', IND: 'AFC South', JAX: 'AFC South', TEN: 'AFC South',
  DEN: 'AFC West', KC: 'AFC West', LV: 'AFC West', LAC: 'AFC West',
  DAL: 'NFC East', NYG: 'NFC East', PHI: 'NFC East', WAS: 'NFC East',
  CHI: 'NFC North', DET: 'NFC North', GB: 'NFC North', MIN: 'NFC North',
  ATL: 'NFC South', CAR: 'NFC South', NO: 'NFC South', TB: 'NFC South',
  ARI: 'NFC West', LA: 'NFC West', SF: 'NFC West', SEA: 'NFC West',
};

export function divisionOf(abbr: string, season: number): string | null {
  const f = franchiseOf(abbr);
  const table = season <= 2001 ? DIVISIONS_1999_2001 : DIVISIONS_CURRENT;
  return table[f] ?? null;
}

export function conferenceOf(abbr: string, season: number): Conference | null {
  const d = divisionOf(abbr, season);
  return d ? (d.slice(0, 3) as Conference) : null;
}

/** Nome histórico de exibição para abreviações antigas. */
export const HISTORICAL_NAMES: Record<string, string> = {
  OAK: 'Oakland Raiders',
  SD: 'San Diego Chargers',
  STL: 'St. Louis Rams',
};

/** Ordem canônica das divisões para exibição. */
export const DIVISION_ORDER = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West', 'AFC Central',
  'NFC East', 'NFC North', 'NFC South', 'NFC West', 'NFC Central',
];

export const GAME_TYPE_LABEL: Record<string, string> = {
  REG: 'Temporada regular',
  WC: 'Wild Card',
  DIV: 'Divisional',
  CON: 'Final de Conferência',
  SB: 'Super Bowl',
};

export function teamSlug(abbr: string): string {
  return abbr.toLowerCase();
}

/**
 * Franquia atual de uma escolha de draft. O draft (Pro Football Reference via nflverse) usa códigos próprios,
 * e alguns mudam de franquia conforme a época: STL (Cardinals até 1987, Rams desde 1995), HOU (Oilers até 1996,
 * Texans desde 2002) e BAL (Colts até 1983, Ravens desde 1996).
 */
export function draftFranchise(code: string, season: number): string | null {
  switch (code) {
    case 'GNB': return 'GB';
    case 'KAN': return 'KC';
    case 'NOR': return 'NO';
    case 'NWE': return 'NE';
    case 'SFO': return 'SF';
    case 'TAM': return 'TB';
    case 'SDG': return 'LAC';
    case 'OAK': case 'RAI': case 'LVR': return 'LV';
    case 'PHO': return 'ARI';
    case 'RAM': case 'LAR': return 'LA';
    case 'STL': return season <= 1987 ? 'ARI' : 'LA';
    case 'HOU': return season <= 1996 ? 'TEN' : 'HOU';
    case 'BAL': return season <= 1983 ? 'IND' : 'BAL';
    default: return (ACTIVE_TEAMS as readonly string[]).includes(code) ? code : null;
  }
}
