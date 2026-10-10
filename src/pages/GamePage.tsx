import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Callout, ModeNote, Seo } from '../components/Bits';
import { Loading, Unavailable } from '../components/States';
import { TeamLogo, TeamName } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { api, apiGet } from '../data/client';
import { useAsync, useTeams } from '../data/hooks';
import { fromEspn } from '../data/live';
import { useTeamColor } from '../data/useTeamColor';
import { GAME_TYPE_LABEL, franchiseOf } from '../lib/teams';
import { headToHead } from '../lib/games';
import { dateBR, num, weekdayPt } from '../lib/format';

interface Detail {
  state: string;
  detail: string;
  venue: { name: string | null; city: string | null; attendance: number | null };
  teams: { side: 'home' | 'away'; abbr: string; score: number | null; linescores: number[] }[];
  scoringPlays: { period: number; clock: string; team: string; type: string; text: string; away: number; home: number }[];
  drives: { team: string; description: string; result: string; yards: number; plays: number; start: string; end: string; time: string; period: number; isScore: boolean }[];
  teamStats: { label: string; away: string; home: string }[];
  leaders: { category: string; side: 'home' | 'away'; team: string; athlete: string; value: string }[];
  winProbability: { play: number; home: number }[];
  officials: string[];
}

const ROOF: Record<string, string> = { outdoors: 'Céu aberto', dome: 'Coberto (domo)', closed: 'Teto retrátil fechado', open: 'Teto retrátil aberto' };
const RESULT_PT: Record<string, string> = {
  Touchdown: 'Touchdown', 'Field Goal': 'Field goal', Punt: 'Punt', Interception: 'Interceptação', Fumble: 'Fumble', 'Turnover on Downs': 'Perdeu no 4º down', 'Missed FG': 'FG errado', 'End of Half': 'Fim do 1º tempo', 'End of Game': 'Fim de jogo', Safety: 'Safety', 'Blocked FG': 'FG bloqueado', 'Blocked Punt': 'Punt bloqueado', Downs: 'Perdeu no 4º down', 'Fumble Return Touchdown': 'TD de fumble', 'Interception Touchdown': 'Pick-six',
};

export default function GamePage() {
  const { id = '' } = useParams();
  const all = useAsync(() => api.allGames(), []);
  const g = all.data?.find((x) => x.id === id);
  const detail = useAsync(() => (g?.espn ? apiGet<Detail>(`/api/live/game/${g.espn}`) : Promise.resolve(null)), [g?.espn]);
  const { map } = useTeams();
  const teamColor = useTeamColor();
  const flowRef = useRef<SVGSVGElement>(null);
  const wpRef = useRef<SVGSVGElement>(null);
  const [selPlay, setSelPlay] = useState<number | null>(null);
  const h2h = useMemo(() => (g && all.data ? headToHead(all.data.filter((x) => x.date < g.date), franchiseOf(g.away), franchiseOf(g.home)) : null), [g, all.data]);

  if (all.loading) return <Loading height={400} />;
  if (!g) return <Unavailable>Jogo não encontrado.</Unavailable>;
  const d = detail.data;
  const home = d?.teams.find((t) => t.side === 'home');
  const away = d?.teams.find((t) => t.side === 'away');
  const hs = home?.score ?? g.homeScore;
  const as = away?.score ?? g.awayScore;
  const played = hs !== null && as !== null;
  const nick = (t: string) => map.get(t)?.nick ?? map.get(franchiseOf(t))?.nick ?? t;
  const colorOf = (t: string) => teamColor(t, t === g.home ? 1 : 0);

  // Evolução do placar a partir das jogadas de pontuação.
  const flow = d?.scoringPlays.length
    ? [{ x: 0, a: 0, h: 0 }, ...d.scoringPlays.map((p, i) => ({ x: i + 1, a: p.away, h: p.home }))]
    : [];

  return (
    <div className="stack">
      <Seo title={`${g.away} × ${g.home} (${g.season})`} description={`Game Center: ${g.away} × ${g.home}, ${GAME_TYPE_LABEL[g.type]} de ${g.season}. Placar por quarto, drives, jogadas de pontuação e estatísticas.`} />
      <div className="breadcrumb">
        <Link to={`/season?tab=schedule`}>Calendário</Link> / Game Center
      </div>
      <section className="card">
        <h1 className="sr-only">
          {nick(g.away)} × {nick(g.home)} — {GAME_TYPE_LABEL[g.type]} {g.season}
        </h1>
        <div className="eyebrow" style={{ textAlign: 'center' }}>
          {g.type === 'REG' ? `Semana ${g.week}` : GAME_TYPE_LABEL[g.type]} · Temporada {g.season} · {weekdayPt(g.weekday)} {dateBR(g.date)}
        </div>
        <div className="row" style={{ justifyContent: 'space-around', gap: 16, marginTop: 12 }}>
          {[
            { t: g.away, s: as, label: 'Visitante' },
            { t: g.home, s: hs, label: g.neutral ? 'Mandante (campo neutro)' : 'Mandante' },
          ].map((x, i) => (
            <div key={x.t} style={{ textAlign: 'center', order: i === 0 ? 0 : 2 }}>
              <Link to={`/teams/${franchiseOf(x.t).toLowerCase()}`}>
                <TeamLogo abbr={x.t} size={80} />
              </Link>
              <div style={{ fontWeight: 650, marginTop: 6 }}>
                <TeamName abbr={x.t} />
              </div>
              <div className="xsmall muted">{x.label}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', order: 1 }}>
            <div className="hero-number" aria-label={played ? `Placar: ${as} a ${hs}` : 'Jogo não iniciado'}>
              {played ? `${as} – ${hs}` : 'vs'}
            </div>
            <div className="small muted">
              {d?.state === 'in' ? <span className="badge live">AO VIVO · {d.detail}</span> : played ? `Final${g.ot ? ' · prorrogação' : ''}` : g.time ? `${g.time} ET` : 'A definir'}
            </div>
          </div>
        </div>
      </section>

      <div className="two-col">
        <div className="stack">
          {d && home && away && home.linescores.length > 0 && (
            <section className="card">
              <h2>Placar por quarto</h2>
              <div className="table-wrap bare" tabIndex={0} role="region" aria-label="Tabela">
                <table className="data">
                  <caption className="sr-only">Pontos por quarto</caption>
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      {home.linescores.map((_, i) => (
                        <th key={i} scope="col" className="num">
                          {i < 4 ? `${i + 1}º` : 'OT'}
                        </th>
                      ))}
                      <th scope="col" className="num">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[away, home].map((t) => (
                      <tr key={t.abbr}>
                        <td>
                          <span className="row" style={{ gap: 6 }}>
                            <TeamLogo abbr={fromEspn(t.abbr)} size={18} /> {nick(fromEspn(t.abbr))}
                          </span>
                        </td>
                        {t.linescores.map((v, i) => (
                          <td key={i} className="num">
                            {v}
                          </td>
                        ))}
                        <td className="num strong">{t.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {flow.length > 1 && (
            <section className="card">
              <ChartFrame
                title="Evolução do placar"
                subtitle="Cada ponto é uma pontuação"
                info={{ simple: 'Mostra como o placar mudou ao longo do jogo. Linhas que se cruzam indicam viradas.' }}
                legend={[
                  { label: nick(g.away), slot: 0, color: colorOf(g.away) },
                  { label: nick(g.home), slot: 1, color: colorOf(g.home) },
                ]}
                svgRef={flowRef}
                table={<MiniTable head={['#', g.away, g.home]} rows={flow.map((f) => [String(f.x), f.a, f.h])} />}
              >
                <LineChart
                  ref={flowRef}
                  ariaLabel="Evolução do placar"
                  xFormat={(x) => (x === 0 ? 'Início' : `${x}ª`)}
                  series={[
                    { id: 'a', label: nick(g.away), slot: 0, color: colorOf(g.away), points: flow.map((f) => ({ x: f.x, y: f.a })) },
                    { id: 'h', label: nick(g.home), slot: 1, color: colorOf(g.home), points: flow.map((f) => ({ x: f.x, y: f.h })) },
                  ]}
                  yZero
                />
              </ChartFrame>
            </section>
          )}

          {d && d.scoringPlays.length > 0 && (
            <section className="card">
              <h2>Jogadas de pontuação</h2>
              <ol className="timeline" style={{ listStyle: 'none', margin: 0 }}>
                {d.scoringPlays.map((p, i) => (
                  <li key={i} className="timeline-item">
                    <button type="button" className="btn ghost" style={{ height: 'auto', padding: 0, textAlign: 'left', whiteSpace: 'normal', display: 'block', fontWeight: 400 }} aria-expanded={selPlay === i} onClick={() => setSelPlay(selPlay === i ? null : i)}>
                      <div className="when">
                        {p.period <= 4 ? `${p.period}º quarto` : 'Prorrogação'} · {p.clock}
                      </div>
                      <span className="row" style={{ gap: 6 }}>
                        <TeamLogo abbr={fromEspn(p.team)} size={18} /> <strong>{p.type}</strong> — {g.away} {p.away} × {p.home} {g.home}
                      </span>
                    </button>
                    {selPlay === i && <p className="small text-2" style={{ marginTop: 4 }}>{p.text}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {d && d.drives.length > 0 && (
            <section className="card">
              <h2 className="row" style={{ gap: 6 }}>
                Drives <InfoTip title="Drive" simple="Sequência de jogadas de um time com a posse da bola. Termina com pontuação, punt, turnover ou fim do tempo." expert="O comprimento da barra representa as jardas ganhas no drive." />
              </h2>
              <div className="stack-sm">
                {d.drives.map((dr, i) => (
                  <div key={i} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                    <span className="xsmall muted num" style={{ width: 28 }}>
                      {i + 1}
                    </span>
                    <TeamLogo abbr={fromEspn(dr.team)} size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row between small" style={{ flexWrap: 'nowrap', gap: 8 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dr.description} · {dr.start} → {dr.end}
                        </span>
                        <span className={`badge ${dr.isScore ? 'good' : /Intercep|Fumble|Downs/.test(dr.result) ? 'live' : ''}`}>{RESULT_PT[dr.result] ?? dr.result}</span>
                      </div>
                      <div className="meter" style={{ marginTop: 4 }} aria-hidden="true">
                        <span style={{ width: `${Math.max(2, Math.min(100, dr.yards))}%`, background: colorOf(fromEspn(dr.team)) ?? 'var(--series-1)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {d && d.winProbability.length > 2 && (
            <section className="card">
              <ChartFrame
                title={`Probabilidade de vitória: ${nick(g.home)}`}
                subtitle="Fonte: modelo da ESPN, jogada a jogada"
                info={{ simple: 'A chance (em %) de o time da casa vencer, estimada a cada jogada. Acima de 50% = favorito naquele momento.', expert: 'Win probability considera placar, tempo, posse, down, distância e posição de campo. Grandes saltos = jogadas de alto WPA.' }}
                svgRef={wpRef}
              >
                <LineChart ref={wpRef} ariaLabel="Probabilidade de vitória" series={[{ id: 'wp', label: nick(g.home), slot: 0, color: colorOf(g.home), points: d.winProbability.map((w) => ({ x: w.play, y: w.home })) }]} xFormat={(x) => `jogada ${x}`} yFormat={(y) => `${num(y)}%`} reference={{ y: 50, label: '50%' }} area endLabels={false} />
              </ChartFrame>
            </section>
          )}
          {!d && !detail.loading && (
            <Callout title="Detalhes jogada a jogada indisponíveis">
              Placar por quarto, drives e probabilidade de vitória vêm da API em tempo real (requer o servidor da aplicação e uma conexão com a fonte). Os dados básicos do jogo continuam disponíveis.
            </Callout>
          )}
          {detail.loading && g.espn && <Loading height={200} label="Carregando detalhes do jogo…" />}
        </div>

        <aside className="stack">
          <section className="card">
            <h2>Ficha do jogo</h2>
            <dl className="kv">
              <dt>Estádio</dt>
              <dd>{d?.venue.name ?? g.stadium ?? 'Não disponível'}</dd>
              {d?.venue.city && (
                <>
                  <dt>Cidade</dt>
                  <dd>{d.venue.city}</dd>
                </>
              )}
              <dt>Teto</dt>
              <dd>{g.roof ? ROOF[g.roof] ?? g.roof : 'Não disponível'}</dd>
              <dt>Gramado</dt>
              <dd>{g.surface ? (g.surface === 'grass' ? 'Grama natural' : `Sintético (${g.surface})`) : 'Não disponível'}</dd>
              <dt>Temperatura</dt>
              <dd>{g.temp !== null ? `${g.temp} °F (${num(((g.temp - 32) * 5) / 9)} °C)` : 'Não disponível'}</dd>
              <dt>Vento</dt>
              <dd>{g.wind !== null ? `${g.wind} mph` : 'Não disponível'}</dd>
              <dt>Público</dt>
              <dd>{d?.venue.attendance ? num(d.venue.attendance) : 'Não disponível'}</dd>
              <dt>QB visitante</dt>
              <dd>{g.awayQb ?? 'Não disponível'}</dd>
              <dt>QB mandante</dt>
              <dd>{g.homeQb ?? 'Não disponível'}</dd>
              <dt>Técnicos</dt>
              <dd>
                {g.awayCoach ?? '—'} × {g.homeCoach ?? '—'}
              </dd>
              <dt>Árbitro</dt>
              <dd>{g.referee ?? 'Não disponível'}</dd>
            </dl>
          </section>
          {d && d.teamStats.length > 0 && (
            <section className="card">
              <h2>Estatísticas dos times</h2>
              <div className="table-wrap bare" tabIndex={0} role="region" aria-label="Tabela">
                <table className="data">
                  <caption className="sr-only">Estatísticas comparadas</caption>
                  <thead>
                    <tr>
                      <th scope="col">{g.away}</th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        Estatística
                      </th>
                      <th scope="col" className="num">
                        {g.home}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.teamStats.map((s, i) => (
                      <tr key={`${s.label}-${i}`}>
                        <td>{s.away}</td>
                        <td className="muted small" style={{ textAlign: 'center', whiteSpace: 'normal' }}>
                          {s.label}
                        </td>
                        <td className="num">{s.home}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {d && d.leaders.length > 0 && (
            <section className="card">
              <h2>Destaques</h2>
              <div className="stack-sm small">
                {d.leaders.map((l, i) => (
                  <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <TeamLogo abbr={fromEspn(l.team)} size={18} />
                    <span style={{ minWidth: 0 }}>
                      <strong>{l.athlete}</strong> <span className="muted">· {l.category}</span>
                      <br />
                      <span className="text-2">{l.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {h2h && h2h.games.length > 0 && (
            <section className="card">
              <h2>Antes deste jogo</h2>
              <p className="small text-2">
                Desde 1999: {nick(g.away)} {h2h.aWins} × {h2h.bWins} {nick(g.home)}
                {h2h.ties ? `, ${h2h.ties} empate(s)` : ''} em {h2h.games.length} jogos.
              </p>
              <Link className="btn sm" to={`/matchup?a=${franchiseOf(g.away)}&b=${franchiseOf(g.home)}`}>
                Histórico do confronto
              </Link>
            </section>
          )}
          <ModeNote beginner={<>“Drive” é uma posse de bola. Os resultados mostram como cada posse terminou: TD, field goal, punt ou perda da bola.</>} />
        </aside>
      </div>
    </div>
  );
}
