/** Fixtures compartilhadas pelos testes (dados pequenos e determinísticos). */
import type { Game, PlayerSeasonLine } from '../src/lib/types';

export function game(p: Partial<Game> & Pick<Game, 'home' | 'away'>): Game {
  return {
    id: p.id ?? `${p.season ?? 2025}_${String(p.week ?? 1).padStart(2, '0')}_${p.away}_${p.home}`,
    season: 2025,
    type: 'REG',
    week: 1,
    date: '2025-09-07',
    time: '13:00',
    weekday: 'Sunday',
    awayScore: null,
    homeScore: null,
    ot: false,
    neutral: false,
    divGame: false,
    roof: 'outdoors',
    surface: 'grass',
    temp: null,
    wind: null,
    awayQb: null,
    homeQb: null,
    awayCoach: null,
    homeCoach: null,
    referee: null,
    stadium: 'Estádio Teste',
    stadiumId: 'TST00',
    espn: null,
    ...p,
  };
}

export function line(p: Partial<PlayerSeasonLine> & Pick<PlayerSeasonLine, 'id'>): PlayerSeasonLine {
  return {
    name: p.id,
    pos: 'QB',
    season: 2025,
    st: 'REG',
    team: 'KC',
    games: 17,
    cmp: 0, att: 0, passYds: 0, passTd: 0, int: 0, sacked: 0, passEpa: null, cpoe: null, airYds: 0,
    carries: 0, rushYds: 0, rushTd: 0, rushEpa: null, rec: 0, tgt: 0, recYds: 0, recTd: 0, yac: 0, recEpa: null,
    tackles: 0, tfl: 0, sacks: 0, qbHits: 0, defInt: 0, pd: 0, ff: 0, defTd: 0, fgm: 0, fga: 0, fgLong: null,
    xpm: 0, xpa: 0, punts: 0, puntYds: 0, fumLost: 0, fpts: 0, fptsPpr: 0,
    ...p,
  };
}

/** Mini temporada: AFC West com 3 rodadas. */
export const SEASON_GAMES: Game[] = [
  game({ week: 1, date: '2025-09-07', away: 'LV', home: 'KC', awayScore: 10, homeScore: 27 }),
  game({ week: 1, date: '2025-09-07', away: 'DEN', home: 'LAC', awayScore: 20, homeScore: 20, ot: true }),
  game({ week: 2, date: '2025-09-14', away: 'KC', home: 'DEN', awayScore: 17, homeScore: 24 }),
  game({ week: 2, date: '2025-09-14', away: 'LAC', home: 'LV', awayScore: 31, homeScore: 3 }),
  game({ week: 3, date: '2025-09-21', away: 'KC', home: 'LAC', awayScore: null, homeScore: null }),
];
