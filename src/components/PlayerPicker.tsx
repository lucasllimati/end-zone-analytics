import { useId, useMemo, useState } from 'react';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { norm } from './SearchPalette';
import type { PlayerIndexEntry } from '../lib/types';

/** Campo de busca com sugestões (combobox acessível) para escolher um jogador. */
export function PlayerPicker({ label, value, onChange }: { label: string; value: string | null; onChange: (id: string) => void }) {
  const index = useAsync(() => api.playerIndex(), []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const id = useId();
  const current = index.data?.find((p) => p.id === value);
  const results = useMemo<PlayerIndexEntry[]>(() => {
    const t = norm(q.trim());
    if (t.length < 2) return [];
    return (index.data ?? []).filter((p) => norm(p.name).includes(t)).slice(0, 8);
  }, [q, index.data]);
  const pick = (p: PlayerIndexEntry) => {
    onChange(p.id);
    setQ('');
    setOpen(false);
  };
  return (
    <div className="field" style={{ position: 'relative', minWidth: 240, flex: '1 1 240px' }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        placeholder={current ? `${current.name} (${current.pos})` : 'Digite o nome…'}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setSel(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setSel((s) => Math.min(s + 1, results.length - 1));
          else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
          else if (e.key === 'Enter' && results[sel]) {
            e.preventDefault();
            pick(results[sel]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {current && !q && <span className="xsmall" style={{ color: 'var(--text-2)' }}>Selecionado: {current.name} · {current.pos} · {current.first}–{current.last}</span>}
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="menu-list" style={{ left: 0, right: 0, top: '100%', listStyle: 'none', margin: 0 }}>
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === sel}>
              <button type="button" style={{ width: '100%', background: i === sel ? 'var(--surface-2)' : undefined }} onMouseDown={() => pick(p)}>
                {p.name} <span className="muted xsmall">· {p.pos} · {p.team ?? '—'} · {p.first}–{p.last}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
