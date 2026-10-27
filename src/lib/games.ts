import type { Game } from './types';
import { franchiseOf } from './teams';
import { isPlayed } from './standings';

export const winnerOf = (g: Game): string | null => {
  if (!isPlayed(g)) return null;
  if (g.homeScore! === g.awayScore!) return null;
  return g.homeScore! > g.awayScore! ? g.home : g.away;
};

export const margin = (g: Game): number => Math.abs((g.homeScore ?? 0) - (g.awayScore ?? 0));

export const involves = (g: Game, team: string) => franchiseOf(g.home) === team || franchiseOf(g.away) === team;

export interface HeadToHead {
  games: Game[];
  aWins: number;
  bWins: number;
  ties: number;
  aPoints: number;
  bPoints: number;
  aHome: [number, number, number];
  aAway: [number, number, number];
  playoffGames: Game[];
  biggestA: Game | null;
  biggestB: Game | null;
  streak: string;
}

/** Histórico de confrontos entre duas franquias (abreviações de franquia). */
export function headToHead(all: Game[], a: string, b: string): HeadToHead {
  const games = all
    .filter((g) => isPlayed(g) && involves(g, a) && involves(g, b) && a !== b)
    .sort((x, y) => x.date.localeCompare(y.date));
  const out: HeadToHead = {
    games, aWins: 0, bWins: 0, ties: 0, aPoints: 0, bPoints: 0,
    aHome: [0, 0, 0], aAway: [0, 0, 0], playoffGames: [], biggestA: null, biggestB: null, streak: '—',
  };
  for (const g of games) {
    const aHome = franchiseOf(g.home) === a;
    const ap = aHome ? g.homeScore! : g.awayScore!;
    const bp = aHome ? g.awayScore! : g.homeScore!;
    out.aPoints += ap;
    out.bPoints += bp;
    const rec = aHome ? out.aHome : out.aAway;
    if (ap > bp) {
      out.aWins++;
      rec[0]++;
      if (!out.biggestA || ap - bp > margin(out.biggestA)) out.biggestA = g;
    } else if (bp > ap) {
      out.bWins++;
      rec[1]++;
      if (!out.biggestB || bp - ap > margin(out.biggestB)) out.biggestB = g;
    } else {
      out.ties++;
      rec[2]++;
    }
    if (g.type !== 'REG') out.playoffGames.push(g);
  }
  if (games.length) {
    const res = games.map((g) => {
      const w = winnerOf(g);
      return w === null ? 'T' : franchiseOf(w) === a ? a : b;
    });
    const last = res[res.length - 1];
    let n = 0;
    for (let i = res.length - 1; i >= 0 && res[i] === last; i--) n++;
    out.streak = last === 'T' ? `Empate (${n})` : n > 1 ? `${last} venceu os últimos ${n}` : `${last} venceu o último`;
  }
  return out;
}

export interface BracketRound {
  type: 'WC' | 'DIV' | 'CON' | 'SB';
  label: string;
  games: Game[];
}

/** Bracket de playoffs a partir dos jogos reais da temporada (sem previsões). */
export function playoffBracket(games: Game[], season: number): BracketRound[] {
  const order: BracketRound['type'][] = ['WC', 'DIV', 'CON', 'SB'];
  const labels = { WC: 'Wild Card', DIV: 'Divisional', CON: 'Final de Conferência', SB: 'Super Bowl' };
  return order.map((t) => ({
    type: t,
    label: labels[t],
    games: games
      .filter((g) => g.season === season && g.type === t)
      .sort((a, b) => confOrder(a) - confOrder(b) || a.date.localeCompare(b.date)),
  }));
}

// AFC primeiro; usa a divisão pela abreviação do mandante.
const AFC = new Set(['BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT', 'HOU', 'IND', 'JAX', 'TEN', 'DEN', 'KC', 'LV', 'OAK', 'LAC', 'SD']);
const confOrder = (g: Game) => (g.type === 'SB' ? 0 : AFC.has(g.home) ? 0 : 1);

/** Semana "atual": primeira semana com jogo não disputado; senão, a última. */
export function currentWeek(games: Game[], season: number): number | null {
  const s = games.filter((g) => g.season === season);
  if (!s.length) return null;
  const pending = s.filter((g) => !isPlayed(g)).sort((a, b) => a.date.localeCompare(b.date));
  if (pending.length) return pending[0].week;
  return Math.max(...s.map((g) => g.week));
}
