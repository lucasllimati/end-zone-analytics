import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { ScatterChart } from '../components/charts/ScatterChart';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { num, percent } from '../lib/format';
import { positionBucket } from '../lib/stats';
import { draftFranchise } from '../lib/teams';
import { MATURE, expectedCurve } from '../lib/draft';

export default function Draft() {
  const draft = useAsync(() => api.draft(), []);
  const [tab, setTab] = useState<'picks' | 'value' | 'rounds' | 'teams' | 'positions'>('picks');
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
  // Escolhas do top 10 que renderam menos que o esperado (drafts maduros).
  const busts = mature
    .filter((d) => d.pick <= 10)
    .map((d) => ({ d, dvs: (d.carAv ?? 0) - (expected(d.pick) ?? 0) }))
    .sort((a, b) => a.dvs - b.dvs)
    .slice(0, 20);
  // Desempenho no draft por franquia: soma do valor acima/abaixo do esperado, drafts de 2000 até o último maduro.
  const teamGrades = (() => {
    const m = new Map<string, { team: string; picks: number; dvs: number; hits: number; pb: number }>();
    for (const d of mature.filter((x) => x.season >= 2000)) {
      const team = draftFranchise(d.team, d.season);
      if (!team) continue;
      const e = expected(d.pick) ?? 0;
      const r = m.get(team) ?? { team, picks: 0, dvs: 0, hits: 0, pb: 0 };
      r.picks++;
      r.dvs += (d.carAv ?? 0) - e;
      if ((d.carAv ?? 0) > e) r.hits++;
      if (d.proBowls > 0) r.pb++;
      m.set(team, r);
    }
    return [...m.values()].sort((a, b) => b.dvs - a.dvs);
  })();
  // Valor médio por grupo de posição: na 1ª rodada e no draft todo.
  const byPosition = (() => {
    const m = new Map<string, { pos: string; n: number; av: number; r1: number; r1av: number; pb: number; hof: number }>();
    for (const d of mature) {
      const pos = positionBucket(d.pos);
      const r = m.get(pos) ?? { pos, n: 0, av: 0, r1: 0, r1av: 0, pb: 0, hof: 0 };
      r.n++;
      r.av += d.carAv ?? 0;
      if (d.round === 1) {
        r.r1++;
        r.r1av += d.carAv ?? 0;
      }
      if (d.proBowls > 0) r.pb++;
      if (d.hof) r.hof++;
      m.set(pos, r);
    }
    return [...m.values()].filter((r) => r.n >= 50).sort((a, b) => b.r1av / Math.max(1, b.r1) - a.r1av / Math.max(1, a.r1));
  })();

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
          { id: 'teams', label: 'Quem drafta melhor' },
          { id: 'positions', label: 'Valor por posição' },
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
            <section>
              <h2>Escolhas altas que não renderam</h2>
              <p className="small text-2">Escolhas do top 10 com o maior déficit em relação ao valor esperado para aquele número. Lesões explicam boa parte dos casos.</p>
              <DataTable
                rows={busts}
                rowKey={(r) => `${r.d.season}-${r.d.pick}`}
                caption="Escolhas do top 10 abaixo do esperado"
                rank
                exportName="draft-abaixo-do-esperado"
                columns={[
                  { key: 'name', label: 'Jogador', render: (r) => (r.d.id ? <Link to={`/players/${r.d.id}`}>{r.d.name}</Link> : r.d.name), value: (r) => r.d.name },
                  { key: 'season', label: 'Draft', render: (r) => r.d.season, value: (r) => r.d.season },
                  { key: 'pick', label: 'Pick', num: true, render: (r) => `#${r.d.pick}`, value: (r) => r.d.pick },
                  { key: 'pos', label: 'Pos.', render: (r) => r.d.pos, value: (r) => r.d.pos },
                  { key: 'team', label: 'Time', render: (r) => <TeamLogo abbr={r.d.team} size={20} />, value: (r) => r.d.team },
                  { key: 'av', label: 'AV', metric: 'carAv', num: true, render: (r) => r.d.carAv, value: (r) => r.d.carAv },
                  { key: 'dvs', label: 'Contra o esperado', num: true, help: 'AV de carreira menos o AV esperado para aquele número de escolha.', render: (r) => num(r.dvs, 1), value: (r) => r.dvs },
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
        {tab === 'teams' && (
          <div className="stack">
            <ModeNote
              beginner={<>Somamos, para cada franquia, o quanto seus escolhidos renderam acima (ou abaixo) do normal para a posição em que foram escolhidos. Quem fica no topo achou mais talento do que o esperado.</>}
              expert={<>Σ (AV de carreira − AV esperado pelo número da escolha), drafts de 2000 a {MATURE}. “Acertos” = escolhas acima da curva. Códigos antigos mapeados para a franquia atual.</>}
            />
            <DataTable
              rows={teamGrades}
              rowKey={(r) => r.team}
              caption={`Desempenho no draft por franquia (2000–${MATURE})`}
              rank
              exportName="draft-por-franquia"
              initialSort={{ key: 'dvs', dir: 'desc' }}
              columns={[
                { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short />, value: (r) => r.team },
                { key: 'picks', label: 'Escolhas', num: true },
                { key: 'dvs', label: 'Valor acima do esperado', num: true, help: 'Soma do AV de carreira acima (ou abaixo) do esperado para cada escolha.', render: (r) => (r.dvs >= 0 ? `+${num(r.dvs)}` : num(r.dvs)), value: (r) => r.dvs },
                { key: 'perPick', label: 'Por escolha', num: true, render: (r) => num(r.dvs / r.picks, 1), value: (r) => r.dvs / r.picks },
                { key: 'hits', label: 'Acertos', num: true, help: 'Escolhas que renderam acima do esperado para a posição em que foram feitas.', render: (r) => `${r.hits} (${percent(r.hits / r.picks, 0)})`, value: (r) => r.hits / r.picks },
                { key: 'pb', label: 'Pro Bowlers', num: true },
              ]}
            />
          </div>
        )}
        {tab === 'positions' && (
          <div className="stack">
            <ModeNote
              beginner={<>Quanto rende, em média, um jogador de cada posição escolhido no draft — na 1ª rodada e no geral. Posições com mais valor costumam ser as mais disputadas no topo do draft.</>}
              expert={<>AV de carreira médio por grupo de posição, drafts de 1980 a {MATURE} (mínimo de 50 escolhas). Ordenado pelo AV médio na 1ª rodada. O AV favorece posições com estatísticas; OL e K/P tendem a ser subavaliados.</>}
            />
            <DataTable
              rows={byPosition}
              rowKey={(r) => r.pos}
              caption="Valor por posição no draft"
              exportName="draft-por-posicao"
              columns={[
                { key: 'pos', label: 'Posição' },
                { key: 'r1', label: 'Na 1ª rodada', num: true },
                { key: 'r1av', label: 'AV médio (1ª rodada)', num: true, metric: 'carAv', render: (r) => num(r.r1 ? r.r1av / r.r1 : null, 1), value: (r) => (r.r1 ? r.r1av / r.r1 : null) },
                { key: 'n', label: 'Escolhas', num: true },
                { key: 'av', label: 'AV médio (todas)', num: true, render: (r) => num(r.av / r.n, 1), value: (r) => r.av / r.n },
                { key: 'pb', label: 'Chegaram ao Pro Bowl', num: true, render: (r) => `${r.pb} (${percent(r.pb / r.n, 1)})`, value: (r) => r.pb / r.n },
                { key: 'hof', label: 'Hall of Fame', num: true },
              ]}
            />
          </div>
        )}
      </TabPanel>
    </div>
  );
}
