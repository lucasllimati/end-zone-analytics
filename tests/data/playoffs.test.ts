/**
 * Critérios oficiais de desempate (src/lib/playoffs.ts) conferidos contra a história: para cada temporada
 * de 2002 em diante (8 divisões), os classificados calculados são os mesmos que jogaram os playoffs, e
 * os times com folga na 1ª rodada também. Pulado sem dados publicados (CI sem data/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPacked, unpack } from '../../src/lib/pack';
import { computeStandings } from '../../src/lib/standings';
import { franchiseOf } from '../../src/lib/teams';
import { Table, seedPlayoffs, wildcardsFor, type Result } from '../../src/lib/playoffs';
import type { Game } from '../../src/lib/types';

const DATA = path.resolve(__dirname, '../../data');
const has = fs.existsSync(path.join(DATA, 'manifest.json'));

function load(season: number): Game[] | null {
  const f = path.join(DATA, 'games', `${season}.json`);
  if (!fs.existsSync(f)) return null;
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  return isPacked(raw) ? unpack<Game>(raw) : raw;
}

describe.skipIf(!has)('desempates e classificação para os playoffs (dados reais)', () => {
  for (let season = 2002; season <= 2025; season++) {
    it(`${season}: classificados e folgas iguais aos playoffs reais`, () => {
      const games = load(season);
      if (!games) return;
      const st = computeStandings(games, season);
      const info = new Map(st.map((s) => [s.team, { team: s.team, conf: s.conf, division: s.division }]));
      const res: Result[] = games
        .filter((g) => g.type === 'REG' && g.homeScore !== null)
        .map((g) => ({ home: franchiseOf(g.home), away: franchiseOf(g.away), r: g.homeScore! > g.awayScore! ? 'H' : g.homeScore! < g.awayScore! ? 'A' : 'T' }));
      const { seeds } = seedPlayoffs(new Table(res, info, new Map(st.map((s) => [s.team, s.diff]))), info, wildcardsFor(season));
      const post = games.filter((g) => g.type !== 'REG');
      const real = new Set(post.flatMap((g) => [franchiseOf(g.home), franchiseOf(g.away)]));
      const inWc = new Set(post.filter((g) => g.type === 'WC').flatMap((g) => [franchiseOf(g.home), franchiseOf(g.away)]));
      const byes = wildcardsFor(season) === 3 ? 1 : 2;
      expect(new Set(Object.values(seeds).flat())).toEqual(real);
      expect(Object.values(seeds).flatMap((s) => s.slice(0, byes)).sort()).toEqual([...real].filter((t) => !inWc.has(t)).sort());
    });
  }
});
