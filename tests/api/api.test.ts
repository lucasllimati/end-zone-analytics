// @vitest-environment node
/** Testes de API com fastify.inject (sem abrir porta) sobre um diretório de dados de fixture. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../server/app';
import { GAME_COLS, INDEX_COLS, PLAYER_LINE_COLS, pack } from '../../src/lib/pack';
import { SEASON_GAMES, line } from '../fixtures';

let dir: string;
let app: FastifyInstance;
const runner = vi.fn(async () => ({ downloaded: ['games.csv'] }));

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eza-api-'));
  const w = (rel: string, data: unknown) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(data));
  };
  w('manifest.json', {
    schemaVersion: 1, app: 'End Zone Analytics', generatedAt: '2026-01-01T00:00:00Z', ingestionVersion: 1, lastMode: 'full',
    coverage: { firstSeason: 2025, lastSeason: 2025, currentSeason: 2025, currentWeek: 3, lastCompletedGame: '2025-09-14' },
    datasets: {}, quality: { pass: 1, warn: 0, fail: 0, checkedAt: '2026-01-01T00:00:00Z' },
  });
  w('teams.json', [
    { abbr: 'KC', name: 'Kansas City Chiefs', nick: 'Chiefs', conf: 'AFC', division: 'AFC West', color: '#E31837', color2: '#FFB81C', logo: '', logoDark: '', wordmark: null, franchise: 'KC', active: true },
    { abbr: 'OAK', name: 'Oakland Raiders', nick: 'Raiders', conf: 'AFC', division: 'AFC West', color: '#000', color2: '#A5ACAF', logo: '', logoDark: '', wordmark: null, franchise: 'LV', active: false },
  ]);
  w('games/all.json', pack(SEASON_GAMES, [...GAME_COLS]));
  w('games/2025.json', pack(SEASON_GAMES, [...GAME_COLS]));
  w('stats/players-2025.json', pack([line({ id: 'p1', name: 'Patrick Mahomes', passYds: 4000 }), line({ id: 'p2', name: 'Outro QB', passYds: 3000 })], [...PLAYER_LINE_COLS]));
  w('players/index.json', pack([{ id: 'p1', name: 'Patrick Mahomes', pos: 'QB', team: 'KC', first: 2017, last: 2025 }], [...INDEX_COLS]));
  w('superbowls.json', [{ number: 60, roman: 'LX', season: 2025, winner: 'SEA', loser: 'NE' }]);
  w('team-seasons.json', []);
  w('quality.json', { checkedAt: 'x', checks: [] });
  app = await buildApp({ dataDir: dir, logger: false, serveStatic: false, syncRunner: runner, adminToken: 'segredo' });
});

afterAll(async () => {
  await app.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('observabilidade', () => {
  it('/health e /ready', async () => {
    expect((await app.inject('/health')).json()).toMatchObject({ status: 'ok' });
    const r = await app.inject('/ready');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'ready', ingestionVersion: 1 });
    expect(r.headers['server-timing']).toMatch(/app;dur=/);
  });
  it('envia cabeçalhos de segurança', async () => {
    const r = await app.inject('/health');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
    expect(r.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('dados', () => {
  it('lista só franquias ativas', async () => {
    const teams = (await app.inject('/api/teams')).json();
    expect(teams.map((t: { abbr: string }) => t.abbr)).toEqual(['KC']);
  });
  it('perfil de time inexistente → 404', async () => {
    expect((await app.inject('/api/teams/XYZ')).statusCode).toBe(404);
  });
  it('classificação calculada', async () => {
    const r = (await app.inject('/api/standings?season=2025')).json();
    expect(r.rows).toHaveLength(4);
    expect(r.note).toContain('simplificado');
  });
  it('filtra jogos por time e valida parâmetros', async () => {
    const r = (await app.inject('/api/games?season=2025&team=kc')).json();
    expect(r).toHaveLength(3);
    expect((await app.inject('/api/games?season=abc')).statusCode).toBe(400);
  });
  it('busca jogadores ignorando acentos/maiúsculas', async () => {
    const r = (await app.inject('/api/players?q=MAHOMES')).json();
    expect(r[0].id).toBe('p1');
  });
  it('líderes por estatística e erro para estatística desconhecida', async () => {
    const r = (await app.inject('/api/stats/leaders?season=2025&stat=passYds&limit=1')).json();
    expect(r).toEqual([expect.objectContaining({ name: 'Patrick Mahomes', value: 4000 })]);
    expect((await app.inject('/api/stats/leaders?season=2025&stat=naoExiste')).statusCode).toBe(400);
  });
  it('Super Bowl por número', async () => {
    expect((await app.inject('/api/super-bowls/60')).json()).toMatchObject({ winner: 'SEA' });
    expect((await app.inject('/api/super-bowls/99')).statusCode).toBe(404);
  });
  it('OpenAPI documenta os endpoints', async () => {
    const spec = (await app.inject('/api/openapi.json')).json();
    expect(spec.openapi).toBe('3.1.0');
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/api/teams', '/api/standings', '/api/admin/sync']));
  });
  it('jogador inexistente → 404 e id malformado → 400', async () => {
    expect((await app.inject('/api/players/../../etc')).statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('admin / sincronização', () => {
  it('bloqueia acesso remoto sem token', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/admin/sync', payload: { mode: 'partial' }, remoteAddress: '203.0.113.9' });
    expect(r.statusCode).toBe(401);
  });
  it('rejeita token errado e corpo inválido', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/admin/sync', payload: { mode: 'partial' }, remoteAddress: '203.0.113.9', headers: { authorization: 'Bearer errado' } });
    expect(bad.statusCode).toBe(401);
    const inv = await app.inject({ method: 'POST', url: '/api/admin/sync', payload: { mode: 'tudo' } });
    expect(inv.statusCode).toBe(400);
  });
  it('aceita token correto, executa o job e expõe o status', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/admin/sync', payload: { mode: 'partial', datasets: ['games'], seasons: [2025] }, remoteAddress: '203.0.113.9', headers: { authorization: 'Bearer segredo' } });
    expect(r.statusCode).toBe(202);
    const { job } = r.json();
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ mode: 'partial', datasets: ['games'], seasons: [2025] }));
    await new Promise((res) => setTimeout(res, 20));
    const status = (await app.inject(`/api/admin/jobs/${job.id}`)).json();
    expect(status.status).toBe('done');
    expect(status.downloaded).toEqual(['games.csv']);
  });
});
