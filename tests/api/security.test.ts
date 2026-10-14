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
    fetchSpy.mockRestore();
    delete (globalThis as { caches?: unknown }).caches;
  });
});
