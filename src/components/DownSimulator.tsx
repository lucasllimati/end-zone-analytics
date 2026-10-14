import { useState } from 'react';
import { HorizontalField } from './Field';
import { adviseDown, type DownInput } from '../lib/downs';
import { useApp, useModeSensitive } from '../context/AppContext';

const PRESETS: (DownInput & { label: string })[] = [
  { label: '1st & 10', down: 1, distance: 10, yardsToGoal: 75 },
  { label: '2nd & 7', down: 2, distance: 7, yardsToGoal: 62 },
  { label: '3rd & 4', down: 3, distance: 4, yardsToGoal: 45 },
  { label: '3rd & 7', down: 3, distance: 7, yardsToGoal: 70 },
  { label: '4th & 1', down: 4, distance: 1, yardsToGoal: 38 },
  { label: '4th & Goal', down: 4, distance: 2, yardsToGoal: 2 },
];

/** Simulador interativo: o usuário define down, distância e posição; o sistema explica objetivo, opções e risco. */
export function DownSimulator() {
  const { mode } = useApp();
  useModeSensitive();
  const [s, setS] = useState<DownInput>({ down: 3, distance: 7, yardsToGoal: 70 });
  const a = adviseDown(s);
  const fieldLabel = s.yardsToGoal > 50 ? `Própria ${100 - s.yardsToGoal}` : s.yardsToGoal === 50 ? 'Meio de campo' : `Adversária ${s.yardsToGoal}`;
  return (
    <div className="stack-sm">
      <div className="chips" aria-label="Situações prontas">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" aria-pressed={p.down === s.down && p.distance === s.distance && p.yardsToGoal === s.yardsToGoal} onClick={() => setS({ down: p.down, distance: p.distance, yardsToGoal: p.yardsToGoal })}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="filters" style={{ alignItems: 'stretch' }}>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 4 }}>Down (tentativa)</legend>
          <div className="chips">
            {([1, 2, 3, 4] as const).map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={s.down === d} onClick={() => setS({ ...s, down: d })}>
                {d}º
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field" style={{ flex: '1 1 180px' }}>
          Distância para o first down: <strong style={{ color: 'var(--text)' }}>{s.distance} jarda(s)</strong>
          <input type="range" min={1} max={25} value={s.distance} onChange={(e) => setS({ ...s, distance: Number(e.target.value) })} />
        </label>
        <label className="field" style={{ flex: '1 1 220px' }}>
          Posição da bola: <strong style={{ color: 'var(--text)' }}>{fieldLabel}</strong>
          <input type="range" min={1} max={99} value={100 - s.yardsToGoal} onChange={(e) => setS({ ...s, yardsToGoal: 100 - Number(e.target.value) })} aria-valuetext={fieldLabel} />
        </label>
      </div>
      <HorizontalField label={`Situação ${a.headline}, ${a.fieldPosition}`} ballYtg={s.yardsToGoal} firstDownYtg={s.distance >= s.yardsToGoal ? undefined : s.yardsToGoal - s.distance} />
      <div className="grid grid-2">
        <div className="card">
          <div className="eyebrow">Situação</div>
          <h3 style={{ fontSize: '1.6rem', margin: '0 0 6px' }}>{a.headline}</h3>
          <p className="text-2">{a.plain}</p>
          <dl className="kv">
            <dt>Objetivo</dt>
            <dd>{a.objective}</dd>
            <dt>Zona do campo</dt>
            <dd>{a.zoneLabel}</dd>
            <dt>Field goal seria de</dt>
            <dd>
              {a.fgDistance} jardas · chance {a.fgChance}
            </dd>
            <dt>Risco</dt>
            <dd>
              <span className={`badge ${a.risk === 'alto' ? 'live' : a.risk === 'médio' ? 'warn' : 'good'}`}>{a.risk}</span>
            </dd>
          </dl>
          <p className="xsmall muted" style={{ marginTop: 8 }}>
            {a.riskWhy}
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Opções</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack-sm">
            {a.options.map((o) => (
              <li key={o.id}>
                <strong>{o.label}</strong> {o.recommended && <span className="badge good">recomendado</span>}
                <div className="small text-2">{o.note}</div>
              </li>
            ))}
          </ul>
          <div className="callout" style={{ marginTop: 12 }}>
            <div className="callout-title">{mode === 'expert' ? 'Nota técnica' : 'Estratégia'}</div>
            {mode === 'expert' ? a.expert : a.strategy}
          </div>
        </div>
      </div>
      <p className="xsmall muted">Simulador educacional: as probabilidades são faixas aproximadas de médias da era moderna, não um modelo oficial de decisão.</p>
    </div>
  );
}
