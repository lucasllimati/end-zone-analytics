import { derived, passerRating, percentile, positionBucket, sumLines, zScore } from '../../src/lib/stats';
import { line } from '../fixtures';

describe('passerRating', () => {
  it('atinge o máximo de 158,3 em uma atuação perfeita', () => {
    expect(passerRating(20, 20, 400, 5, 0)).toBeCloseTo(158.33, 1);
  });
  it('reproduz um caso conhecido (Peyton Manning, 2013: 450/659, 5477 jds, 55 TD, 10 INT ≈ 115,1)', () => {
    expect(passerRating(450, 659, 5477, 55, 10)).toBeCloseTo(115.1, 1);
  });
  it('retorna null sem tentativas (nunca zero)', () => {
    expect(passerRating(0, 0, 0, 0, 0)).toBeNull();
  });
  it('limita componentes em zero', () => {
    expect(passerRating(0, 10, 0, 0, 5)).toBe(0);
  });
});

describe('percentile', () => {
  it('calcula a posição relativa com empates pela metade', () => {
    expect(percentile(5, [1, 2, 3, 4, 5])).toBe(90);
    expect(percentile(1, [1, 2, 3, 4, 5])).toBe(10);
  });
  it('inverte quando menor é melhor', () => {
    expect(percentile(1, [1, 2, 3, 4, 5], true)).toBe(90);
  });
});

describe('sumLines', () => {
  it('soma contagens, pondera CPOE por tentativas e mantém EPA nulo se ausente', () => {
    const a = line({ id: 'x', season: 2024, att: 100, cmp: 60, cpoe: 2, passEpa: 10, fgLong: 50 });
    const b = line({ id: 'x', season: 2025, att: 300, cmp: 200, cpoe: -2, passEpa: null, fgLong: 55 });
    const s = sumLines([a, b])!;
    expect(s.att).toBe(400);
    expect(s.cmp).toBe(260);
    expect(s.cpoe).toBeCloseTo(-1, 5);
    expect(s.passEpa).toBe(10);
    expect(s.fgLong).toBe(55);
    expect(s.season).toBe(2025);
  });
  it('retorna null para lista vazia', () => {
    expect(sumLines([])).toBeNull();
  });
});

describe('derived', () => {
  it('não divide por zero', () => {
    const d = derived(line({ id: 'k' }));
    expect(d.cmpPct).toBeNull();
    expect(d.ypc).toBeNull();
    expect(d.fgPct).toBeNull();
  });
  it('calcula EPA por dropback incluindo sacks', () => {
    expect(derived(line({ id: 'q', att: 90, sacked: 10, passEpa: 20 })).epaPerDb).toBeCloseTo(0.2);
  });
});

describe('positionBucket / zScore', () => {
  it('agrupa posições', () => {
    expect(positionBucket('FS')).toBe('DB');
    expect(positionBucket('OLB')).toBe('LB');
    expect(positionBucket('EDGE')).toBe('DL');
    expect(positionBucket('FB')).toBe('RB');
  });
  it('zScore é nulo sem dispersão', () => {
    expect(zScore(1, [1, 1, 1])).toBeNull();
    expect(zScore(3, [1, 2, 3])).toBeCloseTo(1);
  });
});
