import { useState } from 'react';
import { ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { num, percent } from '../lib/format';
import { PAGE_META } from '../content/pageMeta';

export default function Referees() {
  const refs = useAsync(() => api.referees(), []);
  const m = useManifest();
  const [onlyActive, setOnlyActive] = useState(true);
  if (refs.loading) return <Loading height={400} />;
  if (!refs.data?.length) return <Unavailable>Dados de arbitragem não disponíveis.</Unavailable>;
  const current = m.data?.coverage.currentSeason ?? 0;
  const rows = refs.data.filter((r) => !onlyActive || r.to >= current - 1);
  const all = refs.data;
  const totalGames = all.reduce((s, r) => s + r.games, 0);
  const avg = (f: (r: (typeof all)[number]) => number | null) => {
    const w = all.filter((r) => f(r) !== null);
    const g = w.reduce((s, r) => s + r.games, 0);
    return g ? w.reduce((s, r) => s + f(r)! * r.games, 0) / g : null;
  };
  return (
    <div className="stack">
      <Seo {...PAGE_META['/referees']} />
      <PageHeader
        eyebrow="Estatísticas"
        title="Árbitros"
        lede="Quem comanda a equipe de arbitragem em cada jogo e o perfil das partidas que apitou: placar, vantagem de casa e jogos acima do esperado."
      />
      <ModeNote
        beginner={<>Cada jogo tem um árbitro principal (referee), o de boné branco, que lidera a equipe e anuncia as faltas. Diferenças pequenas entre árbitros são normais e quase sempre vêm do acaso.</>}
        expert={<>Árbitros com 16+ jogos desde 1999. “Acima do total” compara os pontos do jogo com a linha de fechamento (exclui pushes). Amostras de algumas dezenas de jogos têm margem de erro de ±10 p.p.</>}
      />
      <div className="tiles">
        <StatTile label="Árbitros na base" value={num(all.length)} />
        <StatTile label="Jogos com árbitro identificado" value={num(totalGames)} />
        <StatTile label="Pontos por jogo (média)" value={num(avg((r) => r.avgPts), 1)} />
        <StatTile label="Vitórias do mandante" value={percent(avg((r) => r.homeWinPct), 1)} metric="homeWinPct" />
      </div>
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Mostrar apenas árbitros em atividade
      </label>
      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        caption="Árbitros principais"
        exportName="arbitros"
        initialSort={{ key: 'games', dir: 'desc' }}
        columns={[
          { key: 'name', label: 'Árbitro', render: (r) => <strong>{r.name}</strong>, value: (r) => r.name },
          { key: 'period', label: 'Período', render: (r) => (r.from === r.to ? r.from : `${r.from}–${r.to}`), value: (r) => r.to },
          { key: 'games', label: 'Jogos', num: true },
          { key: 'playoffs', label: 'Playoffs', num: true },
          { key: 'superBowls', label: 'Super Bowls', num: true },
          { key: 'avgPts', label: 'Pontos/jogo', num: true, help: 'Média de pontos somados dos dois times nos jogos apitados.', render: (r) => num(r.avgPts, 1) },
          { key: 'homeWinPct', label: 'Mandante', num: true, metric: 'homeWinPct', render: (r) => percent(r.homeWinPct, 1) },
          { key: 'overPct', label: 'Acima do total', num: true, metric: 'overPct', render: (r) => percent(r.overPct, 1) },
          { key: 'ot', label: 'Prorrogações', num: true },
        ]}
      />
    </div>
  );
}
