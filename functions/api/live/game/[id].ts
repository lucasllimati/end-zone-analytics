/** GET /api/live/game/:id — detalhes do jogo (ESPN), mesmo contrato da API Fastify. */
import { gameDetail } from '../../../../server/services/espn';
import { json, unavailable } from '../../../_live';

export async function onRequestGet(ctx: { params: Record<string, string | string[]> }): Promise<Response> {
  const id = String(ctx.params.id ?? '');
  if (!/^\d{6,12}$/.test(id)) return json({ error: 'bad_request' }, 0, 400);
  try {
    return json(await gameDetail(id), 60);
  } catch {
    return unavailable('Detalhes do jogo indisponíveis no momento.');
  }
}
