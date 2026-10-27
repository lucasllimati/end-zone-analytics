/**
 * Fantasy (pontuação PPR, a mais comum nas ligas): ranking por semana, consistência de cada jogador e
 * quanto cada defesa cede por posição. Tudo derivado das estatísticas por jogo do nflverse
 * (fantasy_points_ppr), só temporada regular.
 */
import type { FantasyDefense, FantasyPlayer, FantasySeason, PlayerGameLine } from '../../src/lib/types';

export const FANTASY_POS = ['QB', 'RB', 'WR', 'TE'] as const;
const posOf = (p: string) => (p === 'FB' ? 'RB' : p);
const r1 = (v: number) => Math.round(v * 10) / 10;

export function buildFantasy(season: number, lines: PlayerGameLine[]): FantasySeason | null {
  const reg = lines.filter((l) => l.season === season && l.st === 'REG' && (FANTASY_POS as readonly string[]).includes(posOf(l.pos)));
  if (!reg.length) return null;
  const weeks = Math.max(...reg.map((l) => l.week));

  // Top 12 da posição em cada semana: a referência de "semana de titular" nas ligas de 12 times.
  const top12 = new Map<string, number>();
  for (let w = 1; w <= weeks; w++)
    for (const pos of FANTASY_POS) {
      const ranked = reg.filter((l) => l.week === w && posOf(l.pos) === pos).sort((a, b) => b.fptsPpr - a.fptsPpr);
      for (const l of ranked.slice(0, 12)) if (l.fptsPpr > 0) top12.set(l.id, (top12.get(l.id) ?? 0) + 1);
    }

  const byPlayer = new Map<string, PlayerGameLine[]>();
  for (const l of reg) byPlayer.set(l.id, [...(byPlayer.get(l.id) ?? []), l]);
  const players: FantasyPlayer[] = [];
  for (const [id, ls] of byPlayer) {
    const pts = ls.map((l) => l.fptsPpr);
    const total = pts.reduce((a, b) => a + b, 0);
    if (total <= 0) continue;
    const avg = total / pts.length;
    const sd = Math.sqrt(pts.reduce((a, p) => a + (p - avg) ** 2, 0) / pts.length);
    const last = ls.reduce((a, b) => (b.week > a.week ? b : a));
    const byWeek: (number | null)[] = Array.from({ length: weeks }, () => null);
    for (const l of ls) byWeek[l.week - 1] = r1(l.fptsPpr);
    players.push({ id, name: last.name, pos: posOf(last.pos), team: last.team, games: ls.length, total: r1(total), avg: r1(avg), sd: r1(sd), floor: r1(Math.min(...pts)), ceil: r1(Math.max(...pts)), top12: top12.get(id) ?? 0, weeks: byWeek });
  }
  players.sort((a, b) => b.total - a.total);

  // Pontos cedidos por defesa e posição, por jogo (defesa = time adversário da linha).
  const allowed = new Map<string, { pts: number; games: Set<string> }>();
  const gamesOf = new Map<string, Set<string>>();
  for (const l of reg) {
    const k = `${l.opp}|${posOf(l.pos)}`;
    const a = allowed.get(k) ?? { pts: 0, games: new Set<string>() };
    a.pts += l.fptsPpr;
    allowed.set(k, a);
    (gamesOf.get(l.opp) ?? gamesOf.set(l.opp, new Set()).get(l.opp)!).add(l.game);
  }
  const defense: FantasyDefense[] = [];
  for (const pos of FANTASY_POS) {
    const rows = [...gamesOf.entries()].map(([team, games]) => ({ team, pos, games: games.size, avg: r1((allowed.get(`${team}|${pos}`)?.pts ?? 0) / games.size), rank: 0 }));
    rows.sort((a, b) => b.avg - a.avg).forEach((r, i) => (r.rank = i + 1));
    defense.push(...rows);
  }
  return { season, weeks, players, defense };
}
