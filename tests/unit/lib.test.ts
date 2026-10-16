import { adviseDown, conversionLabel, fieldGoalDistance, fieldPositionText } from '../../src/lib/downs';
import { dateBR, height, pct3, roman, signed } from '../../src/lib/format';
import { currentWeek, headToHead, playoffBracket } from '../../src/lib/games';
import { pack, unpack, isPacked } from '../../src/lib/pack';
import { careerBucket, bucketFile, CAREER_BUCKETS } from '../../src/lib/buckets';
import { slugify, toCsv } from '../../src/lib/export';
import { penaltyOutcome } from '../../src/lib/penalty';
import { PENALTIES } from '../../src/content/penalties';
import { checkForUpdates } from '../../src/lib/updates';
import { DEFAULT_QB_WEIGHTS, powerRankings, rankQbs } from '../../src/lib/models';
import { computeStandings } from '../../src/lib/standings';
import { score } from '../../src/components/SearchPalette';
import { draftFranchise } from '../../src/lib/teams';
import type { Manifest, QbModelEntry } from '../../src/lib/types';
import { SEASON_GAMES, game } from '../fixtures';

describe('format', () => {
  it('formata PCT no estilo NFL', () => {
    expect(pct3(0.75)).toBe('.750');
    expect(pct3(1)).toBe('1.000');
    expect(pct3(null)).toBe('Não disponível');
  });
  it('numera Super Bowls em romanos (50 em arábicos)', () => {
    expect(roman(1)).toBe('I');
    expect(roman(49)).toBe('XLIX');
    expect(roman(50)).toBe('50');
    expect(roman(58)).toBe('LVIII');
    expect(roman(60)).toBe('LX');
  });
  it('usa sinal de menos tipográfico e mantém ausência como "Não disponível"', () => {
    expect(signed(3)).toBe('+3');
    expect(signed(-3)).toBe('−3');
    expect(signed(undefined)).toBe('Não disponível');
  });
  it('converte altura', () => {
    expect(height(74)).toContain(`6'2"`);
  });
  it('formata datas em pt-BR', () => {
    expect(dateBR('2026-02-08')).toMatch(/08.*fev.*2026/);
  });
});

describe('downs', () => {
  it('distância de field goal = jardas até o gol + 17', () => {
    expect(fieldGoalDistance(30)).toBe(47);
  });
  it('4th & 1 no campo adversário recomenda tentar', () => {
    const a = adviseDown({ down: 4, distance: 1, yardsToGoal: 38 });
    expect(a.options.find((o) => o.id === 'go')?.recommended).toBe(true);
    expect(a.headline).toBe('4th & 1');
  });
  it('4th & 10 no próprio campo recomenda punt', () => {
    const a = adviseDown({ down: 4, distance: 10, yardsToGoal: 75 });
    expect(a.options.find((o) => o.id === 'punt')?.recommended).toBe(true);
    expect(a.options.find((o) => o.id === 'go')?.recommended).toBe(false);
  });
  it('identifica goal-to-go', () => {
    expect(adviseDown({ down: 1, distance: 10, yardsToGoal: 6 }).headline).toBe('1st & Goal');
  });
  it('explica 3rd & 7 em linguagem simples', () => {
    expect(adviseDown({ down: 3, distance: 7, yardsToGoal: 70 }).plain).toContain('7 jardas');
  });
  it('textos auxiliares', () => {
    expect(conversionLabel(1)).toContain('65');
    expect(fieldPositionText(75)).toBe('próprio campo, linha de 25');
  });
});

describe('games', () => {
  const all = [
    ...SEASON_GAMES,
    game({ season: 2024, type: 'WC', week: 19, date: '2025-01-11', away: 'LAC', home: 'KC', awayScore: 10, homeScore: 30 }),
  ];
  it('headToHead soma vitórias, pontos e playoffs', () => {
    const h = headToHead(all, 'KC', 'LAC');
    expect(h.games).toHaveLength(1);
    expect(h.aWins).toBe(1);
    expect(h.playoffGames).toHaveLength(1);
    expect(h.biggestA?.homeScore).toBe(30);
  });
  it('playoffBracket monta as 4 rodadas a partir dos jogos reais', () => {
    const b = playoffBracket(all, 2024);
    expect(b.map((r) => r.type)).toEqual(['WC', 'DIV', 'CON', 'SB']);
    expect(b[0].games).toHaveLength(1);
  });
  it('currentWeek = primeira semana com jogo pendente', () => {
    expect(currentWeek(SEASON_GAMES, 2025)).toBe(3);
    expect(currentWeek(SEASON_GAMES, 1990)).toBeNull();
  });
});

describe('pack / buckets / export', () => {
  it('pack e unpack são inversos', () => {
    const rows = [{ a: 1, b: 'x' }, { a: 2, b: null }];
    const p = pack(rows, ['a', 'b']);
    expect(isPacked(p)).toBe(true);
    expect(unpack(p)).toEqual(rows);
  });
  it('bucket é estável e dentro do intervalo', () => {
    const b = careerBucket('00-0033873');
    expect(b).toBe(careerBucket('00-0033873'));
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(CAREER_BUCKETS);
    expect(bucketFile('00-0033873')).toMatch(/^players\/careers\/\d{2}\.json$/);
  });
  it('CSV escapa aspas, vírgulas e quebras de linha', () => {
    expect(toCsv([{ a: 'x,y', b: 'diz "oi"' }])).toBe('a,b\n"x,y","diz ""oi"""');
    expect(toCsv([])).toBe('');
  });
  it('slugify remove acentos', () => {
    expect(slugify('Jardas de passe — São Paulo')).toBe('jardas-de-passe-sao-paulo');
  });
});

describe('penaltyOutcome', () => {
  const p = (id: string) => PENALTIES.find((x) => x.id === id)!;
  it('falta do ataque recua e repete o down', () => {
    expect(penaltyOutcome(p('false-start'))).toMatchObject({ beforeYtg: 60, afterYtg: 65 });
  });
  it('falta da defesa com first down automático', () => {
    const o = penaltyOutcome(p('roughing-passer'));
    expect(o.afterYtg).toBe(45);
    expect(o.result).toContain('first down automático');
  });
  it('interferência defensiva coloca a bola no local', () => {
    expect(penaltyOutcome(p('dpi')).afterYtg).toBe(30);
  });
});

describe('checkForUpdates', () => {
  const manifest = {
    coverage: { firstSeason: 2025, currentSeason: 2026 },
    datasets: {
      games: { remoteVersion: '2026-10-01T00:00:00Z', assets: { 'games.csv': '2026-10-01T00:00:00Z' } },
      playerStats: {
        remoteVersion: '2026-10-01T00:00:00Z',
        assets: { 'stats_player_reg_2025.csv': 'A', 'stats_player_post_2025.csv': 'A', 'stats_player_reg_2026.csv': 'A' },
      },
    },
  } as unknown as Manifest;
  it('detecta arquivos novos e informa as temporadas afetadas (base da carga parcial)', async () => {
    const fetchJson = async (url: string) => {
      if (url.endsWith('/schedules')) return { assets: [{ name: 'games.csv', updated_at: '2026-10-01T00:00:00Z' }] };
      if (url.endsWith('/stats_player'))
        return {
          assets: [
            { name: 'stats_player_reg_2025.csv', updated_at: 'A' },
            { name: 'stats_player_post_2025.csv', updated_at: 'A' },
            { name: 'stats_player_reg_2026.csv', updated_at: 'B' },
          ],
        };
      return { assets: [] };
    };
    const r = await checkForUpdates(manifest, fetchJson);
    const ps = r.items.find((i) => i.key === 'playerStats')!;
    expect(ps.hasUpdate).toBe(true);
    expect(ps.seasons).toEqual([2026]);
    expect(r.items.find((i) => i.key === 'games')!.hasUpdate).toBe(false);
    expect(r.hasUpdates).toBe(true);
  });
  it('registra erro por fonte sem derrubar a verificação inteira', async () => {
    const r = await checkForUpdates(manifest, async () => {
      throw new Error('offline');
    });
    expect(r.items.every((i) => i.error === 'offline')).toBe(true);
    expect(r.hasUpdates).toBe(false);
  });
});

describe('models', () => {
  const qb = (p: Partial<QbModelEntry>): QbModelEntry => ({
    id: p.id!, name: p.id!, first: 2000, last: 2010, seasons: 10, games: 160, att: 5000, passYds: 40000, passTd: 250, int: 120,
    rating: 90, epaPerDb: 0.1, eraRating: 3, regW: 90, regL: 70, playoffW: 5, playoffL: 5, sbWins: 0, sbApps: 0, proBowls: 3, allPro: 0, ...p,
  });
  const entries = [qb({ id: 'campeao', sbWins: 3, sbApps: 4, playoffW: 15 }), qb({ id: 'eficiente', epaPerDb: 0.25, eraRating: 12 }), qb({ id: 'medio' })];
  it('o ranking muda conforme os pesos', () => {
    expect(rankQbs(entries, { ...DEFAULT_QB_WEIGHTS, championships: 100, playoffs: 0, production: 0, efficiency: 0, longevity: 0, era: 0, honors: 0 })[0].id).toBe('campeao');
    expect(rankQbs(entries, { ...DEFAULT_QB_WEIGHTS, championships: 0, playoffs: 0, production: 0, efficiency: 100, longevity: 0, era: 0, honors: 0 })[0].id).toBe('eficiente');
  });
  it('score fica entre 0 e 100', () => {
    for (const r of rankQbs(entries, DEFAULT_QB_WEIGHTS)) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
  it('power ranking: invictos no topo, time sem vitórias no fim, scores somam ~0', () => {
    const st = computeStandings(SEASON_GAMES, 2025);
    const p = powerRankings(SEASON_GAMES, st, [], 2025);
    expect(['LAC', 'DEN']).toContain(p[0].team);
    expect(p.at(-1)?.team).toBe('LV');
    expect(Math.abs(p.reduce((s, r) => s + r.score, 0))).toBeLessThan(0.05);
  });
});

describe('busca global', () => {
  it('prioriza prefixo e exige todos os termos', () => {
    const a = score({ title: 'Kansas City Chiefs', hay: 'kc chiefs' }, 'kansas');
    const b = score({ title: 'Glossário Kansas', hay: '' }, 'kansas');
    expect(a).toBeGreaterThan(b);
    expect(score({ title: 'Kansas City Chiefs', hay: '' }, 'kansas zzz')).toBe(0);
    expect(score({ title: 'Cobertura', hay: '' }, 'COBERTURA')).toBeGreaterThan(0);
  });
});

describe('kickoff (fuso do Leste dos EUA → local)', () => {
  it('converte considerando horário de verão americano', async () => {
    const { kickoffInstant, kickoffLocal } = await import('../../src/lib/format');
    // Outubro: EDT (UTC-4). 13:00 ET = 17:00 UTC.
    expect(kickoffInstant('2026-10-11', '13:00')?.toISOString()).toBe('2026-10-11T17:00:00.000Z');
    // Dezembro: EST (UTC-5). 20:20 ET = 01:20 UTC do dia seguinte.
    expect(kickoffInstant('2025-12-07', '20:20')?.toISOString()).toBe('2025-12-08T01:20:00.000Z');
    expect(kickoffLocal('2026-10-11', '13:00', 'America/Sao_Paulo')).toMatch(/^14:00 /);
    expect(kickoffInstant('2026-10-11', null)).toBeNull();
    expect(kickoffLocal(null, '13:00')).toBeNull();
  });
});

describe('draftFranchise', () => {
  it('mapeia códigos do Pro Football Reference para a franquia atual', () => {
    expect(draftFranchise('GNB', 2020)).toBe('GB');
    expect(draftFranchise('RAI', 1990)).toBe('LV');
    expect(draftFranchise('STL', 1985)).toBe('ARI');
    expect(draftFranchise('STL', 2000)).toBe('LA');
    expect(draftFranchise('HOU', 1990)).toBe('TEN');
    expect(draftFranchise('HOU', 2005)).toBe('HOU');
    expect(draftFranchise('BAL', 1982)).toBe('IND');
    expect(draftFranchise('BAL', 2000)).toBe('BAL');
    expect(draftFranchise('BUF', 1985)).toBe('BUF');
    expect(draftFranchise('XYZ', 1985)).toBeNull();
  });
});

describe('exportação CSV', () => {
  it('neutraliza fórmulas (CSV injection) sem estragar números negativos', () => {
    const csv = toCsv([{ a: '=HYPERLINK("http://x")', b: '+1+1', c: '@SUM(A1)', d: -5, e: '-3,5', f: 'Josh Allen' }]);
    const row = csv.split('\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(row).toContain("'+1+1");
    expect(row).toContain("'@SUM(A1)");
    expect(row).toContain(',-5,');
    expect(row).toContain('"-3,5"');
    expect(row.endsWith('Josh Allen')).toBe(true);
  });
});
