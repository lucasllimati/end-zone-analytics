import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TeamChip } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useSeason } from '../data/hooks';
import { norm } from '../lib/search';
import { positionBucket } from '../lib/stats';
import { ACTIVE_TEAMS, franchiseOf } from '../lib/teams';
import { PAGE_META } from '../content/pageMeta';

const GROUPS = [
  { id: '', label: 'Todas' },
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'OL', label: 'OL' },
  { id: 'DL', label: 'DL' },
  { id: 'LB', label: 'LB' },
  { id: 'DB', label: 'DB' },
  { id: 'K', label: 'K' },
  { id: 'P', label: 'P' },
];

export default function Players() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const pos = params.get('pos') ?? '';
  const team = params.get('team') ?? '';
  const [onlySeason, setOnlySeason] = useState(false);
  const { season } = useSeason();
  const index = useAsync(() => api.playerIndex(), []);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const rows = useMemo(() => {
    const t = norm(q.trim());
    return (index.data ?? []).filter(
      (p) =>
        (!t || norm(p.name).includes(t)) &&
        (!pos || positionBucket(p.pos) === pos) &&
        (!team || (p.team && franchiseOf(p.team) === team)) &&
        (!onlySeason || (season !== null && (p.first ?? 0) <= season && (p.last ?? 0) >= season)),
    );
  }, [index.data, q, pos, team, onlySeason, season]);

  return (
    <div>
      <Seo {...PAGE_META['/players']} />
      <PageHeader eyebrow="Busca de jogadores" title="Jogadores" lede="Todos os jogadores com estatísticas desde 1999. Filtre por nome, posição e time; clique para ver a carreira completa." />
      <div className="filters">
        <label className="field" style={{ flex: '1 1 240px' }}>
          Nome
          <input className="input" type="search" value={q} placeholder="Ex.: Mahomes, Jefferson, Watt…" onChange={(e) => set('q', e.target.value)} />
        </label>
        <label className="field">
          Time (mais recente)
          <select className="select" value={team} onChange={(e) => set('team', e.target.value)}>
            <option value="">Todos</option>
            {ACTIVE_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="row small" style={{ gap: 6, alignSelf: 'center' }}>
          <input type="checkbox" checked={onlySeason} onChange={(e) => setOnlySeason(e.target.checked)} /> Atuou em {season}
        </label>
      </div>
      <div className="chips" role="group" aria-label="Posição" style={{ marginBottom: 16 }}>
        {GROUPS.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={pos === g.id} onClick={() => set('pos', g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      {index.loading ? (
        <Loading height={400} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          caption="Resultados da busca de jogadores"
          exportName="jogadores"
          columns={[
            { key: 'name', label: 'Jogador', render: (r) => <Link to={`/players/${r.id}`}><strong>{r.name}</strong></Link>, value: (r) => r.name },
            { key: 'pos', label: 'Posição', render: (r) => r.pos },
            { key: 'team', label: 'Último time', render: (r) => (r.team ? <TeamChip abbr={r.team} short size={18} /> : '—'), value: (r) => r.team },
            { key: 'first', label: 'Primeira', num: true, help: 'Primeira temporada com estatísticas na base (a partir de 1999).', render: (r) => r.first ?? '—' },
            { key: 'last', label: 'Última', num: true, render: (r) => r.last ?? '—' },
          ]}
        />
      )}
    </div>
  );
}
