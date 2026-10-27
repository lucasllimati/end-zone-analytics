/** Funções das novidades: desempates, simulação, fantasy, lesões, prêmios e relato de erros. */
import { breakTie, homeWinProb, normCdf, seedPlayoffs, simulate, Table, wildcardsFor, type Result, type TeamInfo } from '../../src/lib/playoffs';
import { buildFantasy } from '../../server/etl/fantasy';
import { toInjuries } from '../../server/etl/transform';
import { missingKnown, parseAwardTable } from '../../server/etl/awards';
import { parseClientReport } from '../../server/services/clientReport';
import { norm, score } from '../../src/lib/search';
import type { PlayerGameLine } from '../../src/lib/types';

/** Divisão fictícia de 4 times (A–D) + mais 4 (E–H) na mesma conferência. */
const info = new Map<string, TeamInfo>(
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((t, i) => [t, { team: t, conf: 'AFC', division: i < 4 ? 'AFC East' : 'AFC West' }]),
);
const r = (home: string, away: string, res: 'H' | 'A' | 'T'): Result => ({ home, away, r: res });

describe('desempates oficiais', () => {
  it('na divisão, o confronto direto decide entre dois times empatados', () => {
    const tb = new Table([r('A', 'B', 'A'), r('A', 'C', 'H'), r('D', 'B', 'H')], info);
    // A e B: 1-1 cada; B venceu A.
    expect(tb.pct('A')).toBe(tb.pct('B'));
    expect(breakTie(['A', 'B'], 'division', tb)).toEqual(['B', 'A']);
  });

  it('wild card: confronto direto só vale com varrida; sem ela, passa para a conferência', () => {
    const tb = new Table([r('A', 'E', 'H'), r('E', 'B', 'H'), r('B', 'A', 'H'), r('A', 'F', 'H'), r('B', 'F', 'H'), r('E', 'F', 'H')], info);
    // Triângulo (A>E, E>B, B>A): ninguém varreu → step pulado, todos 2-1 → decide pelos critérios seguintes.
    const order = breakTie(['A', 'B', 'E'], 'wildcard', tb);
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(new Set(['A', 'B', 'E']));
  });

  it('classifica campeões de divisão primeiro e completa com wild cards', () => {
    const games = [r('A', 'B', 'H'), r('A', 'C', 'H'), r('E', 'F', 'H'), r('E', 'G', 'H'), r('B', 'C', 'H'), r('F', 'G', 'H')];
    const { seeds, divisions } = seedPlayoffs(new Table(games, info), info, 2);
    expect(divisions['AFC East'][0]).toBe('A');
    expect(divisions['AFC West'][0]).toBe('E');
    expect(seeds.AFC.slice(0, 2).sort()).toEqual(['A', 'E']);
    expect(seeds.AFC).toHaveLength(4);
  });

  it('número de wild cards por era', () => {
    expect(wildcardsFor(2019)).toBe(2);
    expect(wildcardsFor(2020)).toBe(3);
  });
});

describe('simulação', () => {
  it('chance pela linha de aposta e normal acumulada', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 5);
    expect(homeWinProb(7, 0, 0)).toBeGreaterThan(0.65);
    expect(homeWinProb(-7, 0, 0)).toBeLessThan(0.35);
    expect(homeWinProb(null, 10, -10)).toBeGreaterThan(0.8);
  });

  it('jogo escolhido pelo usuário é respeitado e o resultado é reproduzível', () => {
    const pending = [{ id: 'g1', week: 1, home: 'A', away: 'B', pHome: 0.5 }];
    const forcedA = simulate([], pending, { g1: 'H' }, info, new Map(), 50, 2);
    expect(forcedA.find((o) => o.team === 'A')!.division).toBe(1);
    expect(simulate([], pending, {}, info, new Map(), 200, 2, 7)).toEqual(simulate([], pending, {}, info, new Map(), 200, 2, 7));
  });
});

const line = (id: string, pos: string, week: number, pts: number, opp = 'KC'): PlayerGameLine =>
  ({ id, name: id, pos, season: 2026, week, st: 'REG', game: `g${week}${id}`, team: 'BUF', opp, fptsPpr: pts }) as PlayerGameLine;

describe('fantasy', () => {
  it('total, média, consistência e semanas no top 12', () => {
    const f = buildFantasy(2026, [line('p1', 'WR', 1, 20), line('p1', 'WR', 2, 10), line('p2', 'RB', 1, 15), line('p3', 'FB', 2, 4)])!;
    const p1 = f.players.find((p) => p.id === 'p1')!;
    expect(p1).toMatchObject({ total: 30, avg: 15, sd: 5, floor: 10, ceil: 20, top12: 2, games: 2 });
    expect(p1.weeks).toEqual([20, 10]);
    expect(f.players.find((p) => p.id === 'p3')!.pos).toBe('RB');
    expect(f.defense.find((d) => d.team === 'KC' && d.pos === 'WR')!.avg).toBeGreaterThan(0);
  });
});

describe('relatório de lesões', () => {
  it('fica só a semana mais recente de cada time e só quem tem status ou treino limitado', () => {
    const rows = [
      { team: 'BUF', week: '6', gsis_id: '1', full_name: 'Velho', position: 'WR', report_status: 'Out' },
      { team: 'BUF', week: '7', gsis_id: '2', full_name: 'Fora', position: 'WR', report_status: 'Out', report_primary_injury: 'Knee' },
      { team: 'BUF', week: '7', gsis_id: '3', full_name: 'Ok', position: 'TE', practice_status: 'Full Participation in Practice' },
      { team: 'BUF', week: '7', gsis_id: '4', full_name: 'Limitado', position: 'LB', practice_status: 'Limited Participation in Practice' },
    ];
    const out = toInjuries(rows as never);
    expect(out.map((i) => i.name)).toEqual(['Fora', 'Limitado']);
    expect(out[0]).toMatchObject({ week: 7, status: 'Out', injury: 'Knee' });
  });
});

describe('prêmios (Wikipedia)', () => {
  const wikitext = `{| class="wikitable"
|+ List of AP NFL Most Valuable Player winners
!Season !! Player !! Team
|-
| [[2003 NFL season|2003]]
!scope="row"|{{sortname|Peyton|Manning}}<br />{{sortname|Steve|McNair}}
|[[Indianapolis Colts]]<br />[[Tennessee Titans]]
|-
| {{center|[[2010 NFL season|2010]]}} || [[Tom Brady]] (2) || [[2010 New England Patriots season|New England]]
|-
! scope="row" | {{NFL year|2019}}
| {{sortname|Lamar|Jackson}}<ref>x</ref>
| [[2019 Baltimore Ravens season|Baltimore Ravens]]
|-
| [[2024 NFL season|2024]]
! scope="row"|{{sortname|Josh|Allen|Josh Allen}}
|[[Buffalo Bills]]
|}`;

  it('lê os três formatos de tabela e os co-vencedores', () => {
    const rows = parseAwardTable(wikitext);
    expect(rows).toEqual([
      { season: 2003, name: 'Peyton Manning', team: 'Indianapolis Colts' },
      { season: 2003, name: 'Steve McNair', team: 'Tennessee Titans' },
      { season: 2010, name: 'Tom Brady', team: 'New England Patriots' },
      { season: 2019, name: 'Lamar Jackson', team: 'Baltimore Ravens' },
      { season: 2024, name: 'Josh Allen', team: 'Buffalo Bills' },
    ]);
    expect(missingKnown('mvp', rows)).toEqual([]);
  });

  it('extração errada é detectada pelos fatos conhecidos', () => {
    expect(missingKnown('mvp', [{ season: 2019, name: 'Kyler Murray' }])).toContain('2019 Lamar Jackson');
  });
});

describe('relato de erro do navegador', () => {
  it('aceita só o formato esperado, corta tamanhos e remove a query string', () => {
    expect(parseClientReport({ message: 'x', path: '/a?token=1', source: 'window', stack: 'y' })).toEqual({ message: 'x', stack: 'y', path: '/a', source: 'window' });
    expect(parseClientReport({ message: 'x', path: 'http://evil', source: 'window' })).toBeNull();
    expect(parseClientReport({ message: 'x', path: '/a', source: 'outro' })).toBeNull();
    expect(parseClientReport({ message: '', path: '/a', source: 'react' })).toBeNull();
    expect(parseClientReport({ message: 'a\u0000b\nc'.repeat(200), path: '/a', source: 'react' })!.message.length).toBeLessThanOrEqual(300);
    expect(parseClientReport(null)).toBeNull();
  });
});

describe('busca', () => {
  it('ignora acentos e prioriza o início do título', () => {
    expect(norm('Árbitro')).toBe('arbitro');
    expect(score({ title: 'Josh Allen', hay: '' }, 'jos')).toBeGreaterThan(score({ title: 'Allen Josh', hay: '' }, 'jos'));
  });
});
