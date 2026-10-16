import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DiagramField } from '../components/Field';
import { FORMATIONS, POSITIONS, type Unit } from '../content/positions';
import { useApp, useModeSensitive } from '../context/AppContext';

const UNITS: { id: Unit; label: string }[] = [
  { id: 'offense', label: 'Ataque' },
  { id: 'defense', label: 'Defesa' },
  { id: 'special', label: 'Times especiais' },
];

export default function Positions() {
  const [params, setParams] = useSearchParams();
  const initialPos = params.get('pos');
  const initialUnit = POSITIONS.find((p) => p.id === initialPos)?.unit ?? 'offense';
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [sel, setSel] = useState<string>(initialPos ?? 'QB');
  const { mode } = useApp();
  useModeSensitive();
  const f = FORMATIONS[unit];
  const pos = POSITIONS.find((p) => p.id === sel) ?? POSITIONS[0];
  const choose = (id: string) => {
    setSel(id);
    setParams({ pos: id }, { replace: true });
  };
  return (
    <div className="stack">
      <Seo title="Posições" description="Todas as posições do futebol americano explicadas em um campo interativo: ataque, defesa e times especiais." />
      <PageHeader eyebrow="Aprenda" title="Posições" lede="Passe o mouse, toque ou use Tab nos jogadores do campo para ver a função de cada posição." />
      <div className="chips" role="group" aria-label="Unidade">
        {UNITS.map((u) => (
          <button key={u.id} type="button" className="chip" aria-pressed={unit === u.id} onClick={() => setUnit(u.id)}>
            {u.label}
          </button>
        ))}
      </div>
      <div className="two-col">
        <div className="card" style={{ padding: 12 }}>
          <div className="small muted" style={{ margin: '4px 4px 8px' }}>
            {f.title}
          </div>
          <DiagramField interactive label={`Campo com a formação: ${f.title}`}>
            {f.dots.map((d, i) => {
              const def = POSITIONS.find((p) => p.id === d.pos)!;
              const active = sel === d.pos;
              return (
                <g
                  key={i}
                  className={`player-dot${active ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.label}: ${def.name}`}
                  aria-pressed={active}
                  onMouseEnter={() => setSel(d.pos)}
                  onFocus={() => setSel(d.pos)}
                  onClick={() => choose(d.pos)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(d.pos))}
                >
                  <circle cx={d.x} cy={d.y} r={12} fill={d.team === 'off' ? '#f4f4f2' : '#1b1b1b'} />
                  <text x={d.x} y={d.y} dy="0.35em" textAnchor="middle" fill={d.team === 'off' ? '#111' : '#fff'}>
                    {d.label}
                  </text>
                </g>
              );
            })}
          </DiagramField>
          <p className="xsmall muted" style={{ margin: '8px 4px 0' }}>
            {f.note} Ataque em branco, avançando para cima.
          </p>
        </div>
        <aside className="card" aria-live="polite">
          <div className="eyebrow">{UNITS.find((u) => u.id === pos.unit)?.label}</div>
          <h2 style={{ marginBottom: 2 }}>
            {pos.abbr} — {pos.name}
          </h2>
          <div className="small muted">{pos.pt}</div>
          <p className="text-2" style={{ marginTop: 10 }}>
            {pos.simple}
          </p>
          <h3 className="small muted">Responsabilidades</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {pos.duties.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <h3 className="small muted">Movimentação típica</h3>
          <p className="small">{pos.movement}</p>
          {mode === 'expert' && (
            <div className="callout expert">
              <div className="callout-title">Nota técnica</div>
              {pos.expert}
            </div>
          )}
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Porte típico</dt>
            <dd>{pos.size}</dd>
            <dt>Exemplos</dt>
            <dd>{pos.examples}</dd>
          </dl>
          <Link to={`/players?pos=${['OT', 'OG', 'C'].includes(pos.id) ? 'OL' : ['DE', 'DT', 'NT', 'EDGE'].includes(pos.id) ? 'DL' : ['MLB', 'OLB'].includes(pos.id) ? 'LB' : ['CB', 'S', 'FS', 'SS'].includes(pos.id) ? 'DB' : pos.id}`} className="btn sm" style={{ marginTop: 12 }}>
            Ver jogadores da posição
          </Link>
        </aside>
      </div>
      <ModeNote beginner={<>Cada time tem 11 jogadores em campo. Os times usam grupos diferentes para atacar, defender e chutar — por isso um elenco tem 53 jogadores.</>} />
      <section>
        <h2>Todas as posições</h2>
        {UNITS.map((u) => (
          <div key={u.id} style={{ marginBottom: 16 }}>
            <h3 className="small muted">{u.label}</h3>
            {/* 4 colunas, exceto quando sobraria 1 posição sozinha na última linha (ex.: 5 → 3 + 2). */}
            <div className={`grid ${POSITIONS.filter((p) => p.unit === u.id).length % 4 === 1 ? 'grid-3' : 'grid-4'}`}>
              {POSITIONS.filter((p) => p.unit === u.id).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="tile"
                  style={{ textAlign: 'left', cursor: 'pointer', borderColor: sel === p.id ? 'var(--accent)' : undefined }}
                  onClick={() => {
                    setUnit(p.unit);
                    choose(p.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div style={{ fontWeight: 650 }}>
                    {p.abbr} <span className="muted small">· {p.name}</span>
                  </div>
                  <div className="small text-2">{p.simple}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
