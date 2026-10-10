import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamLogo } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { ScatterChart } from '../components/charts/ScatterChart';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { num } from '../lib/format';
import type { DraftPick } from '../lib/types';

/** Drafts até esta temporada são considerados "maduros" para análise de valor (carreiras já desenvolvidas). */
const MATURE = 2016;

/** AV de carreira esperado por número de escolha (média móvel de picks vizinhos). */
function expectedCurve(picks: DraftPick[]) {
  const mature = picks.filter((p) => p.season <= MATURE && p.carAv !== null);
  const byPick = new Map<number, number[]>();
  for (const p of mature) byPick.set(p.pick, [...(byPick.get(p.pick) ?? []), p.carAv!]);
  const maxPick = Math.max(...byPick.keys());
  const curve: { x: number; y: number }[] = [];
  for (let k = 1; k <= maxPick; k++) {
    const vals: number[] = [];
    for (let j = k - 4; j <= k + 4; j++) vals.push(...(byPick.get(j) ?? []));
    if (vals.length) curve.push({ x: k, y: vals.reduce((a, b) => a + b, 0) / vals.length });
  }
  return curve;
}

export default function Draft() {
  const draft = useAsync(() => api.draft(), []);
  const [tab, setTab] = useState<'picks' | 'value' | 'rounds'>('picks');
  const years = useMemo(() => [...new Set((draft.data ?? []).map((d) => d.season))].sort((a, b) => b - a), [draft.data]);
  const [year, setYear] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const chartRef = useRef<SVGSVGElement>(null);
  const curve = useMemo(() => (draft.data ? expectedCurve(draft.data) : []), [draft.data]);
  const expected = (pick: number) => curve.find((c) => c.x === pick)?.y ?? null;

  if (draft.loading) return <Loading height={400} />;
  const all = draft.data ?? [];
  const y = year ?? years[0];
  const picks = all.filter((d) => d.season === y && (!round || d.round === round));
  const mature = all.filter((d) => d.season <= MATURE && d.carAv !== null);
  const steals = mature
    .map((d) => ({ d, dvs: (d.carAv ?? 0) - (expected(d.pick) ?? 0) }))
    .sort((a, b) => b.dvs - a.dvs)
    .slice(0, 25);
  const bestByRound = [1, 2, 3, 4, 5, 6, 7].map((r) => mature.filter((d) => d.round === r).sort((a, b) => (b.carAv ?? 0) - (a.carAv ?? 0)).slice(0, 5));

  return (
    <div className="stack">
      <Seo title="Draft" description="Draft da NFL desde 1980: todas as escolhas, melhores jogadores por rodada e o valor de cada pick." />
      <PageHeader eyebrow="Draft" title="Draft da NFL" lede="Todas as escolhas desde 1980, quem rendeu mais em cada rodada e quanto vale, em média, cada posição no draft." />
      <ModeNote
        beginner={<>No draft, os times escolhem jogadores universitários; os piores times da temporada anterior escolhem primeiro. “AV” é uma nota que resume o valor do jogador na carreira.</>}
        expert={<>Valor = Approximate Value (PFR) de carreira. Draft Value Score = AV real − AV esperado para aquele número de escolha (média dos picks ±4, drafts até {MATURE}).</>}
      />
      <Tabs
        label="Seções do draft"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'picks', label: 'Escolhas por ano' },
          { id: 'value', label: 'Valor por escolha' },
          { id: 'rounds', label: 'Melhores por rodada' },
        ]}
      />
      <TabPanel id={tab}>
        {tab === 'picks' && (
          <div className="stack">
            <div className="filters">
              <label className="field">
                Draft
                <select className="select" value={y} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Rodada
                <select className="select" value={round} onChange={(e) => setRound(Number(e.target.value))}>
                  <option value={0}>Todas</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                    <option key={r} value={r}>
                      {r}ª rodada
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <DataTable
              rows={picks}
              rowKey={(d) => `${d.season}-${d.pick}`}
              caption={`Draft de ${y}`}
              exportName={`draft-${y}`}
              columns={[
                { key: 'pick', label: 'Pick', num: true },
                { key: 'round', label: 'Rod.', num: true },
                { key: 'team', label: 'Time', render: (d) => <TeamLogo abbr={d.team} size={20} />, value: (d) => d.team },
                { key: 'name', label: 'Jogador', render: (d) => (d.id ? <Link to={`/players/${d.id}`}>{d.name}</Link> : d.name), value: (d) => d.name },
                { key: 'pos', label: 'Pos.' },
                { key: 'college', label: 'Universidade', render: (d) => d.college ?? '—' },
                { key: 'carAv', label: 'AV', metric: 'carAv', num: true, render: (d) => (d.carAv === null ? '—' : d.carAv), value: (d) => d.carAv },
                { key: 'proBowls', label: 'Pro Bowls', num: true, help: 'Convocações para o Pro Bowl (jogo das estrelas) na carreira.' },
                { key: 'allPro', label: 'All-Pro', num: true, help: 'Seleções para o time ideal da temporada (1º time All-Pro).' },
                { key: 'hof', label: 'HOF', help: 'Membro do Pro Football Hall of Fame.', render: (d) => (d.hof ? <span className="badge gold">HOF</span> : ''), value: (d) => (d.hof ? 1 : 0) },
              ]}
            />
          </div>
        )}
        {tab === 'value' && (
          <div className="stack">
            <div className="card">
              <ChartFrame
                title="Valor de carreira por número de escolha"
                subtitle={`Drafts de 1980 a ${MATURE}. Cada ponto é um jogador; a linha é a média esperada.`}
                info={{ simple: 'Escolhas altas rendem mais em média, mas a queda é rápida: depois da 1ª rodada o valor esperado cai bastante. Pontos acima da linha superaram as expectativas.', expert: 'Curva = média do AV de carreira dos picks ±4 posições. Base para o Draft Value Score.' }}
                svgRef={chartRef}
                table={<MiniTable head={['Pick', 'AV esperado']} rows={curve.filter((c) => c.x % 8 === 1).map((c) => [String(c.x), Number(c.y.toFixed(1))])} />}
              >
                <ScatterChart
                  ref={chartRef}
                  ariaLabel="AV de carreira por número de escolha"
                  xLabel="Número da escolha"
                  yLabel="AV de carreira"
                  points={mature.filter((_, i) => i % 3 === 0).map((d) => ({ key: `${d.season}-${d.pick}`, x: d.pick, y: d.carAv!, label: `${d.name} (${d.season})`, detail: `${d.pos} · ${d.team}` }))}
                  trend={curve.filter((c) => c.x % 4 === 1)}
                />
              </ChartFrame>
            </div>
            <section>
              <h2>Maiores “achados” do draft</h2>
              <DataTable
                rows={steals}
                rowKey={(r) => `${r.d.season}-${r.d.pick}`}
                caption="Escolhas que mais superaram o esperado"
                rank
                exportName="draft-value"
                columns={[
                  { key: 'name', label: 'Jogador', render: (r) => (r.d.id ? <Link to={`/players/${r.d.id}`}>{r.d.name}</Link> : r.d.name), value: (r) => r.d.name },
                  { key: 'season', label: 'Draft', render: (r) => r.d.season, value: (r) => r.d.season },
                  { key: 'pick', label: 'Pick', num: true, render: (r) => `${r.d.round}ª · #${r.d.pick}`, value: (r) => r.d.pick },
                  { key: 'team', label: 'Time', render: (r) => <TeamLogo abbr={r.d.team} size={20} />, value: (r) => r.d.team },
                  { key: 'av', label: 'AV', metric: 'carAv', num: true, render: (r) => r.d.carAv, value: (r) => r.d.carAv },
                  { key: 'dvs', label: 'Draft Value Score', num: true, help: 'AV de carreira menos o AV esperado para aquele número de escolha. Quanto maior, maior o "achado".', render: (r) => `+${num(r.dvs, 1)}`, value: (r) => r.dvs },
                ]}
              />
            </section>
          </div>
        )}
        {tab === 'rounds' && (
          <div className="grid grid-3">
            {bestByRound.map((list, i) => (
              <div className="card" key={i}>
                <h3>{i + 1}ª rodada</h3>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {list.map((d) => (
                    <li key={`${d.season}-${d.pick}`} className="small" style={{ padding: '3px 0' }}>
                      {d.id ? <Link to={`/players/${d.id}`}>{d.name}</Link> : d.name} <span className="muted">· {d.pos} · {d.season} (#{d.pick}) · AV {d.carAv}</span>
                      {d.hof && <span className="badge gold" style={{ marginLeft: 4 }}>HOF</span>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="xsmall muted">Melhores jogadores escolhidos em cada rodada (por AV de carreira, drafts de 1980 a {MATURE}).</p>
          </div>
        )}
      </TabPanel>
    </div>
  );
}
