import { useMemo, useState, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import { ExportMenu } from './ExportMenu';
import { metric as metricDef } from '../content/metrics';
import { useModeSensitive } from '../context/AppContext';

export interface Column<T> {
  key: string;
  label: string;
  /** Chave do dicionário de métricas para o ⓘ do cabeçalho. */
  metric?: string;
  /** Texto do ⓘ quando não há métrica no dicionário. */
  help?: string;
  num?: boolean;
  value?: (row: T) => number | string | null;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  /** Só aparece no modo Expert. */
  expertOnly?: boolean;
  className?: string;
  /**
   * Largura fixa da coluna (CSS, ex.: '4.5rem'). Se alguma coluna define largura, a tabela usa layout fixo:
   * tabelas do mesmo tipo na mesma página ficam com colunas idênticas, independentemente do conteúdo.
   * Colunas sem largura dividem o espaço restante.
   */
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  exportName?: string;
  pageSize?: number;
  rank?: boolean;
  rowClass?: (row: T, index: number) => string | undefined;
  expert?: boolean;
  bare?: boolean;
}

/**
 * Tabela de dados: ordenação acessível (aria-sort), ⓘ em cada coluna, exportação CSV/JSON
 * e paginação progressiva ("mostrar mais") para listas longas.
 */
export function DataTable<T>({ rows, columns, rowKey, caption, initialSort, exportName, pageSize = 50, rank, rowClass, expert, bare }: Props<T>) {
  // Tabela controlada pelo modo (recebe `expert`) e com colunas só do Expert: troca de modo muda o que aparece.
  useModeSensitive(expert !== undefined && columns.some((c) => c.expertOnly));
  const cols = columns.filter((c) => (expert ?? true) || !c.expertOnly);
  const [sort, setSort] = useState(initialSort ?? null);
  const [limit, setLimit] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = cols.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.value ?? ((r: T) => (r as Record<string, unknown>)[col.key] as number | string | null);
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      // Valores ausentes sempre no fim, independentemente da direção.
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
      return sort.dir === 'asc' ? d : -d;
    });
  }, [rows, sort, cols]);

  const exportRows = () =>
    sorted.map((r) =>
      Object.fromEntries(cols.map((c) => [c.label, c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]])),
    );

  const visible = sorted.slice(0, limit);
  const fixed = cols.some((c) => c.width);
  // Largura mínima = soma das colunas fixas + 10rem para cada coluna flexível (abaixo disso, rolagem horizontal).
  const minWidth = fixed
    ? `calc(${[...(rank ? ['2.75rem'] : []), ...cols.map((c) => c.width ?? '10rem')].join(' + ')})`
    : undefined;
  return (
    <div>
      {exportName && (
        <div className="table-tools">
          <span className="xsmall muted">{rows.length.toLocaleString('pt-BR')} linha(s)</span>
          <ExportMenu name={exportName} rows={exportRows} />
        </div>
      )}
      <div className={`table-wrap${bare ? ' bare' : ''}`} tabIndex={0} role="region" aria-label={caption}>
        <table className={fixed ? 'data fixed' : 'data'} style={minWidth ? { minWidth } : undefined}>
          <caption className="sr-only">{caption}</caption>
          {fixed && (
            <colgroup>
              {rank && <col style={{ width: '2.75rem' }} />}
              {cols.map((c) => (
                <col key={c.key} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {rank && (
                <th scope="col" className="rank">
                  #
                </th>
              )}
              {cols.map((c) => {
                const active = sort?.key === c.key;
                const canSort = c.sortable !== false;
                const def = c.metric ? metricDef(c.metric) : null;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.num ? 'num' : undefined}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    title={def?.label}
                  >
                    <span className="th-inner">
                      {canSort ? (
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key ? { key: c.key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: c.key, dir: c.num ? 'desc' : 'asc' },
                            )
                          }
                        >
                          {c.label}
                          <span aria-hidden="true">{active ? (sort!.dir === 'asc' ? '↑' : '↓') : ''}</span>
                        </button>
                      ) : (
                        c.label
                      )}
                      {c.metric && <InfoTip metric={c.metric} label={def?.label ?? c.label} />}
                      {!c.metric && c.help && <InfoTip title={c.label} simple={c.help} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={rowKey(r)} className={rowClass?.(r, i)}>
                {rank && <td className="rank num">{i + 1}</td>}
                {cols.map((c) => (
                  <td key={c.key} className={[c.num ? 'num' : '', c.className ?? ''].join(' ').trim() || undefined}>
                    {c.render ? c.render(r, i) : String((r as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={cols.length + (rank ? 1 : 0)} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  Nenhum resultado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="btn sm" onClick={() => setLimit((l) => l + pageSize * 2)}>
            Mostrar mais ({(sorted.length - limit).toLocaleString('pt-BR')} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
