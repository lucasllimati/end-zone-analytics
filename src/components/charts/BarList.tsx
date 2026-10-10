import type { ReactNode } from 'react';

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  display?: string;
  color?: string;
  sub?: ReactNode;
}

/**
 * Ranking em barras horizontais (HTML, acessível como lista).
 * Uma série = uma cor; o valor fica na ponta da barra.
 */
export function BarList({ items, max, ariaLabel }: { items: BarItem[]; max?: number; ariaLabel: string }) {
  const top = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ol className="barlist" aria-label={ariaLabel} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {items.map((it, idx) => (
        <li key={it.key} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
          <span className="xsmall muted num" style={{ textAlign: 'right' }}>
            {idx + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="row between" style={{ gap: 8, flexWrap: 'nowrap', fontSize: '0.88rem' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              <b className="num" style={{ flex: 'none' }}>
                {it.display ?? it.value.toLocaleString('pt-BR')}
              </b>
            </div>
            <div style={{ height: 6, marginTop: 4, background: 'var(--surface-2)', borderRadius: 3 }}>
              <div
                style={{
                  width: `${Math.max(1, (Math.abs(it.value) / top) * 100)}%`,
                  height: '100%',
                  background: it.color ?? 'var(--series-1)',
                  borderRadius: '0 3px 3px 0',
                }}
              />
            </div>
            {it.sub && <div className="xsmall muted" style={{ marginTop: 2 }}>{it.sub}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
