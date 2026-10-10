import { useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { TeamLogo, TeamName } from '../components/TeamLogo';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { ColumnChart } from '../components/charts/ColumnChart';
import { api } from '../data/client';
import { useAsync, useTeams } from '../data/hooks';
import { useTeamColor } from '../data/useTeamColor';
import { headToHead, winnerOf } from '../lib/games';
import { ACTIVE_TEAMS, GAME_TYPE_LABEL, franchiseOf } from '../lib/teams';
import { fmtRecord } from '../lib/standings';
import { dateBR } from '../lib/format';
import { RIVALRIES } from '../content/rivalries';

export default function Matchup() {
  const [params, setParams] = useSearchParams();
  const a = (params.get('a') ?? 'GB').toUpperCase();
  const b = (params.get('b') ?? 'CHI').toUpperCase();
  const { map } = useTeams();
  const navigate = useNavigate();
  const teamColor = useTeamColor();
  const all = useAsync(() => api.allGames(), []);
  const chartRef = useRef<SVGSVGElement>(null);
  const h = useMemo(() => (all.data ? headToHead(all.data, a, b) : null), [all.data, a, b]);
  const rivalry = RIVALRIES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
  const set = (k: 'a' | 'b', v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p, { replace: true });
  };
  const nameA = map.get(a)?.nick ?? a;
  const nameB = map.get(b)?.nick ?? b;

  return (
    <div className="stack">
      <Seo title={`${nameA} × ${nameB}`} description={`Histórico de confrontos entre ${nameA} e ${nameB}: vitórias, placares, playoffs e linha do tempo.`} />
      <PageHeader eyebrow="Confrontos e rivalidades" title={`${nameA} × ${nameB}`} lede="Todos os jogos entre dois times desde 1999: quem venceu mais, maiores vitórias, playoffs e desempenho em casa e fora." />
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
      </div>
      <div className="chips" aria-label="Rivalidades clássicas">
        {RIVALRIES.map((r) => (
          <button key={r.name} type="button" className="chip" aria-pressed={(r.a === a && r.b === b) || (r.a === b && r.b === a)} onClick={() => setParams({ a: r.a, b: r.b }, { replace: true })}>
            {r.name}
          </button>
        ))}
      </div>
      {rivalry && (
        <p className="text-2" style={{ margin: 0 }}>
          <strong>{rivalry.name}</strong> — rivalidade desde {rivalry.since}. {rivalry.note}
        </p>
      )}
      {all.loading || !h ? (
        <Loading />
      ) : a === b ? (
        <Unavailable>Escolha dois times diferentes.</Unavailable>
      ) : h.games.length === 0 ? (
        <Unavailable>Não houve confrontos entre esses times desde 1999.</Unavailable>
      ) : (
        <>
          <section className="card">
            <div className="row" style={{ justifyContent: 'space-around', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <TeamLogo abbr={a} size={72} />
                <div className="hero-number" style={{ marginTop: 8 }}>
                  {h.aWins}
                </div>
                <div className="small muted">vitórias do {nameA}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="small muted">{h.games.length} jogos</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 650 }}>×</div>
                {h.ties > 0 && <div className="small muted">{h.ties} empate(s)</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <TeamLogo abbr={b} size={72} />
                <div className="hero-number" style={{ marginTop: 8 }}>
                  {h.bWins}
                </div>
                <div className="small muted">vitórias do {nameB}</div>
              </div>
            </div>
          </section>
          <div className="tiles">
            <StatTile label="Pontos no confronto" value={`${h.aPoints} × ${h.bPoints}`} note={`${nameA} × ${nameB}`} />
            <StatTile label={`${nameA} em casa`} value={fmtRecord(h.aHome)} />
            <StatTile label={`${nameA} fora`} value={fmtRecord(h.aAway)} />
            <StatTile label="Sequência atual" value={<span style={{ fontSize: '1rem' }}>{h.streak}</span>} />
            <StatTile label="Jogos de playoffs" value={h.playoffGames.length} />
          </div>
          <ModeNote beginner={<>Cada barra é um jogo: para cima, vitória do {nameA}; para baixo, do {nameB}. O tamanho mostra a diferença de pontos.</>} />
          <div className="card">
            <ChartFrame
              title="Linha do tempo dos confrontos"
              subtitle={`Diferença de pontos do ponto de vista do ${nameA}`}
              info={{ simple: `Barras positivas: vitórias do ${nameA}. Negativas: vitórias do ${nameB}. Clique em uma barra para abrir o jogo.` }}
              svgRef={chartRef}
              rows={() => h.games.map((g) => ({ data: g.date, temporada: g.season, tipo: g.type, visitante: g.away, pv: g.awayScore, mandante: g.home, pm: g.homeScore }))}
              table={<MiniTable head={['Data', 'Placar', 'Saldo']} rows={h.games.map((g) => { const d = franchiseOf(g.home) === a ? g.homeScore! - g.awayScore! : g.awayScore! - g.homeScore!; return [g.date, `${g.away} ${g.awayScore} × ${g.homeScore} ${g.home}`, d]; })} />}
            >
              <ColumnChart
                ref={chartRef}
                ariaLabel="Saldo de pontos por confronto"
                labelExtremes={false}
                onSelect={(id) => navigate(`/games/${id}`)}
                data={h.games.map((g) => {
                  const d = franchiseOf(g.home) === a ? g.homeScore! - g.awayScore! : g.awayScore! - g.homeScore!;
                  return {
                    key: g.id,
                    label: String(g.season).slice(2),
                    value: d,
                    color: d >= 0 ? teamColor(a, 0) : teamColor(b, 1),
                    tooltip: [`${dateBR(g.date)} · ${GAME_TYPE_LABEL[g.type]}`, `${g.away} ${g.awayScore} × ${g.homeScore} ${g.home}`],
                  };
                })}
              />
            </ChartFrame>
          </div>
          <div className="grid grid-2">
            {[h.biggestA, h.biggestB].map((g, i) =>
              g ? (
                <Link key={g.id} to={`/games/${g.id}`} className="card card-link">
                  <div className="eyebrow">Maior vitória do {i === 0 ? nameA : nameB}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 650 }}>
                    {g.away} {g.awayScore} × {g.homeScore} {g.home}
                  </div>
                  <div className="small muted">
                    {dateBR(g.date)} · {GAME_TYPE_LABEL[g.type]}
                  </div>
                </Link>
              ) : null,
            )}
          </div>
          <section>
            <h2>Todos os jogos</h2>
            <DataTable
              rows={[...h.games].reverse()}
              rowKey={(g) => g.id}
              caption="Todos os confrontos"
              exportName={`${a}-x-${b}`}
              columns={[
                { key: 'date', label: 'Data', render: (g) => <Link to={`/games/${g.id}`}>{dateBR(g.date)}</Link>, value: (g) => g.date },
                { key: 'type', label: 'Tipo', render: (g) => GAME_TYPE_LABEL[g.type], value: (g) => g.type },
                { key: 'score', label: 'Placar', render: (g) => `${g.away} ${g.awayScore} × ${g.homeScore} ${g.home}${g.ot ? ' (OT)' : ''}` },
                { key: 'winner', label: 'Vencedor', render: (g) => { const w = winnerOf(g); return w ? <span className="row" style={{ gap: 6 }}><TeamLogo abbr={w} size={18} /><TeamName abbr={w} short /></span> : 'Empate'; }, value: (g) => winnerOf(g) },
                { key: 'stadium', label: 'Estádio', render: (g) => g.stadium ?? '—' },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
