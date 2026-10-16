/**
 * Perfil de franquia (data/teams/{CODE}.json): identidade, estádios, técnicos, QBs, recortes, confrontos,
 * extremos, recordes da franquia e draft. Tudo derivado dos dados publicados — nada é digitado à mão.
 */
import { atsResult, expectedMargin, ouResult } from '../../src/lib/betting';
import { draftFranchise, franchiseOf } from '../../src/lib/teams';
import type { DraftPick, Game, PlayerSeasonLine, TeamDraftRef, TeamGameRef, TeamProfile, TeamSeason, WLT } from '../../src/lib/types';

const played = (g: Game) => g.homeScore !== null && g.awayScore !== null;
const add = (r: WLT, pf: number, pa: number) => (pf > pa ? r[0]++ : pf < pa ? r[1]++ : r[2]++);
const pct = (r: WLT) => (r[0] + r[2] / 2) / Math.max(1, r[0] + r[1] + r[2]);

/** Agrupa valores consecutivos por temporada em faixas (ex.: técnico 2017–2026). */
function runs<T extends { season: number }>(rows: T[], key: (r: T) => string | null) {
  const out: { name: string; from: number; to: number; rows: T[] }[] = [];
  for (const r of [...rows].sort((a, b) => a.season - b.season)) {
    const k = key(r);
    if (!k) continue;
    const last = out.at(-1);
    if (last && last.name === k && r.season === last.to + 1) {
      last.to = r.season;
      last.rows.push(r);
    } else out.push({ name: k, from: r.season, to: r.season, rows: [r] });
  }
  return out;
}

const STATS: { key: keyof PlayerSeasonLine; label: string }[] = [
  { key: 'passYds', label: 'Jardas de passe' },
  { key: 'passTd', label: 'TDs de passe' },
  { key: 'rushYds', label: 'Jardas corridas' },
  { key: 'rushTd', label: 'TDs corridos' },
  { key: 'recYds', label: 'Jardas recebidas' },
  { key: 'rec', label: 'Recepções' },
  { key: 'recTd', label: 'TDs recebidos' },
  { key: 'sacks', label: 'Sacks' },
  { key: 'defInt', label: 'Interceptações' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'ff', label: 'Fumbles forçados' },
  { key: 'fgm', label: 'Field goals' },
];

const draftRef = (d: DraftPick): TeamDraftRef => ({
  season: d.season,
  round: d.round,
  pick: d.pick,
  name: d.name,
  id: d.id,
  pos: d.pos,
  college: d.college,
  drAv: d.drAv,
  proBowls: d.proBowls,
  allPro: d.allPro,
  hof: d.hof,
});

export function buildTeamProfile(code: string, allGames: Game[], seasons: TeamSeason[], lines: PlayerSeasonLine[], draft: DraftPick[]): TeamProfile {
  const games = allGames.filter((g) => played(g) && (franchiseOf(g.home) === code || franchiseOf(g.away) === code)).sort((a, b) => a.date.localeCompare(b.date));
  const mySeasons = seasons.filter((s) => s.team === code).sort((a, b) => a.season - b.season);
  const view = (g: Game) => {
    const home = franchiseOf(g.home) === code;
    return { home, pf: (home ? g.homeScore : g.awayScore)!, pa: (home ? g.awayScore : g.homeScore)!, opp: franchiseOf(home ? g.away : g.home), qb: home ? g.homeQb : g.awayQb };
  };
  const myRest = (g: Game) => (franchiseOf(g.home) === code ? g.homeRest : g.awayRest);
  const ref = (g: Game): TeamGameRef => {
    const v = view(g);
    return { id: g.id, season: g.season, date: g.date, type: g.type, opp: v.opp, home: v.home && !g.neutral, pf: v.pf, pa: v.pa };
  };

  // Identidade (abreviações/cidades por época) e estádios usados como mandante.
  const identities = runs(mySeasons, (s) => s.abbr).map(({ name, from, to }) => ({ abbr: name, from, to }));
  // Estádios agrupados pelo identificador (o nome muda com patrocínio; guardamos os outros nomes usados).
  const stadiumMap = new Map<string, { name: string; names: string[]; from: number; to: number; games: number; lastDate: string }>();
  for (const g of games) {
    if (franchiseOf(g.home) !== code || g.neutral || !g.stadium) continue;
    const key = g.stadiumId ?? g.stadium;
    const st = stadiumMap.get(key) ?? { name: g.stadium, names: [], from: g.season, to: g.season, games: 0, lastDate: '' };
    st.from = Math.min(st.from, g.season);
    st.to = Math.max(st.to, g.season);
    st.games++;
    if (!st.names.includes(g.stadium)) st.names.push(g.stadium);
    if (g.date >= st.lastDate) {
      st.lastDate = g.date;
      st.name = g.stadium;
    }
    stadiumMap.set(key, st);
  }
  const stadiums = [...stadiumMap.values()]
    .filter((st) => st.games >= 4)
    .sort((a, b) => b.to - a.to || b.games - a.games)
    .map(({ lastDate: _d, ...st }) => ({ ...st, names: st.names.filter((n) => n !== st.name) }));

  // Técnicos (por temporada, a partir das campanhas) e QBs titulares (por jogo, temporada regular).
  // Técnicos jogo a jogo (inclui interinos com a campanha real de cada um).
  const coachMap = new Map<string, { name: string; from: number; to: number; seasons: Set<number>; record: WLT; playoff: [number, number] }>();
  for (const g of games) {
    const v = view(g);
    const name = v.home ? g.homeCoach : g.awayCoach;
    if (!name) continue;
    const c = coachMap.get(name) ?? { name, from: g.season, to: g.season, seasons: new Set<number>(), record: [0, 0, 0] as WLT, playoff: [0, 0] as [number, number] };
    c.from = Math.min(c.from, g.season);
    c.to = Math.max(c.to, g.season);
    c.seasons.add(g.season);
    if (g.type === 'REG') add(c.record, v.pf, v.pa);
    else if (v.pf > v.pa) c.playoff[0]++;
    else c.playoff[1]++;
    coachMap.set(name, c);
  }
  const coaches = [...coachMap.values()]
    .map(({ seasons, ...c }) => ({ ...c, seasons: seasons.size }))
    .sort((a, b) => b.to - a.to || b.from - a.from);
  const qbMap = new Map<string, { name: string; from: number; to: number; starts: number; record: WLT }>();
  for (const g of games) {
    if (g.type !== 'REG') continue;
    const v = view(g);
    if (!v.qb) continue;
    const q = qbMap.get(v.qb) ?? { name: v.qb, from: g.season, to: g.season, starts: 0, record: [0, 0, 0] as WLT };
    q.from = Math.min(q.from, g.season);
    q.to = Math.max(q.to, g.season);
    q.starts++;
    add(q.record, v.pf, v.pa);
    qbMap.set(v.qb, q);
  }
  const qbs = [...qbMap.values()].filter((q) => q.starts >= 5).sort((a, b) => b.starts - a.starts).slice(0, 12);

  // Recortes de desempenho.
  const split = (label: string, pred: (g: Game) => boolean, note?: string) => {
    const r: WLT = [0, 0, 0];
    for (const g of games) if (pred(g)) add(r, view(g).pf, view(g).pa);
    return { label, record: r, ...(note ? { note } : {}) };
  };
  const reg = (g: Game) => g.type === 'REG';
  const splits = [
    split('Em casa', (g) => reg(g) && view(g).home && !g.neutral),
    split('Fora de casa', (g) => reg(g) && !view(g).home && !g.neutral),
    split('Contra a divisão', (g) => reg(g) && g.divGame),
    split('Jogos decididos por até 8 pontos', (g) => reg(g) && Math.abs(view(g).pf - view(g).pa) <= 8, 'uma posse de bola'),
    split('Prorrogação', (g) => reg(g) && g.ot),
    split('Estádio coberto', (g) => reg(g) && (g.roof === 'dome' || g.roof === 'closed')),
    split('Ao ar livre', (g) => reg(g) && (g.roof === 'outdoors' || g.roof === 'open')),
    split('Playoffs', (g) => g.type !== 'REG'),
    // Descanso (dias desde o jogo anterior): folga = semana de bye; curto = quinta-feira após domingo.
    split('Após semana de folga', (g) => reg(g) && (myRest(g) ?? 0) >= 10, '10+ dias de descanso'),
    split('Descanso curto', (g) => reg(g) && myRest(g) !== null && myRest(g)! <= 5, 'até 5 dias, ex.: quinta à noite'),
  ];

  // Contra a linha de aposta (expectativa do mercado), temporada regular e playoffs.
  const bySeasonMap = new Map<number, { season: number; ats: WLT; ou: WLT; favored: WLT; underdog: WLT }>();
  const betting: TeamProfile['betting'] = { games: 0, ats: [0, 0, 0], ou: [0, 0, 0], favored: [0, 0, 0], underdog: [0, 0, 0], bySeason: [], upsets: [] };
  const triple = (r: WLT, k: string, a: string, b: string) => (k === a ? r[0]++ : k === b ? r[1]++ : r[2]++);
  const upsetList: (TeamGameRef & { line: number })[] = [];
  for (const g of games) {
    const me = franchiseOf(g.home) === code ? g.home : g.away;
    const ats = atsResult(g, me);
    if (!ats) continue;
    const v = view(g);
    const s = bySeasonMap.get(g.season) ?? { season: g.season, ats: [0, 0, 0] as WLT, ou: [0, 0, 0] as WLT, favored: [0, 0, 0] as WLT, underdog: [0, 0, 0] as WLT };
    betting.games++;
    triple(betting.ats, ats, 'cover', 'miss');
    triple(s.ats, ats, 'cover', 'miss');
    const ou = ouResult(g);
    if (ou) {
      triple(betting.ou, ou, 'over', 'under');
      triple(s.ou, ou, 'over', 'under');
    }
    const exp = expectedMargin(g, me)!;
    if (exp > 0) {
      add(betting.favored, v.pf, v.pa);
      add(s.favored, v.pf, v.pa);
    } else if (exp < 0) {
      add(betting.underdog, v.pf, v.pa);
      add(s.underdog, v.pf, v.pa);
      if (v.pf > v.pa) upsetList.push({ ...ref(g), line: -exp });
    }
    bySeasonMap.set(g.season, s);
  }
  betting.bySeason = [...bySeasonMap.values()].sort((a, b) => b.season - a.season);
  betting.upsets = upsetList.sort((a, b) => b.line - a.line || b.date.localeCompare(a.date)).slice(0, 8);

  // Confrontos contra cada adversário.
  const h2hMap = new Map<string, { opp: string; record: WLT; pf: number; pa: number; games: number; last: string }>();
  for (const g of games) {
    const v = view(g);
    const h = h2hMap.get(v.opp) ?? { opp: v.opp, record: [0, 0, 0] as WLT, pf: 0, pa: 0, games: 0, last: g.date };
    add(h.record, v.pf, v.pa);
    h.pf += v.pf;
    h.pa += v.pa;
    h.games++;
    h.last = g.date;
    h2hMap.set(v.opp, h);
  }
  const h2h = [...h2hMap.values()].sort((a, b) => b.games - a.games || a.opp.localeCompare(b.opp));

  // Extremos: temporadas, placares e sequências (jogos em ordem cronológica, inclusive playoffs).
  const finished = mySeasons.filter((s) => s.w + s.l + s.t >= 16);
  const byPct = [...finished].sort((a, b) => pct([b.w, b.l, b.t]) - pct([a.w, a.l, a.t]) || b.pf - b.pa - (a.pf - a.pa));
  const toRec = (s: TeamSeason | undefined) => (s ? { season: s.season, record: [s.w, s.l, s.t] as WLT } : null);
  const margin = (g: Game) => view(g).pf - view(g).pa;
  const biggestWins = [...games].sort((a, b) => margin(b) - margin(a)).slice(0, 5).map(ref);
  const worstLosses = [...games].sort((a, b) => margin(a) - margin(b)).slice(0, 5).map(ref);
  const streak = (want: 1 | -1): { length: number; from: string; to: string } | null => {
    let best: { length: number; from: string; to: string } | null = null;
    let len = 0;
    let from = '';
    for (const g of games) {
      if (Math.sign(margin(g)) === want) {
        if (len === 0) from = g.date;
        len++;
        if (!best || len > best.length) best = { length: len, from, to: g.date };
      } else len = 0;
    }
    return best;
  };

  // Recordes da franquia (temporada regular, desde a primeira temporada com estatísticas).
  const mine = lines.filter((l) => l.st === 'REG' && franchiseOf(l.team) === code);
  const career = new Map<string, { id: string; name: string; from: number; to: number; sums: Record<string, number> }>();
  for (const l of mine) {
    const c = career.get(l.id) ?? { id: l.id, name: l.name, from: l.season, to: l.season, sums: {} };
    c.from = Math.min(c.from, l.season);
    c.to = Math.max(c.to, l.season);
    for (const s of STATS) c.sums[s.key] = (c.sums[s.key] ?? 0) + ((l[s.key] as number) ?? 0);
    career.set(l.id, c);
  }
  const careerList = [...career.values()];
  const leaders = {
    career: STATS.map((s) => ({
      stat: s.label,
      entries: careerList
        .filter((c) => c.sums[s.key] > 0)
        .sort((a, b) => b.sums[s.key] - a.sums[s.key])
        .slice(0, 5)
        .map((c) => ({ id: c.id, name: c.name, value: Math.round(c.sums[s.key] * 10) / 10, from: c.from, to: c.to })),
    })),
    season: STATS.map((s) => ({
      stat: s.label,
      entries: mine
        .filter((l) => ((l[s.key] as number) ?? 0) > 0)
        .sort((a, b) => (b[s.key] as number) - (a[s.key] as number))
        .slice(0, 5)
        .map((l) => ({ id: l.id, name: l.name, value: l[s.key] as number, season: l.season })),
    })),
  };

  // Draft (desde 1980, códigos do PFR mapeados para a franquia atual).
  const picks = draft.filter((d) => draftFranchise(d.team, d.season) === code);
  const lastDraft = Math.max(0, ...picks.map((p) => p.season));
  const draftSummary = {
    picks: picks.length,
    firstRound: picks.filter((p) => p.round === 1).length,
    proBowlers: picks.filter((p) => p.proBowls > 0).length,
    hof: picks.filter((p) => p.hof).sort((a, b) => a.season - b.season).map(draftRef),
    best: picks
      .filter((p) => p.drAv !== null)
      .sort((a, b) => (b.drAv ?? 0) - (a.drAv ?? 0))
      .slice(0, 10)
      .map(draftRef),
    recent: picks.filter((p) => p.season === lastDraft).sort((a, b) => a.pick - b.pick).map(draftRef),
  };

  return {
    team: code,
    coverage: { first: mySeasons[0]?.season ?? 0, last: mySeasons.at(-1)?.season ?? 0 },
    identities,
    stadiums,
    coaches,
    qbs,
    splits,
    h2h,
    extremes: { best: toRec(byPct[0]), worst: toRec(byPct.at(-1)), biggestWins, worstLosses, winStreak: streak(1), lossStreak: streak(-1) },
    leaders,
    draft: draftSummary,
    betting,
  };
}
