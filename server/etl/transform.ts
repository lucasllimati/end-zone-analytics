/**
 * Camada NORMALIZED: converte linhas CSV cruas (RAW) nos tipos do contrato (src/lib/types.ts).
 * Funções puras — fáceis de testar com fixtures.
 */
import { parse } from 'csv-parse/sync';
import type {
  DraftPick, Game, GameType, InjuryEntry, PlayerBio, PlayerGameLine, PlayerSeasonLine, RosterEntry, SeasonType, Team, TeamGameLine, TeamSeasonLine,
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

const FG_BUCKETS = ['0_19', '20_29', '30_39', '40_49', '50_59', '60_'] as const;
/** FGs por faixa de distância; null quando não houve tentativa (economiza espaço nas linhas de quem não chuta). */
const fgSplits = (r: Row) => {
  if (!cnt(r.fg_att)) return { fgMade: null, fgMiss: null };
  return {
    fgMade: FG_BUCKETS.map((b) => cnt(r[`fg_made_${b}`])),
    fgMiss: FG_BUCKETS.map((b) => cnt(r[`fg_missed_${b}`])),
  };
};
/** Colunas comuns a jogadores e times (first downs, jogadas longas, times especiais). */
const extras = (r: Row) => ({
  passFd: cnt(r.passing_first_downs),
  rushFd: cnt(r.rushing_first_downs),
  pass20: cnt(r.passing_20),
  pass40: cnt(r.passing_40),
  rush20: cnt(r.rushing_20),
  rush40: cnt(r.rushing_40),
  ...fgSplits(r),
  gwfgm: cnt(r.gwfg_made),
  gwfga: cnt(r.gwfg_att),
  ptIn20: cnt(r.pt_inside_20),
  ptTb: cnt(r.pt_touchback),
  ptNet: cnt(r.pt_net_yards),
  prYds: cnt(r.punt_return_yards),
  krYds: cnt(r.kickoff_return_yards),
});
/** Participação (0–1); 0 na fonte significa "não se aplica". */
const share = (v: string | undefined) => {
  const n = num(v);
  return n === null || n === 0 ? null : round(n, 3);
};

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
      spread: num(r.spread_line),
      total: num(r.total_line),
      homeMl: num(r.home_moneyline),
      awayMl: num(r.away_moneyline),
      homeRest: num(r.home_rest),
      awayRest: num(r.away_rest),
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
      // A fonte registra alvos = 1 para algumas temporadas antigas (recepções > alvos): tratamos como ausente.
      tgt: cnt(r.targets) >= cnt(r.receptions) || cnt(r.receptions) === 0 ? cnt(r.targets) : null,
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
      ...extras(r),
      recFd: cnt(r.receiving_first_downs),
      rec20: cnt(r.receiving_20),
      rec40: cnt(r.receiving_40),
      tgtShare: share(r.target_share),
      airShare: share(r.air_yards_share),
      wopr: share(r.wopr),
      pr: cnt(r.punt_returns),
      kr: cnt(r.kickoff_returns),
      stTd: cnt(r.special_teams_tds),
    }));
}

/** Linhas por jogo (stats_player_week_{season}.csv): base do jogo a jogo e do box score. */
export function toPlayerGameLines(rows: Row[]): PlayerGameLine[] {
  return rows
    .filter((r) => r.player_id && r.player_id !== '0' && r.game_id && (r.player_display_name || r.player_name))
    .map((r) => ({
      id: r.player_id,
      name: r.player_display_name || r.player_name,
      pos: r.position || r.position_group || '—',
      season: Number(r.season),
      week: Number(r.week),
      st: (r.season_type === 'POST' ? 'POST' : 'REG') as SeasonType,
      game: r.game_id,
      team: r.team,
      opp: r.opponent_team,
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
      rec: cnt(r.receptions),
      tgt: cnt(r.targets),
      recYds: cnt(r.receiving_yards),
      recTd: cnt(r.receiving_tds),
      recEpa: round(num(r.receiving_epa), 2),
      tackles: cnt(r.def_tackles_solo) + cnt(r.def_tackle_assists),
      sacks: cnt(r.def_sacks),
      qbHits: cnt(r.def_qb_hits),
      defInt: cnt(r.def_interceptions),
      pd: cnt(r.def_pass_defended),
      ff: cnt(r.def_fumbles_forced),
      fgm: cnt(r.fg_made),
      fga: cnt(r.fg_att),
      fgLong: num(r.fg_long) || null,
      xpm: cnt(r.pat_made),
      xpa: cnt(r.pat_att),
      punts: cnt(r.pt_att),
      puntYds: cnt(r.pt_yards),
      prYds: cnt(r.punt_return_yards),
      krYds: cnt(r.kickoff_return_yards),
      fumLost: cnt(r.fumbles_lost_total),
      fptsPpr: round(cnt(r.fantasy_points_ppr), 1) ?? 0,
    }));
}

/** Ataque de cada time por jogo (stats_team_week_{season}.csv). */
export function toTeamGameLines(rows: Row[]): TeamGameLine[] {
  return rows
    .filter((r) => r.team && r.opponent_team && r.game_id)
    .map((r) => ({
      team: r.team,
      opp: r.opponent_team,
      season: Number(r.season),
      week: Number(r.week),
      st: (r.season_type === 'POST' ? 'POST' : 'REG') as SeasonType,
      game: r.game_id,
      passYds: cnt(r.passing_yards),
      rushYds: cnt(r.rushing_yards),
      passEpa: round(num(r.passing_epa), 2),
      rushEpa: round(num(r.rushing_epa), 2),
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
    ...extras(r),
    tfl: cnt(r.def_tackles_for_loss),
    qbHits: cnt(r.def_qb_hits),
    pd: cnt(r.def_pass_defended),
    fgLong: num(r.fg_long) || null,
    // Preenchidos no pipeline a partir das linhas por jogo dos adversários.
    passYdsAllowed: null,
    rushYdsAllowed: null,
    passEpaAllowed: null,
    rushEpaAllowed: null,
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
      yearsExp: num(r.years_of_experience),
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
    // car_av passou a vir vazio na fonte; w_av (AV de carreira ponderado do PFR) é a medida equivalente.
    carAv: num(r.car_av) ?? num(r.w_av),
    drAv: num(r.dr_av),
    games: num(r.games),
    hof: r.hof === 'TRUE',
  }));
}

/** Altura da fonte de elencos: "6-2" (pés-polegadas) ou polegadas. */
const inches = (v: string | undefined): number | null => {
  const t = str(v);
  if (!t) return null;
  const m = t.match(/^(\d+)-(\d+)$/);
  return m ? Number(m[1]) * 12 + Number(m[2]) : num(t);
};

/**
 * Elenco da temporada (roster_{ano}.csv). A fonte traz uma linha por jogador com o status mais recente;
 * se houver repetição (troca de time), fica a última linha de cada jogador/time.
 */
export function toRoster(rows: Row[]): RosterEntry[] {
  const m = new Map<string, RosterEntry>();
  for (const r of rows) {
    const name = str(r.full_name);
    if (!name || !r.team) continue;
    const id = str(r.gsis_id);
    m.set(`${id ?? name}|${r.team}`, {
      id,
      name,
      team: r.team,
      pos: r.position || '—',
      depth: str(r.depth_chart_position),
      jersey: num(r.jersey_number),
      status: str(r.status),
      birth: str(r.birth_date),
      height: inches(r.height),
      weight: num(r.weight),
      college: str(r.college),
      exp: num(r.years_exp),
      draftPick: num(r.draft_number),
    });
  }
  return [...m.values()];
}

/**
 * Relatório oficial de lesões (injuries_{ano}.csv): fica só a semana mais recente de cada time e só quem
 * tem status no relatório (Out, Doubtful, Questionable) ou treinou com limitação.
 */
export function toInjuries(rows: Row[]): InjuryEntry[] {
  const latest = new Map<string, number>();
  for (const r of rows) {
    const w = num(r.week);
    if (r.team && w !== null) latest.set(r.team, Math.max(latest.get(r.team) ?? 0, w));
  }
  const out: InjuryEntry[] = [];
  for (const r of rows) {
    const week = num(r.week);
    const status = str(r.report_status);
    const practice = str(r.practice_status);
    if (!r.team || week !== latest.get(r.team)) continue;
    if (!status && (!practice || /^Full/i.test(practice))) continue;
    out.push({
      team: r.team,
      week,
      id: str(r.gsis_id),
      name: str(r.full_name) ?? '—',
      pos: r.position || '—',
      injury: str(r.report_primary_injury) ?? str(r.practice_primary_injury),
      status,
      practice,
    });
  }
  const order: Record<string, number> = { Out: 0, Doubtful: 1, Questionable: 2 };
  return out.sort((a, b) => a.team.localeCompare(b.team) || (order[a.status ?? ''] ?? 3) - (order[b.status ?? ''] ?? 3) || a.name.localeCompare(b.name));
}
