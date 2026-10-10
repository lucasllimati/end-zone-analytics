import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTeams } from '../data/hooks';
import { api } from '../data/client';
import { NAV } from '../content/nav';
import { GLOSSARY } from '../content/glossary';
import { PENALTIES } from '../content/penalties';
import { POSITIONS } from '../content/positions';
import { PLAYS } from '../content/playbook';
import { STRATEGY } from '../content/strategy';
import { BASICS, ADVANCED } from '../content/rules';
import { TeamLogo } from './TeamLogo';
import type { PlayerIndexEntry, SuperBowl } from '../lib/types';

interface Item {
  id: string;
  title: string;
  kind: string;
  to: string;
  hay: string;
  team?: string;
  weight?: number;
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Pontuação de relevância: prefixo > início de palavra > contém; todos os termos precisam aparecer. */
export function score(item: { title: string; hay: string; weight?: number }, q: string): number {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const title = norm(item.title);
  let s = 0;
  for (const t of terms) {
    if (title.startsWith(t)) s += 30;
    else if (title.includes(` ${t}`)) s += 20;
    else if (title.includes(t)) s += 12;
    else if (item.hay.includes(t)) s += 4;
    else return 0;
  }
  return s + (item.weight ?? 0);
}

export function SearchPalette() {
  const { searchOpen, setSearchOpen } = useApp();
  const { data: teams } = useTeams();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [players, setPlayers] = useState<PlayerIndexEntry[]>([]);
  const [sbs, setSbs] = useState<SuperBowl[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchOpen) return;
    setQ('');
    setSel(0);
    setTimeout(() => input.current?.focus(), 0);
    api.playerIndex().then(setPlayers).catch(() => {});
    api.superBowls().then(setSbs).catch(() => {});
  }, [searchOpen]);

  const staticItems = useMemo<Item[]>(() => {
    const out: Item[] = [{ id: 'home', title: 'Início', kind: 'Página', to: '/', hay: 'home inicio', weight: 2 }, { id: 'data', title: 'Dados, fontes e atualização', kind: 'Página', to: '/data', hay: 'dados fontes atualizar carga qualidade', weight: 2 }];
    for (const g of NAV) for (const it of g.items) out.push({ id: `p-${it.to}`, title: it.label, kind: 'Página', to: it.to, hay: norm(`${it.desc} ${g.label}`), weight: 3 });
    for (const t of teams.filter((x) => x.active))
      out.push({ id: `t-${t.abbr}`, title: t.name, kind: 'Time', to: `/teams/${t.abbr.toLowerCase()}`, hay: norm(`${t.abbr} ${t.nick} ${t.division}`), team: t.abbr, weight: 5 });
    for (const g of GLOSSARY) out.push({ id: `g-${g.id}`, title: g.term, kind: 'Glossário', to: `/glossary#${g.id}`, hay: norm(g.simple) });
    for (const p of PENALTIES) out.push({ id: `pen-${p.id}`, title: `${p.name} (${p.pt})`, kind: 'Falta', to: `/rules#falta-${p.id}`, hay: norm(p.simple) });
    for (const p of POSITIONS) out.push({ id: `pos-${p.id}`, title: `${p.abbr} — ${p.name}`, kind: 'Posição', to: `/positions?pos=${p.id}`, hay: norm(`${p.pt} ${p.simple}`) });
    for (const p of PLAYS) out.push({ id: `play-${p.id}`, title: p.name, kind: 'Playbook', to: `/playbook?play=${p.id}`, hay: norm(`${p.category} ${p.simple}`) });
    for (const s of STRATEGY) out.push({ id: `st-${s.id}`, title: s.title, kind: 'Estratégia', to: `/strategy#${s.id}`, hay: norm(s.simple) });
    for (const l of [...BASICS, ...ADVANCED]) out.push({ id: `r-${l.id}`, title: l.title.replace(/^\d+\.\s*/, ''), kind: 'Regra', to: BASICS.includes(l) ? `/learn#${l.id}` : `/rules#${l.id}`, hay: norm(l.body.join(' ')) });
    return out;
  }, [teams]);

  const results = useMemo(() => {
    if (!q.trim()) return staticItems.filter((i) => i.kind === 'Página').slice(0, 12);
    const sbItems: Item[] = sbs.map((s) => ({
      id: `sb-${s.number}`,
      title: `Super Bowl ${s.roman} (${s.season})`,
      kind: 'Super Bowl',
      to: `/super-bowl/${s.number}`,
      hay: norm(`${s.winnerName} ${s.loserName} ${s.mvp} ${s.stadium} ${s.city} super bowl ${s.number}`),
      team: s.winner,
    }));
    const pool = [...staticItems, ...sbItems];
    const ranked = pool
      .map((i) => ({ i, s: score(i, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((r) => r.i);
    if (q.trim().length >= 2) {
      const nq = norm(q.trim());
      const ps = players
        .filter((p) => norm(p.name).includes(nq))
        .slice(0, 8)
        .map<Item>((p) => ({ id: `pl-${p.id}`, title: p.name, kind: `Jogador · ${p.pos} · ${p.first}–${p.last}`, to: `/players/${p.id}`, hay: '', team: p.team ?? undefined }));
      return [...ps.slice(0, 6), ...ranked].slice(0, 16);
    }
    return ranked;
  }, [q, staticItems, players, sbs]);

  useEffect(() => setSel(0), [q]);

  if (!searchOpen) return null;
  const go = (it: Item) => {
    setSearchOpen(false);
    navigate(it.to);
  };
  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSearchOpen(false)}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Busca global">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque jogador, time, Super Bowl, regra, posição, termo…"
          aria-label="Buscar"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[sel] ? `opt-${results[sel].id}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchOpen(false);
            else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === 'Enter' && results[sel]) go(results[sel]);
          }}
        />
        <ul id="palette-list" role="listbox">
          {results.map((r, i) => (
            <li key={r.id} id={`opt-${r.id}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)}>
              <Link to={r.to} onClick={() => setSearchOpen(false)} tabIndex={-1}>
                {r.team ? <TeamLogo abbr={r.team} size={20} /> : <span style={{ width: 20 }} />}
                <span>{r.title}</span>
                <span className="kind">{r.kind}</span>
              </Link>
            </li>
          ))}
          {results.length === 0 && <li className="muted small" style={{ padding: 12 }}>Nada encontrado para “{q}”.</li>}
        </ul>
        <div className="hint">
          <kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar
        </div>
      </div>
    </div>
  );
}
