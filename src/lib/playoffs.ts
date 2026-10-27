/**
 * Classificação para os playoffs com os critérios oficiais de desempate da NFL e simulação Monte Carlo
 * do restante da temporada regular ("e se?").
 *
 * Desempate dentro da divisão: confronto direto → campanha na divisão → adversários comuns →
 * campanha na conferência → força das vitórias (SOV) → força da tabela (SOS) → saldo de pontos → sorteio.
 * Entre times de divisões diferentes (wild card): antes, só o melhor de cada divisão segue; depois,
 * confronto direto (só se um venceu ou perdeu de todos) → conferência → adversários comuns (mínimo 4) →
 * SOV → SOS → saldo de pontos → sorteio. Com 3+ times, quem sai do empate faz os demais recomeçarem do
 * primeiro critério. Fonte: NFL Record & Fact Book, "Tie-breaking procedures".
 * Simplificações: os critérios de "ranking de pontos" (7º a 10º) viram saldo de pontos dos jogos já
 * disputados, e o sorteio é a ordem alfabética (determinística).
 */
export type Outcome = 'H' | 'A' | 'T';

export interface Result {
  home: string;
  away: string;
  r: Outcome;
}

export interface TeamInfo {
  team: string;
  conf: string;
  division: string;
}

/** Jogo ainda não disputado, com a chance de vitória do mandante. */
export interface Pending {
  id: string;
  week: number;
  home: string;
  away: string;
  pHome: number;
}

const EPS = 1e-9;

/** Tabela de uma temporada (disputada ou simulada): campanhas e confrontos de cada time. */
export class Table {
  private games = new Map<string, { opp: string; v: number }[]>();
  constructor(
    results: Result[],
    private info: Map<string, TeamInfo>,
    private netPts: Map<string, number> = new Map(),
  ) {
    for (const t of info.keys()) this.games.set(t, []);
    for (const g of results) {
      const vh = g.r === 'H' ? 1 : g.r === 'A' ? 0 : 0.5;
      this.games.get(g.home)?.push({ opp: g.away, v: vh });
      this.games.get(g.away)?.push({ opp: g.home, v: 1 - vh });
    }
  }

  private pctOf(list: { v: number }[]): number | null {
    return list.length ? list.reduce((a, g) => a + g.v, 0) / list.length : null;
  }
  pct(t: string): number {
    return this.pctOf(this.games.get(t)!) ?? 0;
  }
  record(t: string): [number, number, number] {
    const g = this.games.get(t)!;
    return [g.filter((x) => x.v === 1).length, g.filter((x) => x.v === 0).length, g.filter((x) => x.v === 0.5).length];
  }
  vs(t: string, opps: string[]): number | null {
    return this.pctOf(this.games.get(t)!.filter((g) => opps.includes(g.opp)));
  }
  divPct(t: string): number {
    const d = this.info.get(t)!.division;
    return this.pctOf(this.games.get(t)!.filter((g) => this.info.get(g.opp)?.division === d)) ?? 0;
  }
  confPct(t: string): number {
    const c = this.info.get(t)!.conf;
    return this.pctOf(this.games.get(t)!.filter((g) => this.info.get(g.opp)?.conf === c)) ?? 0;
  }
  opponents(t: string): Set<string> {
    return new Set(this.games.get(t)!.map((g) => g.opp));
  }
  /** Jogos contra adversários que todos do grupo enfrentaram. */
  common(t: string, group: string[]): { pct: number | null; n: number } {
    const sets = group.map((x) => this.opponents(x));
    const common = [...sets[0]].filter((o) => !group.includes(o) && sets.every((s) => s.has(o)));
    const list = this.games.get(t)!.filter((g) => common.includes(g.opp));
    return { pct: this.pctOf(list), n: list.length };
  }
  /** Força das vitórias: aproveitamento combinado dos times que ele venceu. */
  sov(t: string): number {
    const beaten = this.games.get(t)!.filter((g) => g.v === 1);
    return beaten.length ? beaten.reduce((a, g) => a + this.pct(g.opp), 0) / beaten.length : 0;
  }
  /** Força da tabela: aproveitamento combinado de todos os adversários. */
  sos(t: string): number {
    const all = this.games.get(t)!;
    return all.length ? all.reduce((a, g) => a + this.pct(g.opp), 0) / all.length : 0;
  }
  net(t: string): number {
    return this.netPts.get(t) ?? 0;
  }
  played(a: string, b: string): boolean {
    return this.games.get(a)!.some((g) => g.opp === b);
  }
}

type Step = (t: string, group: string[], tb: Table) => number | null;

const H2H: Step = (t, group, tb) => tb.vs(t, group.filter((x) => x !== t));
/** Wild card: confronto direto só conta se alguém venceu (ou perdeu de) todos os outros do grupo. */
const H2H_SWEEP: Step = (t, group, tb) => {
  const others = (x: string) => group.filter((y) => y !== x);
  const sweep = (x: string, v: number) => others(x).every((o) => tb.played(x, o) && tb.vs(x, [o]) === v);
  const winner = group.find((x) => sweep(x, 1));
  const loser = group.find((x) => sweep(x, 0));
  if (!winner && !loser) return null;
  return t === winner ? 1 : t === loser ? 0 : 0.5;
};
const DIV: Step = (t, _g, tb) => tb.divPct(t);
const CONF: Step = (t, _g, tb) => tb.confPct(t);
const COMMON: Step = (t, group, tb) => tb.common(t, group).pct;
const COMMON4: Step = (t, group, tb) => {
  const c = tb.common(t, group);
  return c.n >= 4 ? c.pct : null;
};
const SOV: Step = (t, _g, tb) => tb.sov(t);
const SOS: Step = (t, _g, tb) => tb.sos(t);
const NET: Step = (t, _g, tb) => tb.net(t);

const DIVISION_STEPS = [H2H, DIV, COMMON, CONF, SOV, SOS, NET];
const WILDCARD_STEPS = [H2H_SWEEP, CONF, COMMON4, SOV, SOS, NET];

/** Ordena times empatados no aproveitamento. Um passo que separa o grupo faz cada parte recomeçar do 1º critério. */
export function breakTie(teams: string[], mode: 'division' | 'wildcard', tb: Table): string[] {
  if (teams.length <= 1) return teams;
  for (const step of mode === 'division' ? DIVISION_STEPS : WILDCARD_STEPS) {
    const vals = teams.map((t) => step(t, teams, tb));
    if (vals.some((v) => v === null)) continue;
    const best = Math.max(...(vals as number[]));
    const top = teams.filter((_, i) => Math.abs((vals[i] as number) - best) < EPS);
    if (top.length === teams.length) continue;
    const rest = teams.filter((t) => !top.includes(t));
    return [...breakTie(top, mode, tb), ...rankBy(rest, mode, tb)];
  }
  return [...teams].sort();
}

/** Ordena por aproveitamento; empates resolvidos por breakTie. */
function rankBy(teams: string[], mode: 'division' | 'wildcard', tb: Table): string[] {
  const out: string[] = [];
  const sorted = [...teams].sort((a, b) => tb.pct(b) - tb.pct(a));
  for (let i = 0; i < sorted.length; ) {
    const tied = sorted.filter((t) => Math.abs(tb.pct(t) - tb.pct(sorted[i])) < EPS);
    out.push(...breakTie(tied, mode, tb));
    i += tied.length;
  }
  return out;
}

/** Times de divisões diferentes: a cada vaga, só o melhor de cada divisão entra na disputa do desempate. */
function rankAcrossDivisions(teams: string[], divOrder: Map<string, number>, info: Map<string, TeamInfo>, tb: Table): string[] {
  const out: string[] = [];
  let left = [...teams];
  while (left.length) {
    const best = Math.max(...left.map((t) => tb.pct(t)));
    const tied = left.filter((t) => Math.abs(tb.pct(t) - best) < EPS);
    let pick = tied[0];
    if (tied.length > 1) {
      const reps = new Map<string, string>();
      for (const t of tied) {
        const d = info.get(t)!.division;
        const cur = reps.get(d);
        if (!cur || divOrder.get(t)! < divOrder.get(cur)!) reps.set(d, t);
      }
      pick = breakTie([...reps.values()], 'wildcard', tb)[0];
    }
    out.push(pick);
    left = left.filter((t) => t !== pick);
  }
  return out;
}

export interface Seeding {
  /** Por conferência, em ordem: campeões de divisão (1–4) e wild cards (5–7; até 2019 eram só 5–6). */
  seeds: Record<string, string[]>;
  /** Ordem dentro de cada divisão. */
  divisions: Record<string, string[]>;
}

/** Vagas de wild card por conferência: 3 desde 2020, 2 antes. */
export const wildcardsFor = (season: number) => (season >= 2020 ? 3 : 2);

export function seedPlayoffs(tb: Table, info: Map<string, TeamInfo>, wildcards = 3): Seeding {
  const divisions: Record<string, string[]> = {};
  for (const t of info.values()) (divisions[t.division] ??= []).push(t.team);
  const divOrder = new Map<string, number>();
  for (const d of Object.keys(divisions)) {
    divisions[d] = rankBy(divisions[d], 'division', tb);
    divisions[d].forEach((t, i) => divOrder.set(t, i));
  }
  const seeds: Record<string, string[]> = {};
  for (const conf of [...new Set([...info.values()].map((t) => t.conf))]) {
    const divs = Object.keys(divisions).filter((d) => info.get(divisions[d][0])!.conf === conf);
    const winners = divs.map((d) => divisions[d][0]);
    const others = divs.flatMap((d) => divisions[d].slice(1));
    seeds[conf] = [...rankAcrossDivisions(winners, divOrder, info, tb), ...rankAcrossDivisions(others, divOrder, info, tb).slice(0, wildcards)];
  }
  return { seeds, divisions };
}

/** Distribuição normal acumulada (aproximação de Abramowitz–Stegun). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Chance de vitória do mandante. Com linha de aposta: margem esperada / 13,5 pontos (desvio típico do
 * resultado em relação à linha). Sem linha: saldo por jogo de cada time (encolhido pela metade) + 1,5 de mando.
 */
export function homeWinProb(spread: number | null, homeDiffPerGame: number, awayDiffPerGame: number): number {
  const margin = spread ?? (homeDiffPerGame - awayDiffPerGame) * 0.5 + 1.5;
  return Math.min(0.97, Math.max(0.03, normCdf(margin / 13.5)));
}

export interface SimOdds {
  team: string;
  playoffs: number;
  division: number;
  bye: number;
  /** Frequência de cada seed (índice 0 = seed 1). */
  seeds: number[];
}

/** Gerador pseudoaleatório com semente (mulberry32): a mesma simulação dá o mesmo resultado. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roda `n` temporadas: jogos escolhidos pelo usuário ficam fixos; os demais seguem a chance de cada jogo. */
export function simulate(played: Result[], pending: Pending[], forced: Record<string, Outcome>, info: Map<string, TeamInfo>, netPts: Map<string, number>, n: number, wildcards = 3, seed = 1): SimOdds[] {
  const odds = new Map<string, SimOdds>([...info.keys()].map((t) => [t, { team: t, playoffs: 0, division: 0, bye: 0, seeds: Array(7).fill(0) }]));
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    const sim: Result[] = [...played];
    for (const g of pending) sim.push({ home: g.home, away: g.away, r: forced[g.id] ?? (rand() < g.pHome ? 'H' : 'A') });
    const { seeds } = seedPlayoffs(new Table(sim, info, netPts), info, wildcards);
    for (const list of Object.values(seeds))
      list.forEach((t, k) => {
        const o = odds.get(t)!;
        o.playoffs++;
        o.seeds[k]++;
        if (k < 4) o.division++;
        // Folga na 1ª rodada: só o seed 1 desde 2020 (7 vagas); seeds 1 e 2 antes (6 vagas).
        if (k < (wildcards === 3 ? 1 : 2)) o.bye++;
      });
  }
  return [...odds.values()].map((o) => ({ ...o, playoffs: o.playoffs / n, division: o.division / n, bye: o.bye / n, seeds: o.seeds.map((s) => s / n) }));
}
