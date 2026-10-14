import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { GameCard } from '../components/GameCard';
import { Loading, Unavailable } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync, useSeason, useTeams } from '../data/hooks';
import { useTeamColor } from '../data/useTeamColor';
import { computeStandings, fmtRecord } from '../lib/standings';
import { DIVISIONS_CURRENT, franchiseOf } from '../lib/teams';
import { dateBR, num, pct3, signed } from '../lib/format';
import { RIVALRIES } from '../content/rivalries';
import type { Game, TeamSeason } from '../lib/types';
import { TeamEfficiency } from './team/TeamEfficiency';
import { TeamRoster } from './team/TeamRoster';
import { DivisionTable, DraftSection, FranchiseHistory, FranchiseRecords, Matchups, PointsChart, RecentForm } from './team/TeamSections';

type Tab = 'overview' | 'efficiency' | 'schedule' | 'players' | 'records' | 'history' | 'matchups' | 'draft' | 'similar';

function playoffResult(s: TeamSeason): string {
  if (s.sbWin) return 'Campeão do Super Bowl';
  if (s.sbLoss) return 'Vice no Super Bowl';
  if (!s.madePlayoffs) return '—';
  return `Playoffs (${s.playoffW}-${s.playoffL})`;
}

export default function TeamPage() {
  const { abbr = '' } = useParams();
  const code = abbr.toUpperCase();
  const { map } = useTeams();
  const team = map.get(code);
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>('overview');
  const teamSeasons = useAsync(() => api.teamSeasons(), []);
  const games = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([] as Game[])), [season]);
  const sbs = useAsync(() => api.superBowls(), []);
  const stats = useAsync(() => (season ? api.playerStats(season).catch(() => []) : Promise.resolve([])), [season]);
  const profile = useAsync(() => api.teamProfile(code).catch(() => null), [code]);
  const chartRef = useRef<SVGSVGElement>(null);
  const teamColor = useTeamColor();

  const history = useMemo(() => (teamSeasons.data ?? []).filter((t) => t.team === code).sort((a, b) => a.season - b.season), [teamSeasons.data, code]);
  const cur = history.find((h) => h.season === season);
  const standings = useMemo(() => (games.data && season ? computeStandings(games.data, season) : []), [games.data, season]);
  const st = standings.find((s) => s.team === code);
  const divRank = st ? standings.filter((s) => s.division === st.division).findIndex((s) => s.team === code) + 1 : null;
  const myGames = (games.data ?? []).filter((g) => franchiseOf(g.home) === code || franchiseOf(g.away) === code).sort((a, b) => a.date.localeCompare(b.date));
  const titles = (sbs.data ?? []).filter((s) => s.winner === code);
  const apps = (sbs.data ?? []).filter((s) => s.winner === code || s.loser === code);

  // Temporadas semelhantes — hook antes dos returns condicionais (ordem dos hooks precisa ser estável) (perfil: pontos marcados/sofridos por jogo, jardas, EPA).
  const similar = useMemo(() => {
    if (!cur || !teamSeasons.data) return [];
    const feat = (t: TeamSeason) => {
      const g = t.w + t.l + t.t || 1;
      return [t.pf / g, t.pa / g, (t.passYds ?? 0) / g, (t.rushYds ?? 0) / g, t.plays ? ((t.passEpa ?? 0) + (t.rushEpa ?? 0)) / t.plays : 0];
    };
    const pool = teamSeasons.data.filter((t) => t.w + t.l + t.t >= 8 && t.passYds !== null);
    const dims = 5;
    const vals = pool.map(feat);
    const mean = Array.from({ length: dims }, (_, i) => vals.reduce((s, v) => s + v[i], 0) / vals.length);
    const sd = Array.from({ length: dims }, (_, i) => Math.sqrt(vals.reduce((s, v) => s + (v[i] - mean[i]) ** 2, 0) / vals.length) || 1);
    const me = feat(cur).map((x, i) => (x - mean[i]) / sd[i]);
    return pool
      .filter((t) => !(t.team === code && t.season === cur.season))
      .map((t) => {
        const z = feat(t).map((x, i) => (x - mean[i]) / sd[i]);
        const d = Math.sqrt(z.reduce((s, x, i) => s + (x - me[i]) ** 2, 0));
        return { t, score: Math.round(100 / (1 + d)) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [cur, teamSeasons.data, code]);

  if (!team && !map.size) return <Loading height={300} />;
  if (!team || !team.active) return <Unavailable>Time não encontrado. <Link to="/teams">Ver todos os times</Link></Unavailable>;

  const gp = cur ? cur.w + cur.l + cur.t : 0;
  const totals = history.reduce((a, h) => ({ w: a.w + h.w, l: a.l + h.l, t: a.t + h.t, pw: a.pw + h.playoffW, pl: a.pl + h.playoffL, po: a.po + (h.madePlayoffs ? 1 : 0) }), { w: 0, l: 0, t: 0, pw: 0, pl: 0, po: 0 });
  const rivals = RIVALRIES.filter((r) => r.a === code || r.b === code);
  const divMates = Object.entries(DIVISIONS_CURRENT).filter(([t, d]) => d === team.division && t !== code).map(([t]) => t);
  const teamPlayers = (stats.data ?? []).filter((l) => l.st === 'REG' && franchiseOf(l.team) === code);
  // Técnico atual = o do jogo mais recente já disputado (mostra interinos durante a temporada).
  const lastPlayed = [...myGames].reverse().find((g) => g.homeScore !== null);
  const currentCoach = lastPlayed ? (franchiseOf(lastPlayed.home) === code ? lastPlayed.homeCoach : lastPlayed.awayCoach) : cur?.coach;


  return (
    <div className="stack">
      <Seo title={team.name} description={`${team.name}: perfil, campanha de ${season}, analytics, histórico desde 1999 e Super Bowls.`} />
      <div className="breadcrumb">
        <Link to="/teams">Times</Link> / {team.name}
      </div>
      <section className="team-hero" style={{ ['--team-color' as string]: team.color }}>
        <TeamLogo abbr={code} size={96} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="eyebrow">
            {team.conf} · {team.division}
          </div>
          <PageHeader title={team.name}>
            <div className="row small text-2">
              <span>
                Temporada {season}: <strong>{st ? fmtRecord(st) : '0-0'}</strong>
                {divRank ? ` · ${divRank}º na divisão` : ''}
              </span>
              {currentCoach && <span>Técnico: {currentCoach}</span>}
              {cur?.qb && <span>QB titular: {cur.qb}</span>}
            </div>
            <div className="row" style={{ marginTop: 10, gap: 6 }}>
              <span className="dot" style={{ background: team.color, width: 14, height: 14 }} title="Cor primária" />
              <span className="dot" style={{ background: team.color2, width: 14, height: 14 }} title="Cor secundária" />
              <span className="badge gold">{titles.length} Super Bowl{titles.length === 1 ? '' : 's'}</span>
              <Link className="btn sm" to={`/compare?type=teams&a=${code}`}>
                Comparar
              </Link>
            </div>
          </PageHeader>
        </div>
      </section>

      <Tabs
        label="Seções do time"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Visão geral' },
          { id: 'efficiency', label: 'Eficiência' },
          { id: 'schedule', label: `Jogos ${season ?? ''}` },
          { id: 'players', label: 'Elenco' },
          { id: 'records', label: 'Recordes' },
          { id: 'history', label: 'História' },
          { id: 'matchups', label: 'Confrontos' },
          { id: 'draft', label: 'Draft' },
          { id: 'similar', label: 'Times semelhantes' },
        ]}
      />
      <TabPanel id={tab}>
        {tab === 'overview' && (
          <div className="stack">
            <div className="team-overview-top">
              <RecentForm code={code} games={games.data ?? []} />
              {st && <DivisionTable code={code} rows={standings} division={st.division} />}
            </div>
            {cur && gp > 0 ? (
              <div className="tiles">
                <StatTile label="Pontos por jogo" value={num(cur.pf / gp, 1)} metric="ppg" />
                <StatTile label="Pontos sofridos/jogo" value={num(cur.pa / gp, 1)} metric="papg" />
                <StatTile label="Saldo de pontos" value={signed(cur.pf - cur.pa)} metric="diff" />
                <StatTile label="EPA por jogada" value={cur.plays ? signed(((cur.passEpa ?? 0) + (cur.rushEpa ?? 0)) / cur.plays, 3) : 'N/D'} metric="epaPlay" />
                <StatTile label="Jardas de passe/jogo" value={cur.passYds !== null ? num(cur.passYds / gp, 1) : 'N/D'} metric="passYds" />
                <StatTile label="Jardas corridas/jogo" value={cur.rushYds !== null ? num(cur.rushYds / gp, 1) : 'N/D'} metric="rushYds" />
                <StatTile label="Turnovers cometidos" value={cur.giveaways ?? 'N/D'} metric="giveaways" />
                <StatTile label="Sacks da defesa" value={cur.sacks ?? 'N/D'} metric="sacks" />
              </div>
            ) : (
              <Unavailable>Ainda não há jogos disputados por este time em {season}.</Unavailable>
            )}
            <ModeNote
              beginner={<>O saldo de pontos (pontos marcados menos sofridos) costuma dizer mais sobre a força de um time do que apenas vitórias e derrotas.</>}
              expert={<>EPA/jogada considera dropbacks (passes + sacks) e corridas do ataque. Defesa: o dataset de times não traz EPA permitido.</>}
            />
            <div className="card">
              <ChartFrame
                title="Vitórias por temporada"
                subtitle={`Temporada regular, ${history[0]?.season ?? ''}–${history.at(-1)?.season ?? ''}. Linha de referência: 8,5 vitórias (campanha média).`}
                info={{ simple: 'Quantos jogos o time venceu em cada temporada regular. Os pontos mais altos mostram as melhores fases.', expert: 'Temporadas de 16 jogos até 2020 e 17 a partir de 2021; compare usando PCT se precisar normalizar.' }}
                svgRef={chartRef}
                rows={() => history.map((h) => ({ temporada: h.season, vitórias: h.w, derrotas: h.l, empates: h.t, pf: h.pf, pa: h.pa }))}
                table={<MiniTable head={['Temporada', 'W', 'L', 'T', 'PF', 'PA']} rows={history.map((h) => [String(h.season), h.w, h.l, h.t, h.pf, h.pa])} />}
                source="nflverse games.csv"
              >
                <LineChart
                  ref={chartRef}
                  ariaLabel={`Vitórias por temporada do ${team.name}`}
                  series={[{ id: code, label: team.nick, slot: 0, color: teamColor(code), points: history.map((h) => ({ x: h.season, y: h.w })) }]}
                  reference={{ y: 8.5, label: 'média' }}
                  yZero
                  endLabels={false}
                />
              </ChartFrame>
            </div>
            {history.length > 1 && <PointsChart history={history} name={team.name} />}
            <div className="tiles">
              <StatTile label={`Campanha desde ${history[0]?.season ?? 1999}`} value={fmtRecord(totals)} note={`${pct3((totals.w + totals.t / 2) / Math.max(1, totals.w + totals.l + totals.t))} de aproveitamento`} />
              <StatTile label="Playoffs disputados" value={totals.po} note={`${totals.pw}-${totals.pl} em jogos de playoffs`} />
              <StatTile label="Super Bowls (todas as eras)" value={`${titles.length} título${titles.length === 1 ? '' : 's'}`} note={`${apps.length} participaç${apps.length === 1 ? 'ão' : 'ões'}`} />
            </div>
          </div>
        )}
        {tab === 'schedule' &&
          (myGames.length ? (
            <div className="grid grid-3">
              {myGames.map((g) => (
                <GameCard key={g.id} g={g} />
              ))}
            </div>
          ) : (
            <Unavailable />
          ))}
        {tab === 'players' && (
          <div className="stack">
            <h2>Destaques de {season}</h2>
            <div className="grid grid-3">
              {[
                { k: 'passYds', l: 'Jardas de passe' },
                { k: 'rushYds', l: 'Jardas corridas' },
                { k: 'recYds', l: 'Jardas recebidas' },
                { k: 'tackles', l: 'Tackles' },
                { k: 'sacks', l: 'Sacks' },
                { k: 'defInt', l: 'Interceptações' },
              ].map(({ k, l }) => {
                const top = [...teamPlayers].sort((a, b) => (b[k as keyof typeof b] as number) - (a[k as keyof typeof a] as number)).filter((p) => (p[k as keyof typeof p] as number) > 0).slice(0, 5);
                return (
                  <div className="card" key={k}>
                    <h3>{l}</h3>
                    {top.length ? (
                      <BarList ariaLabel={l} items={top.map((p) => ({ key: p.id, value: p[k as keyof typeof p] as number, label: <Link to={`/players/${p.id}`}>{p.name}</Link>, sub: p.pos }))} />
                    ) : (
                      <p className="small muted">Dados não disponíveis.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <h2>Elenco completo</h2>
            {season && <TeamRoster code={code} season={season} />}
          </div>
        )}
        {tab === 'efficiency' && season && <TeamEfficiency code={code} season={season} standings={standings} />}
        {tab === 'records' && (profile.loading ? <Loading /> : profile.data ? <FranchiseRecords profile={profile.data} /> : <Unavailable>Recordes da franquia indisponíveis.</Unavailable>)}
        {tab === 'matchups' && (profile.loading ? <Loading /> : profile.data ? <Matchups profile={profile.data} code={code} /> : <Unavailable>Confrontos indisponíveis.</Unavailable>)}
        {tab === 'draft' && (profile.loading ? <Loading /> : profile.data ? <DraftSection profile={profile.data} code={code} /> : <Unavailable>Draft indisponível.</Unavailable>)}
        {tab === 'history' && (
          <div className="stack">
            {profile.data && <FranchiseHistory profile={profile.data} code={code} />}
            {apps.length > 0 && (
              <section>
                <h2>Super Bowls</h2>
                <div className="timeline">
                  {apps.map((s) => (
                    <div className="timeline-item" key={s.number}>
                      <div className="when">
                        {dateBR(s.date)} · temporada {s.season}
                      </div>
                      <Link to={`/super-bowl/${s.number}`}>
                        <strong>Super Bowl {s.roman}</strong>
                      </Link>{' '}
                      — {s.winner === code ? 'Campeão' : 'Vice'}: {s.winnerName} {s.winnerScore} × {s.loserScore} {s.loserName}
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2>Temporada a temporada</h2>
              <DataTable
                rows={[...history].reverse()}
                rowKey={(r) => String(r.season)}
                caption="Histórico por temporada"
                exportName={`${team.name}-historico`}
                columns={[
                  { key: 'season', label: 'Temporada', render: (r) => r.season },
                  { key: 'abbr', label: 'Nome', render: (r) => (r.abbr !== code ? <span className="small">{r.abbr}</span> : <span className="muted small">—</span>), help: 'Abreviação usada na época (ex.: OAK para os Raiders em Oakland).' },
                  { key: 'rec', label: 'Campanha', render: (r) => fmtRecord(r), value: (r) => r.w },
                  { key: 'pf', label: 'PF', metric: 'pf', num: true },
                  { key: 'pa', label: 'PA', metric: 'pa', num: true },
                  { key: 'diff', label: 'DIFF', metric: 'diff', num: true, render: (r) => signed(r.pf - r.pa), value: (r) => r.pf - r.pa },
                  { key: 'po', label: 'Playoffs', render: (r) => (r.sbWin ? <span className="badge gold">Campeão</span> : playoffResult(r)), value: (r) => r.playoffW + (r.madePlayoffs ? 1 : 0) },
                  { key: 'coach', label: 'Técnico', render: (r) => r.coach ?? '—' },
                  { key: 'qb', label: 'QB (mais jogos)', render: (r) => r.qb ?? '—' },
                ]}
              />
            </section>
            <section>
              <h2>Rivais</h2>
              <div className="chips">
                {[...new Set([...rivals.map((r) => (r.a === code ? r.b : r.a)), ...divMates])].map((t) => (
                  <Link key={t} className="chip" to={`/matchup?a=${code}&b=${t}`}>
                    <TeamLogo abbr={t} size={16} /> {code} × {t}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
        {tab === 'similar' && (
          <div className="stack">
            <ModeNote
              beginner={<>Procuramos, desde 1999, as temporadas de outros times com o perfil mais parecido com o deste time em {season}: pontos marcados, pontos sofridos, jardas e eficiência.</>}
              expert={<>Distância euclidiana em z-scores de PF/j, PA/j, jardas de passe/j, jardas corridas/j e EPA/jogada. Similaridade = 100 / (1 + d).</>}
            />
            {similar.length ? (
              <DataTable
                rows={similar}
                rowKey={(r) => `${r.t.team}-${r.t.season}`}
                caption="Temporadas semelhantes"
                columns={[
                  { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.t.abbr} short />, value: (r) => r.t.team },
                  { key: 'season', label: 'Temporada', render: (r) => r.t.season, value: (r) => r.t.season },
                  { key: 'score', label: 'Similaridade', num: true, help: 'De 0 a 100; quanto maior, mais parecido o perfil estatístico.', render: (r) => r.score, value: (r) => r.score },
                  { key: 'rec', label: 'Campanha', render: (r) => fmtRecord(r.t) },
                  { key: 'po', label: 'Resultado', render: (r) => playoffResult(r.t) },
                ]}
              />
            ) : (
              <Unavailable>É preciso ao menos 8 jogos na temporada para calcular semelhanças.</Unavailable>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
}
