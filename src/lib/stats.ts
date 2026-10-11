import type { PlayerSeasonLine } from './types';

/**
 * Passer rating oficial da NFL (0 a 158,3).
 * Cada componente é limitado entre 0 e 2,375.
 */
export function passerRating(cmp: number, att: number, yds: number, td: number, int: number): number | null {
  if (!att) return null;
  const clamp = (v: number) => Math.max(0, Math.min(2.375, v));
  const a = clamp((cmp / att - 0.3) * 5);
  const b = clamp((yds / att - 3) * 0.25);
  const c = clamp((td / att) * 20);
  const d = clamp(2.375 - (int / att) * 25);
  return ((a + b + c + d) / 6) * 100;
}

export const safeDiv = (a: number, b: number): number | null => (b ? a / b : null);

/** Soma linhas de temporada em uma linha de carreira (EPA somado; CPOE ponderado por tentativas). */
export function sumLines(lines: PlayerSeasonLine[]): PlayerSeasonLine | null {
  if (lines.length === 0) return null;
  const first = lines[0];
  const keys: (keyof PlayerSeasonLine)[] = [
    'games', 'cmp', 'att', 'passYds', 'passTd', 'int', 'sacked', 'airYds', 'carries', 'rushYds', 'rushTd', 'rec', 'tgt',
    'recYds', 'recTd', 'yac', 'tackles', 'tfl', 'sacks', 'qbHits', 'defInt', 'pd', 'ff', 'defTd', 'fgm', 'fga', 'xpm',
    'xpa', 'punts', 'puntYds', 'fumLost', 'fpts', 'fptsPpr',
  ];
  const out: PlayerSeasonLine = { ...first, season: Math.max(...lines.map((l) => l.season)), team: lines[lines.length - 1].team };
  for (const k of keys) (out as unknown as Record<string, number>)[k] = lines.reduce((s, l) => s + ((l[k] as number) ?? 0), 0);
  // Alvos ausentes em alguma temporada: o total da carreira não é conhecido.
  if (lines.some((l) => l.tgt === null)) out.tgt = null;
  const sumNullable = (k: 'passEpa' | 'rushEpa' | 'recEpa') => {
    const vals = lines.map((l) => l[k]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  out.passEpa = sumNullable('passEpa');
  out.rushEpa = sumNullable('rushEpa');
  out.recEpa = sumNullable('recEpa');
  const cp = lines.filter((l) => l.cpoe !== null && l.att > 0);
  const cpAtt = cp.reduce((s, l) => s + l.att, 0);
  out.cpoe = cpAtt ? cp.reduce((s, l) => s + (l.cpoe as number) * l.att, 0) / cpAtt : null;
  const longs = lines.map((l) => l.fgLong).filter((v): v is number => v !== null);
  out.fgLong = longs.length ? Math.max(...longs) : null;
  return out;
}

/** Métricas derivadas usadas em tabelas, comparações e explorador. */
export function derived(l: PlayerSeasonLine) {
  return {
    cmpPct: safeDiv(l.cmp, l.att),
    ypa: safeDiv(l.passYds, l.att),
    rating: passerRating(l.cmp, l.att, l.passYds, l.passTd, l.int),
    epaPerDb: l.passEpa !== null ? safeDiv(l.passEpa, l.att + l.sacked) : null,
    ypc: safeDiv(l.rushYds, l.carries),
    ypr: safeDiv(l.recYds, l.rec),
    catchRate: l.tgt === null ? null : safeDiv(l.rec, l.tgt),
    fgPct: safeDiv(l.fgm, l.fga),
    puntAvg: safeDiv(l.puntYds, l.punts),
    scrimYds: l.rushYds + l.recYds,
    totalTd: l.passTd + l.rushTd + l.recTd,
    passYdsPg: safeDiv(l.passYds, l.games),
    rushYdsPg: safeDiv(l.rushYds, l.games),
    recYdsPg: safeDiv(l.recYds, l.games),
  };
}

export type DerivedKey = keyof ReturnType<typeof derived>;

/** Percentil (0–100) de `value` dentro de `population` (maior = melhor, a não ser que lowerIsBetter). */
export function percentile(value: number, population: number[], lowerIsBetter = false): number {
  if (population.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const p of population) {
    if (lowerIsBetter ? p > value : p < value) below++;
    else if (p === value) equal++;
  }
  return Math.round(((below + equal / 2) / population.length) * 100);
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function stdev(xs: number[]): number | null {
  const m = mean(xs);
  if (m === null || xs.length < 2) return null;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Pontuação z; null se não houver dispersão. */
export function zScore(x: number, xs: number[]): number | null {
  const m = mean(xs);
  const s = stdev(xs);
  if (m === null || !s) return null;
  return (x - m) / s;
}

/** Grupo de posição usado para comparar jogadores semelhantes. */
export function positionBucket(pos: string): string {
  const p = pos.toUpperCase();
  if (p === 'QB') return 'QB';
  if (['RB', 'FB', 'HB'].includes(p)) return 'RB';
  if (p === 'WR') return 'WR';
  if (p === 'TE') return 'TE';
  if (['K', 'PK'].includes(p)) return 'K';
  if (p === 'P') return 'P';
  if (['DE', 'DT', 'NT', 'DL', 'EDGE'].includes(p)) return 'DL';
  if (['LB', 'ILB', 'OLB', 'MLB'].includes(p)) return 'LB';
  if (['CB', 'S', 'FS', 'SS', 'DB', 'SAF'].includes(p)) return 'DB';
  if (['T', 'G', 'C', 'OT', 'OG', 'OL'].includes(p)) return 'OL';
  return p;
}
