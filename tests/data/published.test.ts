// @vitest-environment node
/**
 * Testes dos dados publicados em data/ (rodam somente se o pipeline já foi executado).
 * Garantem que o que vai para o site é íntegro e factual.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isPacked, unpack } from '../../src/lib/pack';
import { careerBucket } from '../../src/lib/buckets';
import type { DraftPick, Game, Manifest, QbModelEntry, RefereeSummary, SuperBowl, Team, LeagueTrend, QualityCheck, TeamProfile } from '../../src/lib/types';

const DATA = path.resolve(__dirname, '../../data');
const has = fs.existsSync(path.join(DATA, 'manifest.json'));
const read = <T>(rel: string): T => {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));
  return (isPacked(raw) ? unpack(raw) : raw) as T;
};

describe.skipIf(!has)('dados publicados', () => {
  const manifest = has ? read<Manifest>('manifest.json') : (null as unknown as Manifest);

  it('manifest registra fonte, versão, data de coleta e linhas de cada conjunto', () => {
    for (const d of Object.values(manifest.datasets)) {
      expect(d.source, d.key).toBeTruthy();
      expect(d.sourceUrl, d.key).toMatch(/^https:\/\//);
      expect(new Date(d.retrievedAt).getTime(), d.key).not.toBeNaN();
      expect(d.rows, d.key).toBeGreaterThan(0);
      expect(d.sha256, d.key).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(manifest.coverage.firstSeason).toBe(1999);
  });

  it('nenhuma verificação de qualidade falhou', () => {
    const q = read<{ checks: QualityCheck[] }>('quality.json');
    expect(q.checks.filter((c) => c.status === 'fail').map((c) => `${c.id}: ${c.detail}`)).toEqual([]);
  });

  it('32 franquias ativas, com logo e cores', () => {
    const teams = read<Team[]>('teams.json').filter((t) => t.active);
    expect(teams).toHaveLength(32);
    for (const t of teams) {
      expect(t.logo).toMatch(/^https:\/\/a\.espncdn\.com\//);
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('Super Bowls I–LX em sequência, com campeões conhecidos', () => {
    const sb = read<SuperBowl[]>('superbowls.json');
    expect(sb.map((s) => s.number)).toEqual(Array.from({ length: sb.length }, (_, i) => i + 1));
    expect(sb.length).toBeGreaterThanOrEqual(60);
    const by = (n: number) => sb.find((s) => s.number === n)!;
    expect(by(1)).toMatchObject({ winner: 'GB', winnerScore: 35, loserScore: 10 });
    expect(by(51)).toMatchObject({ winner: 'NE', ot: true });
    expect(by(60)).toMatchObject({ winner: 'SEA', loser: 'NE', winnerScore: 29, loserScore: 13 });
    const titles = (t: string) => sb.filter((s) => s.winner === t).length;
    expect(titles('NE')).toBe(6);
    expect(titles('PIT')).toBe(6);
    for (const s of sb) expect(s.winnerScore).toBeGreaterThan(s.loserScore);
  });

  it('tendências da liga estão em faixas plausíveis', () => {
    for (const t of read<LeagueTrend[]>('trends.json')) {
      expect(t.ppg, String(t.season)).toBeGreaterThan(15);
      expect(t.ppg, String(t.season)).toBeLessThan(32);
      expect(t.homeWinPct).toBeGreaterThan(0.3);
      expect(t.homeWinPct).toBeLessThan(0.75);
      if (t.passRate !== null) expect(t.passRate).toBeGreaterThan(0.45);
    }
  });

  it('modelo de QBs contém os nomes esperados e componentes válidos', () => {
    const qb = read<QbModelEntry[]>('models/qb-model.json');
    const brady = qb.find((q) => q.name === 'Tom Brady')!;
    expect(brady.sbWins).toBe(7);
    expect(brady.passYds).toBeGreaterThan(85000);
    for (const q of qb) expect(q.att).toBeGreaterThanOrEqual(1500);
  });

  it('cada temporada da cobertura tem arquivos de jogos e estatísticas', () => {
    for (let s = manifest.coverage.firstSeason; s <= manifest.coverage.lastSeason; s++) {
      expect(fs.existsSync(path.join(DATA, `games/${s}.json`)), String(s)).toBe(true);
      expect(fs.existsSync(path.join(DATA, `stats/players-${s}.json`)), String(s)).toBe(true);
    }
  });
  it('perfis de franquia batem com fatos conhecidos', () => {
    for (const t of read<Team[]>('teams.json').filter((x) => x.active)) {
      expect(fs.existsSync(path.join(DATA, `teams/${t.abbr}.json`)), t.abbr).toBe(true);
    }
    const buf = read<TeamProfile>('teams/BUF.json');
    expect(buf.draft.hof.map((p) => p.name)).toEqual(expect.arrayContaining(['Jim Kelly', 'Bruce Smith', 'Andre Reed', 'Thurman Thomas']));
    expect(buf.coaches.find((c) => c.name === 'Rex Ryan')).toMatchObject({ from: 2015, to: 2016 });
    const lv = read<TeamProfile>('teams/LV.json');
    expect(lv.identities.map((i) => i.abbr)).toEqual(expect.arrayContaining(['OAK', 'LV']));
    expect(new Set(lv.stadiums.map((st) => st.name)).size).toBe(lv.stadiums.length);
  });
  it('estatísticas por jogo, árbitros e linhas de aposta publicadas', () => {
    const allen = read<Record<string, unknown>>(`players/gamelogs/${String(careerBucket('00-0034857')).padStart(2, '0')}.json`);
    expect(allen['00-0034857']).toBeTruthy();
    expect(fs.existsSync(path.join(DATA, 'boxscores/2025/1.json'))).toBe(true);
    const refs = read<RefereeSummary[]>('referees.json');
    expect(refs.length).toBeGreaterThan(20);
    const games = read<Game[]>('games/2024.json');
    expect(games.filter((g) => g.spread !== null).length).toBeGreaterThan(250);
    // Linha conhecida: Vikings favoritos por 16,5 contra os Bills na semana 3 de 2018.
    expect(read<Game[]>('games/2018.json').find((g) => g.id === '2018_03_BUF_MIN')!.spread).toBe(16.5);
    const draft = read<DraftPick[]>('draft.json').filter((d) => d.season <= 2010);
    expect(draft.filter((d) => d.carAv !== null).length / draft.length).toBeGreaterThan(0.6);
  });
});
