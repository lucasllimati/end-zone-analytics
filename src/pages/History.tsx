import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { Loading } from '../components/States';
import { InfoTip } from '../components/InfoTip';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { ERAS } from '../content/history';
import { num, percent } from '../lib/format';
import type { LeagueTrend } from '../lib/types';
import { PAGE_META } from '../content/pageMeta';

const TREND_METRICS: { key: keyof LeagueTrend; label: string; info: string; pct?: boolean; digits?: number; metric?: string }[] = [
  { key: 'ppg', label: 'Pontos por time por jogo', info: 'Média de pontos marcados por cada time em um jogo da temporada regular.', digits: 1, metric: 'ppg' },
  { key: 'passRate', label: 'Taxa de passe', info: 'Percentual de jogadas ofensivas que foram passes (inclui sacks).', pct: true, metric: 'passRate' },
  { key: 'passYdsPg', label: 'Jardas de passe por time/jogo', info: 'Média de jardas aéreas por time em cada jogo.', digits: 1 },
  { key: 'rushYdsPg', label: 'Jardas corridas por time/jogo', info: 'Média de jardas terrestres por time em cada jogo.', digits: 1 },
  { key: 'fgPct', label: 'Aproveitamento de field goals', info: 'Percentual de field goals convertidos na liga.', pct: true, metric: 'fgPct' },
  { key: 'xpPct', label: 'Aproveitamento de pontos extras', info: 'Percentual de pontos extras convertidos. Note a queda em 2015, quando o chute foi recuado para a linha de 15.', pct: true },
  { key: 'homeWinPct', label: 'Vitórias do mandante', info: 'Percentual de jogos vencidos pelo time da casa (exclui campos neutros e empates). Note 2020, com estádios vazios.', pct: true, metric: 'homeWinPct' },
  { key: 'sacksPg', label: 'Sacks por time/jogo', info: 'Média de sacks que cada defesa conseguiu por jogo.', digits: 2 },
  { key: 'turnoversPg', label: 'Turnovers por time/jogo', info: 'Média de interceptações lançadas + fumbles perdidos por time em cada jogo.', digits: 2 },
  { key: 'avgMargin', label: 'Diferença média de placar', info: 'Diferença média de pontos entre vencedor e perdedor.', digits: 1 },
];

export default function History() {
  const trends = useAsync(() => api.trends(), []);
  const [mk, setMk] = useState<keyof LeagueTrend>('ppg');
  const [era, setEra] = useState(ERAS[ERAS.length - 1].id);
  const chartRef = useRef<SVGSVGElement>(null);
  const loc = useLocation();
  const def = TREND_METRICS.find((m) => m.key === mk)!;
  const fmt = (v: number) => (def.pct ? percent(v) : num(v, def.digits ?? 1));
  const data = (trends.data ?? []).filter((t) => t[mk] !== null);
  const decades = useMemo(() => {
    const groups: Record<string, LeagueTrend[]> = {};
    for (const t of trends.data ?? []) {
      const d = t.season < 2000 ? '1999' : `${Math.floor(t.season / 10) * 10}s`;
      (groups[d] ??= []).push(t);
    }
    return Object.entries(groups).filter(([k]) => k !== '1999');
  }, [trends.data]);
  useEffect(() => {
    if (loc.hash === '#evolucao') setTimeout(() => document.getElementById('evolucao')?.scrollIntoView(), 200);
  }, [loc.hash, trends.data]);
  const current = ERAS.find((e) => e.id === era)!;
  return (
    <div className="stack">
      <Seo {...PAGE_META['/history']} />
      <PageHeader eyebrow="1920 – hoje" title="História da NFL" lede="Mais de um século de futebol americano profissional: das cidades pequenas de Ohio ao maior evento esportivo dos EUA." />
      <section>
        <div className="chips" role="group" aria-label="Eras">
          {ERAS.map((e) => (
            <button key={e.id} type="button" className="chip" aria-pressed={era === e.id} onClick={() => setEra(e.id)}>
              {e.period}
            </button>
          ))}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="eyebrow">{current.period}</div>
          <h2>{current.title}</h2>
          <p className="text-2">{current.summary}</p>
          <div className="grid grid-2">
            <div className="timeline">
              {current.events.map((ev) => (
                <div key={ev.year + ev.text} className="timeline-item">
                  <div className="when">{ev.year}</div>
                  {ev.text}
                </div>
              ))}
            </div>
            <div>
              <h3 className="small muted">O que mudou</h3>
              <ul className="small text-2" style={{ paddingLeft: 18 }}>
                {current.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="evolucao" className="stack">
        <h2>Evolução do jogo em números</h2>
        <ModeNote
          beginner={<>Os gráficos mostram como o jogo mudou desde 1999: mais passes, mais precisão dos kickers e mudanças de regras que aparecem nos números.</>}
          expert={<>Agregados da temporada regular (nflverse team stats). Dados de jogadas não identificadas pelo play-by-play podem variar levemente em relação às estatísticas oficiais.</>}
        />
        {trends.loading ? (
          <Loading height={300} />
        ) : (
          <div className="card">
            <div className="chips" style={{ marginBottom: 12 }} role="group" aria-label="Métrica">
              {TREND_METRICS.map((m) => (
                <button key={m.key} type="button" className="chip" aria-pressed={mk === m.key} onClick={() => setMk(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
            <ChartFrame
              title={def.label}
              subtitle={`Temporada regular, ${data[0]?.season}–${data.at(-1)?.season}${data.at(-1)?.season === trends.data?.at(-1)?.season ? ' (última temporada pode estar em andamento)' : ''}`}
              info={{ simple: def.info }}
              svgRef={chartRef}
              rows={() => data.map((t) => ({ temporada: t.season, [def.label]: t[mk] }))}
              table={<MiniTable head={['Temporada', def.label]} rows={data.map((t) => [String(t.season), t[mk] as number])} />}
              source="nflverse"
            >
              <LineChart ref={chartRef} ariaLabel={def.label} series={[{ id: String(mk), label: def.label, slot: 0, points: data.map((t) => ({ x: t.season, y: t[mk] as number })) }]} yFormat={fmt} endLabels={false} area />
            </ChartFrame>
          </div>
        )}
        <section>
          <h3 className="row" style={{ gap: 6 }}>
            Comparação entre décadas <InfoTip title="Comparação entre eras" simple="Médias das temporadas de cada década. Mostram, por exemplo, como o jogo ficou mais aéreo." expert="Média simples das médias de cada temporada (cada temporada pesa igual)." />
          </h3>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
            <table className="data">
              <caption className="sr-only">Médias por década</caption>
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  {decades.map(([d]) => (
                    <th key={d} scope="col" className="num">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TREND_METRICS.slice(0, 8).map((m) => (
                  <tr key={m.key}>
                    <th scope="row" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
                      {m.label}
                    </th>
                    {decades.map(([d, ts]) => {
                      const vals = ts.map((t) => t[m.key] as number | null).filter((v): v is number => v !== null);
                      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                      return (
                        <td key={d} className="num">
                          {avg === null ? '—' : m.pct ? percent(avg) : num(avg, m.digits ?? 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="xsmall muted">Décadas anteriores a 2000 não fazem parte da base detalhada.</p>
        </section>
      </section>
    </div>
  );
}
