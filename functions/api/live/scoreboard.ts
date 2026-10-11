/** GET /api/live/scoreboard — mesmo contrato da API Fastify, servido pela Cloudflare (Pages Function). */
import { scoreboard } from '../../../server/services/espn';
import { json, unavailable } from '../../_live';

export async function onRequestGet(): Promise<Response> {
  try {
    return json(await scoreboard(), 30);
  } catch {
    return unavailable('Placar ao vivo indisponível no momento.');
  }
}
