/**
 * Cloudflare Worker do site publicado.
 * - Arquivos (site + /data/*.json) são servidos direto pelos "static assets" da Cloudflare, sem passar por aqui.
 * - Só /api/* executa este código (run_worker_first no wrangler.jsonc): placar ao vivo e detalhes de jogos (ESPN).
 */
import { gameDetail, scoreboard } from '../server/services/espn';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function json(body: unknown, maxAgeSeconds: number, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Cache na borda: poupa a ESPN e responde rápido para todos os visitantes.
      'Cache-Control': status === 200 ? `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method_not_allowed' }, 0, 405);

    if (pathname === '/api/live/scoreboard') {
      try {
        return json(await scoreboard(), 30);
      } catch {
        return json({ error: 'upstream_unavailable', message: 'Placar ao vivo indisponível no momento.' }, 0, 502);
      }
    }

    const game = pathname.match(/^\/api\/live\/game\/([^/]+)$/);
    if (game) {
      if (!/^\d{6,12}$/.test(game[1])) return json({ error: 'bad_request' }, 0, 400);
      try {
        return json(await gameDetail(game[1]), 60);
      } catch {
        return json({ error: 'upstream_unavailable', message: 'Detalhes do jogo indisponíveis no momento.' }, 0, 502);
      }
    }

    // Demais rotas /api/* (API REST completa e /admin) só existem na versão com servidor.
    if (pathname.startsWith('/api/')) return json({ error: 'not_found', message: 'Não disponível na versão estática do site.' }, 0, 404);
    return env.ASSETS.fetch(request);
  },
};
