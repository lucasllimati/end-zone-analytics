/**
 * Linhas de aposta de fechamento (nflverse/schedules). `spread` = margem esperada do mandante:
 * +3 = mandante favorito por 3; −2,5 = visitante favorito por 2,5. `total` = pontos esperados no jogo.
 * Usado apenas como medida de expectativa do mercado (contexto analítico), nunca como recomendação.
 */
import type { Game } from './types';

export type AtsResult = 'cover' | 'miss' | 'push';
export type OuResult = 'over' | 'under' | 'push';

const isPlayed = (g: Game) => g.homeScore !== null && g.awayScore !== null;

/** Time favorito (código do jogo) ou null quando a linha é zero/ausente. */
export function favoriteOf(g: Game): string | null {
  if (g.spread === null || g.spread === 0) return null;
  return g.spread > 0 ? g.home : g.away;
}

/** Pontos de vantagem esperados para `team` (positivo = favorito). */
export function expectedMargin(g: Game, team: string): number | null {
  if (g.spread === null) return null;
  return team === g.home ? g.spread : -g.spread;
}

/** Resultado contra a linha para `team` (código como aparece no jogo). */
export function atsResult(g: Game, team: string): AtsResult | null {
  const exp = expectedMargin(g, team);
  if (exp === null || !isPlayed(g)) return null;
  const margin = team === g.home ? g.homeScore! - g.awayScore! : g.awayScore! - g.homeScore!;
  return margin > exp ? 'cover' : margin < exp ? 'miss' : 'push';
}

export function ouResult(g: Game): OuResult | null {
  if (g.total === null || !isPlayed(g)) return null;
  const pts = g.homeScore! + g.awayScore!;
  return pts > g.total ? 'over' : pts < g.total ? 'under' : 'push';
}

/** Probabilidade implícita na moneyline americana (sem remover a margem da casa). */
export function impliedProb(ml: number | null): number | null {
  if (ml === null || ml === 0) return null;
  return ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100);
}

/** Probabilidades sem a margem da casa (normalizadas para somar 100%). */
export function fairProbs(g: Game): { home: number; away: number } | null {
  const h = impliedProb(g.homeMl);
  const a = impliedProb(g.awayMl);
  if (h === null || a === null) return null;
  return { home: h / (h + a), away: a / (h + a) };
}

/** Zebra: o azarão venceu. Retorna o tamanho da zebra em pontos da linha (ou null). */
export function upsetSize(g: Game): number | null {
  const fav = favoriteOf(g);
  if (!fav || !isPlayed(g) || g.homeScore === g.awayScore) return null;
  const winner = g.homeScore! > g.awayScore! ? g.home : g.away;
  return winner === fav ? null : Math.abs(g.spread!);
}

/** "KC −3,5" / "Pick'em" — linha formatada do ponto de vista do favorito. */
export function spreadLabel(g: Game): string {
  if (g.spread === null) return 'Não disponível';
  if (g.spread === 0) return "Pick'em (sem favorito)";
  const fav = favoriteOf(g)!;
  return `${fav} −${String(Math.abs(g.spread)).replace('.', ',')}`;
}

export const ATS_LABEL: Record<AtsResult, string> = { cover: 'Cobriu a linha', miss: 'Não cobriu', push: 'Empate na linha (push)' };
export const OU_LABEL: Record<OuResult, string> = { over: 'Over (acima do total)', under: 'Under (abaixo do total)', push: 'Exatamente no total (push)' };
