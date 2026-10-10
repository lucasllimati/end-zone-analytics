import type { Game, StandingRow } from './types';
import { conferenceOf, divisionOf, franchiseOf } from './teams';

type WLT = [number, number, number];

const add = (r: WLT, res: 'W' | 'L' | 'T') => {
  if (res === 'W') r[0]++;
  else if (res === 'L') r[1]++;
  else r[2]++;
};

/** Percentual de vitórias da NFL: empates valem meia vitória. */
export function winPct(w: number, l: number, t: number): number {
  const g = w + l + t;
  return g === 0 ? 0 : (w + t / 2) / g;
}

export const isPlayed = (g: Game): boolean => g.homeScore !== null && g.awayScore !== null;

/** Resultado do ponto de vista de `team` (abreviação de franquia). */
export function resultFor(g: Game, team: string): 'W' | 'L' | 'T' | null {
  if (!isPlayed(g)) return null;
  const home = franchiseOf(g.home) === team;
  const my = home ? g.homeScore! : g.awayScore!;
  const opp = home ? g.awayScore! : g.homeScore!;
  return my > opp ? 'W' : my < opp ? 'L' : 'T';
}

/**
 * Calcula a classificação da temporada regular.
 * Ordenação: PCT → saldo de pontos → pontos marcados (desempate simplificado;
 * os critérios oficiais da NFL incluem confronto direto, divisão, adversários comuns etc.).
 */
export function computeStandings(games: Game[], season: number): StandingRow[] {
  const rows = new Map<string, StandingRow & { results: string[] }>();
  const reg = games
    .filter((g) => g.season === season && g.type === 'REG' && isPlayed(g))
    .sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week);

  const ensure = (abbr: string) => {
    const team = franchiseOf(abbr);
    let r = rows.get(team);
    if (!r) {
      r = {
        team,
        conf: conferenceOf(team, season) ?? 'AFC',
        division: divisionOf(team, season) ?? '—',
        w: 0, l: 0, t: 0, pct: 0, pf: 0, pa: 0, diff: 0,
        home: [0, 0, 0], away: [0, 0, 0], div: [0, 0, 0], confRec: [0, 0, 0],
        streak: '—', last5: '', gamesPlayed: 0, results: [],
      };
      rows.set(team, r);
    }
    return r;
  };

  // Garante que todos os times com jogos agendados apareçam mesmo sem resultado.
  for (const g of games) {
    if (g.season === season && g.type === 'REG') {
      ensure(g.home);
      ensure(g.away);
    }
  }

  for (const g of reg) {
    const h = ensure(g.home);
    const a = ensure(g.away);
    const hs = g.homeScore!;
    const as = g.awayScore!;
    const hr: 'W' | 'L' | 'T' = hs > as ? 'W' : hs < as ? 'L' : 'T';
    const ar: 'W' | 'L' | 'T' = hr === 'W' ? 'L' : hr === 'L' ? 'W' : 'T';
    const sameDiv = h.division === a.division;
    const sameConf = h.conf === a.conf;
    for (const [row, res, pf, pa, isHome] of [
      [h, hr, hs, as, true],
      [a, ar, as, hs, false],
    ] as const) {
      if (res === 'W') row.w++;
      else if (res === 'L') row.l++;
      else row.t++;
      row.pf += pf;
      row.pa += pa;
      add(isHome ? row.home : row.away, res);
      if (sameDiv) add(row.div, res);
      if (sameConf) add(row.confRec, res);
      row.results.push(res);
      row.gamesPlayed++;
    }
  }

  const out: StandingRow[] = [];
  for (const r of rows.values()) {
    r.pct = winPct(r.w, r.l, r.t);
    r.diff = r.pf - r.pa;
    r.streak = streakOf(r.results);
    r.last5 = r.results.slice(-5).join('');
    const { results: _omit, ...row } = r;
    void _omit;
    out.push(row);
  }
  return sortStandings(out);
}

export function streakOf(results: string[]): string {
  if (results.length === 0) return '—';
  const last = results[results.length - 1];
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
  return `${last}${n}`;
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => b.pct - a.pct || b.diff - a.diff || b.pf - a.pf || a.team.localeCompare(b.team));
}

export function groupByDivision(rows: StandingRow[]): Map<string, StandingRow[]> {
  const m = new Map<string, StandingRow[]>();
  for (const r of rows) {
    const list = m.get(r.division) ?? [];
    list.push(r);
    m.set(r.division, list);
  }
  for (const [k, v] of m) m.set(k, sortStandings(v));
  return m;
}

export const fmtRecord = (r: WLT | { w: number; l: number; t: number }): string => {
  const [w, l, t] = Array.isArray(r) ? r : [r.w, r.l, r.t];
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
};
