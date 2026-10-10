import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { ColumnChart } from '../components/charts/ColumnChart';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync, useTeams } from '../data/hooks';
import { useTeamColor } from '../data/useTeamColor';
import { dateBR } from '../lib/format';
import type { SuperBowl } from '../lib/types';

export default function SuperBowlPage() {
  const sbs = useAsync(() => api.superBowls(), []);
  const { map } = useTeams();
  const [team, setTeam] = useState('');
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const chartRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();
  const teamColor = useTeamColor();
  const list = sbs.data ?? [];
  const filtered = team ? list.filter((s) => s.winner === team || s.loser === team) : list;

  const stats = useMemo(() => {
    if (!list.length) return null;
    const by = <T,>(f: (s: SuperBowl) => T, cmp: (a: T, b: T) => number) => [...list].sort((a, b) => cmp(f(a), f(b)))[0];
    const titles = new Map<string, number>();
    const apps = new Map<string, number>();
    const mvps = new Map<string, number>();
    for (const s of list) {
      titles.set(s.winner, (titles.get(s.winner) ?? 0) + 1);
      apps.set(s.winner, (apps.get(s.winner) ?? 0) + 1);
      apps.set(s.loser, (apps.get(s.loser) ?? 0) + 1);
      for (const m of s.mvp.split(' e ')) mvps.set(m, (mvps.get(m) ?? 0) + 1);
    }
    return {
      highest: by((s) => s.winnerScore + s.loserScore, (a, b) => b - a),
      lowest: by((s) => s.winnerScore + s.loserScore, (a, b) => a - b),
      blowout: by((s) => s.winnerScore - s.loserScore, (a, b) => b - a),
      closest: list.filter((s) => s.winnerScore - s.loserScore === Math.min(...list.map((x) => x.winnerScore - x.loserScore))),
      ot: list.filter((s) => s.ot),
      titles: [...titles.entries()].sort((a, b) => b[1] - a[1]),
      apps: [...apps.entries()].sort((a, b) => b[1] - a[1]),
      mvps: [...mvps.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]),
      never: [...map.values()].filter((t) => t.active && !apps.has(t.abbr)).map((t) => t.abbr),
      neverWon: [...map.values()].filter((t) => t.active && apps.has(t.abbr) && !titles.has(t.abbr)).map((t) => t.abbr),
    };
  }, [list, map]);

  if (sbs.loading || !stats) return <Loading height={400} />;
  return (
    <div className="stack">
      <Seo title="Super Bowl" description="Todos os Super Bowls, do I ao LX: campeões, placares, MVPs, estádios, recordes e linha do tempo." />
      <PageHeader eyebrow={`${list.length} edições`} title="Super Bowl" lede="A final da NFL desde a temporada de 1966. Clique em uma edição para ver detalhes, ou em uma barra do gráfico." />
      <ModeNote beginner={<>O Super Bowl é jogado em fevereiro e leva o número romano da edição. A “temporada” é o ano em que ela começou: o Super Bowl LX (fevereiro de 2026) encerrou a temporada 2025.</>} />
      <div className="tiles">
        <StatTile label="Mais títulos" value={<span className="row" style={{ gap: 6 }}>{stats.titles.filter((t) => t[1] === stats.titles[0][1]).map(([t]) => <TeamLogo key={t} abbr={t} size={28} />)} {stats.titles[0][1]}</span>} note={stats.titles.filter((t) => t[1] === stats.titles[0][1]).map(([t]) => map.get(t)?.nick ?? t).join(' e ')} />
        <StatTile label="Maior pontuação combinada" value={stats.highest.winnerScore + stats.highest.loserScore} note={`SB ${stats.highest.roman}: ${stats.highest.winnerName} ${stats.highest.winnerScore} × ${stats.highest.loserScore}`} />
        <StatTile label="Maior diferença" value={stats.blowout.winnerScore - stats.blowout.loserScore} note={`SB ${stats.blowout.roman}: ${stats.blowout.winnerScore} × ${stats.blowout.loserScore}`} />
        <StatTile label="Mais equilibrado" value={`${stats.closest[0].winnerScore - stats.closest[0].loserScore} ponto`} note={stats.closest.map((s) => `SB ${s.roman} (${s.winnerScore} × ${s.loserScore})`).join(', ')} />
        <StatTile label="Decididos na prorrogação" value={stats.ot.length} note={stats.ot.map((s) => `SB ${s.roman}`).join(', ')} />
      </div>

      <div className="card">
        <ChartFrame
          title="Diferença de pontos em cada Super Bowl"
          subtitle="Barras na cor do campeão. Clique para abrir a edição."
          info={{ simple: 'Cada barra é uma edição; a altura é a diferença entre vencedor e vice. Barras baixas = jogos equilibrados.' }}
          svgRef={chartRef}
          rows={() => list.map((s) => ({ edição: s.roman, temporada: s.season, campeão: s.winnerName, vice: s.loserName, placar: `${s.winnerScore}-${s.loserScore}`, diferença: s.winnerScore - s.loserScore, mvp: s.mvp }))}
          table={<MiniTable head={['Edição', 'Placar', 'Diferença']} rows={list.map((s) => [s.roman, `${s.winnerScore}-${s.loserScore}`, s.winnerScore - s.loserScore])} />}
        >
          <ColumnChart
            ref={chartRef}
            ariaLabel="Diferença de pontos por Super Bowl"
            onSelect={(k) => navigate(`/super-bowl/${k}`)}
            data={list.map((s) => ({
              key: String(s.number),
              label: s.roman,
              value: s.winnerScore - s.loserScore,
              color: teamColor(s.winner),
              tooltip: [`Temporada ${s.season}`, `${s.winnerName} ${s.winnerScore} × ${s.loserScore} ${s.loserName}`, `MVP: ${s.mvp}`],
            }))}
          />
        </ChartFrame>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Títulos por franquia</h3>
          <BarList ariaLabel="Títulos por franquia" items={stats.titles.slice(0, 10).map(([t, n]) => ({ key: t, value: n, label: <TeamChip abbr={t} short size={18} /> }))} />
        </div>
        <div className="card">
          <h3>Mais participações</h3>
          <BarList ariaLabel="Participações por franquia" items={stats.apps.slice(0, 10).map(([t, n]) => ({ key: t, value: n, label: <TeamChip abbr={t} short size={18} />, color: 'var(--series-3)' }))} />
        </div>
        <div className="card">
          <h3>MVPs com mais de um prêmio</h3>
          <BarList ariaLabel="Jogadores com múltiplos MVPs" items={stats.mvps.map(([m, n]) => ({ key: m, value: n, label: m, color: 'var(--series-7)' }))} />
          <p className="xsmall muted" style={{ marginTop: 12 }}>
            Nunca chegaram a um Super Bowl: {stats.never.map((t) => map.get(t)?.nick ?? t).join(', ') || 'nenhum'}. Chegaram, mas nunca venceram: {stats.neverWon.map((t) => map.get(t)?.nick ?? t).join(', ')}.
          </p>
        </div>
      </div>

      <section>
        <div className="section-title">
          <h2>Todas as edições</h2>
          <div className="row">
            <select className="select" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filtrar por time">
              <option value="">Todos os times</option>
              {[...map.values()]
                .filter((t) => t.active)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.abbr} value={t.abbr}>
                    {t.name}
                  </option>
                ))}
            </select>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>
                Linha do tempo
              </button>
              <button type="button" className="chip" aria-pressed={view === 'table'} onClick={() => setView('table')}>
                Tabela
              </button>
            </div>
          </div>
        </div>
        {view === 'timeline' ? (
          <div className="timeline">
            {[...filtered].reverse().map((s) => (
              <div className="timeline-item" key={s.number}>
                <div className="when">
                  {dateBR(s.date)} · temporada {s.season} · {s.stadium}, {s.city}
                </div>
                <Link to={`/super-bowl/${s.number}`} className="row" style={{ gap: 8, textDecoration: 'none' }}>
                  <strong style={{ minWidth: 64 }}>SB {s.roman}</strong>
                  <TeamLogo abbr={s.winner} size={22} />
                  <span>
                    <strong>{s.winnerName}</strong> {s.winnerScore} × {s.loserScore} {s.loserName}
                    {s.ot ? ' (prorrogação)' : ''}
                  </span>
                  <span className="muted small">· MVP: {s.mvp}</span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(s) => String(s.number)}
            caption="Todos os Super Bowls"
            exportName="super-bowls"
            initialSort={{ key: 'number', dir: 'desc' }}
            columns={[
              { key: 'number', label: 'Edição', render: (s) => <Link to={`/super-bowl/${s.number}`}>{s.roman}</Link>, value: (s) => s.number },
              { key: 'season', label: 'Temporada', num: true },
              { key: 'winner', label: 'Campeão', render: (s) => <span className="row" style={{ gap: 6 }}><TeamLogo abbr={s.winner} size={18} />{s.winnerName}</span>, value: (s) => s.winnerName },
              { key: 'score', label: 'Placar', render: (s) => `${s.winnerScore}–${s.loserScore}${s.ot ? ' (OT)' : ''}`, value: (s) => s.winnerScore - s.loserScore },
              { key: 'loser', label: 'Vice', render: (s) => s.loserName, value: (s) => s.loserName },
              { key: 'mvp', label: 'MVP', render: (s) => s.mvp },
              { key: 'stadium', label: 'Estádio', render: (s) => `${s.stadium} (${s.city})` },
            ]}
          />
        )}
      </section>
      <p className="xsmall muted">Fonte: curadoria a partir do NFL Record &amp; Fact Book; placares das edições desde a temporada 1999 validados automaticamente contra o nflverse.</p>
    </div>
  );
}
