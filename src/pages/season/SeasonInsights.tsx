/**
 * Abas da temporada: eficiência dos times (ataque, defesa e times especiais com ranking) e
 * expectativa do mercado (zebras, contra a linha, totais e descanso).
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeNote, StatTile } from '../../components/Bits';
import { DataTable, type Column } from '../../components/DataTable';
import { Loading, Unavailable } from '../../components/States';
import { TeamChip, TeamLogo } from '../../components/TeamLogo';
import { ChartFrame, MiniTable } from '../../components/charts/ChartFrame';
import { ScatterChart } from '../../components/charts/ScatterChart';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { atsResult, expectedMargin, favoriteOf, ouResult, upsetSize } from '../../lib/betting';
import { EFF_GROUPS, EFF_METRICS, efficiencyTable, fmtEff, type EffMetric, type EffRow } from '../../lib/efficiency';
import { dateBR, num, percent, signed } from '../../lib/format';
import { fmtRecord, isPlayed } from '../../lib/standings';
import { franchiseOf } from '../../lib/teams';
import type { Game, StandingRow, WLT } from '../../lib/types';

/* -------------------------------- Eficiência -------------------------------- */

export function EfficiencyView({ season, standings }: { season: number; standings: StandingRow[] }) {
  const ts = useAsync(() => api.teamStats(season).catch(() => []), [season]);
  const [group, setGroup] = useState<EffMetric['group']>('off');
  const chartRef = useRef<SVGSVGElement>(null);
  const rows = useMemo(() => (ts.data ? efficiencyTable(ts.data, standings) : []), [ts.data, standings]);
  if (ts.loading) return <Loading />;
  if (!rows.length) return <Unavailable>Estatísticas de times ainda não disponíveis para esta temporada.</Unavailable>;
  const metrics = EFF_METRICS.filter((m) => m.group === group);
  // Situações dependem do play-by-play, que pode não existir ainda para a temporada.
  const hasGroup = (g: EffMetric['group']) => EFF_METRICS.some((m) => m.group === g && rows.some((r) => r.values[m.key] !== null));
  const cell = (key: string): Column<EffRow> => {
    const m = EFF_METRICS.find((x) => x.key === key)!;
    return {
      key,
      label: m.label,
      metric: m.metric,
      help: m.help,
      num: true,
      render: (r) => (
        <span>
          {fmtEff(m, r.values[key])}
          {r.ranks[key] !== null && <span className={`rank-tag${r.ranks[key]! <= 5 ? ' top' : r.ranks[key]! >= rows.length - 4 ? ' bottom' : ''}`}>{r.ranks[key]}º</span>}
        </span>
      ),
      // Ordena pelo ranking (1º = melhor), já considerando quando menor é melhor.
      value: (r) => (r.ranks[key] === null ? null : -r.ranks[key]!),
    };
  };
  const scatter = rows.filter((r) => r.values.epaPlay !== null && r.values.epaAllowed !== null);
  return (
    <div className="stack">
      <ModeNote
        beginner={<>Cada número vem com a posição do time na liga (1º = melhor). Verde = top 5; vermelho = 5 piores. Clique no cabeçalho para ordenar.</>}
        expert={<>Temporada regular. EPA cedido = soma do EPA dos adversários jogo a jogo. Jogadas 20+ = passes completos e corridas de 20+ jardas. Ranking com empates compartilhados.</>}
      />
      <div className="segmented" role="group" aria-label="Fase do jogo">
        {EFF_GROUPS.filter((g) => hasGroup(g.id)).map((g) => (
          <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.team}
        caption={`Eficiência dos times em ${season} — ${EFF_GROUPS.find((g) => g.id === group)!.label}`}
        exportName={`eficiencia-${group}-${season}`}
        initialSort={{ key: metrics[0].key, dir: 'desc' }}
        columns={[{ key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short />, value: (r) => r.team }, ...metrics.map((m) => cell(m.key))]}
      />
      {scatter.length > 8 && (
        <section className="card">
          <ChartFrame
            title="Ataque × defesa"
            subtitle="EPA por jogada do ataque (horizontal) e EPA cedido por jogo (vertical)"
            info={{
              simple: 'Times à direita têm ataques mais eficientes; times mais abaixo têm defesas que cedem menos. O canto inferior direito reúne os times completos.',
              expert: 'x = (EPA de passe + corrida) ÷ jogadas; y = EPA dos adversários por jogo (menor = melhor defesa).',
            }}
            svgRef={chartRef}
            table={<MiniTable head={['Time', 'EPA/jogada', 'EPA cedido/jogo']} rows={scatter.map((r) => [r.team, Number(r.values.epaPlay!.toFixed(3)), Number(r.values.epaAllowed!.toFixed(2))])} />}
          >
            <ScatterChart
              ref={chartRef}
              ariaLabel="EPA do ataque por EPA cedido pela defesa"
              xLabel="EPA por jogada (ataque) →"
              yLabel="EPA cedido por jogo (defesa)"
              xFormat={(v) => signed(v, 2)}
              yFormat={(v) => signed(v, 0)}
              points={scatter.map((r) => ({ key: r.team, x: r.values.epaPlay!, y: r.values.epaAllowed!, label: r.team, detail: `Ataque ${r.ranks.epaPlay}º · Defesa ${r.ranks.epaAllowed}º` }))}
            />
          </ChartFrame>
        </section>
      )}
    </div>
  );
}

/* ------------------------- Expectativa do mercado ------------------------- */

interface AtsRow {
  team: string;
  games: number;
  ats: WLT;
  ou: WLT;
  favored: WLT;
  underdog: WLT;
  vsLine: number;
  bye: WLT;
}

const add = (r: WLT, pf: number, pa: number) => (pf > pa ? r[0]++ : pf < pa ? r[1]++ : r[2]++);
const coverPct = (r: WLT) => (r[0] + r[1] ? r[0] / (r[0] + r[1]) : null);

export function MarketView({ games, season }: { games: Game[]; season: number }) {
  const lined = games.filter((g) => isPlayed(g) && g.spread !== null);
  const rows = useMemo(() => {
    const m = new Map<string, AtsRow>();
    for (const g of lined) {
      for (const side of [g.home, g.away]) {
        const team = franchiseOf(side);
        const r = m.get(team) ?? { team, games: 0, ats: [0, 0, 0] as WLT, ou: [0, 0, 0] as WLT, favored: [0, 0, 0] as WLT, underdog: [0, 0, 0] as WLT, vsLine: 0, bye: [0, 0, 0] as WLT };
        const home = side === g.home;
        const pf = home ? g.homeScore! : g.awayScore!;
        const pa = home ? g.awayScore! : g.homeScore!;
        const exp = expectedMargin(g, side)!;
        const a = atsResult(g, side)!;
        r.games++;
        r.ats[a === 'cover' ? 0 : a === 'miss' ? 1 : 2]++;
        const ou = ouResult(g);
        if (ou) r.ou[ou === 'over' ? 0 : ou === 'under' ? 1 : 2]++;
        if (exp > 0) add(r.favored, pf, pa);
        else if (exp < 0) add(r.underdog, pf, pa);
        r.vsLine += pf - pa - exp;
        const rest = home ? g.homeRest : g.awayRest;
        if (g.type === 'REG' && rest !== null && rest >= 10) add(r.bye, pf, pa);
        m.set(team, r);
      }
    }
    return [...m.values()];
  }, [lined]);
  if (!lined.length) return <Unavailable>Linhas de aposta ainda não disponíveis para esta temporada.</Unavailable>;

  const favWins = lined.filter((g) => {
    const f = favoriteOf(g);
    return f && g.homeScore !== g.awayScore && (g.homeScore! > g.awayScore! ? g.home : g.away) === f;
  }).length;
  const withFav = lined.filter((g) => favoriteOf(g) && g.homeScore !== g.awayScore).length;
  const favCover = lined.filter((g) => {
    const f = favoriteOf(g);
    return f && atsResult(g, f) === 'cover';
  }).length;
  const favDecided = lined.filter((g) => {
    const f = favoriteOf(g);
    return f && atsResult(g, f) !== 'push';
  }).length;
  const ous = lined.map(ouResult).filter((x) => x && x !== 'push');
  const overs = ous.filter((x) => x === 'over').length;
  const avgTotal = lined.filter((g) => g.total !== null).reduce((s, g) => s + g.total!, 0) / Math.max(1, lined.filter((g) => g.total !== null).length);
  const avgPts = lined.reduce((s, g) => s + g.homeScore! + g.awayScore!, 0) / lined.length;
  const upsets = lined
    .map((g) => ({ g, size: upsetSize(g) }))
    .filter((x): x is { g: Game; size: number } => x.size !== null)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  const restEdge = games.filter((g) => isPlayed(g) && g.type === 'REG' && g.homeRest !== null && g.awayRest !== null && Math.abs(g.homeRest - g.awayRest) >= 3 && g.homeScore !== g.awayScore);
  const restWins = restEdge.filter((g) => (g.homeRest! > g.awayRest!) === g.homeScore! > g.awayScore!).length;

  return (
    <div className="stack">
      <ModeNote
        beginner={<>Antes de cada jogo, o mercado de apostas estima quem é favorito e por quantos pontos. Comparar o resultado com essa expectativa mostra quem surpreendeu. Usamos os números apenas como medida de expectativa — não é recomendação de aposta.</>}
        expert={<>Linhas de fechamento (nflverse/schedules). ATS = margem real contra o spread; pushes fora do %. “Saldo vs. linha” = soma de (margem real − margem esperada).</>}
      />
      <div className="tiles">
        <StatTile label="Favoritos venceram" value={percent(withFav ? favWins / withFav : null, 1)} note={`${favWins} de ${withFav} jogos`} />
        <StatTile label="Favoritos cobriram a linha" value={percent(favDecided ? favCover / favDecided : null, 1)} metric="ats" />
        <StatTile label="Jogos acima do total" value={percent(ous.length ? overs / ous.length : null, 1)} metric="overPct" note={`total médio esperado ${num(avgTotal, 1)} · real ${num(avgPts, 1)}`} />
        <StatTile label="Vantagem de descanso" value={percent(restEdge.length ? restWins / restEdge.length : null, 1)} metric="rest" note={`vitórias de quem descansou 3+ dias a mais (${restEdge.length} jogos)`} />
      </div>
      <section className="card">
        <div className="card-title">
          <h2>Maiores zebras de {season}</h2>
        </div>
        {upsets.length ? (
          <ol className="ref-list">
            {upsets.map(({ g, size }) => {
              const homeWon = g.homeScore! > g.awayScore!;
              const winner = homeWon ? g.home : g.away;
              const loser = homeWon ? g.away : g.home;
              return (
                <li key={g.id}>
                  <Link to={`/games/${g.id}`}>
                    <span className="ref-score num">
                      {Math.max(g.homeScore!, g.awayScore!)}–{Math.min(g.homeScore!, g.awayScore!)}
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <TeamLogo abbr={winner} size={18} /> {winner} venceu <TeamLogo abbr={loser} size={18} /> {loser}
                    </span>
                    <span className="xsmall muted">
                      {g.type === 'REG' ? `semana ${g.week}` : g.type} · {dateBR(g.date)} · azarão por {num(size, 1)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="small muted">Nenhum azarão venceu ainda.</p>
        )}
      </section>
      <DataTable
        rows={rows}
        rowKey={(r) => r.team}
        caption={`Contra a expectativa do mercado em ${season}`}
        exportName={`mercado-${season}`}
        initialSort={{ key: 'atsPct', dir: 'desc' }}
        columns={[
          { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short />, value: (r) => r.team },
          { key: 'ats', label: 'ATS', metric: 'ats', render: (r) => fmtRecord(r.ats), value: (r) => r.ats[0] },
          { key: 'atsPct', label: 'Cobriu %', num: true, help: 'Jogos em que superou a linha ÷ jogos decididos contra a linha (sem pushes).', render: (r) => percent(coverPct(r.ats), 0), value: (r) => coverPct(r.ats) },
          { key: 'vsLine', label: 'Saldo vs. linha', num: true, help: 'Soma de (margem real − margem esperada). Positivo = jogou acima do que o mercado previa.', render: (r) => signed(r.vsLine, 1), value: (r) => r.vsLine },
          { key: 'favored', label: 'Como favorito', render: (r) => fmtRecord(r.favored), value: (r) => r.favored[0] / Math.max(1, r.favored[0] + r.favored[1]) },
          { key: 'underdog', label: 'Como azarão', render: (r) => fmtRecord(r.underdog), value: (r) => r.underdog[0] / Math.max(1, r.underdog[0] + r.underdog[1]) },
          { key: 'ou', label: 'Over-Under', metric: 'overPct', render: (r) => `${r.ou[0]}-${r.ou[1]}${r.ou[2] ? `-${r.ou[2]}` : ''}`, value: (r) => r.ou[0] / Math.max(1, r.ou[0] + r.ou[1]) },
          { key: 'bye', label: 'Após folga', metric: 'rest', render: (r) => (r.bye[0] + r.bye[1] + r.bye[2] ? fmtRecord(r.bye) : '—'), value: (r) => r.bye[0] },
        ]}
      />
    </div>
  );
}
