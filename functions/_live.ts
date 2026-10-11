/**
 * Utilitários das Cloudflare Pages Functions (placar ao vivo no site estático).
 * O arquivo começa com "_" para não virar rota.
 */
export function json(body: unknown, maxAgeSeconds: number, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Cache na borda da Cloudflare: poupa a ESPN e responde rápido para todos os visitantes.
      'Cache-Control': status === 200 ? `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const unavailable = (message: string) => json({ error: 'upstream_unavailable', message }, 0, 502);
