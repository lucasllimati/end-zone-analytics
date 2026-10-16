import { useEffect, useRef, useState } from 'react';
import { DiagramField } from './Field';
import type { Actor, Play, Pt } from '../content/playbook';

const DURATION = 4200;

/** Ponto em uma polilinha na fração f (0–1) do comprimento total. */
export function along(path: Pt[], f: number): Pt {
  if (path.length === 1 || f <= 0) return path[0];
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.min(1, f) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const r = seg[i] ? Math.min(1, d / seg[i]) : 1;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * r, path[i][1] + (path[i + 1][1] - path[i][1]) * r];
    }
    d -= seg[i];
  }
  return path[path.length - 1];
}

const progress = (t: number, [a, b]: [number, number]) => Math.max(0, Math.min(1, (t - a) / (b - a || 1)));
const toD = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');

const STROKE: Record<NonNullable<Actor['kind']>, string> = {
  route: '#ffd166',
  run: '#ff8c5a',
  block: 'rgba(255,255,255,0.75)',
  rush: '#ff6b6b',
  drop: '#9ec5f4',
  motion: '#b3a6ff',
  man: '#ff9fd0',
};

/** Animação SVG de uma jogada: rotas, bloqueios, corridas, coberturas e trajetória da bola. */
export function PlayAnimator({ play }: { play: Play }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [t, setT] = useState(reduced ? 1 : 0);
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState(1);
  const raf = useRef<number | undefined>(undefined);
  const last = useRef<number | undefined>(undefined);

  useEffect(() => {
    setT(reduced ? 1 : 0);
    setPlaying(!reduced);
  }, [play.id, reduced]);

  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      const dt = last.current ? now - last.current : 0;
      last.current = now;
      setT((x) => {
        const n = x + (dt / DURATION) * speed;
        if (n >= 1) {
          setPlaying(false);
          return 1;
        }
        return n;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current!);
      last.current = undefined;
    };
  }, [playing, speed]);

  const ballPos = (() => {
    if (!play.ball) return null;
    const p = progress(t, play.ball.t);
    if (t < play.ball.t[0]) return null;
    return along(play.ball.path, p);
  })();

  return (
    <div>
      <DiagramField label={`Diagrama animado da jogada ${play.name}`}>
        {play.zones?.map((z, i) => (
          <g key={i} opacity={Math.min(1, t * 2.2)}>
            <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={z.deep ? 'rgba(57,135,229,0.22)' : 'rgba(255,209,102,0.18)'} stroke={z.deep ? 'rgba(158,197,244,0.8)' : 'rgba(255,209,102,0.7)'} strokeWidth={1.5} />
            <text x={z.cx} y={z.cy - z.ry + 11} dy="0.35em" textAnchor="middle" fill="#fff" style={{ fontSize: 10, fontWeight: 600 }} opacity={0.9}>
              {z.label}
            </text>
          </g>
        ))}
        {play.actors.map((a) =>
          a.path ? (
            <g key={`p-${a.id}-${a.team}`}>
              <path d={toD(a.path)} fill="none" stroke={STROKE[a.kind ?? 'route']} strokeWidth={a.key ? 3 : 2} strokeOpacity={0.28} strokeDasharray={a.kind === 'block' ? undefined : '5 4'} />
              {(() => {
                const pr = progress(t, a.t ?? [0, 1]);
                const pts: Pt[] = [];
                const N = 24;
                for (let i = 0; i <= N; i++) pts.push(along(a.path!, (pr * i) / N));
                return <path d={toD(pts)} fill="none" stroke={STROKE[a.kind ?? 'route']} strokeWidth={a.key ? 3.5 : 2.2} strokeLinecap="round" />;
              })()}
            </g>
          ) : null,
        )}
        {play.actors.map((a) => {
          const pos = a.path ? along(a.path, progress(t, a.t ?? [0, 1])) : a.at;
          const off = a.team === 'off';
          return (
            <g key={`d-${a.id}-${a.team}`} className="player-dot">
              <circle cx={pos[0]} cy={pos[1]} r={a.key ? 12 : 10.5} fill={off ? '#f4f4f2' : '#1b1b1b'} stroke={a.key ? '#ffd166' : 'var(--turf)'} strokeWidth={a.key ? 3 : 2} />
              <text x={pos[0]} y={pos[1]} dy="0.35em" textAnchor="middle" fill={off ? '#111' : '#fff'} style={{ fontSize: 8.5 }}>
                {a.label}
              </text>
            </g>
          );
        })}
        {ballPos && <ellipse cx={ballPos[0]} cy={ballPos[1]} rx={7} ry={4.5} fill="#8b4a1c" stroke="#fff" strokeWidth={1.5} />}
      </DiagramField>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn sm primary" onClick={() => (t >= 1 ? (setT(0), setPlaying(true)) : setPlaying((p) => !p))}>
          {playing ? 'Pausar' : t >= 1 ? 'Repetir' : 'Reproduzir'}
        </button>
        <label className="field" style={{ flex: 1, minWidth: 160 }}>
          <span className="sr-only">Linha do tempo da jogada</span>
          <input type="range" min={0} max={1000} value={Math.round(t * 1000)} onChange={(e) => (setPlaying(false), setT(Number(e.target.value) / 1000))} aria-label="Posição na animação" />
        </label>
        <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Velocidade">
          <option value={0.5}>0,5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1,5×</option>
        </select>
      </div>
      <div className="legend" style={{ marginTop: 8 }}>
        <span>
          <i style={{ background: STROKE.route }} />
          Rota
        </span>
        <span>
          <i style={{ background: STROKE.run }} />
          Corrida
        </span>
        <span>
          <i style={{ background: STROKE.block }} />
          Bloqueio
        </span>
        <span>
          <i style={{ background: STROKE.rush }} />
          Pressão/blitz
        </span>
        <span>
          <i style={{ background: STROKE.drop }} />
          Recuo/zona
        </span>
        <span>
          <i style={{ background: STROKE.man }} />
          Marcação individual
        </span>
        <span>
          <i style={{ background: '#8b4a1c' }} />
          Bola
        </span>
      </div>
    </div>
  );
}
