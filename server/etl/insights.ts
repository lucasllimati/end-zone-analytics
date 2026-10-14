/**
 * Análises que cruzam jogos, linhas de aposta e estatísticas por jogo: árbitros, zebras, recordes de times
 * especiais, defesa (o que cada time cedeu) e detalhes de estádios.
 */
import { ouResult, upsetSize } from '../../src/lib/betting';
import { isPlayed } from '../../src/lib/standings';
import type { Game, PlayerGameLine, PlayerSeasonLine, RefereeSummary, Stadium, TeamGameLine, TeamSeasonLine } from '../../src/lib/types';
import type { LeaderEntry } from './analytics';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Preenche o que cada defesa cedeu somando o ataque dos adversários jogo a jogo. */
export function fillAllowed(teamLines: TeamSeasonLine[], teamGames: TeamGameLine[]) {
  const key = (team: string, season: number, st: string) => `${team}|${season}|${st}`;
  const acc = new Map<string, { py: number; ry: number; pe: number; re: number; n: number }>();
  for (const g of teamGames) {
    const k = key(g.opp, g.season, g.st);
    const a = acc.get(k) ?? { py: 0, ry: 0, pe: 0, re: 0, n: 0 };
    a.py += g.passYds;
    a.ry += g.rushYds;
    a.pe += g.passEpa ?? 0;
    a.re += g.rushEpa ?? 0;
    a.n++;
    acc.set(k, a);
  }
  for (const t of teamLines) {
    const a = acc.get(key(t.team, t.season, t.st));
    if (!a) continue;
    t.passYdsAllowed = a.py;
    t.rushYdsAllowed = a.ry;
    t.passEpaAllowed = Math.round(a.pe * 100) / 100;
    t.rushEpaAllowed = Math.round(a.re * 100) / 100;
  }
}

/** Árbitros principais com pelo menos 16 jogos. */
export function buildReferees(games: Game[]): RefereeSummary[] {
  const m = new Map<string, Game[]>();
  for (const g of games) {
    if (!g.referee || !isPlayed(g)) continue;
    const list = m.get(g.referee);
    if (list) list.push(g);
    else m.set(g.referee, [g]);
  }
  return [...m.entries()]
    .filter(([, gs]) => gs.length >= 16)
    .map(([name, gs]) => {
      const nonNeutral = gs.filter((g) => !g.neutral && g.homeScore !== g.awayScore);
      const withTotal = gs.map(ouResult).filter((r) => r && r !== 'push');
      return {
        name,
        games: gs.length,
        from: Math.min(...gs.map((g) => g.season)),
        to: Math.max(...gs.map((g) => g.season)),
        playoffs: gs.filter((g) => g.type !== 'REG').length,
        superBowls: gs.filter((g) => g.type === 'SB').length,
        avgPts: r1(gs.reduce((s, g) => s + g.homeScore! + g.awayScore!, 0) / gs.length),
        homeWinPct: nonNeutral.length ? r3(nonNeutral.filter((g) => g.homeScore! > g.awayScore!).length / nonNeutral.length) : null,
        overPct: withTotal.length ? r3(withTotal.filter((r) => r === 'over').length / withTotal.length) : null,
        ot: gs.filter((g) => g.ot).length,
      };
    })
    .sort((a, b) => b.to - a.to || b.games - a.games);
}

/** Maiores zebras (azarão venceu), pelo tamanho da linha. */
export function buildUpsets(games: Game[], top = 25): LeaderEntry[] {
  return games
    .map((g) => ({ g, size: upsetSize(g) }))
    .filter((x): x is { g: Game; size: number } => x.size !== null)
    .sort((a, b) => b.size - a.size || b.g.date.localeCompare(a.g.date))
    .slice(0, top)
    .map(({ g, size }) => {
      const homeWon = g.homeScore! > g.awayScore!;
      const winner = homeWon ? g.home : g.away;
      const loser = homeWon ? g.away : g.home;
      return {
        id: g.id,
        name: `${winner} ${Math.max(g.homeScore!, g.awayScore!)} × ${Math.min(g.homeScore!, g.awayScore!)} ${loser}`,
        team: winner,
        season: g.season,
        value: size,
        detail: `${g.date} · ${g.type === 'REG' ? `semana ${g.week}` : g.type} · ${loser} era favorito por ${String(size).replace('.', ',')}`,
      };
    });
}

/** Recordes de times especiais (1999+), carreira na temporada regular e maiores FGs por temporada. */
export function buildSpecialTeams(lines: PlayerSeasonLine[], careers: Map<string, PlayerSeasonLine>, top = 10): Record<string, LeaderEntry[]> {
  const reg = lines.filter((l) => l.st === 'REG');
  const list = [...careers.values()];
  const by = (f: (l: PlayerSeasonLine) => number | null, min: (l: PlayerSeasonLine) => boolean = () => true, digits = 0) =>
    list
      .filter(min)
      .map((l) => ({ l, v: f(l) }))
      .filter((x): x is { l: PlayerSeasonLine; v: number } => x.v !== null && x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, top)
      .map(({ l, v }) => ({ id: l.id, name: l.name, team: l.team, value: digits ? Math.round(v * 10 ** digits) / 10 ** digits : v }));
  return {
    fg50: by((l) => (l.fgMade ? l.fgMade[4] + l.fgMade[5] : null)),
    fgMade: by((l) => l.fgm),
    gwfg: by((l) => l.gwfgm),
    fgPct: by((l) => (l.fga ? (l.fgm / l.fga) * 100 : null), (l) => l.fga >= 150, 1),
    longestFg: reg
      .filter((l) => l.fgLong !== null)
      .sort((a, b) => b.fgLong! - a.fgLong! || a.season - b.season)
      .slice(0, top)
      .map((l) => ({ id: l.id, name: l.name, team: l.team, season: l.season, value: l.fgLong! })),
    puntNet: by((l) => (l.punts ? l.ptNet / l.punts : null), (l) => l.punts >= 250, 1),
    puntIn20: by((l) => l.ptIn20),
    returnYds: by((l) => l.prYds + l.krYds),
    stTd: by((l) => l.stTd),
  };
}

/** Acrescenta aos estádios: pontos por jogo, vantagem do mandante, clima e aproveitamento de FG. */
export function enrichStadiums(stadiums: Stadium[], games: Game[], gameLines: PlayerGameLine[]): Stadium[] {
  const stadiumOf = new Map(games.filter((g) => g.stadiumId).map((g) => [g.id, g.stadiumId!]));
  const fg = new Map<string, { m: number; a: number }>();
  for (const l of gameLines) {
    if (!l.fga) continue;
    const sid = stadiumOf.get(l.game);
    if (!sid) continue;
    const f = fg.get(sid) ?? { m: 0, a: 0 };
    f.m += l.fgm;
    f.a += l.fga;
    fg.set(sid, f);
  }
  return stadiums.map((s) => {
    const gs = games.filter((g) => g.stadiumId === s.id && isPlayed(g));
    const decided = gs.filter((g) => !g.neutral && g.homeScore !== g.awayScore);
    const temps = gs.map((g) => g.temp).filter((v): v is number => v !== null);
    const winds = gs.map((g) => g.wind).filter((v): v is number => v !== null);
    const f = fg.get(s.id);
    return {
      ...s,
      avgPts: gs.length ? r1(gs.reduce((a, g) => a + g.homeScore! + g.awayScore!, 0) / gs.length) : null,
      homeWinPct: decided.length >= 8 ? r3(decided.filter((g) => g.homeScore! > g.awayScore!).length / decided.length) : null,
      avgTemp: temps.length >= 4 ? r1(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
      avgWind: winds.length >= 4 ? r1(winds.reduce((a, b) => a + b, 0) / winds.length) : null,
      fgPct: f && f.a >= 20 ? r3(f.m / f.a) : null,
      fgAtt: f?.a ?? 0,
    };
  });
}
