/**
 * Modelos transparentes (rankings e power rankings).
 * Nenhum ranking é apresentado como verdade: cada um declara pesos, componentes e limitações.
 */
import type { Game, QbModelEntry, StandingRow, TeamSeasonLine } from './types';
import { isPlayed, resultFor, winPct } from './standings';
import { franchiseOf } from './teams';
import { percentile } from './stats';

/* ---------------------------------- QBs ---------------------------------- */

export interface QbWeights {
  championships: number;
  playoffs: number;
  production: number;
  efficiency: number;
  longevity: number;
  era: number;
  honors: number;
}

export const DEFAULT_QB_WEIGHTS: QbWeights = {
  championships: 20,
  playoffs: 20,
  production: 15,
  efficiency: 15,
  longevity: 10,
  era: 10,
  honors: 10,
};

export const QB_COMPONENTS: { key: keyof QbWeights; label: string; how: string }[] = [
  { key: 'championships', label: 'Títulos', how: 'Super Bowls vencidos como QB titular (1 ponto) + participações (0,25).' },
  { key: 'playoffs', label: 'Playoffs', how: 'Vitórias em playoffs como titular, com pequeno ajuste por aproveitamento.' },
  { key: 'production', label: 'Produção', how: 'Jardas + 20 × TDs de passe na temporada regular (carreira desde 1999).' },
  { key: 'efficiency', label: 'Eficiência', how: 'EPA por dropback (pontos esperados adicionados por passe/sack).' },
  { key: 'longevity', label: 'Longevidade', how: 'Temporadas com pelo menos 200 tentativas de passe.' },
  { key: 'era', label: 'Ajuste de era', how: 'Passer rating da carreira acima da média da liga nas mesmas temporadas.' },
  { key: 'honors', label: 'Honrarias', how: 'Pro Bowls + 2 × All-Pro (somente QBs draftados desde 1980; não draftados = sem dado).' },
];

export interface QbRanked extends QbModelEntry {
  score: number;
  parts: Record<keyof QbWeights, number>;
}

function rawComponent(e: QbModelEntry, k: keyof QbWeights): number | null {
  switch (k) {
    case 'championships':
      return e.sbWins + e.sbApps * 0.25;
    case 'playoffs': {
      const g = e.playoffW + e.playoffL;
      return e.playoffW + (g ? (e.playoffW / g) * 2 : 0);
    }
    case 'production':
      return e.passYds + 20 * e.passTd;
    case 'efficiency':
      return e.epaPerDb;
    case 'longevity':
      return e.seasons;
    case 'era':
      return e.eraRating;
    case 'honors':
      return e.proBowls === null ? null : e.proBowls + 2 * (e.allPro ?? 0);
  }
}

/** Aplica pesos: cada componente vira percentil (0–100) na população; score = média ponderada. */
export function rankQbs(entries: QbModelEntry[], weights: QbWeights): QbRanked[] {
  const keys = Object.keys(weights) as (keyof QbWeights)[];
  const pops = Object.fromEntries(
    keys.map((k) => [k, entries.map((e) => rawComponent(e, k)).filter((v): v is number => v !== null)]),
  ) as Record<keyof QbWeights, number[]>;
  const total = keys.reduce((s, k) => s + Math.max(0, weights[k]), 0) || 1;
  return entries
    .map((e) => {
      const parts = {} as Record<keyof QbWeights, number>;
      let score = 0;
      for (const k of keys) {
        const raw = rawComponent(e, k);
        // Dado ausente conta como percentil 0 neste componente (declarado na metodologia).
        parts[k] = raw === null ? 0 : percentile(raw, pops[k]);
        score += (parts[k] * Math.max(0, weights[k])) / total;
      }
      return { ...e, parts, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

/* ----------------------------- Power rankings ----------------------------- */

export const POWER_WEIGHTS = { record: 30, diff: 20, sos: 20, epa: 20, form: 10 } as const;

export interface PowerRow {
  team: string;
  score: number;
  record: string;
  pct: number;
  diffPg: number;
  sos: number;
  epaPerPlay: number | null;
  form: number;
}

/** Força de tabela: média do aproveitamento dos adversários (jogos já disputados). */
export function strengthOfSchedule(team: string, games: Game[], standings: StandingRow[], season: number, played = true) {
  const pctOf = new Map(standings.map((r) => [r.team, r.pct]));
  const opp = games
    .filter((g) => g.season === season && g.type === 'REG' && (played ? isPlayed(g) : !isPlayed(g)))
    .filter((g) => franchiseOf(g.home) === team || franchiseOf(g.away) === team)
    .map((g) => (franchiseOf(g.home) === team ? franchiseOf(g.away) : franchiseOf(g.home)));
  if (opp.length === 0) return { sos: null as number | null, opponents: opp };
  return { sos: opp.reduce((s, o) => s + (pctOf.get(o) ?? 0), 0) / opp.length, opponents: opp };
}

function zs(values: number[]): number[] {
  const m = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length || 1)) || 1;
  return values.map((v) => (v - m) / sd);
}

export function powerRankings(games: Game[], standings: StandingRow[], teamStats: TeamSeasonLine[], season: number): PowerRow[] {
  const rows = standings.filter((s) => s.gamesPlayed > 0);
  if (rows.length === 0) return [];
  const statOf = new Map(teamStats.filter((t) => t.st === 'REG').map((t) => [franchiseOf(t.team), t]));
  const base = rows.map((r) => {
    const st = statOf.get(r.team);
    const plays = st ? st.att + st.sacked + st.carries : 0;
    const epa = st && st.passEpa !== null && st.rushEpa !== null && plays ? (st.passEpa + st.rushEpa) / plays : null;
    const recent = games
      .filter((g) => g.season === season && g.type === 'REG' && isPlayed(g) && (franchiseOf(g.home) === r.team || franchiseOf(g.away) === r.team))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-4)
      .map((g) => resultFor(g, r.team));
    const w = recent.filter((x) => x === 'W').length;
    const t = recent.filter((x) => x === 'T').length;
    return {
      team: r.team,
      record: `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}`,
      pct: r.pct,
      diffPg: r.diff / r.gamesPlayed,
      sos: strengthOfSchedule(r.team, games, standings, season).sos ?? 0.5,
      epaPerPlay: epa,
      form: winPct(w, recent.length - w - t, t),
    };
  });
  const zPct = zs(base.map((b) => b.pct));
  const zDiff = zs(base.map((b) => b.diffPg));
  const zSos = zs(base.map((b) => b.sos));
  const epaVals = base.map((b) => b.epaPerPlay ?? 0);
  const zEpa = zs(epaVals);
  const zForm = zs(base.map((b) => b.form));
  const W = POWER_WEIGHTS;
  return base
    .map((b, i) => ({
      ...b,
      score: Math.round((W.record * zPct[i] + W.diff * zDiff[i] + W.sos * zSos[i] + W.epa * zEpa[i] + W.form * zForm[i]) * 10) / 1000,
    }))
    .sort((a, b) => b.score - a.score);
}
