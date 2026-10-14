import { atsResult, fairProbs, favoriteOf, ouResult, spreadLabel, upsetSize } from '../../src/lib/betting';
import { efficiencyTable } from '../../src/lib/efficiency';
import { buildUpsets, fillAllowed } from '../../server/etl/insights';
import { summarizePbp } from '../../server/etl/pbp';
import type { StandingRow, TeamGameLine, TeamSeasonLine } from '../../src/lib/types';
import { game } from '../fixtures';

describe('linhas de aposta', () => {
  // spread = margem esperada do mandante: +3 → KC (mandante) favorito por 3.
  const g = game({ away: 'LV', home: 'KC', awayScore: 17, homeScore: 21, spread: 3, total: 44.5, homeMl: -160, awayMl: 140 });

  it('identifica o favorito e formata a linha', () => {
    expect(favoriteOf(g)).toBe('KC');
    expect(spreadLabel(g)).toBe('KC −3');
    expect(favoriteOf({ ...g, spread: -2.5 })).toBe('LV');
    expect(favoriteOf({ ...g, spread: 0 })).toBeNull();
  });

  it('calcula o resultado contra a linha e o total', () => {
    expect(atsResult(g, 'KC')).toBe('cover'); // venceu por 4 > 3
    expect(atsResult(g, 'LV')).toBe('miss');
    expect(atsResult({ ...g, homeScore: 20 }, 'KC')).toBe('push'); // venceu por exatamente 3
    expect(ouResult(g)).toBe('under'); // 38 < 44,5
    expect(atsResult({ ...g, homeScore: null, awayScore: null }, 'KC')).toBeNull();
  });

  it('remove a margem da casa das probabilidades da moneyline', () => {
    const p = fairProbs(g)!;
    expect(p.home + p.away).toBeCloseTo(1, 6);
    expect(p.home).toBeGreaterThan(0.55);
  });

  it('detecta zebras pelo tamanho da linha', () => {
    expect(upsetSize(g)).toBeNull();
    const upset = { ...g, homeScore: 10, awayScore: 24 };
    expect(upsetSize(upset)).toBe(3);
    const list = buildUpsets([upset, g, { ...upset, id: 'x', spread: 9.5 }]);
    expect(list.map((u) => u.value)).toEqual([9.5, 3]);
    expect(list[0].team).toBe('LV');
  });
});

const tline = (team: string, p: Partial<TeamSeasonLine>): TeamSeasonLine =>
  ({
    team, season: 2025, st: 'REG', games: 2, cmp: 0, att: 60, passYds: 500, passTd: 0, int: 1, sacked: 4, passEpa: 10, carries: 50,
    rushYds: 200, rushTd: 0, rushEpa: 0, sacks: 3, defInt: 1, ff: 0, fumLost: 1, penalties: 0, penaltyYds: 0, fgm: 4, fga: 5, xpm: 4,
    xpa: 4, punts: 6, puntYds: 270, stTd: 0, passFd: 20, rushFd: 10, pass20: 4, pass40: 1, rush20: 1, rush40: 0, tfl: 2, qbHits: 5,
    pd: 4, fgMade: [0, 1, 2, 1, 0, 0], fgMiss: [0, 0, 0, 1, 0, 0], fgLong: 45, gwfgm: 0, gwfga: 0, ptIn20: 2, ptTb: 0, ptNet: 240,
    prYds: 20, krYds: 60, passYdsAllowed: null, rushYdsAllowed: null, passEpaAllowed: null, rushEpaAllowed: null, ...p,
  }) as TeamSeasonLine;

describe('eficiência dos times', () => {
  it('soma o que cada defesa cedeu a partir do ataque dos adversários', () => {
    const lines = [tline('KC', {}), tline('LV', {})];
    const g = (team: string, opp: string, passYds: number, passEpa: number): TeamGameLine => ({ team, opp, season: 2025, week: 1, st: 'REG', game: 'g', passYds, rushYds: 100, passEpa, rushEpa: -1 });
    fillAllowed(lines, [g('LV', 'KC', 180, 2.5), g('LV', 'KC', 220, -1), g('KC', 'LV', 300, 6)]);
    expect(lines[0]).toMatchObject({ passYdsAllowed: 400, rushYdsAllowed: 200, passEpaAllowed: 1.5, rushEpaAllowed: -2 });
    expect(lines[1]).toMatchObject({ passYdsAllowed: 300, passEpaAllowed: 6 });
  });

  it('ranqueia considerando quando menor é melhor', () => {
    const st = (team: string, pf: number, pa: number) => ({ team, pf, pa, gamesPlayed: 2 }) as StandingRow;
    const rows = efficiencyTable([tline('KC', { int: 0, fumLost: 0 }), tline('LV', { int: 3 })], [st('KC', 50, 20), st('LV', 30, 40)]);
    const kc = rows.find((r) => r.team === 'KC')!;
    expect(kc.ranks.ppg).toBe(1);
    expect(kc.ranks.papg).toBe(1); // sofreu menos
    expect(kc.ranks.give).toBe(1); // menos turnovers
    expect(kc.values.fg40).toBeCloseTo(0.5); // 1 de 2 de 40+
  });
});

describe('resumo do play-by-play', () => {
  const play = (p: Partial<Record<string, string>>) =>
    ({
      game_id: 'G1', season_type: 'REG', posteam: 'KC', defteam: 'LV', down: '1', play_type: 'pass', yardline_100: '50', epa: '0.5',
      success: '1', pass: '1', rush: '0', third_down_converted: '0', third_down_failed: '0', fourth_down_converted: '0',
      fourth_down_failed: '0', fixed_drive: '1', fixed_drive_result: 'Punt', two_point_attempt: '0', ...p,
    }) as never;

  it('conta 3ª e 4ª descidas, red zone e sucesso para ataque e defesa', () => {
    const rows = summarizePbp(2025, [
      play({ down: '3', third_down_converted: '1' }),
      play({ down: '3', third_down_failed: '1', success: '0', epa: '-1' }),
      play({ down: '4', play_type: 'run', pass: '0', rush: '1', fourth_down_converted: '1' }),
      play({ down: '4', play_type: 'punt', pass: '0', success: '0', epa: '0' }),
      play({ down: '1', play_type: 'no_play', epa: '3' }),
      // Drive 2 chega à red zone e termina em TD; drive 3 chega à 25 (não conta).
      play({ fixed_drive: '2', yardline_100: '15', fixed_drive_result: 'Touchdown' }),
      play({ fixed_drive: '3', yardline_100: '25' }),
      // Drive 4: TD de 60 jardas; o ponto extra sai da 15 e não pode contar como red zone.
      play({ fixed_drive: '4', yardline_100: '60', fixed_drive_result: 'Touchdown' }),
      play({ fixed_drive: '4', yardline_100: '15', play_type: 'extra_point', pass: '0', fixed_drive_result: 'Touchdown' }),
    ]);
    const kc = rows.find((r) => r.team === 'KC')!;
    const lv = rows.find((r) => r.team === 'LV')!;
    expect(kc).toMatchObject({ thirdAtt: 2, thirdConv: 1, fourthOpp: 2, fourthAtt: 1, fourthConv: 1, rzTrips: 1, rzTd: 1 });
    expect(kc.plays).toBe(6); // punt e jogada anulada não contam
    expect(kc.success).toBe(5);
    expect(lv).toMatchObject({ dThirdAtt: 2, dThirdConv: 1, dRzTrips: 1, dRzTd: 1, dPlays: 6 });
  });
});
