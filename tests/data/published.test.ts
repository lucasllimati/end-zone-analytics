// @vitest-environment node
/**
 * Testes dos dados publicados em data/ (rodam somente se o pipeline já foi executado).
 * Garantem que o que vai para o site é íntegro e factual.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isPacked, unpack } from '../../src/lib/pack';
import type { Manifest, QbModelEntry, SuperBowl, Team, LeagueTrend, QualityCheck } from '../../src/lib/types';

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
});
