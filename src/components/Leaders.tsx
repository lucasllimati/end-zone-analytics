import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlayerSeasonLine } from '../lib/types';
import { BarList } from './charts/BarList';
import { InfoTip } from './InfoTip';
import { TeamLogo } from './TeamLogo';
import { metric } from '../content/metrics';
import { num } from '../lib/format';
import { derived } from '../lib/stats';

export interface LeaderCat {
  key: string;
  label: string;
  stats: { key: string; min?: (l: PlayerSeasonLine) => boolean; value?: (l: PlayerSeasonLine) => number | null; digits?: number; asc?: boolean }[];
}

/** Mínimos de volume para métricas de taxa (evita líderes com 3 tentativas). */
const qualQB = (l: PlayerSeasonLine) => l.att >= l.games * 14 && l.att >= 50;
const qualRB = (l: PlayerSeasonLine) => l.carries >= l.games * 6.25 && l.carries >= 30;

export const LEADER_CATS: LeaderCat[] = [
  { key: 'pass', label: 'Passe', stats: [{ key: 'passYds' }, { key: 'passTd' }, { key: 'rating', min: qualQB, value: (l) => derived(l).rating, digits: 1 }, { key: 'epaPerDb', min: qualQB, value: (l) => derived(l).epaPerDb, digits: 3 }, { key: 'cmpPct', min: qualQB, value: (l) => derived(l).cmpPct, digits: 3 }, { key: 'int' }] },
  { key: 'rush', label: 'Corrida', stats: [{ key: 'rushYds' }, { key: 'rushTd' }, { key: 'ypc', min: qualRB, value: (l) => derived(l).ypc, digits: 1 }, { key: 'scrimYds', value: (l) => l.rushYds + l.recYds }] },
  { key: 'rec', label: 'Recepção', stats: [{ key: 'recYds' }, { key: 'rec' }, { key: 'recTd' }, { key: 'yac' }, { key: 'tgt' }] },
  { key: 'def', label: 'Defesa', stats: [{ key: 'sacks', digits: 1 }, { key: 'tackles' }, { key: 'defInt' }, { key: 'ff' }, { key: 'tfl' }, { key: 'defTd' }] },
  { key: 'st', label: 'Times especiais', stats: [{ key: 'fgm' }, { key: 'fgPct', min: (l) => l.fga >= 15, value: (l) => derived(l).fgPct, digits: 3 }, { key: 'fgLong' }, { key: 'puntAvg', min: (l) => l.punts >= 20, value: (l) => derived(l).puntAvg, digits: 1 }] },
];

export function topBy(lines: PlayerSeasonLine[], stat: LeaderCat['stats'][number], n = 5) {
  const val = stat.value ?? ((l: PlayerSeasonLine) => (l[stat.key as keyof PlayerSeasonLine] as number | null) ?? null);
  return lines
    .filter((l) => (stat.min ? stat.min(l) : true))
    .map((l) => ({ l, v: val(l) }))
    .filter((x): x is { l: PlayerSeasonLine; v: number } => x.v !== null && x.v !== undefined && x.v > 0)
    .sort((a, b) => (stat.asc ? a.v - b.v : b.v - a.v))
    .slice(0, n);
}

const fmtVal = (key: string, v: number, digits?: number) => {
  const d = metric(key);
  if (d.format === 'pct') return `${num(v * 100, 1)}%`;
  if (d.format === 'signed') return `${v > 0 ? '+' : ''}${num(v, digits ?? d.digits ?? 0)}`;
  return num(v, digits ?? d.digits ?? 0);
};

/** Painel de líderes por categoria, com abas e ⓘ em cada estatística. */
export function LeadersPanel({ lines, n = 5, compact = false }: { lines: PlayerSeasonLine[]; n?: number; compact?: boolean }) {
  const [cat, setCat] = useState(LEADER_CATS[0].key);
  const c = LEADER_CATS.find((x) => x.key === cat)!;
  const stats = compact ? c.stats.slice(0, 2) : c.stats;
  return (
    <div>
      <div className="chips" role="group" aria-label="Categoria de líderes" style={{ marginBottom: 12 }}>
        {LEADER_CATS.map((x) => (
          <button key={x.key} type="button" className="chip" aria-pressed={cat === x.key} onClick={() => setCat(x.key)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className={compact ? 'grid grid-2' : 'grid grid-3'}>
        {stats.map((s) => {
          const top = topBy(lines, s, n);
          const def = metric(s.key);
          return (
            <div key={s.key}>
              <h3 className="row" style={{ gap: 6, fontSize: '0.92rem' }}>
                {def.label}
                <InfoTip metric={s.key} />
              </h3>
              {top.length === 0 ? (
                <p className="small muted">Dados não disponíveis.</p>
              ) : (
                <BarList
                  ariaLabel={`Líderes em ${def.label}`}
                  items={top.map(({ l, v }) => ({
                    key: l.id,
                    value: v,
                    display: fmtVal(s.key, v, s.digits),
                    label: (
                      <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <TeamLogo abbr={l.team} size={16} />
                        <Link to={`/players/${l.id}`}>{l.name}</Link>
                      </span>
                    ),
                  }))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
