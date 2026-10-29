import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Callout, ModeNote, Seo, StatTile } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { RadarChart } from '../components/charts/RadarChart';
import { primaryStat, statColumns } from '../components/playerColumns';
import { api } from '../data/client';
import { useAsync, useSeason } from '../data/hooks';
import { useApp } from '../context/AppContext';
import { age, height, num, percent, signed, weight } from '../lib/format';
import { derived, percentile, positionBucket, sumLines } from '../lib/stats';
import type { PlayerSeasonLine } from '../lib/types';
import { metric } from '../content/metrics';
import { TabPanel, Tabs } from '../components/Tabs';
import { DraftValue, GameLog, KickingSplits, ReturnsSummary } from './player/PlayerSections';
import { PlayerSplits } from './player/PlayerSplits';
import { AwardBadges } from '../components/AwardBadges';

/** Métricas por jogo usadas no radar de percentis, por grupo de posição. */
const RADAR: Record<string, { key: string; label: string; f: (l: PlayerSeasonLine) => number | null; low?: boolean }[]> = {
  QB: [
    { key: 'passYds', label: 'Jardas/j', f: (l) => l.passYds / l.games },
    { key: 'passTd', label: 'TD/j', f: (l) => l.passTd / l.games },
    { key: 'cmpPct', label: 'CMP%', f: (l) => derived(l).cmpPct },
    { key: 'ypa', label: 'Y/A', f: (l) => derived(l).ypa },
    { key: 'int', label: 'INT/j (menos)', f: (l) => l.int / l.games, low: true },
    { key: 'epaPerDb', label: 'EPA/DB', f: (l) => derived(l).epaPerDb },
  ],
  RB: [
    { key: 'rushYds', label: 'Jardas/j', f: (l) => l.rushYds / l.games },
    { key: 'ypc', label: 'Y/C', f: (l) => derived(l).ypc },
    { key: 'rushTd', label: 'TD/j', f: (l) => l.rushTd / l.games },
    { key: 'rec', label: 'Rec/j', f: (l) => l.rec / l.games },
    { key: 'recYds', label: 'J. rec/j', f: (l) => l.recYds / l.games },
  ],
  WR: [
    { key: 'tgt', label: 'Alvos/j', f: (l) => (l.tgt === null ? null : l.tgt / l.games) },
    { key: 'rec', label: 'Rec/j', f: (l) => l.rec / l.games },
    { key: 'recYds', label: 'Jardas/j', f: (l) => l.recYds / l.games },
    { key: 'ypr', label: 'Y/R', f: (l) => derived(l).ypr },
    { key: 'recTd', label: 'TD/j', f: (l) => l.recTd / l.games },
    { key: 'yac', label: 'YAC/j', f: (l) => l.yac / l.games },
  ],
  DEF: [
    { key: 'tackles', label: 'Tackles/j', f: (l) => l.tackles / l.games },
    { key: 'tfl', label: 'TFL/j', f: (l) => l.tfl / l.games },
    { key: 'sacks', label: 'Sacks/j', f: (l) => l.sacks / l.games },
    { key: 'qbHits', label: 'QB hits/j', f: (l) => l.qbHits / l.games },
    { key: 'pd', label: 'PD/j', f: (l) => l.pd / l.games },
    { key: 'defInt', label: 'INT/j', f: (l) => l.defInt / l.games },
  ],
  K: [
    { key: 'fgPct', label: 'FG%', f: (l) => derived(l).fgPct },
    { key: 'fg40', label: 'FG% 40+', f: (l) => fgFrom(l, 3) },
    { key: 'fg50', label: '50+/j', f: (l) => (derived(l).fg50 ?? 0) / l.games },
    { key: 'xpPct', label: 'XP%', f: (l) => (l.xpa ? l.xpm / l.xpa : null) },
    { key: 'fgLong', label: 'Mais longo', f: (l) => l.fgLong },
  ],
  P: [
    { key: 'puntAvg', label: 'Média', f: (l) => derived(l).puntAvg },
    { key: 'puntNet', label: 'Líquida', f: (l) => derived(l).puntNet },
    { key: 'in20', label: 'Dentro da 20 %', f: (l) => (l.punts ? l.ptIn20 / l.punts : null) },
    { key: 'tb', label: 'Touchback % (menos)', f: (l) => (l.punts ? l.ptTb / l.punts : null), low: true },
  ],
};

/** Aproveitamento de FG a partir de uma faixa de distância (3 = 40+). */
function fgFrom(l: PlayerSeasonLine, from: number): number | null {
  if (!l.fgMade || !l.fgMiss) return null;
  const m = l.fgMade.slice(from).reduce((a, b) => a + b, 0);
  const a = m + l.fgMiss.slice(from).reduce((x, y) => x + y, 0);
  return a ? m / a : null;
}
const radarGroup = (pos: string) => {
  const b = positionBucket(pos);
  if (b === 'TE') return 'WR';
  if (['DL', 'LB', 'DB'].includes(b)) return 'DEF';
  return RADAR[b] ? b : null;
};

export default function PlayerPage() {
  const { id = '' } = useParams();
  const { mode } = useApp();
  const career = useAsync(() => api.career(id), [id]);
  const [phase, setSt] = useState<'REG' | 'POST'>('REG');
  const [view, setView] = useState<'seasons' | 'games' | 'splits'>('seasons');
  const chartRef = useRef<SVGSVGElement>(null);
  const radarRef = useRef<SVGSVGElement>(null);
  const c = career.data;
  // Playoffs só aparecem para quem jogou playoffs (sem chip que leva a uma tabela vazia).
  const hasPost = useMemo(() => (c?.lines ?? []).some((l) => l.st === 'POST'), [c]);
  const st = hasPost ? phase : 'REG';
  const lines = useMemo(() => (c?.lines ?? []).filter((l) => l.st === st).sort((a, b) => a.season - b.season), [c, st]);
  const reg = useMemo(() => (c?.lines ?? []).filter((l) => l.st === 'REG'), [c]);
  // Temporada em andamento no fim do gráfico: o total é parcial (não é uma queda de rendimento).
  const { current } = useSeason();
  const ongoing = reg.at(-1)?.season === current ? reg.at(-1) : null;
  const pos = reg.at(-1)?.pos ?? c?.bio.pos ?? '—';
  const statOpts = primaryStat(pos);
  const [statKey, setStatKey] = useState<string | null>(null);
  const stat = statOpts.find((s) => s.key === statKey) ?? statOpts[0];
  const latest = reg.at(-1);
  const group = radarGroup(pos);
  const pop = useAsync(() => (latest && group ? api.playerStats(latest.season) : Promise.resolve([])), [latest?.season, group]);

  const radar = useMemo(() => {
    if (!latest || !group || !pop.data?.length) return null;
    if (!pop.data.some((l) => l.st === 'REG')) return null;
    const defs = RADAR[group];
    // Mínimo de jogos proporcional ao andamento da temporada (≥ 35% do máximo disputado).
    const maxG = Math.max(...pop.data.filter((l) => l.st === 'REG').map((l) => l.games));
    const minG = Math.max(1, Math.ceil(maxG * 0.35));
    const volume = (l: PlayerSeasonLine) => (group === 'QB' ? l.att >= l.games * 14 : group === 'K' ? l.fga >= 8 : group === 'P' ? l.punts >= 20 : true);
    const peers = pop.data.filter((l) => l.st === 'REG' && l.games >= minG && radarGroup(l.pos) === group && volume(l));
    const values = defs.map((d) => {
      const v = d.f(latest);
      const popv = peers.map(d.f).filter((x): x is number => x !== null && Number.isFinite(x));
      return v === null || !Number.isFinite(v) ? null : percentile(v, popv, d.low);
    });
    return { defs, values, raw: defs.map((d) => { const v = d.f(latest); return v === null ? '—' : num(v, 2); }), n: peers.length, minG };
  }, [latest, group, pop.data]);

  if (career.loading) return <Loading height={400} />;
  if (!c) return <Unavailable>Jogador não encontrado. <Link to="/players">Buscar jogadores</Link></Unavailable>;
  const b = c.bio;
  const tot = sumLines(reg);
  const bucket = positionBucket(pos);
  const partial = (b.first ?? 9999) < 1999 || (b.draftYear ?? 9999) < 1999;
  const yrs = age(b.birth);

  const tiles = !tot
    ? []
    : bucket === 'QB'
      ? [
          { l: 'Jardas de passe', v: num(tot.passYds), m: 'passYds' },
          { l: 'TDs de passe', v: num(tot.passTd), m: 'passTd' },
          { l: 'Interceptações', v: num(tot.int), m: 'int' },
          { l: 'Passer rating', v: num(derived(tot).rating, 1), m: 'rating' },
          { l: 'EPA por dropback', v: derived(tot).epaPerDb === null ? 'N/D' : signed(derived(tot).epaPerDb, 3), m: 'epaPerDb' },
        ]
      : bucket === 'RB'
        ? [
            { l: 'Jardas corridas', v: num(tot.rushYds), m: 'rushYds' },
            { l: 'TDs corridos', v: num(tot.rushTd), m: 'rushTd' },
            { l: 'Jardas por corrida', v: num(derived(tot).ypc, 1), m: 'ypc' },
            { l: 'Jardas recebidas', v: num(tot.recYds), m: 'recYds' },
          ]
        : bucket === 'WR' || bucket === 'TE'
          ? [
              { l: 'Recepções', v: num(tot.rec), m: 'rec' },
              { l: 'Jardas recebidas', v: num(tot.recYds), m: 'recYds' },
              { l: 'TDs recebidos', v: num(tot.recTd), m: 'recTd' },
              { l: 'Jardas por recepção', v: num(derived(tot).ypr, 1), m: 'ypr' },
            ]
          : bucket === 'K'
            ? [
                { l: 'Field goals', v: num(tot.fgm), m: 'fgm' },
                { l: 'Aproveitamento', v: percent(derived(tot).fgPct), m: 'fgPct' },
                { l: 'Mais longo', v: tot.fgLong ?? 'N/D', m: 'fgLong' },
              ]
            : bucket === 'P'
              ? [
                  { l: 'Punts', v: num(tot.punts), m: 'punts' },
                  { l: 'Média', v: num(derived(tot).puntAvg, 1), m: 'puntAvg' },
                ]
              : [
                  { l: 'Tackles', v: num(tot.tackles), m: 'tackles' },
                  { l: 'Sacks', v: num(tot.sacks, 1), m: 'sacks' },
                  { l: 'Interceptações', v: num(tot.defInt), m: 'defInt' },
                  { l: 'Fumbles forçados', v: num(tot.ff), m: 'ff' },
                ];

  return (
    <div className="stack">
      <Seo title={b.name} description={`${b.name} (${pos}): estatísticas por temporada, carreira, percentis e jogadores semelhantes.`} />
      <div className="breadcrumb">
        <Link to="/players">Jogadores</Link> / {b.name}
      </div>
      <section className="card">
        <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
          {b.headshot ? (
            <img className="avatar" src={b.headshot} alt={`Foto de ${b.name}`} width={104} height={104} loading="lazy" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
          ) : (
            <div className="avatar" style={{ width: 104, height: 104, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 28 }} aria-hidden="true">
              {pos}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="eyebrow">
              {pos}
              {b.jersey ? ` · #${b.jersey}` : ''} {b.status ? `· ${b.status === 'ACT' ? 'Ativo' : b.status === 'RET' ? 'Aposentado' : b.status}` : ''}
            </div>
            <h1 style={{ marginBottom: 6 }}>{b.name}</h1>
            <div className="row small text-2">
              {latest && <TeamChip abbr={latest.team} />}
              <span>
                Temporadas na base: {reg[0]?.season ?? '—'}–{latest?.season ?? '—'}
              </span>
            </div>
            <AwardBadges playerId={b.id} />
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn sm" to={`/compare?type=players&a=${b.id}`}>
                Comparar com outro jogador
              </Link>
            </div>
          </div>
          <dl className="kv" style={{ minWidth: 240 }}>
            <dt>Altura</dt>
            <dd>{height(b.height)}</dd>
            <dt>Peso</dt>
            <dd>{weight(b.weight)}</dd>
            <dt>Idade</dt>
            <dd>{yrs !== null ? `${yrs} anos` : 'Não disponível'}</dd>
            <dt>Universidade</dt>
            <dd>{b.college ?? 'Não disponível'}</dd>
            <dt>Draft</dt>
            <dd>{b.draftYear ? `${b.draftYear} · ${b.draftRound}ª rodada, ${b.draftPick}ª escolha${b.draftTeam ? ` (${b.draftTeam})` : ''}` : 'Não draftado / não disponível'}</dd>
            {b.yearsExp !== null && b.yearsExp !== undefined && (
              <>
                <dt>Experiência</dt>
                <dd>{b.yearsExp === 0 ? 'Novato' : `${b.yearsExp} temporada${b.yearsExp === 1 ? '' : 's'} na NFL`}</dd>
              </>
            )}
          </dl>
        </div>
      </section>

      {partial && (
        <Callout title="Carreira parcial">
          Este jogador atuou antes de 1999. A base detalhada começa em 1999, então os totais abaixo <strong>não</strong> incluem as temporadas anteriores.
        </Callout>
      )}

      {tot && (
        <section aria-label="Totais da carreira">
          <h2 style={{ fontSize: '1rem' }}>Carreira — temporada regular{partial ? ' (desde 1999)' : ''}</h2>
          <div className="tiles">
            <StatTile label="Jogos" value={num(tot.games)} metric="games" />
            {tiles.map((t) => (
              <StatTile key={t.l} label={t.l} value={t.v} metric={t.m} />
            ))}
          </div>
        </section>
      )}

      {tot && <ReturnsSummary career={tot} />}
      {tot && bucket === 'K' && <KickingSplits career={tot} latest={latest} />}
      <DraftValue bio={b} />

      <div className="two-col">
        <section className="card">
          <ChartFrame
            title={`${stat.label} por temporada`}
            subtitle={ongoing ? `Temporada regular · ${ongoing.season} ainda em andamento (${ongoing.games} jogos): total parcial` : 'Temporada regular'}
            info={{ simple: `Evolução de ${stat.label.toLowerCase()} a cada temporada. Picos mostram o auge da carreira.`, expert: metric(stat.key).expert }}
            svgRef={chartRef}
            rows={() => reg.map((l) => ({ temporada: l.season, time: l.team, [stat.key]: l[stat.key] }))}
            table={<MiniTable head={['Temporada', stat.label]} rows={reg.map((l) => [String(l.season), l[stat.key] as number])} />}
          >
            <div className="chips" style={{ marginBottom: 8 }}>
              {statOpts.map((s) => (
                <button key={s.key} type="button" className="chip" aria-pressed={s.key === stat.key} onClick={() => setStatKey(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            {reg.length > 1 ? (
              <LineChart ref={chartRef} ariaLabel={`${stat.label} por temporada de ${b.name}`} series={[{ id: b.id, label: b.name, slot: 0, points: reg.map((l) => ({ x: l.season, y: l[stat.key] as number })) }]} yZero endLabels={false} />
            ) : (
              <p className="small muted">É preciso ao menos duas temporadas para traçar a evolução.</p>
            )}
          </ChartFrame>
        </section>
        <section className="card">
          {radar ? (
            <ChartFrame
              title={`Percentis em ${latest!.season}`}
              subtitle={`Comparado a ${radar.n} jogadores da mesma posição (${radar.minG}+ jogos)`}
              info={{ simple: 'Cada eixo mostra em que posição o jogador fica entre os colegas de posição: 90 = melhor que 90% deles.', expert: 'Percentil por métrica por jogo na temporada regular; empates contam metade. "INT/j (menos)" é invertido: menos é melhor.' }}
              svgRef={radarRef}
              table={<MiniTable head={['Métrica', 'Percentil', 'Valor']} rows={radar.defs.map((d, i) => [d.label, radar.values[i] ?? 0, radar.raw[i]])} />}
            >
              <RadarChart ref={radarRef} ariaLabel="Radar de percentis" axes={radar.defs.map((d) => d.label)} series={[{ id: b.id, label: b.name, slot: 0, values: radar.values, raw: radar.raw }]} size={300} />
            </ChartFrame>
          ) : (
            <p className="small muted">Percentis disponíveis para QB, RB, WR, TE, defensores, kickers e punters com estatísticas na temporada mais recente.</p>
          )}
        </section>
      </div>

      <Tabs
        label="Estatísticas"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'seasons', label: 'Temporada a temporada' },
          { id: 'games', label: 'Jogo a jogo' },
          { id: 'splits', label: 'Recortes e recordes' },
        ]}
      />
      <TabPanel id={view}>
        {view === 'games' ? (
          <GameLog id={b.id} name={b.name} pos={pos} expert={mode === 'expert'} />
        ) : view === 'splits' ? (
          <PlayerSplits id={b.id} name={b.name} pos={pos} />
        ) : (
          <section>
            <div className="section-title">
              <h2>Temporada a temporada</h2>
              {hasPost && (
                <div className="chips">
                  <button type="button" className="chip" aria-pressed={st === 'REG'} onClick={() => setSt('REG')}>
                    Temporada regular
                  </button>
                  <button type="button" className="chip" aria-pressed={st === 'POST'} onClick={() => setSt('POST')}>
                    Playoffs
                  </button>
                </div>
              )}
            </div>
            <ModeNote beginner={<>Cada linha é uma temporada. Ative o modo Expert para ver métricas avançadas como EPA e CPOE.</>} />
            {lines.length ? (
              <DataTable
                rows={[...lines].reverse()}
                rowKey={(r) => `${r.season}-${r.st}`}
                caption={`Estatísticas de ${b.name} por temporada`}
                exportName={`${b.name}-${st === 'REG' ? 'temporada-regular' : 'playoffs'}`}
                expert={mode === 'expert'}
                columns={[
                  { key: 'season', label: 'Temporada', render: (r) => r.season },
                  { key: 'team', label: 'Time', render: (r) => <TeamLogo abbr={r.team} size={20} />, value: (r) => r.team },
                  ...statColumns(pos),
                ]}
              />
            ) : (
              <Unavailable>{st === 'POST' ? 'Sem jogos de playoffs na base.' : 'Sem estatísticas de temporada regular.'}</Unavailable>
            )}
          </section>
        )}
      </TabPanel>

      {c.similar.length > 0 && (
        <section className="card">
          <div className="card-title">
            <h2>Jogadores semelhantes</h2>
          </div>
          <ModeNote
            beginner={<>Jogadores da mesma posição cuja produção por jogo na carreira mais se parece com a de {b.name}.</>}
            expert={<>Distância euclidiana entre z-scores de produção por jogo (carreira, temporada regular, mínimo de 16 jogos). Similaridade = 100 / (1 + d).</>}
          />
          <div className="chips" style={{ marginTop: 12 }}>
            {c.similar.map((s) => (
              <Link key={s.id} className="chip" to={`/players/${s.id}`}>
                {s.name} <span className="muted">· {s.score}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
