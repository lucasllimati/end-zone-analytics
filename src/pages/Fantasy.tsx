import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Callout, ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable, type Column } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useSeason } from '../data/hooks';
import { num } from '../lib/format';
import { franchiseOf } from '../lib/teams';
import type { FantasyDefense, FantasyPlayer, FantasySeason, Game } from '../lib/types';
import { PAGE_META } from '../content/pageMeta';

type Tab = 'week' | 'season' | 'matchups';
const POS = ['QB', 'RB', 'WR', 'TE'] as const;

export default function Fantasy() {
  const { season } = useSeason();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'week';
  const [pos, setPos] = useState<string>('');
  const data = useAsync(() => (season ? api.fantasy(season).catch(() => null) : Promise.resolve(null)), [season]);
  const games = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([] as Game[])), [season]);

  return (
    <div className="stack">
      <Seo {...PAGE_META['/fantasy']} />
      <PageHeader eyebrow="Fantasy" title={`Fantasy ${season ?? ''}`} lede="Quem pontua mais em cada semana, quem é consistente e quais defesas cedem mais pontos para cada posição. Pontuação PPR, a mais usada nas ligas." />
      <Tabs
        label="Seções do fantasy"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { id: 'week', label: 'Ranking da semana' },
          { id: 'season', label: 'Consistência' },
          { id: 'matchups', label: 'Confrontos' },
        ]}
      />
      <div className="chips" role="group" aria-label="Posição">
        {['', ...POS].map((p) => (
          <button key={p || 'all'} type="button" className="chip" aria-pressed={pos === p} onClick={() => setPos(p)}>
            {p || 'Todas'}
          </button>
        ))}
      </div>
      <TabPanel id={tab}>
        {data.loading ? (
          <Loading height={320} />
        ) : !data.data ? (
          <Unavailable>Ainda não há pontuação de fantasy para {season}.</Unavailable>
        ) : (
          <>
            {tab === 'week' && <WeekView f={data.data} pos={pos} />}
            {tab === 'season' && <SeasonView f={data.data} pos={pos} />}
            {tab === 'matchups' && <MatchupsView f={data.data} pos={pos} games={games.data ?? []} />}
          </>
        )}
      </TabPanel>
      <ModeNote
        beginner={
          <>
            No fantasy, cada participante monta um time com jogadores reais e soma os pontos que eles fazem nos jogos. Na pontuação PPR, cada recepção vale 1 ponto, além de jardas e touchdowns.
          </>
        }
        expert={<>PPR: 0,04 por jarda de passe, 4 por TD de passe, −2 por interceptação, 0,1 por jarda corrida ou recebida, 6 por TD, 1 por recepção, −2 por fumble perdido. Fonte: nflverse (fantasy_points_ppr).</>}
      />
    </div>
  );
}

const playerCol: Column<FantasyPlayer> = { key: 'name', label: 'Jogador', render: (r) => <Link to={`/players/${r.id}`}>{r.name}</Link>, value: (r) => r.name };
const posCol: Column<FantasyPlayer> = { key: 'pos', label: 'Pos.', width: '3.5rem' };
const teamCol: Column<FantasyPlayer> = { key: 'team', label: 'Time', width: '6rem', render: (r) => <TeamChip abbr={r.team} short size={18} />, value: (r) => r.team };
const n1 = (key: keyof FantasyPlayer, label: string, help?: string, width = '5rem'): Column<FantasyPlayer> => ({ key, label, num: true, width, help, render: (r) => num(r[key] as number, 1), value: (r) => r[key] as number });

function WeekView({ f, pos }: { f: FantasySeason; pos: string }) {
  const [week, setWeek] = useState(f.weeks);
  const rows = useMemo(
    () =>
      f.players
        .filter((p) => (!pos || p.pos === pos) && p.weeks[week - 1] !== null)
        .map((p) => ({ ...p, wk: p.weeks[week - 1]! }))
        .sort((a, b) => b.wk - a.wk),
    [f, pos, week],
  );
  return (
    <div className="stack">
      <label className="field" style={{ maxWidth: 200 }}>
        Semana
        <select className="select" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {Array.from({ length: f.weeks }, (_, i) => f.weeks - i).map((w) => (
            <option key={w} value={w}>
              Semana {w}
            </option>
          ))}
        </select>
      </label>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        caption={`Ranking de fantasy da semana ${week}`}
        rank
        pageSize={50}
        exportName={`fantasy-${f.season}-semana-${week}`}
        initialSort={{ key: 'wk', dir: 'desc' }}
        columns={[playerCol, posCol, teamCol, { key: 'wk', label: 'Pontos', num: true, width: '5rem', render: (r) => num(r.wk, 1), value: (r) => r.wk }, n1('avg', 'Média', 'Média por jogo na temporada.')]}
      />
    </div>
  );
}

function SeasonView({ f, pos }: { f: FantasySeason; pos: string }) {
  const rows = f.players.filter((p) => !pos || p.pos === pos);
  return (
    <div className="stack">
      <Callout title="Como ler a consistência">
        <strong>Desvio</strong> mede quanto a pontuação varia de um jogo para outro: quanto menor, mais previsível. <strong>Piso</strong> e <strong>teto</strong> são a pior e a melhor semana.{' '}
        <strong>Top 12</strong> conta as semanas em que o jogador ficou entre os 12 melhores da posição.
      </Callout>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        caption={`Fantasy da temporada ${f.season}: total, média e consistência`}
        rank
        pageSize={50}
        exportName={`fantasy-${f.season}`}
        initialSort={{ key: 'total', dir: 'desc' }}
        columns={[
          playerCol,
          posCol,
          teamCol,
          { key: 'games', label: 'J', num: true, width: '3.5rem', help: 'Jogos com pontuação.' },
          n1('total', 'Total'),
          n1('avg', 'Média', 'Pontos por jogo.'),
          n1('sd', 'Desvio', 'Desvio padrão por jogo: quanto menor, mais consistente.'),
          n1('floor', 'Piso', 'Pior semana.'),
          n1('ceil', 'Teto', 'Melhor semana.'),
          { key: 'top12', label: 'Top 12', num: true, width: '5rem', help: 'Semanas entre os 12 melhores da posição.' },
        ]}
      />
    </div>
  );
}

function MatchupsView({ f, pos, games }: { f: FantasySeason; pos: string; games: Game[] }) {
  const shown = pos ? [pos] : [...POS];
  const byTeam = useMemo(() => {
    const m = new Map<string, Record<string, FantasyDefense>>();
    for (const d of f.defense) (m.get(d.team) ?? m.set(d.team, {}).get(d.team)!)[d.pos] = d;
    return [...m.entries()].map(([team, p]) => ({ team, ...p })) as ({ team: string } & Record<string, FantasyDefense>)[];
  }, [f]);
  // Próxima rodada: cada ataque contra o ranking da defesa adversária na posição escolhida.
  // Só jogos ainda não disputados; se a semana atual estiver quase no fim, entra também a seguinte.
  const open = games.filter((g) => g.type === 'REG' && g.homeScore === null);
  const openWeeks = [...new Set(open.map((g) => g.week))].sort((x, y) => x - y);
  const shownWeeks = openWeeks.length && open.filter((g) => g.week === openWeeks[0]).length < 4 ? openWeeks.slice(0, 2) : openWeeks.slice(0, 1);
  const upcoming = open.filter((g) => shownWeeks.includes(g.week));
  const weeksLabel = shownWeeks.length > 1 ? `Semanas ${shownWeeks[0]}–${shownWeeks[1]}` : `Semana ${shownWeeks[0]}`;
  const rankOf = (team: string, p: string) => f.defense.find((d) => d.team === franchiseOf(team) && d.pos === p);
  const tone = (rank: number) => (rank <= 8 ? 'good' : rank >= 25 ? 'bad' : '');
  // Com "Todas", entram as quatro posições (com a coluna Pos.); com uma posição, só ela.
  const plays = upcoming
    .flatMap((g) => [
      { offense: g.away, defense: g.home, game: g.id },
      { offense: g.home, defense: g.away, game: g.id },
    ])
    .flatMap((m) => shown.map((p) => ({ ...m, pos: p, d: rankOf(m.defense, p) })))
    .filter((m) => m.d)
    .sort((a, b) => a.d!.rank - b.d!.rank || b.d!.avg - a.d!.avg);
  const forWhom = pos || 'cada posição';
  return (
    <div className="stack">
      <Callout title="Como ler os confrontos">
        Média de pontos de fantasy que cada defesa cedeu por jogo a cada posição. <span className="badge good">1º–8º</span> cede mais (confronto favorável para quem ataca);{' '}
        <span className="badge bad">25º–32º</span> cede menos (confronto difícil).
      </Callout>
      {plays.length > 0 && (
        <section className="card">
          <h2>
            {weeksLabel}: melhores confrontos para {forWhom}
          </h2>
          <DataTable
            rows={plays}
            rowKey={(r) => `${r.game}-${r.offense}-${r.pos}`}
            caption={`Próximos confrontos para ${forWhom}`}
            bare
            pageSize={8}
            columns={[
              { key: 'offense', label: 'Ataque', render: (r) => <TeamChip abbr={r.offense} short size={18} />, value: (r) => r.offense },
              ...(pos ? [] : [{ key: 'pos', label: 'Pos.', width: '4rem' } as Column<(typeof plays)[number]>]),
              { key: 'defense', label: 'Contra a defesa de', render: (r) => <TeamChip abbr={r.defense} short size={18} />, value: (r) => r.defense },
              { key: 'avg', label: pos ? `Cede a ${pos}` : 'Cede à posição', num: true, width: '8rem', render: (r) => num(r.d!.avg, 1), value: (r) => r.d!.avg },
              { key: 'rank', label: 'Ranking', num: true, width: '6rem', render: (r) => <span className={`badge ${tone(r.d!.rank)}`}>{r.d!.rank}º</span>, value: (r) => r.d!.rank },
            ]}
          />
        </section>
      )}
      <DataTable
        rows={byTeam}
        rowKey={(r) => r.team}
        caption={`Pontos de fantasy cedidos por defesa e posição em ${f.season}`}
        initialSort={{ key: shown[0], dir: 'desc' }}
        columns={[
          { key: 'team', label: 'Defesa', render: (r) => <TeamChip abbr={r.team} size={18} />, value: (r) => r.team },
          ...shown.map(
            (p): Column<{ team: string } & Record<string, FantasyDefense>> => ({
              key: p,
              label: `Cede a ${p}`,
              num: true,
              width: '8rem',
              render: (r) => (
                <span className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {num(r[p]?.avg ?? 0, 1)} <span className={`badge ${tone(r[p]?.rank ?? 16)}`}>{r[p]?.rank}º</span>
                </span>
              ),
              value: (r) => r[p]?.avg ?? 0,
            }),
          ),
        ]}
      />
    </div>
  );
}
