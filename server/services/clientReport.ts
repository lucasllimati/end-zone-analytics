/**
 * Relato de erro do navegador (POST /api/report), aceito pelo Worker e pelo servidor Fastify.
 * Só texto técnico: mensagem, pilha, caminho da página (sem query string) e origem do erro.
 * Nada de IP, cookies ou identificadores do visitante (ver a página de Privacidade).
 */
export interface ClientReport {
  message: string;
  stack: string | null;
  path: string;
  source: 'window' | 'promise' | 'react';
}

export const REPORT_MAX_BYTES = 4096;
const SOURCES = new Set(['window', 'promise', 'react']);

/** Corta, tira caracteres de controle (evita injeção em logs) e normaliza. */
const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max) : null);

export function parseClientReport(body: unknown): ClientReport | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const message = clean(b.message, 300);
  const path = clean(b.path, 200);
  if (!message || !path || !path.startsWith('/') || !SOURCES.has(b.source as string)) return null;
  return { message, stack: clean(b.stack, 2000), path: path.split('?')[0], source: b.source as ClientReport['source'] };
}
