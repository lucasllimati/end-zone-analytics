/**
 * Eficiência dos times na temporada (ataque, defesa, times especiais) a partir das estatísticas de times
 * e dos placares. Cada métrica traz o ranking na liga (1 = melhor, já considerando se menor é melhor).
 */
import { num, percent, signed } from './format';
import { safeDiv } from './stats';
import { franchiseOf } from './teams';
import type { StandingRow, TeamSeasonLine } from './types';

export interface EffMetric {
  key: string;
  label: string;
  group: 'off' | 'def' | 'st' | 'sit';
  /** Chave do dicionário de métricas (ⓘ). */
  metric?: string;
  help?: string;
  lowerIsBetter?: boolean;
  format: 'num1' | 'num2' | 'signed3' | 'signed2' | 'pct' | 'int';
  f: (t: TeamSeasonLine, s: StandingRow | undefined) => number | null;
}

const plays = (t: TeamSeasonLine) => t.att + t.sacked + t.carries;
/** Razão para campos do play-by-play (opcionais: ausentes quando a temporada não tem pbp). */
const ratio = (a: number | undefined, b: number | undefined) => (a === undefined || !b ? null : a / b);
const fgRange = (t: TeamSeasonLine, from: number) => {
  if (!t.fgMade || !t.fgMiss) return null;
  const m = t.fgMade.slice(from).reduce((a, b) => a + b, 0);
  const a = m + t.fgMiss.slice(from).reduce((x, y) => x + y, 0);
  return a ? m / a : null;
};

export const EFF_METRICS: EffMetric[] = [
  // Ataque
  { key: 'ppg', label: 'Pontos/jogo', group: 'off', metric: 'ppg', format: 'num1', f: (_t, s) => (s && s.gamesPlayed ? s.pf / s.gamesPlayed : null) },
  { key: 'ydsPg', label: 'Jardas/jogo', group: 'off', help: 'Jardas de passe + corrida por jogo.', format: 'num1', f: (t) => safeDiv(t.passYds + t.rushYds, t.games) },
  { key: 'epaPlay', label: 'EPA/jogada', group: 'off', metric: 'epaPlay', format: 'signed3', f: (t) => (t.passEpa === null || t.rushEpa === null ? null : safeDiv(t.passEpa + t.rushEpa, plays(t))) },
  { key: 'epaPass', label: 'EPA/dropback', group: 'off', metric: 'epaPerDb', format: 'signed3', f: (t) => (t.passEpa === null ? null : safeDiv(t.passEpa, t.att + t.sacked)) },
  { key: 'epaRush', label: 'EPA/corrida', group: 'off', help: 'Pontos esperados adicionados por corrida.', format: 'signed3', f: (t) => (t.rushEpa === null ? null : safeDiv(t.rushEpa, t.carries)) },
  { key: 'big', label: 'Jogadas 20+/jogo', group: 'off', help: 'Passes completos e corridas de 20+ jardas por jogo.', format: 'num1', f: (t) => safeDiv((t.pass20 ?? 0) + (t.rush20 ?? 0), t.games) },
  { key: 'fd', label: 'First downs/jogo', group: 'off', help: 'First downs de passe e de corrida por jogo (sem os por falta).', format: 'num1', f: (t) => safeDiv((t.passFd ?? 0) + (t.rushFd ?? 0), t.games) },
  { key: 'give', label: 'Turnovers', group: 'off', metric: 'giveaways', lowerIsBetter: true, format: 'int', f: (t) => t.int + t.fumLost },
  { key: 'sackedPct', label: 'Sacks sofridos %', group: 'off', help: 'Sacks sofridos ÷ dropbacks. Mede a proteção ao QB (e o tempo com a bola).', lowerIsBetter: true, format: 'pct', f: (t) => safeDiv(t.sacked, t.att + t.sacked) },
  // Defesa
  { key: 'papg', label: 'Pontos sofridos/jogo', group: 'def', metric: 'papg', lowerIsBetter: true, format: 'num1', f: (_t, s) => (s && s.gamesPlayed ? s.pa / s.gamesPlayed : null) },
  { key: 'ydsAllowed', label: 'Jardas cedidas/jogo', group: 'def', metric: 'ydsAllowedPg', lowerIsBetter: true, format: 'num1', f: (t) => (t.passYdsAllowed == null || t.rushYdsAllowed == null ? null : safeDiv(t.passYdsAllowed + t.rushYdsAllowed, t.games)) },
  { key: 'epaAllowed', label: 'EPA cedido/jogo', group: 'def', metric: 'epaAllowed', lowerIsBetter: true, format: 'signed2', f: (t) => (t.passEpaAllowed == null || t.rushEpaAllowed == null ? null : safeDiv(t.passEpaAllowed + t.rushEpaAllowed, t.games)) },
  { key: 'passAllowed', label: 'Jardas aéreas cedidas/jogo', group: 'def', lowerIsBetter: true, help: 'Jardas de passe dos adversários por jogo.', format: 'num1', f: (t) => (t.passYdsAllowed == null ? null : safeDiv(t.passYdsAllowed, t.games)) },
  { key: 'rushAllowed', label: 'Jardas terrestres cedidas/jogo', group: 'def', lowerIsBetter: true, help: 'Jardas corridas dos adversários por jogo.', format: 'num1', f: (t) => (t.rushYdsAllowed == null ? null : safeDiv(t.rushYdsAllowed, t.games)) },
  { key: 'sacks', label: 'Sacks', group: 'def', metric: 'sacks', format: 'num1', f: (t) => t.sacks },
  { key: 'qbHits', label: 'Hits no QB', group: 'def', metric: 'qbHits', format: 'int', f: (t) => t.qbHits ?? null },
  { key: 'tfl', label: 'Tackles para perda', group: 'def', metric: 'tfl', format: 'int', f: (t) => t.tfl ?? null },
  { key: 'takeaways', label: 'Interceptações', group: 'def', metric: 'takeaways', format: 'int', f: (t) => t.defInt },
  { key: 'pd', label: 'Passes defendidos', group: 'def', metric: 'pd', format: 'int', f: (t) => t.pd ?? null },
  // Times especiais
  { key: 'fgPct', label: 'FG%', group: 'st', metric: 'fgPct', format: 'pct', f: (t) => safeDiv(t.fgm, t.fga) },
  { key: 'fg40', label: 'FG% de 40+', group: 'st', help: 'Aproveitamento em field goals de 40 jardas ou mais.', format: 'pct', f: (t) => fgRange(t, 3) },
  { key: 'gwfg', label: 'FGs da vitória', group: 'st', metric: 'gwfgm', format: 'int', f: (t) => t.gwfgm ?? null },
  { key: 'xpPct', label: 'Ponto extra %', group: 'st', help: 'Aproveitamento nos chutes de ponto extra.', format: 'pct', f: (t) => safeDiv(t.xpm, t.xpa) },
  { key: 'puntNet', label: 'Punt líquido', group: 'st', metric: 'puntNet', format: 'num1', f: (t) => safeDiv(t.ptNet ?? 0, t.punts) },
  { key: 'in20', label: 'Punts dentro da 20', group: 'st', metric: 'ptIn20', format: 'int', f: (t) => t.ptIn20 ?? null },
  { key: 'retPg', label: 'Jardas de retorno/jogo', group: 'st', help: 'Jardas em retornos de punt e kickoff por jogo.', format: 'num1', f: (t) => safeDiv((t.prYds ?? 0) + (t.krYds ?? 0), t.games) },
  { key: 'stTd', label: 'TDs de times especiais', group: 'st', metric: 'stTd', format: 'int', f: (t) => t.stTd },
  // Situações (play-by-play)
  { key: 'third', label: '3ª descida', group: 'sit', metric: 'thirdPct', format: 'pct', f: (t) => ratio(t.thirdConv, t.thirdAtt) },
  { key: 'fourth', label: '4ª descida: conversão', group: 'sit', metric: 'fourthPct', format: 'pct', f: (t) => ratio(t.fourthConv, t.fourthAtt) },
  { key: 'goRate', label: '4ª descida: decidiu ir', group: 'sit', metric: 'goRate', format: 'pct', f: (t) => ratio(t.fourthAtt, t.fourthOpp) },
  { key: 'rz', label: 'Red zone: TD%', group: 'sit', metric: 'rzPct', format: 'pct', f: (t) => ratio(t.rzTd, t.rzTrips) },
  { key: 'successOff', label: 'Taxa de sucesso', group: 'sit', metric: 'successRate', format: 'pct', f: (t) => ratio(t.success, t.plays) },
  { key: 'thirdDef', label: '3ª descida cedida', group: 'sit', metric: 'thirdPct', lowerIsBetter: true, format: 'pct', f: (t) => ratio(t.dThirdConv, t.dThirdAtt) },
  { key: 'rzDef', label: 'Red zone: TD% cedido', group: 'sit', metric: 'rzPct', lowerIsBetter: true, format: 'pct', f: (t) => ratio(t.dRzTd, t.dRzTrips) },
  { key: 'successDef', label: 'Sucesso cedido', group: 'sit', metric: 'successRate', lowerIsBetter: true, format: 'pct', f: (t) => ratio(t.dSuccess, t.dPlays) },
  { key: 'epaPlayDef', label: 'EPA/jogada cedido', group: 'sit', metric: 'epaPlayAllowed', lowerIsBetter: true, format: 'signed3', f: (t) => (t.dEpa === undefined ? null : ratio(t.dEpa, t.dPlays)) },
];

export interface EffRow {
  team: string;
  games: number;
  values: Record<string, number | null>;
  ranks: Record<string, number | null>;
}

/** Linhas de eficiência (temporada regular) com ranking por métrica. */
export function efficiencyTable(lines: TeamSeasonLine[], standings: StandingRow[]): EffRow[] {
  const reg = lines.filter((t) => t.st === 'REG' && t.games > 0);
  const st = new Map(standings.map((s) => [s.team, s]));
  const rows: EffRow[] = reg.map((t) => {
    const team = franchiseOf(t.team);
    const values: Record<string, number | null> = {};
    for (const m of EFF_METRICS) {
      const v = m.f(t, st.get(team));
      values[m.key] = v === null || !Number.isFinite(v) ? null : v;
    }
    return { team, games: t.games, values, ranks: {} };
  });
  for (const m of EFF_METRICS) {
    const sorted = rows.filter((r) => r.values[m.key] !== null).sort((a, b) => (m.lowerIsBetter ? a.values[m.key]! - b.values[m.key]! : b.values[m.key]! - a.values[m.key]!));
    // Empates recebem o mesmo ranking.
    sorted.forEach((r, i) => {
      const prev = sorted[i - 1];
      r.ranks[m.key] = prev && prev.values[m.key] === r.values[m.key] ? prev.ranks[m.key] : i + 1;
    });
    for (const r of rows) if (r.values[m.key] === null) r.ranks[m.key] = null;
  }
  return rows;
}

export function fmtEff(m: EffMetric, v: number | null): string {
  if (v === null) return '—';
  switch (m.format) {
    case 'pct':
      return percent(v, 1);
    case 'signed3':
      return signed(v, 3);
    case 'signed2':
      return signed(v, 2);
    case 'num2':
      return num(v, 2);
    case 'int':
      return num(v, Number.isInteger(v) ? 0 : 1);
    default:
      return num(v, 1);
  }
}

export const EFF_GROUPS: { id: EffMetric['group']; label: string }[] = [
  { id: 'off', label: 'Ataque' },
  { id: 'def', label: 'Defesa' },
  { id: 'st', label: 'Times especiais' },
  { id: 'sit', label: 'Situações' },
];
