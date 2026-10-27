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
import { norm, score } from '../lib/search';
import type { PlayerIndexEntry, SuperBowl } from '../lib/types';

interface Item {
  id: string;
  title: string;
  kind: string;
  to: string;
  hay: string;
  team?: string;
  weight?: number;
  /** Título alternativo também pontuado (jogadores: sobrenome primeiro, para "allen" achar Josh Allen). */
  alt?: string;
}

/** Como um brasileiro procuraria o termo (a busca também acha pelo nome em inglês). */
const SYNONYMS: Record<string, string> = {
  down: 'descida tentativa',
  'first-down': 'primeira descida primeiro down',
  touchdown: 'gol ponto anotação',
  'field-goal': 'chute gol de campo',
  'extra-point': 'ponto extra chute',
  interception: 'roubo de bola',
  fumble: 'bola solta perda',
  sack: 'derrubada do quarterback',
  turnover: 'perda de posse',
  punt: 'chute de devolução',
  kickoff: 'chute inicial pontapé',
  coverage: 'marcação individual zona',
  offside: 'impedimento',
  'false-start': 'saída falsa',
  blitz: 'pressão',
  clock: 'tempo cronômetro',
};

export function SearchPalette() {
  const { searchOpen, setSearchOpen } = useApp();
  const { data: teams } = useTeams();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [players, setPlayers] = useState<PlayerIndexEntry[]>([]);
  const [sbs, setSbs] = useState<SuperBowl[]>([]);
  const [awarded, setAwarded] = useState<Set<string>>(new Set());
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchOpen) return;
    setQ('');
    setSel(0);
    setTimeout(() => input.current?.focus(), 0);
    api.playerIndex().then(setPlayers).catch(() => {});
    api.superBowls().then(setSbs).catch(() => {});
    api.awards().then((a) => setAwarded(new Set(a.winners.map((w) => w.playerId).filter((x): x is string => Boolean(x))))).catch(() => {});
  }, [searchOpen]);

  const staticItems = useMemo<Item[]>(() => {
    const out: Item[] = [{ id: 'home', title: 'Início', kind: 'Página', to: '/', hay: 'home inicio', weight: 2 }, { id: 'data', title: 'Dados, fontes e atualização', kind: 'Página', to: '/data', hay: 'dados fontes atualizar carga qualidade', weight: 2 }];
    for (const g of NAV) for (const it of g.items) out.push({ id: `p-${it.to}`, title: it.label, kind: 'Página', to: it.to, hay: norm(`${it.desc} ${g.label}`), weight: 3 });
    for (const t of teams.filter((x) => x.active))
      out.push({ id: `t-${t.abbr}`, title: t.name, kind: 'Time', to: `/teams/${t.abbr.toLowerCase()}`, hay: norm(`${t.abbr} ${t.nick} ${t.division}`), team: t.abbr, weight: 5 });
    for (const g of GLOSSARY) out.push({ id: `g-${g.id}`, title: g.term, kind: 'Glossário', to: `/glossary#${g.id}`, hay: norm(`${SYNONYMS[g.id] ?? ''} ${g.simple}`), weight: 2 });
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
    // Jogadores entram na mesma ordenação (antes ficavam sempre no topo: "EPA" abria um jogador).
    // Peso: em atividade e carreira longa sobem — "allen" traz Josh Allen antes de nomes menos conhecidos.
    const newest = players.reduce((m, p) => Math.max(m, p.last ?? 0), 0);
    const ps: Item[] =
      q.trim().length >= 2
        ? players.map((p) => ({
            id: `pl-${p.id}`,
            title: p.name,
            kind: `Jogador · ${p.pos} · ${p.first}–${p.last}`,
            to: `/players/${p.id}`,
            hay: '',
            team: p.team ?? undefined,
            alt: p.name.split(' ').reverse().join(' '),
            weight: ((p.last ?? 0) >= newest - 1 ? 6 : 0) + Math.min(8, (p.last ?? 0) - (p.first ?? 0)) + (awarded.has(p.id) ? 10 : 0),
          }))
        : [];
    return [...staticItems, ...sbItems, ...ps]
      .map((i) => ({ i, s: Math.max(score(i, q), i.alt ? score({ ...i, title: i.alt }, q) : 0) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 16)
      .map((r) => r.i);
  }, [q, staticItems, players, sbs, awarded]);

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
