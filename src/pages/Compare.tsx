import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Callout, ModeNote, PageHeader, Seo } from '../components/Bits';
import { Loading, Unavailable } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { PlayerPicker } from '../components/PlayerPicker';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { RadarChart } from '../components/charts/RadarChart';
import { primaryStat } from '../components/playerColumns';
import { api } from '../data/client';
import { useAsync, useTeams } from '../data/hooks';
import { derived, percentile, positionBucket, sumLines } from '../lib/stats';
import { num, pct3, percent, signed } from '../lib/format';
import { fmtRecord } from '../lib/standings';
import { ACTIVE_TEAMS } from '../lib/teams';
import type { PlayerCareer, PlayerSeasonLine, QbModelEntry, TeamSeason } from '../lib/types';
import { metric } from '../content/metrics';

type Kind = 'players' | 'teams' | 'seasons';

const PRESETS = [
  { label: 'Brady × Manning', a: '00-0019596', b: '00-0010346' },
  { label: 'Brady × Mahomes', a: '00-0019596', b: '00-0033873' },
  { label: 'Mahomes × Allen', a: '00-0033873', b: '00-0034857' },
  { label: 'Tomlinson × Peterson', a: '00-0020536', b: '00-0025394' },
  { label: 'Moss × Fitzgerald', a: '00-0011754', b: '00-0022921' },
  { label: 'J. J. Watt × Aaron Donald', a: '00-0027949', b: '00-0031388' },
];

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const kind = (params.get('type') as Kind) || 'players';
  return (
    <div>
      <Seo title="Comparador" description="Compare jogadores, times e temporadas lado a lado, com gráficos, percentis e ajuste de era." />
      <PageHeader eyebrow="Comparador" title="Compare lado a lado" lede="Jogador × jogador, time × time e temporada × temporada, com totais, gráficos e explicação de cada métrica." />
      <Tabs
        label="Tipo de comparação"
        value={kind}
        onChange={(t) => setParams({ type: t }, { replace: true })}
        tabs={[
          { id: 'players', label: 'Jogadores' },
          { id: 'teams', label: 'Times' },
          { id: 'seasons', label: 'Temporadas' },
        ]}
      />
      <TabPanel id={kind}>
        {kind === 'players' && <ComparePlayers />}
        {kind === 'teams' && <CompareTeams />}
        {kind === 'seasons' && <CompareSeasons />}
      </TabPanel>
    </div>
  );
}

/* --------------------------------- Jogadores --------------------------------- */

interface Row {
  label: string;
  metric?: string;
  get: (c: PlayerSeasonLine) => number | null;
  fmt: (v: number | null) => string;
  low?: boolean;
}

function rowsFor(bucket: string): Row[] {
  const n0 = (v: number | null) => num(v);
  const n1 = (v: number | null) => num(v, 1);
  const base: Row[] = [{ label: 'Jogos', metric: 'games', get: (c) => c.games, fmt: n0 }];
  if (bucket === 'QB')
    return [
      ...base,
      { label: 'Jardas de passe', metric: 'passYds', get: (c) => c.passYds, fmt: n0 },
      { label: 'TDs de passe', metric: 'passTd', get: (c) => c.passTd, fmt: n0 },
      { label: 'Interceptações', metric: 'int', get: (c) => c.int, fmt: n0, low: true },
      { label: '% de completos', metric: 'cmpPct', get: (c) => derived(c).cmpPct, fmt: (v) => percent(v) },
      { label: 'Jardas por tentativa', metric: 'ypa', get: (c) => derived(c).ypa, fmt: n1 },
      { label: 'Passer rating', metric: 'rating', get: (c) => derived(c).rating, fmt: n1 },
      { label: 'EPA por dropback', metric: 'epaPerDb', get: (c) => derived(c).epaPerDb, fmt: (v) => signed(v, 3) },
      { label: 'CPOE', metric: 'cpoe', get: (c) => c.cpoe, fmt: (v) => signed(v, 1) },
      { label: 'Jardas corridas', metric: 'rushYds', get: (c) => c.rushYds, fmt: n0 },
    ];
  if (bucket === 'RB')
    return [
      ...base,
      { label: 'Jardas corridas', metric: 'rushYds', get: (c) => c.rushYds, fmt: n0 },
      { label: 'Jardas por corrida', metric: 'ypc', get: (c) => derived(c).ypc, fmt: n1 },
      { label: 'TDs corridos', metric: 'rushTd', get: (c) => c.rushTd, fmt: n0 },
      { label: 'Recepções', metric: 'rec', get: (c) => c.rec, fmt: n0 },
      { label: 'Jardas de scrimmage', metric: 'scrimYds', get: (c) => c.rushYds + c.recYds, fmt: n0 },
      { label: 'Fumbles perdidos', metric: 'fumLost', get: (c) => c.fumLost, fmt: n0, low: true },
    ];
  if (bucket === 'WR' || bucket === 'TE')
    return [
      ...base,
      { label: 'Recepções', metric: 'rec', get: (c) => c.rec, fmt: n0 },
      { label: 'Jardas recebidas', metric: 'recYds', get: (c) => c.recYds, fmt: n0 },
      { label: 'TDs recebidos', metric: 'recTd', get: (c) => c.recTd, fmt: n0 },
      { label: 'Jardas por recepção', metric: 'ypr', get: (c) => derived(c).ypr, fmt: n1 },
      { label: 'Jardas por jogo', metric: 'recYds', get: (c) => derived(c).recYdsPg, fmt: n1 },
      { label: 'Taxa de recepção', metric: 'catchRate', get: (c) => derived(c).catchRate, fmt: (v) => percent(v) },
    ];
  return [
    ...base,
    { label: 'Tackles', metric: 'tackles', get: (c) => c.tackles, fmt: n0 },
    { label: 'Sacks', metric: 'sacks', get: (c) => c.sacks, fmt: n1 },
    { label: 'Tackles para perda', metric: 'tfl', get: (c) => c.tfl, fmt: n0 },
    { label: 'Interceptações', metric: 'defInt', get: (c) => c.defInt, fmt: n0 },
    { label: 'Passes defendidos', metric: 'pd', get: (c) => c.pd, fmt: n0 },
    { label: 'Fumbles forçados', metric: 'ff', get: (c) => c.ff, fmt: n0 },
  ];
}

function ComparePlayers() {
  const [params, setParams] = useSearchParams();
  const a = params.get('a');
  const b = params.get('b');
  const setP = (k: 'a' | 'b', v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    p.set('type', 'players');
    setParams(p, { replace: true });
  };
  const [st, setSt] = useState<'REG' | 'POST'>('REG');
  const [axis, setAxis] = useState<'season' | 'year'>('year');
  const ca = useAsync(() => (a ? api.career(a) : Promise.resolve(null)), [a]);
  const cb = useAsync(() => (b ? api.career(b) : Promise.resolve(null)), [b]);
  const qb = useAsync(() => api.qbModel(), []);
  const chartRef = useRef<SVGSVGElement>(null);
  const radarRef = useRef<SVGSVGElement>(null);
  const players = [ca.data, cb.data].filter(Boolean) as PlayerCareer[];
  const tot = players.map((p) => sumLines(p.lines.filter((l) => l.st === st)));
  const bucket = players[0] ? positionBucket(players[0].lines.filter((l) => l.st === 'REG').at(-1)?.pos ?? players[0].bio.pos) : 'QB';
  const rows = rowsFor(bucket);
  const stats = primaryStat(players[0]?.bio.pos ?? 'QB');
  const [statKey, setStatKey] = useState<string | null>(null);
  const stat = stats.find((s) => s.key === statKey) ?? stats[0];
  const bothQb = players.length === 2 && players.every((p) => positionBucket(p.bio.pos) === 'QB');

  return (
    <div className="stack">
      <div className="filters">
        <PlayerPicker label="Jogador A" value={a} onChange={(v) => setP('a', v)} />
        <PlayerPicker label="Jogador B" value={b} onChange={(v) => setP('b', v)} />
      </div>
      <div className="chips" aria-label="Comparações prontas">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" aria-pressed={a === p.a && b === p.b} onClick={() => setParams({ type: 'players', a: p.a, b: p.b }, { replace: true })}>
            {p.label}
          </button>
        ))}
      </div>
      {(ca.loading && a) || (cb.loading && b) ? (
        <Loading />
      ) : players.length < 2 ? (
        <Unavailable>Escolha dois jogadores (ou use uma comparação pronta acima).</Unavailable>
      ) : (
        <>
          {players.some((p) => (p.bio.first ?? 9999) < 1999 || (p.bio.draftYear ?? 9999) < 1999) && (
            <Callout title="Atenção: cobertura de dados">
              Pelo menos um dos jogadores começou a carreira antes de 1999. Os números comparam apenas as temporadas a partir de 1999 — não a carreira completa.
            </Callout>
          )}
          {positionBucket(players[0].bio.pos) !== positionBucket(players[1].bio.pos) && (
            <Callout title="Posições diferentes">Comparar posições diferentes tem pouco significado estatístico; as métricas exibidas seguem a posição do jogador A.</Callout>
          )}
          <div className="chips">
            <button type="button" className="chip" aria-pressed={st === 'REG'} onClick={() => setSt('REG')}>
              Temporada regular
            </button>
            <button type="button" className="chip" aria-pressed={st === 'POST'} onClick={() => setSt('POST')}>
              Playoffs
            </button>
          </div>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
            <table className="data">
              <caption className="sr-only">Comparação de carreira</caption>
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  {players.map((p, i) => (
                    <th key={p.bio.id} scope="col" className="num">
                      <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <span className="dot" style={{ background: `var(--series-${i + 1})` }} />
                        <Link to={`/players/${p.bio.id}`}>{p.bio.name}</Link>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const vals = tot.map((t) => (t ? r.get(t) : null));
                  const valid = vals.filter((v): v is number => v !== null);
                  const best = valid.length === 2 && valid[0] !== valid[1] ? (r.low ? Math.min(...valid) : Math.max(...valid)) : null;
                  return (
                    <tr key={r.label}>
                      <th scope="row" style={{ fontWeight: 500 }}>
                        <span className="th-inner" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.86rem', color: 'var(--text-2)' }}>
                          {r.label} {r.metric && <InfoTip metric={r.metric} label={r.label} />}
                        </span>
                      </th>
                      {vals.map((v, i) => (
                        <td key={i} className="num" style={{ fontWeight: v !== null && v === best ? 700 : 400 }}>
                          {v !== null && v === best && <span className="sr-only">melhor: </span>}
                          {r.fmt(v)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="xsmall muted">Em negrito, o melhor valor de cada linha (em interceptações e fumbles, menos é melhor).</p>

          <div className="two-col">
            <div className="card">
              <ChartFrame
                title={`${stat.label} — ${axis === 'year' ? 'por ano de carreira' : 'por temporada'}`}
                info={{ simple: 'Alinhar por ano de carreira (1º ano, 2º ano…) compara as trajetórias; por temporada mostra quando cada um jogou.' }}
                legend={players.map((p, i) => ({ label: p.bio.name, slot: i }))}
                svgRef={chartRef}
                table={
                  <MiniTable
                    head={['Ano', ...players.map((p) => p.bio.name)]}
                    rows={Array.from({ length: Math.max(...players.map((p) => p.lines.filter((l) => l.st === 'REG').length)) }, (_, i) => [String(i + 1), ...players.map((p) => (p.lines.filter((l) => l.st === 'REG')[i]?.[stat.key] as number) ?? 0)])}
                  />
                }
              >
                <div className="row" style={{ marginBottom: 8 }}>
                  <div className="chips">
                    {stats.map((s) => (
                      <button key={s.key} type="button" className="chip" aria-pressed={s.key === stat.key} onClick={() => setStatKey(s.key)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <select className="select" value={axis} onChange={(e) => setAxis(e.target.value as 'season' | 'year')} aria-label="Eixo X">
                    <option value="year">Ano de carreira</option>
                    <option value="season">Temporada</option>
                  </select>
                </div>
                <LineChart
                  ref={chartRef}
                  ariaLabel="Comparação por temporada"
                  xFormat={(x) => (axis === 'year' ? `${x}º` : String(x))}
                  series={players.map((p, i) => ({
                    id: p.bio.id,
                    label: p.bio.name,
                    slot: i,
                    points: p.lines
                      .filter((l) => l.st === 'REG')
                      .sort((x, y) => x.season - y.season)
                      .map((l, j) => ({ x: axis === 'year' ? j + 1 : l.season, y: l[stat.key] as number })),
                  }))}
                  yZero
                />
              </ChartFrame>
            </div>
            <div className="card">
              {bothQb && qb.data ? (
                <QbRadar entries={qb.data} ids={players.map((p) => p.bio.id)} names={players.map((p) => p.bio.name)} svgRef={radarRef} />
              ) : (
                <ModeNote
                  beginner={<>O radar de percentis está disponível para comparações entre quarterbacks (população: QBs com 1.500+ tentativas desde 1999).</>}
                  expert={<>Radar de percentis disponível para QBs (modelo EZA-QB). Para outras posições, use o perfil do jogador (percentis na temporada).</>}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QbRadar({ entries, ids, names, svgRef }: { entries: QbModelEntry[]; ids: string[]; names: string[]; svgRef: React.RefObject<SVGSVGElement | null> }) {
  const axes: { label: string; f: (e: QbModelEntry) => number | null }[] = [
    { label: 'Jardas', f: (e) => e.passYds },
    { label: 'TDs', f: (e) => e.passTd },
    { label: 'Rating', f: (e) => e.rating },
    { label: 'EPA/DB', f: (e) => e.epaPerDb },
    { label: 'Ajuste de era', f: (e) => e.eraRating },
    { label: 'Vitórias playoffs', f: (e) => e.playoffW },
    { label: 'Longevidade', f: (e) => e.seasons },
  ];
  const found = ids.map((id) => entries.find((e) => e.id === id));
  if (found.some((f) => !f)) return <p className="small muted">Um dos QBs não atinge o mínimo de 1.500 tentativas desde 1999 para entrar no radar.</p>;
  const series = found.map((e, i) => ({
    id: e!.id,
    label: names[i],
    slot: i,
    values: axes.map((a) => {
      const v = a.f(e!);
      const pop = entries.map(a.f).filter((x): x is number => x !== null);
      return v === null ? null : percentile(v, pop);
    }),
    raw: axes.map((a) => {
      const v = a.f(e!);
      return v === null ? '—' : num(v, Number.isInteger(v) ? 0 : 2);
    }),
  }));
  return (
    <ChartFrame
      title="Percentis entre QBs (1999+)"
      subtitle={`População: ${entries.length} QBs com 1.500+ tentativas`}
      info={{ simple: 'Cada eixo mostra a posição do QB entre todos os QBs da era moderna: 95 = melhor que 95% deles.', expert: '"Ajuste de era" = passer rating da carreira menos a média da liga nas mesmas temporadas, ponderado por tentativas.' }}
      legend={series.map((s) => ({ label: s.label, slot: s.slot }))}
      svgRef={svgRef}
      table={<MiniTable head={['Eixo', ...names]} rows={axes.map((a, i) => [a.label, ...series.map((s) => s.values[i] ?? 0)])} />}
    >
      <RadarChart ref={svgRef} ariaLabel="Radar de percentis de QBs" axes={axes.map((a) => a.label)} series={series} size={320} />
    </ChartFrame>
  );
}

/* ----------------------------------- Times ----------------------------------- */

function CompareTeams() {
  const [params, setParams] = useSearchParams();
  const a = params.get('a') ?? 'KC';
  const b = params.get('b') ?? 'PHI';
  const ts = useAsync(() => api.teamSeasons(), []);
  const sbs = useAsync(() => api.superBowls(), []);
  const chartRef = useRef<SVGSVGElement>(null);
  const { map } = useTeams();
  const set = (k: 'a' | 'b', v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    p.set('type', 'teams');
    setParams(p, { replace: true });
  };
  const sum = (t: string) => {
    const rows = (ts.data ?? []).filter((x) => x.team === t);
    const r = rows.reduce((acc, x) => ({ w: acc.w + x.w, l: acc.l + x.l, t: acc.t + x.t, pf: acc.pf + x.pf, pa: acc.pa + x.pa, pw: acc.pw + x.playoffW, pl: acc.pl + x.playoffL, po: acc.po + (x.madePlayoffs ? 1 : 0), best: Math.max(acc.best, x.w) }), { w: 0, l: 0, t: 0, pf: 0, pa: 0, pw: 0, pl: 0, po: 0, best: 0 });
    const sb = (sbs.data ?? []).filter((s) => s.winner === t).length;
    const sbApp = (sbs.data ?? []).filter((s) => s.winner === t || s.loser === t).length;
    return { ...r, sb, sbApp, rows, g: r.w + r.l + r.t };
  };
  if (ts.loading) return <Loading />;
  const A = sum(a);
  const B = sum(b);
  const lines: { label: string; metric?: string; va: string; vb: string; na: number; nb: number; low?: boolean }[] = [
    { label: 'Super Bowls vencidos (todas as eras)', va: String(A.sb), vb: String(B.sb), na: A.sb, nb: B.sb },
    { label: 'Participações em Super Bowl', va: String(A.sbApp), vb: String(B.sbApp), na: A.sbApp, nb: B.sbApp },
    { label: 'Campanha desde 1999', metric: 'pct', va: fmtRecord(A), vb: fmtRecord(B), na: A.w / Math.max(1, A.g), nb: B.w / Math.max(1, B.g) },
    { label: 'Aproveitamento', metric: 'pct', va: pct3((A.w + A.t / 2) / Math.max(1, A.g)), vb: pct3((B.w + B.t / 2) / Math.max(1, B.g)), na: A.w / Math.max(1, A.g), nb: B.w / Math.max(1, B.g) },
    { label: 'Temporadas com playoffs', va: String(A.po), vb: String(B.po), na: A.po, nb: B.po },
    { label: 'Jogos de playoffs (V-D)', va: `${A.pw}-${A.pl}`, vb: `${B.pw}-${B.pl}`, na: A.pw, nb: B.pw },
    { label: 'Pontos por jogo', metric: 'ppg', va: num(A.pf / Math.max(1, A.g), 1), vb: num(B.pf / Math.max(1, B.g), 1), na: A.pf / Math.max(1, A.g), nb: B.pf / Math.max(1, B.g) },
    { label: 'Pontos sofridos por jogo', metric: 'papg', va: num(A.pa / Math.max(1, A.g), 1), vb: num(B.pa / Math.max(1, B.g), 1), na: A.pa / Math.max(1, A.g), nb: B.pa / Math.max(1, B.g), low: true },
    { label: 'Melhor temporada (vitórias)', va: String(A.best), vb: String(B.best), na: A.best, nb: B.best },
  ];
  return (
    <div className="stack">
      <div className="filters">
        {(['a', 'b'] as const).map((k) => (
          <label className="field" key={k}>
            Time {k.toUpperCase()}
            <select className="select" value={k === 'a' ? a : b} onChange={(e) => set(k, e.target.value)}>
              {ACTIVE_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {map.get(t)?.name ?? t}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Link className="btn sm" to={`/matchup?a=${a}&b=${b}`}>
          Ver confrontos diretos
        </Link>
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
        <table className="data">
          <caption className="sr-only">Comparação de times</caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col" className="num">
                <TeamChip abbr={a} short />
              </th>
              <th scope="col" className="num">
                <TeamChip abbr={b} short />
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const best = l.na === l.nb ? null : l.low ? (l.na < l.nb ? 'a' : 'b') : l.na > l.nb ? 'a' : 'b';
              return (
                <tr key={l.label}>
                  <th scope="row" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
                    {l.label} {l.metric && <InfoTip metric={l.metric} />}
                  </th>
                  <td className="num" style={{ fontWeight: best === 'a' ? 700 : 400 }}>
                    {l.va}
                  </td>
                  <td className="num" style={{ fontWeight: best === 'b' ? 700 : 400 }}>
                    {l.vb}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card">
        <ChartFrame
          title="Vitórias por temporada"
          legend={[
            { label: map.get(a)?.nick ?? a, slot: 0 },
            { label: map.get(b)?.nick ?? b, slot: 1 },
          ]}
          svgRef={chartRef}
          info={{ simple: 'Vitórias na temporada regular de cada time, ano a ano.' }}
          table={<MiniTable head={['Temporada', a, b]} rows={A.rows.map((r) => [String(r.season), r.w, B.rows.find((x) => x.season === r.season)?.w ?? 0])} />}
        >
          <LineChart
            ref={chartRef}
            ariaLabel="Vitórias por temporada dos dois times"
            yZero
            series={[
              { id: a, label: map.get(a)?.nick ?? a, slot: 0, points: A.rows.map((r) => ({ x: r.season, y: r.w })) },
              { id: b, label: map.get(b)?.nick ?? b, slot: 1, points: B.rows.map((r) => ({ x: r.season, y: r.w })) },
            ]}
          />
        </ChartFrame>
      </div>
    </div>
  );
}

/* --------------------------------- Temporadas --------------------------------- */

const SEASON_PRESETS = [
  { team: 'NE', season: 2007 },
  { team: 'SEA', season: 2013 },
  { team: 'DEN', season: 2015 },
  { team: 'KC', season: 2023 },
  { team: 'BAL', season: 2000 },
  { team: 'NO', season: 2011 },
];

function CompareSeasons() {
  const ts = useAsync(() => api.teamSeasons(), []);
  const [picks, setPicks] = useState(SEASON_PRESETS.slice(0, 4));
  const [team, setTeam] = useState('PHI');
  const [season, setSeason] = useState(2024);
  const rows = useMemo(() => picks.map((p) => (ts.data ?? []).find((t) => t.team === p.team && t.season === p.season)).filter(Boolean) as TeamSeason[], [picks, ts.data]);
  if (ts.loading) return <Loading />;
  const seasons = [...new Set((ts.data ?? []).map((t) => t.season))].sort((x, y) => y - x);
  const g = (t: TeamSeason) => Math.max(1, t.w + t.l + t.t);
  const metricsRows: { label: string; metric?: string; f: (t: TeamSeason) => string; v: (t: TeamSeason) => number | null; low?: boolean }[] = [
    { label: 'Campanha', f: (t) => fmtRecord(t), v: (t) => t.w / g(t) },
    { label: 'Pontos por jogo', metric: 'ppg', f: (t) => num(t.pf / g(t), 1), v: (t) => t.pf / g(t) },
    { label: 'Pontos sofridos por jogo', metric: 'papg', f: (t) => num(t.pa / g(t), 1), v: (t) => t.pa / g(t), low: true },
    { label: 'Saldo por jogo', metric: 'diff', f: (t) => signed((t.pf - t.pa) / g(t), 1), v: (t) => (t.pf - t.pa) / g(t) },
    { label: 'EPA por jogada (ataque)', metric: 'epaPlay', f: (t) => (t.plays ? signed(((t.passEpa ?? 0) + (t.rushEpa ?? 0)) / t.plays, 3) : 'N/D'), v: (t) => (t.plays ? ((t.passEpa ?? 0) + (t.rushEpa ?? 0)) / t.plays : null) },
    { label: 'Jardas de passe por jogo', metric: 'passYds', f: (t) => (t.passYds === null ? 'N/D' : num(t.passYds / g(t), 1)), v: (t) => (t.passYds === null ? null : t.passYds / g(t)) },
    { label: 'Jardas corridas por jogo', metric: 'rushYds', f: (t) => (t.rushYds === null ? 'N/D' : num(t.rushYds / g(t), 1)), v: (t) => (t.rushYds === null ? null : t.rushYds / g(t)) },
    { label: 'Sacks da defesa', metric: 'sacks', f: (t) => (t.sacks === null ? 'N/D' : String(t.sacks)), v: (t) => t.sacks },
    { label: 'Turnovers cometidos', metric: 'giveaways', f: (t) => (t.giveaways === null ? 'N/D' : String(t.giveaways)), v: (t) => t.giveaways, low: true },
    { label: 'Resultado nos playoffs', f: (t) => (t.sbWin ? 'Campeão' : t.sbLoss ? 'Vice' : t.madePlayoffs ? `${t.playoffW}-${t.playoffL}` : 'Fora'), v: (t) => (t.sbWin ? 3 : t.sbLoss ? 2 : t.madePlayoffs ? 1 : 0) },
  ];
  return (
    <div className="stack">
      <ModeNote
        beginner={<>Compare temporadas históricas de times diferentes. Times de temporadas com 16 jogos (até 2020) e 17 jogos (2021+) são comparados por jogo.</>}
        expert={<>Valores por jogo para neutralizar 16 × 17 jogos. Sem ajuste de era nesta visão: o nível ofensivo da liga muda ao longo das temporadas (veja História → Evolução).</>}
      />
      <div className="filters">
        <label className="field">
          Time
          <select className="select" value={team} onChange={(e) => setTeam(e.target.value)}>
            {ACTIVE_TEAMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Temporada
          <select className="select" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" disabled={picks.length >= 5} onClick={() => setPicks((p) => [...p, { team, season }].slice(-5))}>
          Adicionar
        </button>
        <span className="xsmall muted">Até 5 temporadas. Pré-1999 (ex.: Bears 1985, Dolphins 1972) não está na base detalhada.</span>
      </div>
      <div className="chips">
        {picks.map((p, i) => (
          <button key={`${p.team}${p.season}`} type="button" className="chip" onClick={() => setPicks((x) => x.filter((_, j) => j !== i))} aria-label={`Remover ${p.team} ${p.season}`}>
            <TeamLogo abbr={p.team} size={16} /> {p.team} {p.season} ✕
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
          <table className="data">
            <caption className="sr-only">Comparação de temporadas</caption>
            <thead>
              <tr>
                <th scope="col">Métrica</th>
                {rows.map((t) => (
                  <th key={`${t.team}${t.season}`} scope="col" className="num">
                    <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <TeamLogo abbr={t.abbr} size={18} /> {t.season}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricsRows.map((m) => {
                const vals = rows.map(m.v).filter((x): x is number => x !== null);
                const best = vals.length ? (m.low ? Math.min(...vals) : Math.max(...vals)) : null;
                return (
                  <tr key={m.label}>
                    <th scope="row" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
                      {m.label} {m.metric && <InfoTip metric={m.metric} />}
                    </th>
                    {rows.map((t) => (
                      <td key={`${t.team}${t.season}`} className="num" style={{ fontWeight: m.v(t) === best ? 700 : 400 }}>
                        {m.f(t)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Unavailable>Adicione temporadas para comparar.</Unavailable>
      )}
      <p className="xsmall muted">{metric('epaPlay').simple}</p>
    </div>
  );
}
