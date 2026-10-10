/**
 * Camada NORMALIZED: converte linhas CSV cruas (RAW) nos tipos do contrato (src/lib/types.ts).
 * Funções puras — fáceis de testar com fixtures.
 */
import { parse } from 'csv-parse/sync';
import type {
  DraftPick, Game, GameType, PlayerBio, PlayerSeasonLine, SeasonType, Team, TeamSeasonLine,
} from '../../src/lib/types';
import { ACTIVE_TEAMS, franchiseOf } from '../../src/lib/teams';

export type Row = Record<string, string>;

export const parseCsv = (text: string): Row[] =>
  parse(text, { columns: true, skip_empty_lines: true, relax_quotes: true, bom: true }) as Row[];

/** Número ou null (string vazia / NA / inválido → null). Nunca converte ausência em 0. */
export const num = (v: string | undefined): number | null => {
  if (v === undefined || v === '' || v === 'NA') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
/** Contagem: ausência vira 0 (usado só em colunas de contagem, onde vazio significa "nenhum evento"). */
export const cnt = (v: string | undefined): number => num(v) ?? 0;
export const str = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return t === '' || t === 'NA' ? null : t;
};
const round = (v: number | null, d = 3) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

export function toTeams(rows: Row[]): Team[] {
  const active = new Set<string>(ACTIVE_TEAMS);
  return rows.map((r) => {
    const logo = r.team_logo_espn;
    return {
      abbr: r.team_abbr,
      name: r.team_name,
      nick: r.team_nick,
      conf: r.team_conf as Team['conf'],
      division: r.team_division,
      color: r.team_color,
      color2: r.team_color2,
      logo,
      logoDark: logo.replace('/nfl/500/', '/nfl/500-dark/'),
      wordmark: str(r.team_wordmark),
      franchise: franchiseOf(r.team_abbr),
      active: active.has(r.team_abbr),
    };
  });
}

export function toGames(rows: Row[], firstSeason: number): Game[] {
  return rows
    .filter((r) => Number(r.season) >= firstSeason)
    .map((r) => ({
      id: r.game_id,
      season: Number(r.season),
      type: r.game_type as GameType,
      week: Number(r.week),
      date: r.gameday,
      time: str(r.gametime),
      weekday: str(r.weekday),
      away: r.away_team,
      home: r.home_team,
      awayScore: num(r.away_score),
      homeScore: num(r.home_score),
      ot: r.overtime === '1',
      neutral: r.location === 'Neutral',
      divGame: r.div_game === '1',
      roof: str(r.roof),
      surface: str(r.surface)?.trim() ?? null,
      temp: num(r.temp),
      wind: num(r.wind),
      awayQb: str(r.away_qb_name),
      homeQb: str(r.home_qb_name),
      awayCoach: str(r.away_coach),
      homeCoach: str(r.home_coach),
      referee: str(r.referee),
      stadium: str(r.stadium),
      stadiumId: str(r.stadium_id),
      espn: str(r.espn),
    }));
}

/** IDs de QB titular por jogo (para recordes de titular em playoffs/Super Bowl). */
export function qbStarts(rows: Row[], firstSeason: number) {
  return rows
    .filter((r) => Number(r.season) >= firstSeason && r.home_score !== '' && r.home_score !== 'NA')
    .flatMap((r) => {
      const hs = Number(r.home_score);
      const as = Number(r.away_score);
      return [
        { qb: r.home_qb_id, team: r.home_team, type: r.game_type, season: Number(r.season), res: hs > as ? 'W' : hs < as ? 'L' : 'T' },
        { qb: r.away_qb_id, team: r.away_team, type: r.game_type, season: Number(r.season), res: as > hs ? 'W' : as < hs ? 'L' : 'T' },
      ].filter((x) => x.qb && x.qb !== 'NA');
    });
}

export function toPlayerLines(rows: Row[], st: SeasonType): PlayerSeasonLine[] {
  return rows
    // Linhas sem player_id/nome são agregados de jogadas sem jogador identificado — não são jogadores.
    .filter((r) => cnt(r.games) > 0 && r.player_id && r.player_id !== '0' && (r.player_display_name || r.player_name))
    .map((r) => ({
      id: r.player_id,
      name: r.player_display_name || r.player_name,
      pos: r.position || r.position_group || '—',
      season: Number(r.season),
      st,
      team: r.recent_team,
      games: cnt(r.games),
      cmp: cnt(r.completions),
      att: cnt(r.attempts),
      passYds: cnt(r.passing_yards),
      passTd: cnt(r.passing_tds),
      int: cnt(r.passing_interceptions),
      sacked: cnt(r.sacks_suffered),
      passEpa: round(num(r.passing_epa), 2),
      cpoe: round(num(r.passing_cpoe), 2),
      airYds: cnt(r.passing_air_yards),
      carries: cnt(r.carries),
      rushYds: cnt(r.rushing_yards),
      rushTd: cnt(r.rushing_tds),
      rushEpa: round(num(r.rushing_epa), 2),
      rec: cnt(r.receptions),
      tgt: cnt(r.targets),
      recYds: cnt(r.receiving_yards),
      recTd: cnt(r.receiving_tds),
      yac: cnt(r.receiving_yards_after_catch),
      recEpa: round(num(r.receiving_epa), 2),
      tackles: cnt(r.def_tackles_solo) + cnt(r.def_tackle_assists),
      tfl: cnt(r.def_tackles_for_loss),
      sacks: cnt(r.def_sacks),
      qbHits: cnt(r.def_qb_hits),
      defInt: cnt(r.def_interceptions),
      pd: cnt(r.def_pass_defended),
      ff: cnt(r.def_fumbles_forced),
      defTd: cnt(r.def_tds),
      fgm: cnt(r.fg_made),
      fga: cnt(r.fg_att),
      fgLong: num(r.fg_long) || null,
      xpm: cnt(r.pat_made),
      xpa: cnt(r.pat_att),
      punts: cnt(r.pt_att),
      puntYds: cnt(r.pt_yards),
      fumLost: cnt(r.fumbles_lost_total),
      fpts: round(cnt(r.fantasy_points), 1) ?? 0,
      fptsPpr: round(cnt(r.fantasy_points_ppr), 1) ?? 0,
    }));
}

export function toTeamLines(rows: Row[], st: SeasonType): TeamSeasonLine[] {
  return rows.map((r) => ({
    team: r.team,
    season: Number(r.season),
    st,
    games: cnt(r.games),
    cmp: cnt(r.completions),
    att: cnt(r.attempts),
    passYds: cnt(r.passing_yards),
    passTd: cnt(r.passing_tds),
    int: cnt(r.passing_interceptions),
    sacked: cnt(r.sacks_suffered),
    passEpa: round(num(r.passing_epa), 2),
    carries: cnt(r.carries),
    rushYds: cnt(r.rushing_yards),
    rushTd: cnt(r.rushing_tds),
    rushEpa: round(num(r.rushing_epa), 2),
    sacks: cnt(r.def_sacks),
    defInt: cnt(r.def_interceptions),
    ff: cnt(r.def_fumbles_forced),
    fumLost: cnt(r.fumbles_lost_total),
    penalties: cnt(r.penalties),
    penaltyYds: cnt(r.penalty_yards),
    fgm: cnt(r.fg_made),
    fga: cnt(r.fg_att),
    xpm: cnt(r.pat_made),
    xpa: cnt(r.pat_att),
    punts: cnt(r.pt_att),
    puntYds: cnt(r.pt_yards),
    stTd: cnt(r.special_teams_tds),
  }));
}

export function toBios(rows: Row[]): Map<string, PlayerBio> {
  const m = new Map<string, PlayerBio>();
  for (const r of rows) {
    if (!r.gsis_id) continue;
    m.set(r.gsis_id, {
      id: r.gsis_id,
      name: r.display_name,
      pos: r.position || '—',
      posGroup: str(r.position_group),
      team: str(r.latest_team),
      first: num(r.rookie_season),
      last: num(r.last_season),
      headshot: str(r.headshot),
      college: str(r.college_name),
      height: num(r.height),
      weight: num(r.weight),
      birth: str(r.birth_date),
      draftYear: num(r.draft_year),
      draftRound: num(r.draft_round),
      draftPick: num(r.draft_pick),
      draftTeam: str(r.draft_team),
      jersey: num(r.jersey_number) || null,
      status: str(r.status),
      espnId: str(r.espn_id),
    });
  }
  return m;
}

export function toDraft(rows: Row[]): DraftPick[] {
  return rows.map((r) => ({
    season: Number(r.season),
    round: Number(r.round),
    pick: Number(r.pick),
    team: r.team,
    name: r.pfr_player_name,
    id: str(r.gsis_id),
    pos: r.position || '—',
    college: str(r.college),
    age: num(r.age),
    to: num(r.to),
    allPro: cnt(r.allpro),
    proBowls: cnt(r.probowls),
    starts: cnt(r.seasons_started),
    carAv: num(r.car_av),
    drAv: num(r.dr_av),
    games: num(r.games),
    hof: r.hof === 'TRUE',
  }));
}
