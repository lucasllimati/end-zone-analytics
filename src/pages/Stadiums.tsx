import { useState } from 'react';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';

const ROOF: Record<string, string> = { outdoors: 'Aberto', dome: 'Domo', closed: 'Retrátil', open: 'Retrátil' };
const SURF = (s: string | null) => (!s ? '—' : s === 'grass' ? 'Grama natural' : `Sintético (${s})`);

export default function Stadiums() {
  const st = useAsync(() => api.stadiums(), []);
  const m = useManifest();
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  if (st.loading) return <Loading height={400} />;
  const current = m.data?.coverage.currentSeason ?? 0;
  const rows = (st.data ?? []).filter((s) => !onlyCurrent || (s.last >= current - 1 && s.teams.length > 0));
  return (
    <div className="stack">
      <Seo title="Estádios" description="Estádios da NFL: times, tipo de teto, gramado, jogos e Super Bowls disputados desde 1999." />
      <PageHeader eyebrow="Estádios" title="Estádios da NFL" lede="Onde os jogos acontecem: teto, tipo de gramado e histórico de uso desde 1999 (inclui jogos internacionais e campos neutros)." />
      <ModeNote
        beginner={<>Estádios com domo ou teto retrátil protegem do frio e do vento — o que favorece passes e chutes. Gramado sintético costuma deixar o jogo mais rápido.</>}
        expert={<>Teto e superfície = valor mais frequente nos 10 jogos mais recentes do estádio. Capacidade não consta na base e não é exibida.</>}
      />
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={onlyCurrent} onChange={(e) => setOnlyCurrent(e.target.checked)} /> Mostrar apenas estádios em uso
      </label>
      <DataTable
        rows={rows}
        rowKey={(s) => s.id}
        caption="Estádios"
        exportName="estadios"
        columns={[
          { key: 'name', label: 'Estádio', render: (s) => <strong>{s.name}</strong>, value: (s) => s.name },
          { key: 'teams', label: 'Times', render: (s) => (s.teams.length ? <span className="row" style={{ gap: 4 }}>{s.teams.map((t) => <TeamLogo key={t} abbr={t} size={20} />)}</span> : <span className="muted small">Campo neutro</span>), value: (s) => s.teams.join(',') },
          { key: 'roof', label: 'Teto', render: (s) => (s.roof ? ROOF[s.roof] ?? s.roof : '—') },
          { key: 'surface', label: 'Gramado', render: (s) => SURF(s.surface) },
          { key: 'games', label: 'Jogos (1999+)', num: true },
          { key: 'superBowls', label: 'Super Bowls (1999+)', num: true },
          { key: 'first', label: 'Primeiro', num: true },
          { key: 'last', label: 'Último', num: true },
        ]}
      />
    </div>
  );
}
