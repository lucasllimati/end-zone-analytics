import { forwardRef, useMemo, useState } from 'react';
import { SERIES, fmtTick, linear, niceTicks, useWidth } from './scale';

export interface Column {
  key: string;
  label: string;
  value: number;
  /** Cor de destaque (ex.: cor do campeão); padrão = série 1. */
  color?: string;
  tooltip?: string[];
}

interface Props {
  data: Column[];
  height?: number;
  yFormat?: (v: number) => string;
  ariaLabel: string;
  onSelect?: (key: string) => void;
  /** Rótulos de valor só nos extremos (seletivo). */
  labelExtremes?: boolean;
}

/** Colunas verticais (≤24px, ponta arredondada de 4px, base reta, 2px de respiro entre barras). */
export const ColumnChart = forwardRef<SVGSVGElement, Props>(function ColumnChart(
  { data, height = 240, yFormat = fmtTick, ariaLabel, onSelect, labelExtremes = true },
  svgRef,
) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 16, right: 8, bottom: 28, left: 44 };
  const { y, ticks } = useMemo(() => {
    const max = Math.max(0, ...data.map((d) => d.value));
    const min = Math.min(0, ...data.map((d) => d.value));
    const t = niceTicks(min, max, 4);
    return { y: linear(t[0], t[t.length - 1], height - m.bottom, m.top), ticks: t };
  }, [data, height, m.bottom, m.top]);
  const band = (width - m.left - m.right) / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(24, band - 2));
  const maxIdx = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor((width - m.left) / 46))));

  const barPath = (x: number, v: number) => {
    const y0 = y(0);
    const y1 = y(v);
    const h = Math.abs(y0 - y1);
    const r = Math.min(4, h, barW / 2);
    if (v >= 0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + barW - r}Q${x + barW},${y1} ${x + barW},${y1 + r}V${y0}Z`;
    return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + barW - r}Q${x + barW},${y1} ${x + barW},${y1 - r}V${y0}Z`;
  };

  return (
    <div className="chart" ref={ref}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text className="tick" x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        <line className="axis-line" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />
        {data.map((d, i) => {
          const x = m.left + i * band + (band - barW) / 2;
          return (
            <g
              key={d.key}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onClick={() => onSelect?.(d.key)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <rect x={m.left + i * band} y={m.top} width={band} height={height - m.top - m.bottom} fill="transparent" />
              <path d={barPath(x, d.value)} fill={d.color ?? SERIES(0)} opacity={hover === null || hover === i ? 1 : 0.55} />
              {labelExtremes && i === maxIdx && (
                <text className="value-label" x={x + barW / 2} y={y(d.value) - 5} textAnchor="middle">
                  {yFormat(d.value)}
                </text>
              )}
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <text className="tick" x={x + barW / 2} y={height - m.bottom + 16} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(m.left + hover * band + band + 6, 0), width - 220), top: 6 }}
          role="status"
        >
          <div className="tt-title">{data[hover].label}</div>
          {(data[hover].tooltip ?? [yFormat(data[hover].value)]).map((l) => (
            <div className="tt-row" key={l}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
