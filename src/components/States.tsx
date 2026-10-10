import type { ReactNode } from 'react';

export function Loading({ height = 160, label = 'Carregando dados…' }: { height?: number; label?: string }) {
  return (
    <div className="skeleton" style={{ height }} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, children }: { error?: Error | null; children?: ReactNode }) {
  return (
    <div className="empty" role="alert">
      <strong style={{ color: 'var(--text)' }}>Não foi possível carregar.</strong>
      <div>{children ?? error?.message ?? 'Tente novamente em instantes.'}</div>
    </div>
  );
}

/** Estado vazio honesto: dados indisponíveis nunca viram zero. */
export function Unavailable({ children = 'Dados não disponíveis para esta temporada.' }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}
