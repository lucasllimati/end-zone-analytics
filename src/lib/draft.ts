import type { DraftPick } from './types';

/** Drafts até esta temporada são considerados "maduros" para análise de valor (carreiras já desenvolvidas). */
export const MATURE = 2016;

/** AV de carreira esperado por número de escolha (média móvel de picks vizinhos, ±4). */
export function expectedCurve(picks: DraftPick[]) {
  const mature = picks.filter((p) => p.season <= MATURE && p.carAv !== null);
  const byPick = new Map<number, number[]>();
  for (const p of mature) byPick.set(p.pick, [...(byPick.get(p.pick) ?? []), p.carAv!]);
  const maxPick = Math.max(...byPick.keys());
  const curve: { x: number; y: number }[] = [];
  for (let k = 1; k <= maxPick; k++) {
    const vals: number[] = [];
    for (let j = k - 4; j <= k + 4; j++) vals.push(...(byPick.get(j) ?? []));
    if (vals.length) curve.push({ x: k, y: vals.reduce((a, b) => a + b, 0) / vals.length });
  }
  return curve;
}
