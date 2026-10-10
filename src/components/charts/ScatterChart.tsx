import { forwardRef, useMemo, useState } from 'react';
import { SERIES, fmtTick, linear, niceTicks, useWidth } from './scale';

export interface ScatterPoint {
  key: string;
  x: number;
  y: number;
  label: string;
  detail?: string;
  /** Destaque (até 3 grupos categóricos: 0, 1, 2). */
  group?: number;
}

interface Props {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  height?: number;
  ariaLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  /** Linha de tendência (média por faixa de X), desenhada como linha. */
  trend?: { x: number; y: number }[];
}

/** Dispersão com tooltip por ponto (alvo de hover maior que o marcador). */
export const ScatterChart = forwardRef<SVGSVGElement, Props>(function ScatterChart(
  { points, xLabel, yLabel, height = 300, ariaLabel, xFormat = fmtTick, yFormat = fmtTick, trend },
  svgRef,
) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<ScatterPoint | null>(null);
  const m = { top: 12, right: 16, bottom: 40, left: 52 };
  const { x, y, xt, yt } = useMemo(() => {
    const xt = niceTicks(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x)), 6);
    const yt = niceTicks(Math.min(0, ...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)), 5);
    return {
      xt,
      yt,
      x: linear(xt[0], xt[xt.length - 1], m.left, width - m.right),
      y: linear(yt[0], yt[yt.length - 1], height - m.bottom, m.top),
    };
  }, [points, width, height, m.left, m.right, m.bottom, m.top]);
  return (
    <div className="chart" ref={ref}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {yt.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text className="tick" x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} className="tick" x={x(t)} y={height - m.bottom + 16} textAnchor="middle">
            {xFormat(t)}
          </text>
        ))}
        <line className="axis-line" x1={m.left} x2={width - m.right} y1={height - m.bottom} y2={height - m.bottom} />
        <text className="label" x={(m.left + width - m.right) / 2} y={height - 4} textAnchor="middle">
          {xLabel}
        </text>
        <text className="label" transform={`translate(12 ${(height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle">
          {yLabel}
        </text>
        {points.map((p) => (
          <circle
            key={p.key}
            cx={x(p.x)}
            cy={y(p.y)}
            r={p.group !== undefined ? 5 : 3.5}
            fill={p.group !== undefined ? SERIES(p.group + 1) : SERIES(0)}
            fillOpacity={p.group !== undefined ? 1 : 0.45}
            stroke="var(--surface-1)"
            strokeWidth={p.group !== undefined ? 2 : 1}
            onPointerEnter={() => setHover(p)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
        {trend && trend.length > 1 && (
          <path
            d={trend.map((t, i) => `${i ? 'L' : 'M'}${x(t.x).toFixed(1)},${y(t.y).toFixed(1)}`).join('')}
            fill="none"
            stroke="var(--text-2)"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}
      </svg>
      {hover && (
        <div className="chart-tooltip" style={{ left: Math.min(x(hover.x) + 10, width - 220), top: Math.max(0, y(hover.y) - 60) }} role="status">
          <div className="tt-title">{hover.label}</div>
          <div className="tt-row">
            {xLabel}
            <b>{xFormat(hover.x)}</b>
          </div>
          <div className="tt-row">
            {yLabel}
            <b>{yFormat(hover.y)}</b>
          </div>
          {hover.detail && <div className="tt-row">{hover.detail}</div>}
        </div>
      )}
    </div>
  );
});
