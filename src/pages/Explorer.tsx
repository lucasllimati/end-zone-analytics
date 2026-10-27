import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { metric } from '../content/metrics';
import { derived, positionBucket, sumLines } from '../lib/stats';
import { num } from '../lib/format';
import { ACTIVE_TEAMS, franchiseOf } from '../lib/teams';
import type { PlayerSeasonLine, TeamSeason } from '../lib/types';
import { PAGE_META } from '../content/pageMeta';

const PLAYER_METRICS = ['passYds', 'passTd', 'int', 'cmpPct', 'ypa', 'rating', 'epaPerDb', 'cpoe', 'rushYds', 'rushTd', 'ypc', 'rec', 'tgt', 'recYds', 'recTd', 'ypr', 'yac', 'scrimYds', 'totalTd', 'tackles', 'sacks', 'tfl', 'qbHits', 'defInt', 'pd', 'ff', 'fgm', 'fgPct', 'fg50', 'gwfgm', 'puntNet', 'ptIn20', 'prYds', 'krYds', 'stTd', 'tgtShare', 'airShare', 'wopr', 'pass20', 'rush20', 'rec20', 'passFd', 'rushFd', 'recFd', 'fpts', 'fptsPpr'];
const TEAM_METRICS = ['w', 'pf', 'pa', 'diff', 'ppg', 'papg', 'passYds', 'rushYds', 'epaPlay', 'sacks', 'giveaways'];
/** Volume mínimo para métricas de taxa (evita distorções com amostras pequenas). */
const MIN_VOL: Record<string, (l: PlayerSeasonLine) => boolean> = {
  cmpPct: (l) => l.att >= 150, ypa: (l) => l.att >= 150, rating: (l) => l.att >= 150, epaPerDb: (l) => l.att >= 150, cpoe: (l) => l.att >= 150,
  ypc: (l) => l.carries >= 50, ypr: (l) => l.rec >= 20, fgPct: (l) => l.fga >= 10, puntNet: (l) => l.punts >= 20,
  tgtShare: (l) => (l.tgt ?? 0) >= 30, airShare: (l) => (l.tgt ?? 0) >= 30, wopr: (l) => (l.tgt ?? 0) >= 30,
};
const DERIVED = new Set(['cmpPct', 'ypa', 'rating', 'epaPerDb', 'ypc', 'ypr', 'fgPct', 'scrimYds', 'totalTd', 'fg50', 'puntNet']);
const pVal = (l: PlayerSeasonLine, k: string): number | null => (DERIVED.has(k) ? (derived(l) as Record<string, number | null>)[k] : (l[k as keyof PlayerSeasonLine] as number | null));
const tVal = (t: TeamSeason, k: string): number | null => {
  const g = t.w + t.l + t.t || 1;
  switch (k) {
    case 'diff': return t.pf - t.pa;
    case 'ppg': return t.pf / g;
    case 'papg': return t.pa / g;
    case 'epaPlay': return t.plays ? ((t.passEpa ?? 0) + (t.rushEpa ?? 0)) / t.plays : null;
    default: return (t[k as keyof TeamSeason] as number | null) ?? null;
  }
};
const fmt = (k: string, v: number | null) => {
  if (v === null) return '—';
  const d = metric(k);
  if (d.format === 'pct') return `${num(v * 100, 1)}%`;
  return num(v, d.digits ?? (Number.isInteger(v) ? 0 : 1));
};

const EXAMPLES = [
  { label: 'Mais TDs de passe (2010–2025, carreira)', q: 'ds=players&from=2010&to=2025&pos=QB&metric=passTd&agg=total' },
  { label: 'Melhor EPA/dropback em uma temporada', q: 'ds=players&from=1999&to=2025&pos=QB&metric=epaPerDb&agg=season' },
  { label: 'Mais sacks desde 2015', q: 'ds=players&from=2015&to=2025&metric=sacks&agg=total' },
  { label: 'Recebedores mais acionados (WOPR)', q: 'ds=players&from=2006&to=2025&metric=wopr&agg=season' },
  { label: 'Mais FGs de 50+ jardas (carreira)', q: 'ds=players&from=1999&to=2025&pos=K&metric=fg50&agg=total' },
  { label: 'Ataques mais eficientes (EPA/jogada)', q: 'ds=teams&from=1999&to=2025&metric=epaPlay' },
  { label: 'Defesas que menos sofreram pontos por jogo', q: 'ds=teams&from=1999&to=2025&metric=papg&dir=asc' },
];

export default function Explorer() {
  const [params, setParams] = useSearchParams();
  const m = useManifest();
  const last = m.data?.coverage.lastSeason ?? 2026;
  const first = m.data?.coverage.firstSeason ?? 1999;
  const ds = (params.get('ds') as 'players' | 'teams') ?? 'players';
  const from = Number(params.get('from') ?? last - 5);
  const to = Number(params.get('to') ?? last);
  const pos = params.get('pos') ?? '';
  const team = params.get('team') ?? '';
  const st = (params.get('st') as 'REG' | 'POST') ?? 'REG';
  const agg = (params.get('agg') as 'season' | 'total') ?? 'season';
  const mk = params.get('metric') ?? (ds === 'players' ? 'passYds' : 'epaPlay');
  const dir = params.get('dir') === 'asc' || (params.get('dir') !== 'desc' && metric(mk).lowerIsBetter) ? 'asc' : 'desc';
  const minGames = Number(params.get('min') ?? 0);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k === 'ds') p.delete('metric');
    setParams(p, { replace: true });
  };
  const seasons = useMemo(() => {
    const out: number[] = [];
    for (let s = Math.max(first, Math.min(from, to)); s <= Math.min(last, Math.max(from, to)); s++) out.push(s);
    return out;
  }, [from, to, first, last]);

  const lines = useAsync(async () => (ds === 'players' ? (await Promise.all(seasons.map((s) => api.playerStats(s).catch(() => [])))).flat() : []), [ds, seasons.join(',')]);
  const teamSeasons = useAsync(() => (ds === 'teams' ? api.teamSeasons() : Promise.resolve([])), [ds]);

  const playerRows = useMemo(() => {
    if (ds !== 'players' || !lines.data) return [];
    const filtered = lines.data.filter((l) => l.st === st && (!pos || positionBucket(l.pos) === pos) && (!team || franchiseOf(l.team) === team));
    let rows: { key: string; id: string; name: string; team: string; season: string; games: number; v: number | null; l: PlayerSeasonLine }[];
    if (agg === 'total') {
      const by = new Map<string, PlayerSeasonLine[]>();
      for (const l of filtered) by.set(l.id, [...(by.get(l.id) ?? []), l]);
      rows = [...by.entries()].map(([id, ls]) => {
        const s = sumLines(ls)!;
        const yrs = ls.map((x) => x.season);
        return { key: id, id, name: s.name, team: ls[ls.length - 1].team, season: `${Math.min(...yrs)}–${Math.max(...yrs)}`, games: s.games, v: pVal(s, mk), l: s };
      });
    } else rows = filtered.map((l) => ({ key: `${l.id}-${l.season}`, id: l.id, name: l.name, team: l.team, season: String(l.season), games: l.games, v: pVal(l, mk), l }));
    return rows.filter((r) => r.v !== null && r.games >= minGames && (MIN_VOL[mk] ? MIN_VOL[mk](r.l) : true) && (DERIVED.has(mk) || r.v !== 0));
  }, [ds, lines.data, st, pos, team, agg, mk, minGames]);

  const teamRows = useMemo(() => {
    if (ds !== 'teams' || !teamSeasons.data) return [];
    return teamSeasons.data
      .filter((t) => seasons.includes(t.season) && (!team || t.team === team) && t.w + t.l + t.t >= Math.max(1, minGames))
      .map((t) => ({ key: `${t.team}-${t.season}`, t, v: tVal(t, mk) }))
      .filter((r) => r.v !== null);
  }, [ds, teamSeasons.data, seasons, team, mk, minGames]);

  const sorted = <T extends { v: number | null }>(rows: T[]) => [...rows].sort((a, b) => (dir === 'asc' ? a.v! - b.v! : b.v! - a.v!));
  const loading = lines.loading || teamSeasons.loading;
  const def = metric(mk);
  const metricsList = ds === 'players' ? PLAYER_METRICS : TEAM_METRICS;

  return (
    <div className="stack">
      <Seo {...PAGE_META['/explorer']} />
      <PageHeader eyebrow="Analytics" title="Explorador de dados" lede="Escolha o conjunto de dados, o período, filtros e a métrica. O ranking, a tabela e o gráfico são gerados na hora — e o link da página guarda sua análise para compartilhar." />
      <div className="chips" aria-label="Exemplos">
        {EXAMPLES.map((e) => (
          <button key={e.label} type="button" className="chip" onClick={() => setParams(new URLSearchParams(e.q), { replace: true })}>
            {e.label}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="filters" style={{ marginBottom: 0 }}>
          <label className="field">
            Dados
            <select className="select" value={ds} onChange={(e) => set('ds', e.target.value)}>
              <option value="players">Jogadores</option>
              <option value="teams">Times (temporadas)</option>
            </select>
          </label>
          <label className="field">
            De
            <select className="select" value={from} onChange={(e) => set('from', e.target.value)}>
              {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Até
            <select className="select" value={to} onChange={(e) => set('to', e.target.value)}>
              {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {ds === 'players' && (
            <>
              <label className="field">
                Posição
                <select className="select" value={pos} onChange={(e) => set('pos', e.target.value)}>
                  <option value="">Todas</option>
                  {['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'P'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Fase
                <select className="select" value={st} onChange={(e) => set('st', e.target.value)}>
                  <option value="REG">Temporada regular</option>
                  <option value="POST">Playoffs</option>
                </select>
              </label>
              <label className="field">
                Agrupar
                <select className="select" value={agg} onChange={(e) => set('agg', e.target.value)}>
                  <option value="season">Por temporada</option>
                  <option value="total">Total do período</option>
                </select>
              </label>
            </>
          )}
          <label className="field">
            Time
            <select className="select" value={team} onChange={(e) => set('team', e.target.value)}>
              <option value="">Todos</option>
              {ACTIVE_TEAMS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Métrica
            <select className="select" value={mk} onChange={(e) => set('metric', e.target.value)}>
              {metricsList.map((k) => (
                <option key={k} value={k}>
                  {metric(k).label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ width: 120 }}>
            Mín. de jogos
            <input className="input" type="number" min={0} max={300} value={minGames} onChange={(e) => set('min', e.target.value)} />
          </label>
          <label className="field">
            Ordem
            <select className="select" value={dir} onChange={(e) => set('dir', e.target.value)}>
              <option value="desc">Maior primeiro</option>
              <option value="asc">Menor primeiro</option>
            </select>
          </label>
        </div>
      </div>
      <p className="small text-2 row" style={{ gap: 6 }}>
        <strong>{def.label}</strong> <InfoTip metric={mk} /> — {def.simple}
      </p>
      <ModeNote expert={<>Métricas de taxa exigem volume mínimo por linha (ex.: 150 tentativas para métricas de QB, 50 corridas para Y/C). Estatísticas derivadas do play-by-play (nflverse).</>} />
      {loading ? (
        <Loading height={360} />
      ) : (ds === 'players' ? playerRows : teamRows).length === 0 ? (
        <Unavailable>Nenhum resultado. Ajuste os filtros.</Unavailable>
      ) : ds === 'players' ? (
        <div className="two-col">
          <DataTable
            rows={sorted(playerRows)}
            rowKey={(r) => r.key}
            caption="Resultado do explorador"
            rank
            exportName={`explorador-${mk}`}
            columns={[
              { key: 'name', label: 'Jogador', render: (r) => <Link to={`/players/${r.id}`}>{r.name}</Link>, value: (r) => r.name, sortable: false },
              { key: 'team', label: 'Time', render: (r) => <TeamLogo abbr={r.team} size={20} />, value: (r) => r.team, sortable: false },
              { key: 'season', label: agg === 'total' ? 'Período' : 'Temporada', render: (r) => r.season, sortable: false },
              { key: 'games', label: 'J', metric: 'games', num: true, sortable: false },
              { key: 'v', label: def.short ?? def.label, metric: mk, num: true, render: (r) => <strong>{fmt(mk, r.v)}</strong>, value: (r) => r.v, sortable: false },
            ]}
          />
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3>Top 15</h3>
            <BarList ariaLabel="Top 15" items={sorted(playerRows).slice(0, 15).map((r) => ({ key: r.key, value: Math.abs(r.v!), display: fmt(mk, r.v), label: `${r.name}${agg === 'season' ? ` (${r.season})` : ''}` }))} />
          </div>
        </div>
      ) : (
        <div className="two-col">
          <DataTable
            rows={sorted(teamRows)}
            rowKey={(r) => r.key}
            caption="Resultado do explorador"
            rank
            exportName={`explorador-times-${mk}`}
            columns={[
              { key: 'team', label: 'Time', render: (r) => <span className="row" style={{ gap: 6 }}><TeamLogo abbr={r.t.abbr} size={20} />{r.t.team}</span>, sortable: false },
              { key: 'season', label: 'Temporada', render: (r) => r.t.season, sortable: false },
              { key: 'rec', label: 'Campanha', render: (r) => `${r.t.w}-${r.t.l}${r.t.t ? `-${r.t.t}` : ''}`, sortable: false },
              { key: 'v', label: def.short ?? def.label, metric: mk, num: true, render: (r) => <strong>{fmt(mk, r.v)}</strong>, value: (r) => r.v, sortable: false },
            ]}
          />
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3>Top 15</h3>
            <BarList ariaLabel="Top 15" items={sorted(teamRows).slice(0, 15).map((r) => ({ key: r.key, value: Math.abs(r.v!), display: fmt(mk, r.v), label: `${r.t.team} ${r.t.season}` }))} />
          </div>
        </div>
      )}
    </div>
  );
}
