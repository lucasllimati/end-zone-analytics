import { useState } from 'react';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { useApp } from '../context/AppContext';
import { num, percent, surfaceLabel } from '../lib/format';
import { PAGE_META } from '../content/pageMeta';

const celsius = (f: number | null | undefined) => (f === null || f === undefined ? '—' : `${num(((f - 32) * 5) / 9)} °C`);

const ROOF: Record<string, string> = { outdoors: 'Aberto', dome: 'Domo', closed: 'Retrátil', open: 'Retrátil' };
/** Valor ausente vira "—" (curto, não estica a coluna como "Não disponível"). */
const dash = (v: number | null | undefined, f: (v: number) => string) => (v === null || v === undefined ? '—' : f(v));

/** Gramado em duas linhas: tipo e, no sintético, a marca (ex.: fieldturf), sem alargar a coluna. */
function Surface({ s }: { s: string | null }) {
  const l = surfaceLabel(s);
  if (!l) return <>—</>;
  if (!l.brand) return <>{l.kind}</>;
  return (
    <span className="cell-2l">
      {l.kind}
      <span className="xsmall muted">{l.brand}</span>
    </span>
  );
}

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
      <Seo {...PAGE_META['/stadiums']} />
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
          { key: 'name', label: 'Estádio', render: (s) => <strong title={s.name}>{s.name}</strong>, value: (s) => s.name },
          { key: 'teams', label: 'Times', width: '5.5rem', render: (s) => (s.teams.length ? <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>{s.teams.map((t) => <TeamLogo key={t} abbr={t} size={20} />)}</span> : <span className="muted small">Neutro</span>), value: (s) => s.teams.join(',') },
          { key: 'roof', label: 'Teto', width: '5rem', render: (s) => (s.roof ? ROOF[s.roof] ?? s.roof : '—') },
          { key: 'surface', label: 'Gramado', width: '7rem', render: (s) => <Surface s={s.surface} />, value: (s) => s.surface },
          { key: 'games', label: 'Jogos', num: true, width: '4.5rem', help: 'Jogos disputados no estádio desde 1999.' },
          { key: 'avgPts', label: 'Pts/jogo', num: true, width: '5.5rem', help: 'Média de pontos somados dos dois times.', render: (s) => dash(s.avgPts, (v) => num(v, 1)), value: (s) => s.avgPts ?? null },
          { key: 'homeWinPct', label: 'Mandante', num: true, width: '6rem', metric: 'homeWinPct', render: (s) => dash(s.homeWinPct, (v) => percent(v, 0)), value: (s) => s.homeWinPct ?? null },
          { key: 'avgTemp', label: 'Temp.', num: true, width: '5rem', help: 'Temperatura média nos jogos com medição (céu aberto ou teto aberto).', render: (s) => celsius(s.avgTemp), value: (s) => s.avgTemp ?? null },
          { key: 'avgWind', label: 'Vento', num: true, width: '5.25rem', expertOnly: true, help: 'Vento médio nos jogos com medição.', render: (s) => dash(s.avgWind, (v) => `${num(v * 1.609)} km/h`), value: (s) => s.avgWind ?? null },
          { key: 'fgPct', label: 'FG%', num: true, width: '5rem', metric: 'fgPct', render: (s) => dash(s.fgPct, (v) => percent(v, 1)), value: (s) => s.fgPct ?? null },
          { key: 'superBowls', label: 'SB', num: true, width: '3.75rem', help: 'Super Bowls disputados no estádio desde 1999.', render: (s) => s.superBowls || '—', value: (s) => s.superBowls },
          { key: 'period', label: 'Período', num: true, width: '6.5rem', help: 'Primeira e última temporada com jogos no estádio (desde 1999).', render: (s) => (s.first === s.last ? s.first : `${s.first}–${s.last}`), value: (s) => s.last },
        ]}
      />
    </div>
  );
}
