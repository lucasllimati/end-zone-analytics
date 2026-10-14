import { useState } from 'react';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { useApp } from '../context/AppContext';
import { num, percent } from '../lib/format';

const celsius = (f: number | null | undefined) => (f === null || f === undefined ? '—' : `${num(((f - 32) * 5) / 9)} °C`);

const ROOF: Record<string, string> = { outdoors: 'Aberto', dome: 'Domo', closed: 'Retrátil', open: 'Retrátil' };
const SURF = (s: string | null) => (!s ? '—' : s === 'grass' ? 'Grama natural' : `Sintético (${s})`);

export default function Stadiums() {
  const st = useAsync(() => api.stadiums(), []);
  const m = useManifest();
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const { mode } = useApp();
  if (st.loading) return <Loading height={400} />;
  const current = m.data?.coverage.currentSeason ?? 0;
  const rows = (st.data ?? []).filter((s) => !onlyCurrent || (s.last >= current - 1 && s.teams.length > 0));
  return (
    <div className="stack">
      <Seo title="Estádios" description="Estádios da NFL: times, teto, gramado, clima, pontos por jogo, vantagem do mandante, aproveitamento de field goals e Super Bowls desde 1999." />
      <PageHeader eyebrow="Estádios" title="Estádios da NFL" lede="Onde os jogos acontecem: teto, gramado, clima, placar médio, vantagem do mandante e aproveitamento dos chutes, desde 1999 (inclui jogos internacionais e campos neutros)." />
      <ModeNote
        beginner={<>Estádios com domo ou teto retrátil protegem do frio e do vento — o que favorece passes e chutes. Gramado sintético costuma deixar o jogo mais rápido.</>}
        expert={<>Teto e superfície = valor mais frequente nos 10 jogos mais recentes do estádio. Clima = média dos jogos com medição (estádios cobertos não têm). FG% a partir das estatísticas por jogo (mínimo de 20 tentativas). Capacidade não consta na base.</>}
      />
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={onlyCurrent} onChange={(e) => setOnlyCurrent(e.target.checked)} /> Mostrar apenas estádios em uso
      </label>
      <DataTable
        rows={rows}
        rowKey={(s) => s.id}
        caption="Estádios"
        exportName="estadios"
        expert={mode === 'expert'}
        columns={[
          { key: 'name', label: 'Estádio', render: (s) => <strong>{s.name}</strong>, value: (s) => s.name },
          { key: 'teams', label: 'Times', render: (s) => (s.teams.length ? <span className="row" style={{ gap: 4 }}>{s.teams.map((t) => <TeamLogo key={t} abbr={t} size={20} />)}</span> : <span className="muted small">Campo neutro</span>), value: (s) => s.teams.join(',') },
          { key: 'roof', label: 'Teto', render: (s) => (s.roof ? ROOF[s.roof] ?? s.roof : '—') },
          { key: 'surface', label: 'Gramado', render: (s) => SURF(s.surface) },
          { key: 'games', label: 'Jogos (1999+)', num: true },
          { key: 'avgPts', label: 'Pontos/jogo', num: true, help: 'Média de pontos somados dos dois times.', render: (s) => num(s.avgPts ?? null, 1), value: (s) => s.avgPts ?? null },
          { key: 'homeWinPct', label: 'Mandante', num: true, metric: 'homeWinPct', render: (s) => percent(s.homeWinPct ?? null, 0), value: (s) => s.homeWinPct ?? null },
          { key: 'avgTemp', label: 'Temp. média', num: true, help: 'Temperatura média nos jogos com medição (céu aberto ou teto aberto).', render: (s) => celsius(s.avgTemp), value: (s) => s.avgTemp ?? null },
          { key: 'avgWind', label: 'Vento médio', num: true, expertOnly: true, help: 'Vento médio (mph) nos jogos com medição.', render: (s) => (s.avgWind == null ? '—' : `${num(s.avgWind, 1)} mph`), value: (s) => s.avgWind ?? null },
          { key: 'fgPct', label: 'FG%', num: true, metric: 'fgPct', render: (s) => percent(s.fgPct ?? null, 1), value: (s) => s.fgPct ?? null },
          { key: 'superBowls', label: 'Super Bowls (1999+)', num: true },
          { key: 'first', label: 'Primeiro', num: true },
          { key: 'last', label: 'Último', num: true },
        ]}
      />
    </div>
  );
}
