/**
 * Fábrica da aplicação Fastify (API + arquivos estáticos). Exportada separadamente de index.ts
 * para permitir testes com `app.inject()` sem abrir porta.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { DATA_DIR, DIST_DIR, config } from './config';
import { DataStore } from './services/dataStore';
import { TtlCache } from './services/ttlCache';
import { gameDetail, scoreboard } from './services/espn';
import { currentJob, getJob, listJobs, startSync, type Runner } from './services/jobs';
import { fetchJson } from './etl/fetcher';
import { openapi } from './openapi';
import { SOURCES } from '../src/lib/sources';
import { checkForUpdates } from '../src/lib/updates';
import { computeStandings } from '../src/lib/standings';
import { franchiseOf } from '../src/lib/teams';
import { DEFAULT_QB_WEIGHTS, rankQbs, type QbWeights } from '../src/lib/models';
import type { PlayerSeasonLine, UpdateCheckResult } from '../src/lib/types';

export interface AppOptions {
  dataDir?: string;
  logger?: boolean;
  serveStatic?: boolean;
  syncRunner?: Runner;
  adminToken?: string;
}

const seasonQ = z.coerce.number().int().min(1920).max(2100);

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? true,
    trustProxy: true,
    bodyLimit: 32 * 1024,
  });
  const store = new DataStore(opts.dataDir ?? DATA_DIR);
  const checkCache = new TtlCache<UpdateCheckResult>();
  const adminToken = opts.adminToken ?? config.adminToken;

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://a.espncdn.com', 'https://static.www.nfl.com', 'https://github.com', 'https://raw.githubusercontent.com'],
        connectSrc: ["'self'", 'https://api.github.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await app.register(compress, { global: true, threshold: 1024 });
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });

  // Tempo de resposta em todos os endpoints (observabilidade).
  app.addHook('onSend', async (req, reply) => {
    reply.header('Server-Timing', `app;dur=${reply.elapsedTime.toFixed(1)}`);
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-cache');
  });

  const notFound = (what: string) => ({ error: 'not_found', message: `${what} não encontrado(a)` });

  /* --------------------------------- Saúde --------------------------------- */
  app.get('/health', async () => ({ status: 'ok', uptime: Math.round(process.uptime()), time: new Date().toISOString() }));
  app.get('/ready', async (_req, reply) => {
    const m = await store.manifest();
    if (!m) return reply.code(503).send({ status: 'not_ready', reason: 'Sem dados. Execute npm run data:full.' });
    return { status: 'ready', generatedAt: m.generatedAt, ingestionVersion: m.ingestionVersion, quality: m.quality, syncing: Boolean(currentJob()) };
  });

  /* ---------------------------------- Meta --------------------------------- */
  app.get('/api/openapi.json', async () => openapi);
  app.get('/api/meta', async (_req, reply) => (await store.manifest()) ?? reply.code(503).send({ error: 'no_data' }));
  app.get('/api/quality', async () => store.read('quality.json'));
  app.get('/api/changes', async () => store.read('history/changes.json'));

  /* --------------------------------- Times --------------------------------- */
  app.get('/api/teams', async () => (await store.teams()).filter((t) => t.active));
  app.get('/api/teams/:abbr', async (req, reply) => {
    const abbr = String((req.params as { abbr: string }).abbr).toUpperCase();
    const team = (await store.teams()).find((t) => t.abbr === abbr && t.active);
    if (!team) return reply.code(404).send(notFound('Time'));
    const seasons = (await store.teamSeasons()).filter((s) => s.team === abbr);
    const sb = (await store.superBowls()).filter((s) => s.winner === abbr || s.loser === abbr);
    return { team, seasons, superBowls: sb };
  });

  /* --------------------------------- Jogos --------------------------------- */
  app.get('/api/games', async (req, reply) => {
    const q = z
      .object({
        season: seasonQ.optional(),
        week: z.coerce.number().int().min(1).max(25).optional(),
        team: z.string().regex(/^[A-Za-z]{2,3}$/).optional(),
        type: z.enum(['REG', 'WC', 'DIV', 'CON', 'SB', 'POST']).optional(),
        limit: z.coerce.number().int().min(1).max(5000).default(500),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request', issues: q.error.issues });
    const { season, week, team, type, limit } = q.data;
    let games = season ? await store.seasonGames(season).catch(() => []) : await store.allGames();
    if (week) games = games.filter((g) => g.week === week);
    if (team) games = games.filter((g) => franchiseOf(g.home) === team.toUpperCase() || franchiseOf(g.away) === team.toUpperCase());
    if (type) games = games.filter((g) => (type === 'POST' ? g.type !== 'REG' : g.type === type));
    return games.slice(-limit);
  });
  app.get('/api/games/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const g = (await store.allGames()).find((x) => x.id === id);
    return g ?? reply.code(404).send(notFound('Jogo'));
  });

  app.get('/api/standings', async (req, reply) => {
    const q = z.object({ season: seasonQ.optional() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request', issues: q.error.issues });
    const m = await store.manifest();
    const season = q.data.season ?? m?.coverage.currentSeason ?? new Date().getFullYear();
    const games = await store.seasonGames(season).catch(() => null);
    if (!games) return reply.code(404).send(notFound('Temporada'));
    return { season, note: 'Ordenação: PCT → saldo → pontos (desempate simplificado).', rows: computeStandings(games, season) };
  });

  /* ------------------------------- Jogadores ------------------------------- */
  app.get('/api/players', async (req, reply) => {
    const q = z
      .object({ q: z.string().max(60).optional(), pos: z.string().max(5).optional(), limit: z.coerce.number().int().min(1).max(200).default(25) })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request', issues: q.error.issues });
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const term = q.data.q ? norm(q.data.q) : '';
    return (await store.playerIndex())
      .filter((p) => (!term || norm(p.name).includes(term)) && (!q.data.pos || p.pos === q.data.pos.toUpperCase()))
      .slice(0, q.data.limit);
  });
  app.get('/api/players/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    if (!/^[\w-]{3,20}$/.test(id)) return reply.code(400).send({ error: 'bad_request' });
    return (await store.career(id)) ?? reply.code(404).send(notFound('Jogador'));
  });

  app.get('/api/stats/leaders', async (req, reply) => {
    const q = z
      .object({
        season: seasonQ.optional(),
        stat: z.string().regex(/^[a-zA-Z]+$/).default('passYds'),
        type: z.enum(['REG', 'POST']).default('REG'),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request', issues: q.error.issues });
    const m = await store.manifest();
    const season = q.data.season ?? m?.coverage.currentSeason ?? 0;
    const lines = await store.playerStats(season).catch(() => null);
    if (!lines) return reply.code(404).send(notFound('Temporada'));
    const stat = q.data.stat as keyof PlayerSeasonLine;
    if (!(stat in (lines[0] ?? {}))) return reply.code(400).send({ error: 'bad_request', message: `Estatística desconhecida: ${stat}` });
    return lines
      .filter((l) => l.st === q.data.type)
      .sort((a, b) => ((b[stat] as number) ?? 0) - ((a[stat] as number) ?? 0))
      .slice(0, q.data.limit)
      .map((l) => ({ id: l.id, name: l.name, team: l.team, pos: l.pos, value: l[stat] }));
  });

  /* ------------------------- História, recordes, modelos ------------------------- */
  app.get('/api/super-bowls', async () => store.superBowls());
  app.get('/api/super-bowls/:n', async (req, reply) => {
    const n = Number((req.params as { n: string }).n);
    const sb = (await store.superBowls()).find((s) => s.number === n);
    return sb ?? reply.code(404).send(notFound('Super Bowl'));
  });
  app.get('/api/records', async () => ({ curated: await store.read('records-curated.json'), computed: await store.read('records-computed.json') }));
  app.get('/api/draft', async (req) => {
    const season = Number((req.query as { season?: string }).season);
    const d = await store.draft();
    return Number.isFinite(season) && season > 0 ? d.filter((x) => x.season === season) : d.slice(-300);
  });
  app.get('/api/rankings/qb', async (req) => {
    const w = { ...DEFAULT_QB_WEIGHTS };
    for (const k of Object.keys(w) as (keyof QbWeights)[]) {
      const v = Number((req.query as Record<string, string>)[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) w[k] = v;
    }
    return { model: 'EZA-QB v1 (dados 1999+)', weights: w, rows: rankQbs(await store.qbModel(), w).slice(0, 50) };
  });

  /* -------------------------------- Ao vivo -------------------------------- */
  app.get('/api/live/scoreboard', async (_req, reply) => {
    try {
      return await scoreboard();
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable', message: 'Placar ao vivo indisponível no momento.' });
    }
  });
  app.get('/api/live/game/:espnId', async (req, reply) => {
    const id = (req.params as { espnId: string }).espnId;
    if (!/^\d{6,12}$/.test(id)) return reply.code(400).send({ error: 'bad_request' });
    try {
      return await gameDetail(id);
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable', message: 'Detalhes do jogo indisponíveis no momento.' });
    }
  });

  /* --------------------------------- Admin --------------------------------- */
  const isLocal = (req: FastifyRequest) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
  const authorized = (req: FastifyRequest) => {
    if (isLocal(req) && !req.headers['x-forwarded-for']) return true;
    if (!adminToken) return false;
    const given = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(given);
    const b = Buffer.from(adminToken);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  app.get('/api/admin/check', async (req, reply) => {
    const m = await store.manifest();
    if (!m) return reply.code(503).send({ error: 'no_data' });
    const force = (req.query as { force?: string }).force === '1';
    if (force) checkCache.clear();
    try {
      return await checkCache.get(`check:${m.generatedAt}`, 10 * 60_000, () => checkForUpdates(m, fetchJson));
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable' });
    }
  });

  app.post('/api/admin/sync', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authorized(req)) return reply.code(401).send({ error: 'unauthorized', message: 'Sincronização exige acesso local ou ADMIN_TOKEN.' });
    const body = z
      .object({
        mode: z.enum(['full', 'partial']).default('partial'),
        datasets: z.array(z.enum(SOURCES.map((s) => s.key) as [string, ...string[]])).max(10).optional(),
        seasons: z.array(seasonQ).max(40).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'bad_request', issues: body.error.issues });
    const { job, alreadyRunning } = startSync(body.data, () => {
      store.invalidate();
      checkCache.clear();
    }, opts.syncRunner);
    return reply.code(alreadyRunning ? 409 : 202).send({ job, alreadyRunning });
  });
  app.get('/api/admin/jobs', async () => listJobs().map(({ log, ...j }) => ({ ...j, logLines: log.length })));
  app.get('/api/admin/jobs/:id', async (req, reply) => getJob((req.params as { id: string }).id) ?? reply.code(404).send(notFound('Job')));

  /* -------------------------------- Estáticos ------------------------------- */
  if (opts.serveStatic ?? config.isProd) {
    const dataDir = opts.dataDir ?? DATA_DIR;
    await app.register(fastifyStatic, { root: dataDir, prefix: '/data/', decorateReply: false, maxAge: 60_000, etag: true });
    if (fs.existsSync(DIST_DIR)) {
      await app.register(fastifyStatic, {
        root: DIST_DIR,
        prefix: '/',
        wildcard: false,
        maxAge: '1h',
        setHeaders: (res, file) => {
          if (file.includes(`${path.sep}assets${path.sep}`)) res.header('Cache-Control', 'public, max-age=31536000, immutable');
        },
      });
      // SPA: rotas do frontend caem no index.html.
      app.setNotFoundHandler((req, reply) => {
        if (req.raw.url?.startsWith('/api/') || req.raw.url?.startsWith('/data/')) return reply.code(404).send({ error: 'not_found' });
        return reply.type('text/html').sendFile('index.html', DIST_DIR);
      });
    }
  }

  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error(err);
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.code(status).send({ error: status === 500 ? 'internal_error' : err.code ?? 'error', message: status === 500 ? 'Erro interno.' : err.message });
  });

  return app;
}

function req_log(app: FastifyInstance, e: unknown) {
  app.log.warn({ err: e instanceof Error ? e.message : String(e) }, 'upstream failure');
}
