/**
 * Envia erros do navegador para /api/report (Worker na Cloudflare ou servidor Fastify), para que falhas
 * vistas por visitantes não fiquem invisíveis. Só em produção, no máximo 5 por visita e sem repetir a
 * mesma mensagem. Não envia dados do visitante: só mensagem, pilha e o caminho da página.
 */
const MAX_PER_VISIT = 5;
const sent = new Set<string>();

export function reportError(err: unknown, source: 'window' | 'promise' | 'react') {
  if (!import.meta.env.PROD || sent.size >= MAX_PER_VISIT) return;
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Erro sem mensagem');
  if (sent.has(e.message)) return;
  sent.add(e.message);
  const body = JSON.stringify({ message: e.message, stack: e.stack?.slice(0, 2000) ?? null, path: window.location.pathname, source });
  fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

export function installErrorReporting() {
  window.addEventListener('error', (ev) => {
    // Erros de extensões e scripts de terceiros não são do site.
    if (ev.filename && !ev.filename.startsWith(window.location.origin)) return;
    reportError(ev.error ?? ev.message, 'window');
  });
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'promise'));
}
