import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Callout, ModeNote, Seo } from '../components/Bits';
import { Loading, Unavailable } from '../components/States';
import { TeamLogo, TeamName } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { LineChart } from '../components/charts/LineChart';
import { api } from '../data/client';
import { useAsync, useTeams } from '../data/hooks';
import { fromEspn, useGameDetail } from '../data/live';
import { useFavoriteTeam } from '../data/favorite';
import { useTeamColor } from '../data/useTeamColor';
import { GAME_TYPE_LABEL, franchiseOf } from '../lib/teams';
import { headToHead } from '../lib/games';
import { dateBR, num, surfaceLabel, weekdayPt } from '../lib/format';
import { BoxScore, MarketCard, RefereeCard, RestRows } from './game/GameSections';
import { LeadersByTeam, StatsCompare, TeamForm } from './game/GamePreview';
import { gameMeta } from '../content/pageMeta';
import { TermText, TermsToggle, useTermsLang } from '../components/TermsToggle';
import { leaderTerm, scoreTypeTerm, translateGameDetail, translateLeaderValue, translateScoringText } from '../content/espnTerms';

interface Detail {
  state: string;
  detail: string;
  venue: { name: string | null; city: string | null; attendance: number | null };
  teams: { side: 'home' | 'away'; abbr: string; score: number | null; linescores: number[] }[];
  scoringPlays: { period: number; clock: string; team: string; type: string; text: string; away: number; home: number }[];
  drives: { team: string; description: string; result: string; yards: number; plays: number; start: string; end: string; time: string; period: number; isScore: boolean }[];
  teamStats: { key?: string; label: string; away: string; home: string }[];
  leaders: { key?: string; category: string; side: 'home' | 'away'; team: string; athlete: string; value: string }[];
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
  const detail = useGameDetail<Detail>(g?.espn);
  const [fav] = useFavoriteTeam();
  const { map } = useTeams();
  const teamColor = useTeamColor();
  const flowRef = useRef<SVGSVGElement>(null);
  const wpRef = useRef<SVGSVGElement>(null);
  const [lang] = useTermsLang();
  const [wpSide, setWpSide] = useState<'both' | 'away' | 'home'>('both');
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

  // Árbitro: nflverse; se ainda não estiver lá (jogos recentes), a equipe de arbitragem informada pela ESPN.
  const referee = g.referee ?? d?.officials.find((o) => /\(Referee\)/i.test(o))?.replace(/\s*\(Referee\)/i, '') ?? null;
  const facts: [string, string | null][] = [
    ['Estádio', d?.venue.name ?? g.stadium],
    ['Cidade', d?.venue.city ?? null],
    ['Teto', g.roof ? ROOF[g.roof] ?? g.roof : null],
    ['Gramado', surfaceLabel(g.surface) ? [surfaceLabel(g.surface)!.kind, surfaceLabel(g.surface)!.brand].filter(Boolean).join(' · ') : null],
    ['Temperatura', g.temp !== null ? `${num(((g.temp - 32) * 5) / 9)} °C (${g.temp} °F)` : null],
    ['Vento', g.wind !== null ? `${num(g.wind * 1.609)} km/h (${g.wind} mph)` : null],
    ['Público', d?.venue.attendance ? num(d.venue.attendance) : null],
    ['QB visitante', g.awayQb],
    ['QB mandante', g.homeQb],
    ['Técnicos', g.awayCoach || g.homeCoach ? `${g.awayCoach ?? '—'} × ${g.homeCoach ?? '—'}` : null],
    ['Árbitro', referee],
  ];

  // Jogo ainda não disputado abre direto na prévia (antes, mostrava duas colunas enquanto carregava e
  // depois trocava de layout). Com detalhes, a prévia só fica enquanto não houver placar, drives etc.
  const upcoming = g.homeScore === null && d?.state !== 'in' && d?.state !== 'post';
  const hasMain = d
    ? Boolean((home && home.linescores.length > 0) || d.scoringPlays.length || d.drives.length || d.winProbability.length > 2)
    : !upcoming;

  // Evolução do placar a partir das jogadas de pontuação.
  const flow = d?.scoringPlays.length
    ? [{ x: 0, a: 0, h: 0 }, ...d.scoringPlays.map((p, i) => ({ x: i + 1, a: p.away, h: p.home }))]
    : [];

  // Blocos usados nos dois layouts (jogo em andamento/encerrado e prévia antes do jogo).
  const fichaCard = (
    <section className="card">
      <h2>Ficha do jogo</h2>
      {/* Só aparecem as linhas com informação: dado ausente não ocupa espaço na ficha. */}
      <dl className="kv">
        {facts.map(([label, value]) => (
          <Fact key={label} label={label} value={value} />
        ))}
        <RestRows g={g} nick={nick} />
      </dl>
    </section>
  );
  const h2hCard = h2h && h2h.games.length > 0 && (
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
  );

  return (
    <div className="stack">
      <Seo {...gameMeta(g, nick)} />
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
              {/* "Meu time" na mesma linha do papel do time: não muda a altura e os dois lados ficam alinhados. */}
              <div className="xsmall muted">
                {x.label}
                {fav === franchiseOf(x.t) && <span className="accent-text"> · ★ Meu time</span>}
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', order: 1 }}>
            <div className="hero-number" aria-label={played ? `Placar: ${as} a ${hs}` : 'Jogo não iniciado'}>
              {played ? `${as} – ${hs}` : 'vs'}
            </div>
            <div className="small muted">
              {d?.state === 'in' ? (
                <>
                  <span className="badge live">AO VIVO · {lang === 'en' ? d.detail : translateGameDetail(d.detail)}</span>
                  {detail.updatedAt && (
                    <div className="xsmall muted" style={{ marginTop: 4 }} aria-live="polite">
                      Atualizado às {new Date(detail.updatedAt).toLocaleTimeString('pt-BR')} · atualiza sozinho a cada 30 s
                    </div>
                  )}
                </>
              ) : played ? `Final${g.ot ? ' · prorrogação' : ''}` : g.time ? `${g.time} ET` : 'A definir'}
            </div>
          </div>
        </div>
      </section>

      {/* Antes do jogo não há placar, drives nem probabilidade: a página vira uma prévia em duas colunas. */}
      {!hasMain ? (
        <div className="gc-preview">
          <div className="stack">
            {fichaCard}
            {/* Os jogos da temporada chegam por outra consulta: reserva o espaço enquanto carregam. */}
            {all.loading && !all.data && <Loading height={120} label="Carregando momento dos times…" />}
            {all.data && <TeamForm g={g} all={all.data} nick={nick} lang={lang} />}
            <MarketCard g={g} nick={nick} />
            <RefereeCard name={referee} />
            {h2hCard}
          </div>
          <div className="stack">
            {detail.loading && <Loading height={260} label="Carregando médias e destaques…" />}
            {d && d.teamStats.length > 0 && <StatsCompare g={g} rows={d.teamStats} pre lang={lang} />}
            {d && <LeadersByTeam g={g} leaders={d.leaders} nick={nick} lang={lang} />}
          </div>
        </div>
      ) : (
      <div className="two-col gc-layout">
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
              <div className="section-title">
                <h2>Jogadas de pontuação</h2>
                <TermsToggle />
              </div>
              <ol className="timeline" style={{ listStyle: 'none', margin: 0 }}>
                {d.scoringPlays.map((p, i) => (
                  <li key={i} className="timeline-item">
                    <div className="when">
                      {p.period <= 4 ? `${p.period}º quarto` : 'Prorrogação'} · {p.clock}
                    </div>
                    <span className="row" style={{ gap: 6 }}>
                      <TeamLogo abbr={fromEspn(p.team)} size={18} /> <strong>{lang === 'en' ? scoreTypeTerm(p.type)?.en ?? p.type : p.type}</strong> — {g.away} {p.away} × {p.home} {g.home}
                    </span>
                    {p.text && <p className="small text-2 scoring-text">{lang === 'en' ? p.text : translateScoringText(p.text)}</p>}
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
                          {lang === 'en' ? dr.description : driveText(dr)} · {dr.start} → {dr.end}
                        </span>
                        <span className={`badge ${dr.isScore ? 'good' : /Intercep|Fumble|Downs/.test(dr.result) ? 'live' : ''}`}>{lang === 'en' ? dr.result : RESULT_PT[dr.result] ?? dr.result}</span>
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
                title={wpSide === 'both' ? 'Probabilidade de vitória' : `Probabilidade de vitória: ${nick(wpSide === 'home' ? g.home : g.away)}`}
                subtitle="Eixo horizontal: número da jogada. Modelo da ESPN; as duas linhas são complementares (somam 100%)."
                info={{ simple: 'A chance (em %) de cada time vencer, estimada a cada jogada. Quem está acima de 50% é o favorito naquele momento; os cruzamentos mostram as viradas.', expert: 'Win probability considera placar, tempo, posse, down, distância e posição de campo. Grandes saltos = jogadas de alto WPA.' }}
                legend={
                  wpSide === 'both'
                    ? [
                        { label: nick(g.away), slot: 0, color: colorOf(g.away) },
                        { label: nick(g.home), slot: 1, color: colorOf(g.home) },
                      ]
                    : undefined
                }
                svgRef={wpRef}
                table={<MiniTable head={['Jogada', g.away, g.home]} rows={d.winProbability.filter((_, i) => i % 10 === 0).map((w) => [String(w.play), `${num(100 - w.home)}%`, `${num(w.home)}%`])} />}
              >
                <div className="segmented segmented-sm" role="group" aria-label="Time na probabilidade de vitória" style={{ marginBottom: 8 }}>
                  {(
                    [
                      ['both', 'Os dois'],
                      ['away', nick(g.away)],
                      ['home', nick(g.home)],
                    ] as const
                  ).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={wpSide === k} onClick={() => setWpSide(k)}>
                      {l}
                    </button>
                  ))}
                </div>
                <LineChart
                  ref={wpRef}
                  ariaLabel="Probabilidade de vitória de cada time por jogada"
                  series={[
                    ...(wpSide !== 'home' ? [{ id: 'away', label: nick(g.away), slot: 0, color: colorOf(g.away), points: d.winProbability.map((w) => ({ x: w.play, y: 100 - w.home })) }] : []),
                    ...(wpSide !== 'away' ? [{ id: 'home', label: nick(g.home), slot: 1, color: colorOf(g.home), points: d.winProbability.map((w) => ({ x: w.play, y: w.home })) }] : []),
                  ]}
                  xFormat={(x) => (x === 0 ? 'Início' : String(x))}
                  yFormat={(y) => `${num(y)}%`}
                  reference={{ y: 50, label: '50%' }}
                  area={wpSide !== 'both'}
                  endLabels={wpSide === 'both'}
                />
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
          {fichaCard}
          <MarketCard g={g} nick={nick} />
          <RefereeCard name={referee} />
          {d && d.teamStats.length > 0 && <StatsCompare g={g} rows={d.teamStats} pre={d.state === 'pre'} lang={lang} />}
          {d && d.leaders.length > 0 && (
            <section className="card">
              <div className="section-title">
                <h2>Destaques</h2>
                <TermsToggle />
              </div>
              <div className="stack-sm small">
                {d.leaders.map((l, i) => (
                  <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <TeamLogo abbr={fromEspn(l.team)} size={18} />
                    <span style={{ minWidth: 0 }}>
                      <strong>{l.athlete}</strong>
                      <br />
                      <span className="text-2">
                        <span className="muted">
                          <TermText term={leaderTerm(l.key, l.category)} fallback={l.category} lang={lang} />
                        </span>{' '}
                        · {lang === 'en' ? l.value : translateLeaderValue(l.value)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {h2hCard}
          {d && d.drives.length > 0 && <ModeNote beginner={<>“Drive” é uma posse de bola. Os resultados mostram como cada posse terminou: TD, field goal, punt ou perda da bola.</>} />}
        </aside>
      </div>
      )}
      {/* Box score em largura total: tabelas de até 8 colunas pedem espaço, e a coluna lateral termina antes. */}
      <BoxScore g={g} nick={nick} />
    </div>
  );
}

/** Linha da ficha do jogo; sem valor, não é exibida. */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** "8 jogadas, 20 jardas, 5:01" a partir dos números do drive (a descrição da ESPN vem em inglês). */
function driveText(dr: { plays: number; yards: number; time: string }) {
  const plays = `${dr.plays} ${dr.plays === 1 ? 'jogada' : 'jogadas'}`;
  const yards = `${dr.yards} ${Math.abs(dr.yards) === 1 ? 'jarda' : 'jardas'}`;
  return [plays, yards, dr.time].filter(Boolean).join(', ');
}
