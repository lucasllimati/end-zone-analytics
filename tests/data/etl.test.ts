// @vitest-environment node
/** Testes da camada de transformação, analytics e qualidade do pipeline (com CSVs de fixture). */
import { parseCsv, toGames, toPlayerLines, toTeams, qbStarts, num } from '../../server/etl/transform';
import { buildSuperBowls, buildTeamSeasons, buildTrends, buildSimilarity } from '../../server/etl/analytics';
import { runQuality } from '../../server/etl/quality';
import { line } from '../fixtures';

const GAMES_CSV = `game_id,season,game_type,week,gameday,weekday,gametime,away_team,away_score,home_team,home_score,location,overtime,div_game,roof,surface,temp,wind,away_qb_id,home_qb_id,away_qb_name,home_qb_name,away_coach,home_coach,referee,stadium_id,stadium,espn
2024_22_KC_PHI,2024,SB,22,2025-02-09,Sunday,18:30,KC,22,PHI,40,Neutral,0,0,dome,sportturf,,,QB1,QB2,Patrick Mahomes,Jalen Hurts,Andy Reid,Nick Sirianni,Ron Torbert,NOR00,Caesars Superdome,401671889
2025_01_DAL_PHI,2025,REG,1,2025-09-04,Thursday,20:20,DAL,20,PHI,24,Home,0,1,outdoors,grass ,,,QB3,QB2,Dak Prescott,Jalen Hurts,Brian Schottenheimer,Nick Sirianni,,PHI00,Lincoln Financial Field,
2026_05_DAL_PHI,2026,REG,5,2026-10-11,Sunday,13:00,DAL,NA,PHI,NA,Home,0,1,outdoors,grass,,,,,,,,,,PHI00,Lincoln Financial Field,`;

describe('transform', () => {
  const games = toGames(parseCsv(GAMES_CSV), 1999);
  it('converte tipos e trata ausência como null (não zero)', () => {
    expect(games).toHaveLength(3);
    expect(games[0]).toMatchObject({ type: 'SB', neutral: true, homeScore: 40, awayScore: 22, espn: '401671889', homeCoach: 'Nick Sirianni' });
    expect(games[1].surface).toBe('grass');
    expect(games[2].homeScore).toBeNull();
    expect(games[1].temp).toBeNull();
    expect(num('NA')).toBeNull();
    expect(num('')).toBeNull();
  });
  it('extrai QBs titulares somente de jogos disputados', () => {
    const s = qbStarts(parseCsv(GAMES_CSV), 1999);
    expect(s).toHaveLength(4);
    expect(s.find((x) => x.qb === 'QB2' && x.type === 'SB')?.res).toBe('W');
  });
  it('descarta linhas de estatística sem jogador identificado', () => {
    const csv = `player_id,player_name,player_display_name,position,position_group,season,recent_team,games,completions,attempts,passing_yards,def_tackles_solo,def_tackle_assists
00-1,P.Test,Pedro Teste,QB,QB,2025,KC,17,300,450,3500,0,0
,,,,,2025,KC,272,10,20,100,0,0
0,,,,,2025,KC,272,10,20,100,0,0
00-2,D.Def,Davi Defensor,LB,LB,2025,KC,10,0,0,0,40,30`;
    const l = toPlayerLines(parseCsv(csv), 'REG');
    expect(l.map((x) => x.id)).toEqual(['00-1', '00-2']);
    expect(l[1].tackles).toBe(70);
    expect(l[0].passEpa).toBeNull();
  });
  it('gera a URL do logo para tema escuro e mapeia a franquia', () => {
    const csv = `team_abbr,team_name,team_nick,team_conf,team_division,team_color,team_color2,team_logo_espn,team_wordmark
OAK,Oakland Raiders,Raiders,AFC,AFC West,#000000,#a5acaf,https://a.espncdn.com/i/teamlogos/nfl/500/oak.png,`;
    const [t] = toTeams(parseCsv(csv));
    expect(t.logoDark).toBe('https://a.espncdn.com/i/teamlogos/nfl/500-dark/oak.png');
    expect(t.franchise).toBe('LV');
    expect(t.active).toBe(false);
    expect(t.wordmark).toBeNull();
  });
});

describe('analytics', () => {
  const games = toGames(parseCsv(GAMES_CSV), 1999);
  it('cruza a curadoria de Super Bowls com o nflverse e aponta divergências', () => {
    const ok = buildSuperBowls([{ n: 59, season: 2024, date: '2025-02-09', stadium: 'Caesars Superdome', city: 'New Orleans, LA', w: 'PHI', wn: 'Philadelphia Eagles', l: 'KC', ln: 'Kansas City Chiefs', ws: 40, ls: 22, ot: false, mvp: 'Jalen Hurts' }], games, 'curadoria');
    expect(ok.issues).toEqual([]);
    expect(ok.list[0]).toMatchObject({ roman: 'LIX', winnerQb: 'Jalen Hurts', winnerCoach: 'Nick Sirianni', gameId: '2024_22_KC_PHI' });
    const bad = buildSuperBowls([{ n: 59, season: 2024, date: '', stadium: '', city: '', w: 'KC', wn: '', l: 'PHI', ln: '', ws: 31, ls: 24, ot: false, mvp: '' }], games, 'curadoria');
    expect(bad.issues[0]).toContain('≠ nflverse');
  });
  it('resume temporadas de times com playoffs e título', () => {
    const ts = buildTeamSeasons(games, []);
    const phi24 = ts.find((t) => t.team === 'PHI' && t.season === 2024)!;
    expect(phi24).toMatchObject({ sbWin: true, madePlayoffs: true, playoffW: 1, w: 0 });
    expect(ts.find((t) => t.team === 'PHI' && t.season === 2026)).toMatchObject({ w: 0, l: 0 });
  });
  it('tendências da liga por temporada', () => {
    const tr = buildTrends(games, []);
    expect(tr.find((t) => t.season === 2025)).toMatchObject({ games: 1, ppg: 22, homeWinPct: 1, passYdsPg: null });
  });
  it('similaridade encontra o perfil mais parecido', () => {
    const careers = new Map(
      [line({ id: 'a', passYds: 4000, passTd: 30, att: 600, cmp: 400 }), line({ id: 'b', passYds: 4100, passTd: 31, att: 610, cmp: 405 }), line({ id: 'c', passYds: 2000, passTd: 10, att: 400, cmp: 220, int: 15 })].map((l) => [l.id, l]),
    );
    expect(buildSimilarity(careers).get('a')?.[0].id).toBe('b');
  });
});

describe('qualidade', () => {
  it('detecta duplicidades, placares inconsistentes e times inexistentes', () => {
    const games = toGames(parseCsv(GAMES_CSV), 1999);
    const broken = [...games, { ...games[1] }, { ...games[1], id: 'x', homeScore: 3, awayScore: null }, { ...games[1], id: 'y', home: 'ZZZ' }];
    const checks = runQuality({ teams: [], games: broken, lines: [], draft: [], superBowls: [], sbIssues: [], teamSeasons: [], curatedRecords: [], currentSeason: 2026 });
    const st = Object.fromEntries(checks.map((c) => [c.id, c.status]));
    expect(st['games-unique']).toBe('fail');
    expect(st['games-scores']).toBe('fail');
    expect(st['games-teams']).toBe('fail');
    expect(st['teams-32']).toBe('fail');
  });
  it('alvos inconsistentes na fonte viram "Não disponível" (nunca um número errado)', () => {
    const csv = `player_id,player_name,player_display_name,position,position_group,season,recent_team,games,receptions,targets,receiving_yards
00-9,T.Edwards,Troy Edwards,WR,WR,2003,JAX,12,35,1,487
00-8,O.Ok,Outro Ok,WR,WR,2003,JAX,12,30,50,400`;
    const [bad, ok] = toPlayerLines(parseCsv(csv), 'REG');
    expect(bad.tgt).toBeNull();
    expect(ok.tgt).toBe(50);
    const checks = runQuality({ teams: [], games: [], lines: [{ ...line({ id: 'w', rec: 35 }), tgt: null }], draft: [], superBowls: [], sbIssues: [], teamSeasons: [], curatedRecords: [], currentSeason: 2026 });
    expect(checks.find((c) => c.id === 'players-impossible')?.status).toBe('pass');
    expect(checks.find((c) => c.id === 'players-targets')).toMatchObject({ status: 'pass', detail: expect.stringContaining('Não disponível') });
  });
  it('divergência de recorde documentada na curadoria não gera alerta', () => {
    const rec = { id: 'season-pass-yds', category: 'season', label: 'Jardas de passe (temporada)', holder: 'Peyton Manning', value: 5477, unit: 'jardas', detail: '', source: '', asOf: '', season: 2013, verify: 'passYds' } as const;
    const lines = [line({ id: 'pm', name: 'Peyton Manning', season: 2013, passYds: 5477 }), line({ id: 'db', name: 'Drew Brees', season: 2011, passYds: 5535 })];
    const base = { teams: [], games: [], lines, draft: [], superBowls: [], sbIssues: [], teamSeasons: [], currentSeason: 2026 };
    expect(runQuality({ ...base, curatedRecords: [rec] }).find((c) => c.id === 'records-divergence')?.status).toBe('warn');
    const known = { ...rec, knownDivergences: [{ player: 'Drew Brees', season: 2011, source: 5535, official: 5476, note: 'play-by-play' }] };
    const c = runQuality({ ...base, curatedRecords: [known] }).find((x) => x.id === 'records-divergence')!;
    expect(c.status).toBe('pass');
    expect(c.detail).toContain('Drew Brees 2011');
  });
  it('detecta estatísticas impossíveis', () => {
    const checks = runQuality({ teams: [], games: [], lines: [line({ id: 'z', cmp: 50, att: 40 })], draft: [], superBowls: [], sbIssues: [], teamSeasons: [], curatedRecords: [], currentSeason: 2026 });
    expect(checks.find((c) => c.id === 'players-impossible')?.status).toBe('warn');
  });
});

describe('erros de fonte', () => {
  it('explica o limite da API do GitHub com horário de liberação e ação', async () => {
    const { rateLimitMessage } = await import('../../server/etl/fetcher');
    const { recommendedAction } = await import('../../server/services/ops');
    const reset = Math.floor(Date.UTC(2026, 9, 10, 3, 15) / 1000);
    const e = rateLimitMessage(403, new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) }), 'https://api.github.com/x');
    expect(e.message).toContain('Limite de consultas da API do GitHub');
    expect(e.resetAt).toBe('2026-10-10T03:15:00.000Z');
    expect(recommendedAction(e.message)).toContain('GITHUB_TOKEN');
    const other = rateLimitMessage(500, new Headers(), 'https://api.github.com/x');
    expect(other.message).toBe('HTTP 500 em https://api.github.com/x');
  });
});
