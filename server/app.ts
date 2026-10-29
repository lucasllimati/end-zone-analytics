/**
 * Fábrica da aplicação Fastify (API + arquivos estáticos). Exportada separadamente de index.ts
 * para permitir testes com `app.inject()` sem abrir porta.
 */
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { DATA_DIR, DIST_DIR, OPS_DIR, config } from './config';
import { DataStore } from './services/dataStore';
import { TtlCache } from './services/ttlCache';
import { gameDetail, scoreboard, teamNews } from './services/espn';
import { currentJob, getJob, listJobs, startSync, type Runner } from './services/jobs';
import { AdminAuth, LoginThrottle } from './services/auth';
import { OpsLog, recommendedAction, type Notifier } from './services/ops';
import { Scheduler, type ScheduleConfig } from './services/scheduler';
import { fetchJson } from './etl/fetcher';
import { openapi } from './openapi';
import { SOURCES } from '../src/lib/sources';
import { checkForUpdates } from '../src/lib/updates';
import { computeStandings } from '../src/lib/standings';
import { ACTIVE_TEAMS, franchiseOf } from '../src/lib/teams';
import { DEFAULT_QB_WEIGHTS, rankQbs, type QbWeights } from '../src/lib/models';
import type { PlayerSeasonLine, UpdateCheckResult } from '../src/lib/types';
import { parseClientReport, REPORT_MAX_BYTES } from './services/clientReport';

export interface AppOptions {
  dataDir?: string;
  logger?: boolean;
  serveStatic?: boolean;
  syncRunner?: Runner;
  adminToken?: string;
  /** Diretório do log operacional privado (padrão: ops/). */
  opsDir?: string;
  /** Libera o admin sem token para requisições de localhost (padrão: somente fora de produção). */
  allowLocalAdmin?: boolean;
  /** Proxies confiáveis à frente da API (padrão: TRUST_PROXY, 0 = nenhum). */
  trustProxyHops?: number;
  /** Agendamento das cargas; padrão vem das variáveis SYNC_* (desligado se não configurado). false desliga. */
  schedule?: ScheduleConfig | false;
  /** Webhook de alertas; padrão vem de ALERT_WEBHOOK_URL. */
  notifier?: Notifier;
}

const seasonQ = z.coerce.number().int().min(1920).max(2100);
/** Tamanho mínimo do ADMIN_TOKEN em produção (≈ 144 bits em base64). */
export const MIN_TOKEN_LENGTH = 24;

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const proxyHops = opts.trustProxyHops ?? config.trustProxyHops;
  const app = Fastify({
    logger: opts.logger ?? true,
    // Só confia em X-Forwarded-For quando há proxy configurado (senão o IP do limite de login seria forjável).
    trustProxy: proxyHops > 0 ? (_addr: string, hop: number) => hop < proxyHops : false,
    bodyLimit: 32 * 1024,
  });
  const store = new DataStore(opts.dataDir ?? DATA_DIR);
  const checkCache = new TtlCache<UpdateCheckResult>();
  const ops = new OpsLog(opts.opsDir ?? OPS_DIR, opts.notifier ?? { url: config.alertWebhook, format: config.alertFormat, minSeverity: config.alertMinSeverity });
  const adminToken = opts.adminToken ?? config.adminToken;
  // Em produção, token curto = adivinhável: o login fica desligado até ser trocado por um forte.
  const weakToken = config.isProd && adminToken.length > 0 && adminToken.length < MIN_TOKEN_LENGTH;
  // Uma única trava para todas as formas de autenticar (login e Authorization: Bearer).
  const loginGuard = new LoginThrottle();
  const auth = new AdminAuth(weakToken ? '' : adminToken, opts.allowLocalAdmin ?? !config.isProd, config.isProd, loginGuard, () => {
    void ops.event({ severity: 'error', component: 'auth', message: 'Acesso administrativo bloqueado por excesso de tokens inválidos (Bearer)' }).catch(() => {});
  });
  if (weakToken) app.log.error(`ADMIN_TOKEN tem menos de ${MIN_TOKEN_LENGTH} caracteres: login administrativo desativado. Gere um com: openssl rand -base64 32`);
  const afterSync = () => {
    store.invalidate();
    checkCache.clear();
  };
  const scheduler =
    opts.schedule === false
      ? null
      : new Scheduler(opts.schedule ?? config.schedule, (mode) => !startSync({ mode }, afterSync, opts.syncRunner, ops, 'scheduler').alreadyRunning);
  if (scheduler?.enabled) {
    scheduler.run();
    app.addHook('onClose', async () => scheduler.stop());
  }

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
    frameguard: { action: 'deny' },
  });
  // Recursos do navegador que o site não usa ficam bloqueados (helmet não define este cabeçalho).
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
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
        stat: z.string().regex(/^[a-zA-Z0-9]+$/).max(20).default('passYds'),
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
    // Só colunas numéricas próprias da linha (sem "constructor", "toString" e afins herdados do protótipo).
    if (!lines[0] || !Object.hasOwn(lines[0], stat) || typeof lines[0][stat] !== 'number') return reply.code(400).send({ error: 'bad_request', message: 'Estatística desconhecida.' });
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

  app.get('/api/news/:abbr', async (req, reply) => {
    const abbr = (req.params as { abbr: string }).abbr;
    // Só os 32 times (o servidor não vira proxy de buscas arbitrárias na ESPN).
    if (!(ACTIVE_TEAMS as readonly string[]).includes(abbr)) return reply.code(404).send(notFound('Time'));
    try {
      reply.header('Cache-Control', 'public, max-age=900');
      return await teamNews(abbr);
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable', message: 'Notícias indisponíveis no momento.' });
    }
  });

  /* --------------------------- Erros do navegador --------------------------- */
  // Visível em /admin (componente "Navegador"). Limite de tamanho e de frequência: não vira canal de spam.
  app.post('/api/report', { bodyLimit: REPORT_MAX_BYTES, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    // Mesmas regras do Worker: só JSON e só do próprio site (o log aparece no /admin).
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.headers.host}`) return reply.code(403).send({ error: 'forbidden' });
    if (!(req.headers['content-type'] ?? '').includes('application/json')) return reply.code(415).send({ error: 'unsupported_media_type' });
    const r = parseClientReport(req.body);
    if (!r) return reply.code(400).send({ error: 'bad_request' });
    // Severidade "info": relato anônimo nunca vira alerta no celular/Discord/Slack do administrador.
    void ops.event({ severity: 'info', component: 'client', message: `Erro no navegador: ${r.message}`, detail: `${r.path} (${r.source})${r.stack ? `\n${r.stack}` : ''}` }).catch(() => {});
    return reply.code(204).send();
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
    // Só jogos da base: o servidor não vira proxy para IDs arbitrários da ESPN.
    const known = await store.allGames().catch(() => []);
    if (!known.some((g) => g.espn === id)) return reply.code(404).send(notFound('Jogo'));
    try {
      return await gameDetail(id);
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable', message: 'Detalhes do jogo indisponíveis no momento.' });
    }
  });

  /* --------------------------------- Admin --------------------------------- */
  // Todas as rotas /api/admin/* (exceto sessão/login/logout) exigem autenticação no servidor — ver services/auth.ts.
  const ip = (req: FastifyRequest) => req.ip;
  const guard = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!auth.method(req)) return reply.code(401).send({ error: 'unauthorized', message: 'Acesso restrito à administração.' });
  };

  // Rota pública: não avalia Bearer (senão serviria para gastar a trava global de login sem custo).
  app.get('/api/admin/session', async (req) => ({
    authenticated: Boolean(auth.sessionMethod(req)),
    method: auth.sessionMethod(req),
    tokenConfigured: auth.tokenConfigured,
  }));

  app.post('/api/admin/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = z.object({ token: z.string().min(1).max(512) }).safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'bad_request' });
    if (!auth.tokenConfigured) return reply.code(503).send({ error: 'not_configured', message: 'Defina ADMIN_TOKEN no servidor (24+ caracteres) para habilitar o login.' });
    // Trava global (todos os IPs somados): segura força bruta distribuída, que o limite por IP não pega.
    const wait = loginGuard.blockedFor();
    if (wait > 0) {
      reply.header('Retry-After', String(Math.ceil(wait / 1000)));
      return reply.code(429).send({ error: 'too_many_attempts', message: 'Muitas tentativas recusadas. Tente novamente mais tarde.' });
    }
    if (!auth.login(body.data.token, reply)) {
      const locked = loginGuard.fail();
      void ops
        .event({ severity: locked ? 'error' : 'warning', component: 'auth', message: locked ? 'Login administrativo bloqueado por excesso de tentativas' : 'Tentativa de login administrativo recusada', detail: `IP ${ip(req)}` })
        .catch(() => {});
      return reply.code(401).send({ error: 'unauthorized', message: 'Token inválido.' });
    }
    loginGuard.reset();
    void ops.event({ severity: 'info', component: 'auth', message: 'Login administrativo', detail: `IP ${ip(req)}` }).catch(() => {});
    return { authenticated: true };
  });

  app.post('/api/admin/logout', async (req, reply) => {
    auth.logout(req, reply);
    return { authenticated: false };
  });

  app.get('/api/admin/check', { preHandler: guard }, async (req, reply) => {
    const m = await store.manifest();
    if (!m) return reply.code(503).send({ error: 'no_data' });
    const force = (req.query as { force?: string }).force === '1';
    if (force) checkCache.clear();
    try {
      return await checkCache.get(`check:${m.generatedAt}`, 10 * 60_000, async () => {
        const res = await checkForUpdates(m, fetchJson);
        const failed = res.items.filter((i) => i.error);
        if (failed.length) {
          const detail = failed.map((i) => `${i.label}: ${i.error}`).join('\n');
          void ops
            .event({
              severity: 'warning',
              component: 'sources',
              message: `Verificação de dados novos: ${failed.length} de ${res.items.length} fonte(s) indisponível(is)`,
              detail,
              action: recommendedAction(detail),
            })
            .catch(() => {});
        }
        return res;
      });
    } catch (e) {
      req_log(app, e);
      return reply.code(502).send({ error: 'upstream_unavailable' });
    }
  });

  app.post('/api/admin/sync', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!auth.method(req)) return reply.code(401).send({ error: 'unauthorized', message: 'Sincronização exige login administrativo ou ADMIN_TOKEN.' });
    if (!auth.canMutate(req)) return reply.code(403).send({ error: 'forbidden', message: 'Cabeçalho de proteção ausente.' });
    const body = z
      .object({
        mode: z.enum(['full', 'partial']).default('partial'),
        datasets: z.array(z.enum(SOURCES.map((s) => s.key) as [string, ...string[]])).max(10).optional(),
        seasons: z.array(seasonQ).max(40).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'bad_request', issues: body.error.issues });
    const { job, alreadyRunning } = startSync(body.data, afterSync, opts.syncRunner, ops);
    if (!alreadyRunning)
      void ops
        .event({ severity: 'info', component: 'auth', jobId: job.id, message: `Carga ${body.data.mode === 'full' ? 'completa' : 'parcial'} solicitada (${auth.method(req)})`, detail: `IP ${ip(req)}` })
        .catch(() => {});
    return reply.code(alreadyRunning ? 409 : 202).send({ job, alreadyRunning });
  });

  app.get('/api/admin/jobs', { preHandler: guard }, async () => listJobs().map(({ log, ...j }) => ({ ...j, logLines: log.length })));
  app.get('/api/admin/jobs/:id', { preHandler: guard }, async (req, reply) => getJob((req.params as { id: string }).id) ?? reply.code(404).send(notFound('Job')));

  app.get('/api/admin/overview', { preHandler: guard }, async () => {
    const m = await store.manifest();
    const runs = await ops.runs();
    const dataDir = opts.dataDir ?? DATA_DIR;
    const expected = ['manifest.json', 'quality.json', 'teams.json', 'games/all.json', 'players/index.json', 'superbowls.json', 'team-seasons.json', 'draft.json'];
    if (m) for (let s = m.coverage.firstSeason; s <= m.coverage.lastSeason; s++) expected.push(`games/${s}.json`, `stats/players-${s}.json`);
    const missing = expected.filter((f) => !fs.existsSync(path.join(dataDir, f)));
    return {
      api: { status: 'ok', uptime: Math.round(process.uptime()), node: process.version, env: config.isProd ? 'production' : 'development' },
      githubTokenConfigured: Boolean(config.githubToken),
      alertsConfigured: Boolean(opts.notifier?.url ?? config.alertWebhook),
      schedule: scheduler?.enabled ? { ...scheduler.cfg, next: scheduler.next() } : null,
      data: m
        ? {
            generatedAt: m.generatedAt,
            ingestionVersion: m.ingestionVersion,
            lastMode: m.lastMode,
            coverage: m.coverage,
            quality: m.quality,
            datasets: Object.values(m.datasets).map(({ key, label, rows, retrievedAt, remoteVersion, sha256 }) => ({ key, label, rows, retrievedAt, remoteVersion, sha256 })),
          }
        : null,
      files: { expected: expected.length, missing },
      running: currentJob(),
      lastSuccess: runs.find((r) => r.status === 'done') ?? null,
      lastAttempt: runs[0] ?? null,
      runs: runs.slice(0, 30),
    };
  });

  app.get('/api/admin/events', { preHandler: guard }, async (req, reply) => {
    const q = z
      .object({
        severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
        component: z.enum(['pipeline', 'sources', 'quality', 'auth', 'api', 'client']).optional(),
        jobId: z.string().uuid().optional(),
        days: z.coerce.number().int().min(1).max(365).optional(),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request', issues: q.error.issues });
    // Um erro de carga ou de fonte é considerado resolvido quando há uma carga bem-sucedida posterior.
    const lastOk = (await ops.runs()).find((r) => r.status === 'done')?.finishedAt ?? '';
    const since = q.data.days ? Date.now() - q.data.days * 86_400_000 : 0;
    return (await ops.events())
      .filter(
        (e) =>
          (!q.data.severity || e.severity === q.data.severity) &&
          (!q.data.component || e.component === q.data.component) &&
          (!q.data.jobId || e.jobId === q.data.jobId) &&
          Date.parse(e.at) >= since,
      )
      .map((e) => ({ ...e, resolved: e.severity !== 'info' && ['pipeline', 'sources'].includes(e.component) ? e.at < lastOk : null }));
  });

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
          else if (file.endsWith('sw.js') || file.endsWith('.webmanifest')) res.header('Cache-Control', 'no-cache');
        },
      });
      // SPA: rotas do frontend caem no index.html.
      app.setNotFoundHandler((req, reply) => {
        if (req.raw.url?.startsWith('/api/') || req.raw.url?.startsWith('/data/')) return reply.code(404).send({ error: 'not_found' });
        // Rotas com HTML próprio (gerado por scripts/prerender-meta.ts: título e descrição da página).
        const route = (req.raw.url ?? '/').split('?')[0].replace(/\/$/, '');
        if (/^(\/[A-Za-z0-9_-]+)+$/.test(route) && fs.existsSync(path.join(DIST_DIR, `${route}.html`))) return reply.type('text/html').sendFile(`${route.slice(1)}.html`, DIST_DIR);
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
