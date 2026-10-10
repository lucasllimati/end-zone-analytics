import { computeStandings, fmtRecord, streakOf, winPct } from '../../src/lib/standings';
import { SEASON_GAMES, game } from '../fixtures';

describe('winPct', () => {
  it('conta empate como meia vitória', () => {
    expect(winPct(1, 0, 1)).toBe(0.75);
    expect(winPct(0, 0, 0)).toBe(0);
  });
});

describe('computeStandings', () => {
  const rows = computeStandings(SEASON_GAMES, 2025);
  const by = Object.fromEntries(rows.map((r) => [r.team, r]));

  it('inclui todos os times com jogos agendados', () => {
    expect(rows.map((r) => r.team).sort()).toEqual(['DEN', 'KC', 'LAC', 'LV']);
  });

  it('calcula W-L-T, pontos e saldo', () => {
    expect(fmtRecord(by.KC)).toBe('1-1');
    expect(by.KC.pf).toBe(44);
    expect(by.KC.pa).toBe(34);
    expect(by.KC.diff).toBe(10);
    expect(fmtRecord(by.DEN)).toBe('1-0-1');
    expect(by.DEN.pct).toBe(0.75);
  });

  it('separa casa/fora e divisão', () => {
    expect(by.KC.home).toEqual([1, 0, 0]);
    expect(by.KC.away).toEqual([0, 1, 0]);
    expect(by.KC.div).toEqual([1, 1, 0]);
    expect(by.LAC.division).toBe('AFC West');
  });

  it('ignora jogos não disputados e ordena por PCT e saldo', () => {
    expect(by.KC.gamesPlayed).toBe(2);
    expect(rows[0].team).toBe('LAC'); // 1-0-1 com saldo +28 vence 1-0-1 do DEN (+7)
    expect(rows.at(-1)?.team).toBe('LV');
  });

  it('usa as divisões pré-2002 para 1999–2001', () => {
    const r = computeStandings([game({ season: 2000, away: 'SEA', home: 'KC', awayScore: 3, homeScore: 7 })], 2000);
    expect(r.find((x) => x.team === 'SEA')?.division).toBe('AFC West');
    expect(r.find((x) => x.team === 'SEA')?.conf).toBe('AFC');
  });

  it('agrupa abreviações históricas na franquia atual', () => {
    const r = computeStandings([game({ season: 2015, away: 'STL', home: 'SD', awayScore: 3, homeScore: 7 })], 2015);
    expect(r.map((x) => x.team).sort()).toEqual(['LA', 'LAC']);
  });
});

describe('streakOf', () => {
  it('conta a sequência atual', () => {
    expect(streakOf(['W', 'L', 'W', 'W'])).toBe('W2');
    expect(streakOf([])).toBe('—');
  });
});
