import { forwardRef, useMemo, useState } from 'react';
import { SERIES, fmtTick, linear, niceTicks, useWidth } from './scale';

export interface LineSeries {
  id: string;
  label: string;
  slot: number;
  color?: string;
  points: { x: number; y: number | null }[];
}

interface Props {
  series: LineSeries[];
  height?: number;
  xFormat?: (x: number) => string;
  yFormat?: (y: number) => string;
  yZero?: boolean;
  /** Linha de referência horizontal (ex.: média da liga). */
  reference?: { y: number; label: string };
  area?: boolean;
  ariaLabel: string;
  /** Rótulo direto no fim das linhas (somente quando ≤ 4 séries). */
  endLabels?: boolean;
}

/**
 * Gráfico de linhas com crosshair e tooltip (todas as séries no X sob o cursor).
 * Linhas 2px, marcador final 8px com anel da cor da superfície, grade horizontal discreta.
 */
export const LineChart = forwardRef<SVGSVGElement, Props>(function LineChart(
  { series, height = 260, xFormat = String, yFormat = fmtTick, yZero = false, reference, area = false, ariaLabel, endLabels = true },
  svgRef,
) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const showEnd = endLabels && series.length <= 4 && width > 480;
  const m = { top: 12, right: showEnd ? 92 : 16, bottom: 28, left: 52 };

  const { xs, xScale, yScale, yTicks } = useMemo(() => {
    const allX = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
    const ys = series.flatMap((s) => s.points.map((p) => p.y).filter((y): y is number => y !== null));
    if (reference) ys.push(reference.y);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (yZero) lo = Math.min(0, lo);
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const ticks = niceTicks(lo, hi, 5);
    return {
      xs: allX,
      xScale: linear(allX[0] ?? 0, allX[allX.length - 1] ?? 1, m.left, width - m.right),
      yScale: linear(ticks[0], ticks[ticks.length - 1], height - m.bottom, m.top),
      yTicks: ticks,
    };
  }, [series, width, height, reference, yZero, m.left, m.right, m.top, m.bottom]);

  const xTickEvery = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((width - m.left - m.right) / 64))));

  const path = (s: LineSeries) => {
    let d = '';
    let pen = false;
    for (const p of s.points) {
      if (p.y === null) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = xs[0];
    for (const x of xs) if (Math.abs(xScale(x) - px) < Math.abs(xScale(best) - px)) best = x;
    setHoverX(best ?? null);
  };

  const hoverRows =
    hoverX === null
      ? []
      : series
          .map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) }))
          .filter((r) => r.p && r.p.y !== null)
          .sort((a, b) => (b.p!.y as number) - (a.p!.y as number));
  const ttLeft = hoverX !== null ? xScale(hoverX) : 0;

  return (
    <div className="chart" ref={ref}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} style={{ ['--surface-1' as string]: 'var(--surface-1)' }}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={m.left} x2={width - m.right} y1={yScale(t)} y2={yScale(t)} />
            <text className="tick" x={m.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        <line className="axis-line" x1={m.left} x2={width - m.right} y1={height - m.bottom} y2={height - m.bottom} />
        {xs.map((x, i) =>
          i % xTickEvery === 0 || i === xs.length - 1 ? (
            <text key={x} className="tick" x={xScale(x)} y={height - m.bottom + 16} textAnchor="middle">
              {xFormat(x)}
            </text>
          ) : null,
        )}
        {reference && (
          <g>
            <line x1={m.left} x2={width - m.right} y1={yScale(reference.y)} y2={yScale(reference.y)} stroke="var(--muted)" strokeWidth={1} />
            <text className="tick" x={width - m.right} y={yScale(reference.y) - 4} textAnchor="end">
              {reference.label}
            </text>
          </g>
        )}
        {series.map((s) => {
          const color = s.color ?? SERIES(s.slot);
          const d = path(s);
          const pts = s.points.filter((p) => p.y !== null);
          const last = pts[pts.length - 1];
          return (
            <g key={s.id}>
              {area && last && (
                <path
                  d={`${d}L${xScale(last.x)},${yScale(yTicks[0])}L${xScale(pts[0].x)},${yScale(yTicks[0])}Z`}
                  fill={color}
                  opacity={0.1}
                />
              )}
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {last && <circle cx={xScale(last.x)} cy={yScale(last.y!)} r={4} fill={color} stroke="var(--surface-1)" strokeWidth={2} />}
              {showEnd && last && (
                <text className="label" x={xScale(last.x) + 8} y={yScale(last.y!)} dy="0.32em">
                  {s.label.length > 12 ? `${s.label.slice(0, 11)}…` : s.label}
                </text>
              )}
            </g>
          );
        })}
        {hoverX !== null && (
          <g pointerEvents="none">
            <line x1={xScale(hoverX)} x2={xScale(hoverX)} y1={m.top} y2={height - m.bottom} stroke="var(--axis)" />
            {hoverRows.map(({ s, p }) => (
              <circle key={s.id} cx={xScale(hoverX)} cy={yScale(p!.y!)} r={4} fill={s.color ?? SERIES(s.slot)} stroke="var(--surface-1)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect
          x={m.left}
          y={m.top}
          width={Math.max(0, width - m.left - m.right)}
          height={Math.max(0, height - m.top - m.bottom)}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHoverX(null)}
        />
      </svg>
      {hoverX !== null && hoverRows.length > 0 && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(ttLeft + 12, 0), width - 200), top: 8 }}
          role="status"
          aria-live="polite"
        >
          <div className="tt-title">{xFormat(hoverX)}</div>
          {hoverRows.map(({ s, p }) => (
            <div className="tt-row" key={s.id}>
              <span className="dot" style={{ background: s.color ?? SERIES(s.slot) }} />
              {s.label}
              <b>{yFormat(p!.y!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
