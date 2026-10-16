import type { ReactNode, RefObject } from 'react';
import { InfoTip } from '../InfoTip';
import { ExportMenu } from '../ExportMenu';
import { SERIES } from './scale';

export interface LegendItem {
  label: string;
  slot: number;
  /** Cor explícita (ex.: cor do time) em vez do slot categórico. */
  color?: string;
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  info?: { simple: string; expert?: string; formula?: string };
  legend?: LegendItem[];
  svgRef?: RefObject<SVGSVGElement | null>;
  rows?: () => Record<string, unknown>[];
  table?: ReactNode;
  children: ReactNode;
  source?: ReactNode;
}

/**
 * Moldura padrão de gráfico: título + ⓘ (o que o gráfico mostra e como ler), legenda,
 * exportação (PNG/SVG/CSV/JSON) e "ver como tabela" (acessibilidade).
 */
export function ChartFrame({ title, subtitle, info, legend, svgRef, rows, table, children, source }: Props) {
  return (
    <figure className="chart-frame" style={{ margin: 0 }}>
      <div className="chart-head">
        <div>
          <h3>
            {title}
            {info && <InfoTip title={title} simple={info.simple} expert={info.expert} formula={info.formula} />}
          </h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {(svgRef || rows) && <ExportMenu name={title} svg={svgRef} rows={rows} />}
      </div>
      {legend && legend.length > 1 && (
        <div className="legend" aria-label="Legenda">
          {legend.map((l) => (
            <span key={l.label}>
              <i style={{ background: l.color ?? SERIES(l.slot) }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
      {table && (
        <details className="table-view">
          <summary>Ver dados em tabela</summary>
          {table}
        </details>
      )}
      {source && <figcaption className="xsmall muted">Fonte: {source}</figcaption>}
    </figure>
  );
}

/** Tabela simples para a visão "ver dados" dos gráficos. */
export function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="table-wrap" style={{ maxHeight: 320, marginTop: 8 }} tabIndex={0} role="region" aria-label="Tabela">
      <table className="data">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} className={i > 0 ? 'num' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j > 0 ? 'num' : undefined}>
                  {typeof c === 'number' ? c.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
