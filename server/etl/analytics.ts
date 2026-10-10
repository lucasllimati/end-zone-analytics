/**
 * Camada ANALYTICS: agregações e modelos derivados dos dados normalizados.
 */
import type {
  DraftPick, Game, LeagueTrend, PlayerSeasonLine, QbModelEntry, SimilarEntry, Stadium, SuperBowl, TeamSeason, TeamSeasonLine,
} from '../../src/lib/types';
import { franchiseOf } from '../../src/lib/teams';
import { isPlayed } from '../../src/lib/standings';
import { passerRating, positionBucket, sumLines } from '../../src/lib/stats';
import { roman } from '../../src/lib/format';
import type { qbStarts } from './transform';

const r1 = (v: number | null) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r3 = (v: number | null) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000);

function mode<T>(xs: T[]): T | null {
  const m = new Map<T, number>();
  let best: T | null = null;
  let bestN = 0;
  for (const x of xs) {
    const n = (m.get(x) ?? 0) + 1;
    m.set(x, n);
    if (n > bestN) {
      best = x;
      bestN = n;
    }
  }
  return best;
}

/* ------------------------------ Team seasons ------------------------------ */

export function buildTeamSeasons(games: Game[], teamLines: TeamSeasonLine[]): TeamSeason[] {
  const key = (t: string, s: number) => `${t}|${s}`;
  const acc = new Map<string, TeamSeason & { coaches: string[]; qbs: string[] }>();
  const get = (abbr: string, season: number) => {
    const team = franchiseOf(abbr);
    const k = key(team, season);
    if (!acc.has(k)) {
      acc.set(k, {
        team, abbr, season, w: 0, l: 0, t: 0, pf: 0, pa: 0, playoffW: 0, playoffL: 0, madePlayoffs: false,
        sbWin: false, sbLoss: false, passYds: null, rushYds: null, passEpa: null, rushEpa: null, plays: null,
        sacks: null, takeaways: null, giveaways: null, penaltyYds: null, coach: null, qb: null, coaches: [], qbs: [],
      });
    }
    return acc.get(k)!;
  };
  for (const g of games) {
    if (!isPlayed(g)) continue;
    for (const side of ['home', 'away'] as const) {
      const me = side === 'home' ? g.home : g.away;
      const my = side === 'home' ? g.homeScore! : g.awayScore!;
      const op = side === 'home' ? g.awayScore! : g.homeScore!;
      const row = get(me, g.season);
      const coach = side === 'home' ? g.homeCoach : g.awayCoach;
      const qb = side === 'home' ? g.homeQb : g.awayQb;
      if (coach) row.coaches.push(coach);
      if (qb && g.type === 'REG') row.qbs.push(qb);
      if (g.type === 'REG') {
        row.pf += my;
        row.pa += op;
        if (my > op) row.w++;
        else if (my < op) row.l++;
        else row.t++;
      } else {
        row.madePlayoffs = true;
        if (my > op) row.playoffW++;
        else row.playoffL++;
        if (g.type === 'SB') {
          if (my > op) row.sbWin = true;
          else row.sbLoss = true;
        }
      }
    }
  }
  // Times com calendário mas sem jogos disputados (início de temporada) também aparecem.
  for (const g of games) {
    get(g.home, g.season);
    get(g.away, g.season);
  }
  const stat = new Map(teamLines.filter((t) => t.st === 'REG').map((t) => [key(franchiseOf(t.team), t.season), t]));
  const out: TeamSeason[] = [];
  for (const row of acc.values()) {
    const s = stat.get(key(row.team, row.season));
    if (s) {
      row.passYds = s.passYds;
      row.rushYds = s.rushYds;
      row.passEpa = s.passEpa;
      row.rushEpa = s.rushEpa;
      row.plays = s.att + s.sacked + s.carries;
      row.sacks = s.sacks;
      row.takeaways = s.defInt; // recuperações de fumble do adversário não estão no dataset de times
      row.giveaways = s.int + s.fumLost;
      row.penaltyYds = s.penaltyYds;
    }
    row.coach = row.coaches.at(-1) ?? null;
    row.qb = mode(row.qbs);
    const { coaches: _c, qbs: _q, ...clean } = row;
    void _c;
    void _q;
    out.push(clean);
  }
  return out.sort((a, b) => a.season - b.season || a.team.localeCompare(b.team));
}

/* --------------------------------- Trends --------------------------------- */

export function buildTrends(games: Game[], teamLines: TeamSeasonLine[]): LeagueTrend[] {
  const seasons = [...new Set(games.map((g) => g.season))].sort();
  return seasons
    .map((season) => {
      const reg = games.filter((g) => g.season === season && g.type === 'REG' && isPlayed(g));
      if (reg.length === 0) return null;
      const pts = reg.reduce((s, g) => s + g.homeScore! + g.awayScore!, 0);
      const nonNeutral = reg.filter((g) => !g.neutral && g.homeScore !== g.awayScore);
      const homeW = nonNeutral.filter((g) => g.homeScore! > g.awayScore!).length;
      const tl = teamLines.filter((t) => t.season === season && t.st === 'REG');
      const tg = tl.reduce((s, t) => s + t.games, 0);
      const sum = (k: keyof TeamSeasonLine) => tl.reduce((s, t) => s + (t[k] as number), 0);
      const per = (k: keyof TeamSeasonLine) => (tg ? r1(sum(k) / tg) : null);
      const dropbacks = sum('att') + sum('sacked');
      return {
        season,
        games: reg.length,
        ppg: r1(pts / (reg.length * 2))!,
        homeWinPct: r3(nonNeutral.length ? homeW / nonNeutral.length : 0)!,
        avgMargin: r1(reg.reduce((s, g) => s + Math.abs(g.homeScore! - g.awayScore!), 0) / reg.length)!,
        otRate: r3(reg.filter((g) => g.ot).length / reg.length)!,
        passYdsPg: per('passYds'),
        rushYdsPg: per('rushYds'),
        passAttPg: per('att'),
        carriesPg: per('carries'),
        passRate: tg ? r3(dropbacks / (dropbacks + sum('carries'))) : null,
        sacksPg: per('sacks'),
        turnoversPg: tg ? r1((sum('int') + sum('fumLost')) / tg) : null,
        fgPct: sum('fga') ? r3(sum('fgm') / sum('fga')) : null,
        xpPct: sum('xpa') ? r3(sum('xpm') / sum('xpa')) : null,
      } satisfies LeagueTrend;
    })
    .filter((x): x is LeagueTrend => x !== null);
}

/* ------------------------------- Super Bowls ------------------------------- */

export interface CuratedSb {
  n: number; season: number; date: string; stadium: string; city: string; w: string; wn: string; l: string; ln: string;
  ws: number; ls: number; ot: boolean; mvp: string; wc?: string;
}

export function buildSuperBowls(curated: CuratedSb[], games: Game[], source: string) {
  const issues: string[] = [];
  const sbGames = new Map(games.filter((g) => g.type === 'SB').map((g) => [g.season, g]));
  const list: SuperBowl[] = curated.map((c) => {
    const g = sbGames.get(c.season);
    let winnerQb: string | null = null;
    let loserQb: string | null = null;
    let winnerCoach: string | null = c.wc ?? null;
    let loserCoach: string | null = null;
    if (g && isPlayed(g)) {
      const homeWon = g.homeScore! > g.awayScore!;
      const wAbbr = franchiseOf(homeWon ? g.home : g.away);
      const ws = Math.max(g.homeScore!, g.awayScore!);
      const ls = Math.min(g.homeScore!, g.awayScore!);
      if (wAbbr !== c.w || ws !== c.ws || ls !== c.ls) {
        issues.push(`SB ${c.n}: curadoria ${c.w} ${c.ws}-${c.ls} ≠ nflverse ${wAbbr} ${ws}-${ls}`);
      }
      winnerQb = homeWon ? g.homeQb : g.awayQb;
      loserQb = homeWon ? g.awayQb : g.homeQb;
      winnerCoach = homeWon ? g.homeCoach : g.awayCoach;
      loserCoach = homeWon ? g.awayCoach : g.homeCoach;
    } else if (c.season >= 1999) {
      issues.push(`SB ${c.n}: jogo não encontrado no nflverse`);
    }
    return {
      number: c.n,
      roman: roman(c.n),
      season: c.season,
      date: c.date,
      stadium: c.stadium,
      city: c.city,
      winner: c.w,
      winnerName: c.wn,
      loser: c.l,
      loserName: c.ln,
      winnerScore: c.ws,
      loserScore: c.ls,
      ot: c.ot,
      mvp: c.mvp,
      winnerCoach,
      loserCoach,
      winnerQb,
      loserQb,
      gameId: g?.id ?? null,
      source: g ? `${source} + nflverse games.csv` : source,
    };
  });
  return { list, issues };
}

/* --------------------------------- QB model -------------------------------- */

export function buildQbModel(
  lines: PlayerSeasonLine[],
  teamLines: TeamSeasonLine[],
  starts: ReturnType<typeof qbStarts>,
  draft: DraftPick[],
  minAtt = 1500,
): QbModelEntry[] {
  // Passer rating médio da liga por temporada (soma de todos os times).
  const league = new Map<number, number>();
  for (const s of new Set(teamLines.map((t) => t.season))) {
    const tl = teamLines.filter((t) => t.season === s && t.st === 'REG');
    const sum = (k: keyof TeamSeasonLine) => tl.reduce((a, t) => a + (t[k] as number), 0);
    const r = passerRating(sum('cmp'), sum('att'), sum('passYds'), sum('passTd'), sum('int'));
    if (r !== null) league.set(s, r);
  }
  const byPlayer = new Map<string, PlayerSeasonLine[]>();
  for (const l of lines) {
    if (l.st !== 'REG' || l.att === 0) continue;
    const list = byPlayer.get(l.id) ?? [];
    list.push(l);
    byPlayer.set(l.id, list);
  }
  const startRec = new Map<string, { regW: number; regL: number; pW: number; pL: number; sbW: number; sbA: number }>();
  for (const s of starts) {
    const r = startRec.get(s.qb) ?? { regW: 0, regL: 0, pW: 0, pL: 0, sbW: 0, sbA: 0 };
    if (s.type === 'REG') {
      if (s.res === 'W') r.regW++;
      else if (s.res === 'L') r.regL++;
    } else {
      if (s.res === 'W') r.pW++;
      else r.pL++;
      if (s.type === 'SB') {
        r.sbA++;
        if (s.res === 'W') r.sbW++;
      }
    }
    startRec.set(s.qb, r);
  }
  const honors = new Map(draft.filter((d) => d.id).map((d) => [d.id!, d]));
  const out: QbModelEntry[] = [];
  for (const [id, ls] of byPlayer) {
    const qbLines = ls.filter((l) => l.pos === 'QB');
    if (qbLines.length === 0) continue;
    const c = sumLines(ls)!;
    if (c.att < minAtt) continue;
    let eraNum = 0;
    let eraDen = 0;
    for (const l of ls) {
      const r = passerRating(l.cmp, l.att, l.passYds, l.passTd, l.int);
      const lg = league.get(l.season);
      if (r !== null && lg !== undefined) {
        eraNum += (r - lg) * l.att;
        eraDen += l.att;
      }
    }
    const sr = startRec.get(id) ?? { regW: 0, regL: 0, pW: 0, pL: 0, sbW: 0, sbA: 0 };
    const h = honors.get(id);
    out.push({
      id,
      name: c.name,
      first: Math.min(...ls.map((l) => l.season)),
      last: Math.max(...ls.map((l) => l.season)),
      seasons: ls.filter((l) => l.att >= 200).length,
      games: c.games,
      att: c.att,
      passYds: c.passYds,
      passTd: c.passTd,
      int: c.int,
      rating: r1(passerRating(c.cmp, c.att, c.passYds, c.passTd, c.int)),
      epaPerDb: c.passEpa !== null ? r3(c.passEpa / (c.att + c.sacked)) : null,
      eraRating: eraDen ? r1(eraNum / eraDen) : null,
      regW: sr.regW,
      regL: sr.regL,
      playoffW: sr.pW,
      playoffL: sr.pL,
      sbWins: sr.sbW,
      sbApps: sr.sbA,
      proBowls: h ? h.proBowls : null,
      allPro: h ? h.allPro : null,
    });
  }
  return out.sort((a, b) => b.passYds - a.passYds);
}

/* ------------------------------- Similaridade ------------------------------ */

type Feat = (c: PlayerSeasonLine) => number | null;
const pg = (k: keyof PlayerSeasonLine): Feat => (c) => (c.games ? (c[k] as number) / c.games : null);
const ratio = (a: keyof PlayerSeasonLine, b: keyof PlayerSeasonLine): Feat => (c) => ((c[b] as number) ? (c[a] as number) / (c[b] as number) : null);

const FEATURES: Record<string, Feat[]> = {
  QB: [pg('passYds'), pg('passTd'), pg('int'), ratio('cmp', 'att'), ratio('passYds', 'att'), pg('rushYds')],
  RB: [pg('rushYds'), ratio('rushYds', 'carries'), pg('rushTd'), pg('rec'), pg('recYds')],
  WR: [pg('rec'), pg('recYds'), ratio('recYds', 'rec'), pg('recTd'), pg('tgt')],
  TE: [pg('rec'), pg('recYds'), ratio('recYds', 'rec'), pg('recTd'), pg('tgt')],
  DL: [pg('tackles'), pg('sacks'), pg('tfl'), pg('qbHits'), pg('ff')],
  LB: [pg('tackles'), pg('sacks'), pg('tfl'), pg('defInt'), pg('pd')],
  DB: [pg('tackles'), pg('defInt'), pg('pd'), pg('ff')],
  K: [ratio('fgm', 'fga'), pg('fga'), ratio('xpm', 'xpa')],
  P: [ratio('puntYds', 'punts'), pg('punts')],
};

/** Jogadores semelhantes: distância euclidiana em z-scores de produção por jogo (carreira, temporada regular). */
export function buildSimilarity(careers: Map<string, PlayerSeasonLine>, minGames = 16, topN = 5): Map<string, SimilarEntry[]> {
  const out = new Map<string, SimilarEntry[]>();
  const groups = new Map<string, { id: string; name: string; v: number[] }[]>();
  for (const [id, c] of careers) {
    const b = positionBucket(c.pos);
    const feats = FEATURES[b];
    if (!feats || c.games < minGames) continue;
    const v = feats.map((f) => f(c));
    if (v.some((x) => x === null)) continue;
    const list = groups.get(b) ?? [];
    list.push({ id, name: c.name, v: v as number[] });
    groups.set(b, list);
  }
  for (const list of groups.values()) {
    const dims = list[0]?.v.length ?? 0;
    const means = Array.from({ length: dims }, (_, i) => list.reduce((s, p) => s + p.v[i], 0) / list.length);
    const sds = Array.from({ length: dims }, (_, i) => Math.sqrt(list.reduce((s, p) => s + (p.v[i] - means[i]) ** 2, 0) / list.length) || 1);
    const z = list.map((p) => p.v.map((x, i) => (x - means[i]) / sds[i]));
    for (let i = 0; i < list.length; i++) {
      const best: { j: number; d: number }[] = [];
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        let d = 0;
        for (let k = 0; k < dims; k++) d += (z[i][k] - z[j][k]) ** 2;
        if (best.length < topN || d < best[best.length - 1].d) {
          best.push({ j, d });
          best.sort((a, b) => a.d - b.d);
          if (best.length > topN) best.pop();
        }
      }
      out.set(
        list[i].id,
        best.map((b) => ({ id: list[b.j].id, name: list[b.j].name, score: Math.round(100 / (1 + Math.sqrt(b.d))) })),
      );
    }
  }
  return out;
}

/* -------------------------------- Recordes -------------------------------- */

export interface LeaderEntry {
  id?: string;
  name: string;
  team?: string;
  season?: number;
  value: number;
  detail?: string;
}

export interface ComputedRecords {
  coverage: string;
  seasonLeaders: Record<string, LeaderEntry[]>;
  careerLeaders: Record<string, LeaderEntry[]>;
  postseasonCareer: Record<string, LeaderEntry[]>;
  teamSeason: Record<string, LeaderEntry[]>;
  games: Record<string, LeaderEntry[]>;
}

export const RECORD_STATS: (keyof PlayerSeasonLine)[] = [
  'passYds', 'passTd', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'sacks', 'defInt', 'tackles', 'ff', 'fgm',
];

export function buildRecords(lines: PlayerSeasonLine[], careers: Map<string, PlayerSeasonLine>, teamSeasons: TeamSeason[], games: Game[], top = 10): ComputedRecords {
  const reg = lines.filter((l) => l.st === 'REG');
  const post = lines.filter((l) => l.st === 'POST');
  const seasonLeaders: ComputedRecords['seasonLeaders'] = {};
  const careerLeaders: ComputedRecords['careerLeaders'] = {};
  const postseasonCareer: ComputedRecords['postseasonCareer'] = {};
  const postCareers = new Map<string, PlayerSeasonLine>();
  const byId = new Map<string, PlayerSeasonLine[]>();
  for (const l of post) byId.set(l.id, [...(byId.get(l.id) ?? []), l]);
  for (const [id, ls] of byId) postCareers.set(id, sumLines(ls)!);

  for (const k of RECORD_STATS) {
    seasonLeaders[k] = [...reg]
      .sort((a, b) => (b[k] as number) - (a[k] as number))
      .slice(0, top)
      .map((l) => ({ id: l.id, name: l.name, team: l.team, season: l.season, value: l[k] as number }));
    careerLeaders[k] = [...careers.values()]
      .sort((a, b) => (b[k] as number) - (a[k] as number))
      .slice(0, top)
      .map((l) => ({ id: l.id, name: l.name, team: l.team, value: l[k] as number }));
    postseasonCareer[k] = [...postCareers.values()]
      .sort((a, b) => (b[k] as number) - (a[k] as number))
      .slice(0, top)
      .map((l) => ({ id: l.id, name: l.name, team: l.team, value: l[k] as number }));
  }
  const complete = teamSeasons.filter((t) => t.w + t.l + t.t >= 16);
  const ts = (f: (t: TeamSeason) => number, asc = false) =>
    [...complete]
      .sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a)))
      .slice(0, top)
      .map((t) => ({ name: t.team, team: t.team, season: t.season, value: f(t), detail: `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}` }));
  const played = games.filter(isPlayed);
  const gm = (f: (g: Game) => number) =>
    [...played]
      .sort((a, b) => f(b) - f(a))
      .slice(0, top)
      .map((g) => ({
        name: `${g.away} ${g.awayScore} × ${g.homeScore} ${g.home}`,
        season: g.season,
        value: f(g),
        detail: `${g.date} · ${g.type === 'REG' ? `semana ${g.week}` : g.type}`,
        id: g.id,
      }));
  return {
    coverage: `${Math.min(...games.map((g) => g.season))}–${Math.max(...games.map((g) => g.season))}`,
    seasonLeaders,
    careerLeaders,
    postseasonCareer,
    teamSeason: {
      mostWins: ts((t) => t.w),
      mostPoints: ts((t) => t.pf),
      fewestAllowed: ts((t) => t.pa, true),
      bestDiff: ts((t) => t.pf - t.pa),
      mostLosses: ts((t) => t.l),
    },
    games: {
      totalPoints: gm((g) => g.homeScore! + g.awayScore!),
      margin: gm((g) => Math.abs(g.homeScore! - g.awayScore!)),
      teamPoints: gm((g) => Math.max(g.homeScore!, g.awayScore!)),
    },
  };
}

/* -------------------------------- Estádios -------------------------------- */

export function buildStadiums(games: Game[]): Stadium[] {
  const m = new Map<string, Game[]>();
  for (const g of games) {
    if (!g.stadiumId) continue;
    m.set(g.stadiumId, [...(m.get(g.stadiumId) ?? []), g]);
  }
  return [...m.entries()]
    .map(([id, gs]) => {
      const sorted = [...gs].sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      const homeTeams = [...new Set(sorted.filter((g) => !g.neutral).map((g) => franchiseOf(g.home)))];
      return {
        id,
        name: last.stadium ?? id,
        teams: homeTeams,
        roof: mode(sorted.slice(-10).map((g) => g.roof).filter(Boolean) as string[]),
        surface: mode(sorted.slice(-10).map((g) => g.surface).filter(Boolean) as string[]),
        games: sorted.filter(isPlayed).length,
        first: sorted[0].season,
        last: last.season,
        superBowls: sorted.filter((g) => g.type === 'SB').length,
      };
    })
    .sort((a, b) => b.last - a.last || b.games - a.games);
}
