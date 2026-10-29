/**
 * Cloudflare Worker do site publicado.
 * - Arquivos (site + /data/*.json) são servidos direto pelos "static assets" da Cloudflare, sem passar por aqui.
 * - Só /api/* executa este código (run_worker_first no wrangler.jsonc): placar ao vivo e detalhes de jogos (ESPN).
 */
import { parseClientReport, REPORT_MAX_BYTES } from '../server/services/clientReport';
import { gameDetail, scoreboard, teamNews } from '../server/services/espn';
import { ACTIVE_TEAMS } from '../src/lib/teams';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

/** Cache da borda da Cloudflare (Cache API). Ausente fora do runtime de Workers (ex.: testes). */
const edgeCache = (): Cache | null => (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default ?? null;

/**
 * Responde do cache da borda quando possível: uma rajada de visitantes (ou um abuso) vira uma única
 * chamada à ESPN por janela de cache, em vez de uma por requisição. A chave ignora a query string.
 */
async function cached(request: Request, ctx: Ctx | undefined, produce: () => Promise<Response>): Promise<Response> {
  const cache = edgeCache();
  const url = new URL(request.url);
  const key = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return hit;
  const res = await produce();
  if (cache && res.status === 200) {
    const put = cache.put(key, res.clone());
    if (ctx) ctx.waitUntil(put);
    else await put;
  }
  return res;
}

/** Cabeçalhos de segurança de uma API JSON (o _headers do site não se aplica às respostas do Worker). */
const API_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function json(body: unknown, maxAgeSeconds: number, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...API_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      // Cache na borda: poupa a ESPN e responde rápido para todos os visitantes.
      'Cache-Control': status === 200 ? `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}` : 'no-store',
    },
  });
}

/**
 * IDs ESPN dos jogos da base (data/live-ids.json, gerado pelo pipeline). Só esses podem ser consultados:
 * sem a lista, qualquer número viraria uma chamada à ESPN e o cache não ajudaria (cada ID é uma chave nova).
 * Carregado uma vez por instância do Worker.
 */
let knownIds: Promise<Set<string> | null> | null = null;
function liveIds(request: Request, env: Env): Promise<Set<string> | null> {
  knownIds ??= env.ASSETS.fetch(new Request(new URL('/data/live-ids.json', request.url)))
    .then(async (r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? new Set<string>(await r.json()) : null))
    .catch(() => null)
    .then((s) => {
      // Falha ao ler a lista: tenta de novo na próxima requisição (não fixa o erro).
      if (!s) knownIds = null;
      return s;
    });
  return knownIds;
}

/** Limite por instância do Worker (melhor esforço): cada IP envia no máximo 10 relatos por minuto. */
const reportHits = new Map<string, { n: number; since: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  if (reportHits.size > 5000) reportHits.clear();
  const h = reportHits.get(ip);
  if (!h || now - h.since > 60_000) {
    reportHits.set(ip, { n: 1, since: now });
    return false;
  }
  return ++h.n > 10;
}

/**
 * Erro do navegador → log do Worker (Cloudflare → Workers → Observability). Só aceita POST JSON pequeno
 * vindo do próprio site; o IP é usado só para o limite de frequência e não vai para o log.
 */
async function report(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 0, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'forbidden' }, 0, 403);
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'unsupported_media_type' }, 0, 415);
  if (tooMany(request.headers.get('cf-connecting-ip') ?? 'local')) return json({ error: 'too_many_requests' }, 0, 429);
  // Corpo grande é recusado pelo cabeçalho, antes de ler (não gasta memória do Worker à toa).
  if (Number(request.headers.get('content-length') ?? 0) > REPORT_MAX_BYTES) return json({ error: 'payload_too_large' }, 0, 413);
  const text = await request.text();
  if (text.length > REPORT_MAX_BYTES) return json({ error: 'payload_too_large' }, 0, 413);
  let r = null;
  try {
    r = parseClientReport(JSON.parse(text));
  } catch {
    /* JSON inválido */
  }
  if (!r) return json({ error: 'bad_request' }, 0, 400);
  console.error(JSON.stringify({ type: 'client_error', ...r }));
  return new Response(null, { status: 204, headers: API_HEADERS });
}

export default {
  async fetch(request: Request, env: Env, ctx?: Ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/report') return report(request);
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method_not_allowed' }, 0, 405);

    if (pathname === '/api/live/scoreboard') {
      return cached(request, ctx, async () => {
        try {
          return json(await scoreboard(), 15);
        } catch {
          return json({ error: 'upstream_unavailable', message: 'Placar ao vivo indisponível no momento.' }, 0, 502);
        }
      });
    }

    const game = pathname.match(/^\/api\/live\/game\/([^/]+)$/);
    if (game) {
      if (!/^\d{6,12}$/.test(game[1])) return json({ error: 'bad_request' }, 0, 400);
      const ids = await liveIds(request, env);
      // Sem a lista (falha de leitura), recusa em vez de liberar qualquer ID (falha fechada).
      if (!ids || !ids.has(game[1])) return json({ error: 'not_found', message: 'Jogo não encontrado.' }, 0, 404);
      return cached(request, ctx, async () => {
        try {
          // Em andamento: cache curto (o Game Center atualiza a cada 30 s). Encerrado: muda pouco, cache maior.
          const d = await gameDetail(game[1]);
          return json(d, d.state === 'in' ? 15 : d.state === 'post' ? 600 : 60);
        } catch {
          return json({ error: 'upstream_unavailable', message: 'Detalhes do jogo indisponíveis no momento.' }, 0, 502);
        }
      });
    }

    const news = pathname.match(/^\/api\/news\/([A-Z]{2,3})$/);
    if (news) {
      // Só os 32 times: qualquer outro valor viraria uma chave de cache nova e uma chamada à ESPN.
      if (!(ACTIVE_TEAMS as readonly string[]).includes(news[1])) return json({ error: 'not_found' }, 0, 404);
      return cached(request, ctx, async () => {
        try {
          return json(await teamNews(news[1]), 900);
        } catch {
          return json({ error: 'upstream_unavailable', message: 'Notícias indisponíveis no momento.' }, 0, 502);
        }
      });
    }

    // Demais rotas /api/* (API REST completa e /admin) só existem na versão com servidor.
    if (pathname.startsWith('/api/')) return json({ error: 'not_found', message: 'Não disponível na versão estática do site.' }, 0, 404);
    return env.ASSETS.fetch(request);
  },
};
