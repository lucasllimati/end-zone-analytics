// @vitest-environment node
/** Testes de segurança: limite de login, IP forjado, trava global e cache do Worker. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../server/app';
import { LoginThrottle } from '../../server/services/auth';

let dir: string;
const apps: FastifyInstance[] = [];
const make = async (trustProxyHops = 0) => {
  const app = await buildApp({ dataDir: dir, opsDir: path.join(dir, 'ops'), logger: false, serveStatic: false, adminToken: 'segredo', schedule: false, trustProxyHops });
  apps.push(app);
  return app;
};
const login = (app: FastifyInstance, forwardedFor?: string) =>
  app.inject({ method: 'POST', url: '/api/admin/login', payload: { token: 'errado' }, remoteAddress: '203.0.113.9', headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {} });

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eza-sec-'));
});
afterAll(async () => {
  for (const a of apps) await a.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('força bruta no login', () => {
  it('X-Forwarded-For forjado não burla o limite por IP quando a API está exposta direto', async () => {
    const app = await make(0);
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await login(app, `198.51.100.${i}`)).statusCode);
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes.slice(5)).toEqual([429, 429]);
  });

  it('atrás de um proxy confiável, o IP real vem do cabeçalho', async () => {
    const app = await make(1);
    for (let i = 0; i < 5; i++) await login(app, '198.51.100.7');
    expect((await login(app, '198.51.100.7')).statusCode).toBe(429);
    expect((await login(app, '198.51.100.8')).statusCode).toBe(401); // outro visitante não é punido
  });

  it('tokens errados via Authorization: Bearer também acionam a trava (e ela barra até o token certo)', async () => {
    const app = await make(0);
    const hit = (token: string) => app.inject({ url: '/api/admin/overview', remoteAddress: '203.0.113.50', headers: { authorization: `Bearer ${token}` } });
    expect((await hit('segredo')).statusCode).toBe(200);
    for (let i = 0; i < 20; i++) expect((await hit(`chute-${i}`)).statusCode).toBe(401);
    expect((await hit('segredo')).statusCode).toBe(401);
    // Uma requisição conta uma tentativa só, mesmo com várias checagens de autenticação.
    const app2 = await make(0);
    for (let i = 0; i < 19; i++) await app2.inject({ method: 'POST', url: '/api/admin/sync', remoteAddress: `203.0.113.${i}`, headers: { authorization: 'Bearer x' }, payload: {} });
    expect((await app2.inject({ url: '/api/admin/overview', remoteAddress: '203.0.113.99', headers: { authorization: 'Bearer segredo' } })).statusCode).toBe(200);
  });

  it('trava global bloqueia ataque distribuído e libera depois do prazo', () => {
    let now = 0;
    const t = new LoginThrottle(3, 60_000, 120_000, () => now);
    expect(t.fail()).toBe(false);
    expect(t.fail()).toBe(false);
    expect(t.fail()).toBe(true);
    expect(t.blockedFor()).toBe(120_000);
    now = 121_000;
    expect(t.blockedFor()).toBe(0);
    // Falhas antigas saem da janela.
    t.fail();
    now += 61_000;
    t.fail();
    expect(t.fail()).toBe(false);
  });
});

describe('Worker do site publicado', () => {
  it('serve o placar do cache da borda: rajadas não viram chamadas à ESPN', async () => {
    const store = new Map<string, Response>();
    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: async (r: Request) => store.get(r.url)?.clone(),
        put: async (r: Request, res: Response) => void store.set(r.url, res),
      },
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ events: [] }), { status: 200 }));
    const { default: worker } = await import('../../worker/index');
    const env = { ASSETS: { fetch: async () => new Response('') } };
    for (let i = 0; i < 5; i++) {
      const r = await worker.fetch(new Request(`https://x.dev/api/live/scoreboard?bust=${i}`), env);
      expect(r.status).toBe(200);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect((await worker.fetch(new Request('https://x.dev/api/live/game/../../x'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://x.dev/api/live/game/abc'), env)).status).toBe(400);
    expect((await worker.fetch(new Request('https://x.dev/api/live/scoreboard', { method: 'POST' }), env)).status).toBe(405);
    // Respostas da API levam cabeçalhos de segurança próprios.
    const head = await worker.fetch(new Request('https://x.dev/api/live/scoreboard'), env);
    expect(head.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(head.headers.get('x-frame-options')).toBe('DENY');
    fetchSpy.mockRestore();
    delete (globalThis as { caches?: unknown }).caches;
  });
});

describe('Worker: só jogos da base', () => {
  it('ID fora da lista não chega à ESPN; sem a lista, recusa (falha fechada)', async () => {
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const { default: worker } = await import('../../worker/index');
    const list = { ASSETS: { fetch: async () => new Response(JSON.stringify(['401547417']), { headers: { 'content-type': 'application/json' } }) } };
    expect((await worker.fetch(new Request('https://x.dev/api/live/game/123456789'), list)).status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.resetModules();
    const { default: fresh } = await import('../../worker/index');
    const broken = { ASSETS: { fetch: async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) } };
    expect((await fresh.fetch(new Request('https://x.dev/api/live/game/401547417'), broken)).status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('API do servidor', () => {
  it('não aceita propriedades herdadas como estatística nem IDs de jogo fora da base', async () => {
    const app = await make(0);
    for (const stat of ['constructor', 'toString', 'hasOwnProperty']) {
      expect((await app.inject(`/api/stats/leaders?stat=${stat}`)).statusCode, stat).not.toBe(200);
    }
    expect((await app.inject('/api/live/game/999999999')).statusCode).toBe(404);
  });
});

describe('relato de erro e notícias (Worker)', () => {
  it('/api/report só aceita POST JSON pequeno do próprio site, com limite por IP', async () => {
    vi.resetModules();
    const { default: worker } = await import('../../worker/index');
    const env = { ASSETS: { fetch: async () => new Response('') } };
    const post = (body: string, headers: Record<string, string> = {}) =>
      worker.fetch(new Request('https://x.dev/api/report', { method: 'POST', body, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.20', ...headers } }), env);
    const ok = JSON.stringify({ message: 'falhou', path: '/teams/buf', source: 'window' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post(ok)).status).toBe(204);
    expect(log.mock.calls[0][0]).toContain('client_error');
    expect((await post(ok, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post(ok, { 'content-type': 'text/plain' })).status).toBe(415);
    expect((await post('x'.repeat(5000))).status).toBe(413);
    expect((await post('{nao-json')).status).toBe(400);
    expect((await worker.fetch(new Request('https://x.dev/api/report'), env)).status).toBe(405);
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await post(ok, { 'cf-connecting-ip': '198.51.100.21' })).status);
    expect(codes.filter((c) => c === 429).length).toBe(2);
    log.mockRestore();
  });

  it('/api/news só aceita os 32 times (nada de buscas arbitrárias na ESPN)', async () => {
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const { default: worker } = await import('../../worker/index');
    const env = { ASSETS: { fetch: async () => new Response('') } };
    for (const bad of ['XYZ', 'buf', 'B%2F', '..']) expect((await worker.fetch(new Request(`https://x.dev/api/news/${bad}`), env)).status, bad).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('relato de erro e notícias (servidor)', () => {
  it('/api/report valida o corpo e registra no log operacional; /api/news recusa times inexistentes', async () => {
    const app = await make(0);
    const bad = await app.inject({ method: 'POST', url: '/api/report', payload: { message: 'x', path: 'http://evil', source: 'window' } });
    expect(bad.statusCode).toBe(400);
    const big = await app.inject({ method: 'POST', url: '/api/report', payload: { message: 'x'.repeat(6000), path: '/', source: 'window' } });
    expect(big.statusCode).toBe(413);
    const ok = await app.inject({ method: 'POST', url: '/api/report', payload: { message: 'quebrou', path: '/x?token=1', source: 'react' } });
    expect(ok.statusCode).toBe(204);
    expect((await app.inject('/api/news/XYZ')).statusCode).toBe(404);
  });
});
