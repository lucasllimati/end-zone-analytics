import { forwardRef, useState } from 'react';
import { SERIES } from './scale';

export interface RadarSeries {
  id: string;
  label: string;
  slot: number;
  /** Valores 0–100 (percentis), na mesma ordem dos eixos. */
  values: (number | null)[];
  raw?: string[];
}

/** Radar de percentis (0–100). Recomendado para até 3 séries. */
export const RadarChart = forwardRef<SVGSVGElement, { axes: string[]; series: RadarSeries[]; ariaLabel: string; size?: number }>(function RadarChart(
  { axes, series, ariaLabel, size = 340 },
  svgRef,
) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 58;
  const angle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * (r * v) / 100, cy + Math.sin(angle(i)) * (r * v) / 100];
  return (
    <div className="chart" style={{ maxWidth: size + 40, margin: '0 auto' }}>
      <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        {[25, 50, 75, 100].map((lvl) => (
          <polygon
            key={lvl}
            points={axes.map((_, i) => pt(i, lvl).join(',')).join(' ')}
            fill="none"
            className="grid-line"
          />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 100);
          const [lx, ly] = pt(i, 122);
          return (
            <g key={a} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <line x1={cx} y1={cy} x2={x} y2={y} className="grid-line" />
              <text className="label" x={lx} y={ly} textAnchor={Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'} dy="0.32em">
                {a}
              </text>
            </g>
          );
        })}
        <text className="tick" x={cx + 3} y={cy - r / 2} dy="-2">
          50
        </text>
        {series.map((s) => (
          <g key={s.id}>
            <polygon
              points={s.values.map((v, i) => pt(i, v ?? 0).join(',')).join(' ')}
              fill={SERIES(s.slot)}
              fillOpacity={0.1}
              stroke={SERIES(s.slot)}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => {
              const [x, y] = pt(i, v ?? 0);
              return <circle key={i} cx={x} cy={y} r={4} fill={SERIES(s.slot)} stroke="var(--surface-1)" strokeWidth={2} />;
            })}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tooltip" style={{ left: 8, top: 8 }} role="status">
          <div className="tt-title">{axes[hover]}</div>
          {series.map((s) => (
            <div className="tt-row" key={s.id}>
              <span className="dot" style={{ background: SERIES(s.slot) }} />
              {s.label}
              <b>{s.values[hover] === null ? 'N/D' : `${s.values[hover]}º pct`}{s.raw?.[hover] ? ` · ${s.raw[hover]}` : ''}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
