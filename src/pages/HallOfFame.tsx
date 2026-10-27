import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { DraftTeamLogo } from '../components/TeamLogo';
import { draftFranchise } from '../lib/teams';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { PAGE_META } from '../content/pageMeta';

export default function HallOfFame() {
  const draft = useAsync(() => api.draft(), []);
  const [pos, setPos] = useState('');
  const hof = useMemo(() => (draft.data ?? []).filter((d) => d.hof), [draft.data]);
  const byPos = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of hof) m.set(d.pos, (m.get(d.pos) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [hof]);
  const byRound = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => ({ r, n: hof.filter((d) => d.round === r).length })).filter((x) => x.n), [hof]);
  if (draft.loading) return <Loading height={400} />;
  const rows = pos ? hof.filter((d) => d.pos === pos) : hof;
  return (
    <div className="stack">
      <Seo {...PAGE_META['/hall-of-fame']} />
      <PageHeader eyebrow="Pro Football Hall of Fame" title="Hall of Fame" lede="O Hall da Fama do futebol americano profissional fica em Canton, Ohio — onde a NFL foi fundada, em 1920." />
      <Callout title="Cobertura desta página">
        Esta lista mostra os <strong>{hof.length} membros do Hall of Fame escolhidos no draft desde 1980</strong> (dados do nflverse/PFR). Jogadores de antes de 1980, não draftados (ex.: Kurt Warner) e
        técnicos/dirigentes não aparecem aqui. Não completamos a lista com dados não verificados.
      </Callout>
      <div className="grid grid-2">
        <div className="card">
          <h3>Por posição</h3>
          <BarList ariaLabel="Membros por posição" items={byPos.slice(0, 10).map(([p, n]) => ({ key: p, value: n, label: p }))} />
        </div>
        <div className="card">
          <h3>Por rodada do draft</h3>
          <BarList ariaLabel="Membros por rodada" items={byRound.map(({ r, n }) => ({ key: String(r), value: n, label: `${r}ª rodada`, color: 'var(--series-3)' }))} />
          <p className="xsmall muted" style={{ marginTop: 8 }}>
            Até 1992 o draft tinha mais de 7 rodadas.
          </p>
        </div>
      </div>
      <div className="filters">
        <label className="field">
          Posição
          <select className="select" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="">Todas</option>
            {byPos.map(([p]) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <DataTable
        rows={rows}
        rowKey={(d) => `${d.season}-${d.pick}`}
        caption="Membros do Hall of Fame draftados desde 1980"
        exportName="hall-of-fame"
        initialSort={{ key: 'carAv', dir: 'desc' }}
        columns={[
          { key: 'name', label: 'Jogador', render: (d) => (d.id ? <Link to={`/players/${d.id}`}>{d.name}</Link> : <strong>{d.name}</strong>), value: (d) => d.name },
          { key: 'pos', label: 'Pos.' },
          { key: 'team', label: 'Time que draftou', render: (d) => <DraftTeamLogo code={d.team} season={d.season} />, value: (d) => draftFranchise(d.team, d.season) ?? d.team },
          { key: 'season', label: 'Draft', num: true },
          { key: 'pick', label: 'Escolha', num: true, render: (d) => `${d.round}ª · #${d.pick}`, value: (d) => d.pick },
          { key: 'college', label: 'Universidade', render: (d) => d.college ?? '—' },
          { key: 'to', label: 'Última temp.', num: true, render: (d) => d.to ?? '—' },
          { key: 'games', label: 'Jogos', num: true, render: (d) => d.games ?? '—' },
          { key: 'proBowls', label: 'Pro Bowls', num: true },
          { key: 'allPro', label: 'All-Pro', num: true },
          { key: 'carAv', label: 'AV', metric: 'carAv', num: true, render: (d) => d.carAv ?? '—' },
        ]}
      />
    </div>
  );
}
