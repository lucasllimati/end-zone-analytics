import type { ReactNode } from 'react';

/**
 * Campo para diagramas (vista de trás do ataque, ataque embaixo). viewBox 600×380.
 * Linha de scrimmage em y=218; linhas a cada 5 jardas (≈56 px).
 */
export function DiagramField({ children, label, showLos = true, interactive = false }: { children: ReactNode; label: string; showLos?: boolean; interactive?: boolean }) {
  const lines = [];
  for (let y = 218 - 56 * 4; y <= 380; y += 56) lines.push(y);
  return (
    <svg className="field-svg" viewBox="0 0 600 380" role={interactive ? 'group' : 'img'} aria-label={label}>
      <rect width="600" height="380" fill="var(--turf)" />
      {lines.map((y, i) => (
        <rect key={`s${y}`} x="0" y={y - 56} width="600" height="56" fill={i % 2 ? 'var(--turf-2)' : 'var(--turf)'} />
      ))}
      {lines.map((y) => (
        <line key={y} className="yard-line" x1="0" x2="600" y1={y} y2={y} opacity={0.35} />
      ))}
      {Array.from({ length: 30 }, (_, i) => 218 - 56 * 4 + i * 11.2).map((y) => (
        <g key={`h${y}`}>
          <line className="hash" x1="236" x2="244" y1={y} y2={y} />
          <line className="hash" x1="356" x2="364" y1={y} y2={y} />
        </g>
      ))}
      {showLos && (
        <>
          <line x1="0" x2="600" y1="208" y2="208" stroke="#5aa2ff" strokeWidth="2" opacity="0.9" />
          <text x="8" y="202" className="num-label" style={{ fontSize: 10 }}>
            LINHA DE SCRIMMAGE
          </text>
        </>
      )}
      {children}
    </svg>
  );
}

interface HFieldProps {
  /** Jardas até a end zone adversária (ataque vai da esquerda para a direita). */
  ballYtg?: number;
  firstDownYtg?: number;
  /** Marcadores extras (ex.: posição antes da falta). */
  marks?: { ytg: number; label: string; color: string }[];
  label: string;
  height?: number;
}

/** Campo inteiro na horizontal (120 jardas incluindo end zones) para situações de jogo e penalidades. */
export function HorizontalField({ ballYtg, firstDownYtg, marks = [], label, height = 150 }: HFieldProps) {
  const W = 1200;
  const H = 240;
  const x = (ytg: number) => 100 + (100 - ytg) * 10; // ytg=100 → própria linha de gol (x=100)
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  return (
    <svg className="field-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ height: 'auto', maxHeight: height * 1.6 }}>
      <rect width={W} height={H} fill="var(--turf)" />
      <rect width="100" height={H} fill="var(--endzone)" />
      <rect x="1100" width="100" height={H} fill="var(--endzone)" />
      <text x="50" y={H / 2} className="num-label" textAnchor="middle" transform={`rotate(-90 50 ${H / 2})`} style={{ fontSize: 18, letterSpacing: 4 }}>
        PRÓPRIA END ZONE
      </text>
      <text x="1150" y={H / 2} className="num-label" textAnchor="middle" transform={`rotate(90 1150 ${H / 2})`} style={{ fontSize: 18, letterSpacing: 4 }}>
        END ZONE ADVERSÁRIA
      </text>
      {Array.from({ length: 21 }, (_, i) => 100 + i * 50).map((lx) => (
        <line key={lx} className="yard-line" x1={lx} x2={lx} y1="0" y2={H} opacity={lx === 100 || lx === 1100 ? 0.9 : 0.4} />
      ))}
      {nums.map((n, i) => (
        <text key={i} x={200 + i * 100} y={H - 18} className="num-label" textAnchor="middle" style={{ fontSize: 22 }}>
          {n}
        </text>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x(m.ytg)} x2={x(m.ytg)} y1="0" y2={H} stroke={m.color} strokeWidth="4" strokeDasharray="10 6" />
          <text x={x(m.ytg) + 6} y="22" fill="#fff" style={{ fontSize: 16, fontWeight: 700 }}>
            {m.label}
          </text>
        </g>
      ))}
      {firstDownYtg !== undefined && firstDownYtg > 0 && (
        <g>
          <line x1={x(firstDownYtg)} x2={x(firstDownYtg)} y1="0" y2={H} stroke="#f5d90a" strokeWidth="5" />
          <text x={x(firstDownYtg) + 6} y={H - 48} fill="#f5d90a" style={{ fontSize: 16, fontWeight: 700 }}>
            1st down
          </text>
        </g>
      )}
      {ballYtg !== undefined && (
        <g>
          <line x1={x(ballYtg)} x2={x(ballYtg)} y1="0" y2={H} stroke="#5aa2ff" strokeWidth="5" />
          <ellipse cx={x(ballYtg)} cy={H / 2} rx="16" ry="10" fill="#8b4a1c" stroke="#fff" strokeWidth="2" />
          <line x1={x(ballYtg) - 7} x2={x(ballYtg) + 7} y1={H / 2} y2={H / 2} stroke="#fff" strokeWidth="2" />
        </g>
      )}
      <path d="M 560 34 l 30 0 l -8 -8 M 590 34 l -8 8" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" />
      <text x="600" y="40" fill="#fff" style={{ fontSize: 16 }} opacity="0.85">
        direção do ataque
      </text>
    </svg>
  );
}
