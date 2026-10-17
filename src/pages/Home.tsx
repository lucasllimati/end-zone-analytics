import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Bits';
import { GameTile, type LiveOverlay } from '../components/GameCard';
import { HeroArt } from '../components/HeroArt';
import { LeadersPanel } from '../components/Leaders';
import { Loading, Unavailable } from '../components/States';
import { TeamChip, TeamLogo, TeamName } from '../components/TeamLogo';
import { BarList } from '../components/charts/BarList';
import { InfoTip } from '../components/InfoTip';
import {
  BallIcon, BookIcon, ChartIcon, ChevronLeft, ChevronRight, ShieldIcon, StarIcon, TrophyIcon,
} from '../components/Icons';
import { api } from '../data/client';
import { useAsync, useManifest, useSeason, useTeams } from '../data/hooks';
import { useLiveScores } from '../data/live';
import { computeStandings, fmtRecord } from '../lib/standings';
import { currentWeek, headToHead } from '../lib/games';
import { dateBR, num, pct3, relativeTime, signed } from '../lib/format';
import { passerRating } from '../lib/stats';
import { franchiseOf } from '../lib/teams';
import { useApp, useModeSensitive } from '../context/AppContext';
import type { Game, PlayerSeasonLine, StandingRow } from '../lib/types';
import { useTermsLang } from '../components/TermsToggle';

export default function Home() {
  const { season } = useSeason();
  const manifest = useManifest();
  const { mode } = useApp();
  useModeSensitive();
  const teams = useTeams();
  const live = useLiveScores();
  const games = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([])), [season]);
  const stats = useAsync(() => (season ? api.playerStats(season) : Promise.resolve([])), [season]);
  const sbs = useAsync(() => api.superBowls(), []);
  const all = useAsync(() => api.allGames(), []);

  const week = games.data && season ? currentWeek(games.data, season) : null;
  const weekGames = useMemo(
    () => (games.data ?? []).filter((g) => g.week === week).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
    [games.data, week],
  );
  const standings = useMemo(() => (games.data && season ? computeStandings(games.data, season) : []), [games.data, season]);
  const regLines = useMemo(() => (stats.data ?? []).filter((l) => l.st === 'REG'), [stats.data]);
  const regGames = (games.data ?? []).filter((g) => g.type === 'REG').length;

  // Jogo em destaque: próximo jogo entre os times com melhor aproveitamento combinado.
  const featured = useMemo(() => {
    const pct = new Map(standings.map((s) => [s.team, s.pct]));
    const upcoming = weekGames.filter((g) => g.homeScore === null);
    const pool = upcoming.length ? upcoming : weekGames;
    return [...pool].sort((a, b) => (pct.get(franchiseOf(b.home)) ?? 0) + (pct.get(franchiseOf(b.away)) ?? 0) - ((pct.get(franchiseOf(a.home)) ?? 0) + (pct.get(franchiseOf(a.away)) ?? 0)))[0];
  }, [weekGames, standings]);
  const h2h = useMemo(() => (featured && all.data ? headToHead(all.data, franchiseOf(featured.away), franchiseOf(featured.home)) : null), [featured, all.data]);

  const sbCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sbs.data ?? []) m.set(s.winner, (m.get(s.winner) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [sbs.data]);
  const lastSb = sbs.data?.at(-1);
  const rec = (t: string) => standings.find((s) => s.team === franchiseOf(t));
  const q = manifest.data?.quality;

  return (
    <div className="home">
      <Seo title="" description="Estatísticas, classificação, jogos, Super Bowls, recordes e explicações da NFL para iniciantes e especialistas." />

      <section className="hero" aria-labelledby="h-hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            {season ? `Temporada ${season}` : 'NFL'}
            {week ? ` · Semana ${week}` : ''}
          </p>
          <h1 id="h-hero">
            <span className="hero-brand">End Zone Analytics</span>
            <span className="hero-tagline">O jogo em números.</span>
          </h1>
          <p className="hero-lede">
            Classificações, jogos, jogadores, Super Bowls e recordes — com análises que ajudam você a entender cada jogada, do primeiro snap ao EPA.
          </p>
          <div className="hero-actions">
            <Link to="/season" className="btn primary lg">
              Ver a temporada
            </Link>
            <Link to="/season?tab=schedule" className="link-more">
              Calendário completo <ChevronRight />
            </Link>
          </div>
          <Link to="/learn" className="hero-learn">
            Nunca viu um jogo? Comece aqui em 10 minutos <ChevronRight />
          </Link>
        </div>
        <div className="hero-art-wrap">
          <HeroArt />
        </div>
        {manifest.data && (
          <>
            <ul className="hero-stats" aria-label="A base em números">
              <HeroStat value={teams.data.filter((t) => t.active).length || '—'} label="times" />
              <HeroStat value={regGames ? num(regGames) : '—'} label={`jogos na temporada regular ${season ?? ''}`} />
              <HeroStat value={sbs.data ? sbs.data.length : '—'} label="Super Bowls na base" />
              <HeroStat value={q ? `${q.pass}/${q.pass + q.warn + q.fail}` : '—'} label="verificações de qualidade aprovadas" />
            </ul>
            <p className="hero-meta">
              Dados atualizados {relativeTime(manifest.data.generatedAt)} · último jogo registrado em {dateBR(manifest.data.coverage.lastCompletedGame)} ·{' '}
              <Link to="/data">fontes abertas e verificáveis</Link>
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="h-semana" className="home-section">
        <div className="section-title">
          <h2 id="h-semana">
            <BallIcon /> {week ? `Jogos da semana ${week}` : 'Jogos'}
          </h2>
          <Link to="/season?tab=schedule">
            Calendário completo <span aria-hidden="true">→</span>
          </Link>
        </div>
        {games.loading ? <Loading height={150} /> : weekGames.length ? <GamesRail games={weekGames} live={live} /> : <Unavailable>Sem jogos para esta seleção.</Unavailable>}
      </section>

      <div className="home-panels">
        <section className="card panel-standings" aria-labelledby="h-class">
          <StandingsPanel rows={standings} loading={games.loading} expert={mode === 'expert'} />
        </section>
        <section className="card panel-highlight" aria-labelledby="h-destaques">
          <HighlightsPanel lines={regLines} season={season} loading={stats.loading} expert={mode === 'expert'} />
        </section>
        <section className="card panel-learn" aria-labelledby="h-aprenda">
          <div className="card-title">
            <h2 id="h-aprenda">
              <BookIcon /> Entenda o jogo
            </h2>
            <Link to="/learn">Aprenda →</Link>
          </div>
          <ul className="explain-list">
            {[
              { to: '/learn#downs', q: 'O que significa 3rd & 7?', a: 'Terceira tentativa, faltando 7 jardas para um novo first down.', tag: 'Básico' },
              { to: '/playbook?play=cover-3', q: 'Como funciona a Cover 3?', a: 'Três defensores dividem o fundo do campo.', tag: 'Playbook' },
              { to: '/glossary#epa', q: 'O que é EPA?', a: 'Quanto cada jogada muda os pontos esperados.', tag: 'Analytics' },
              { to: '/rankings', q: 'Quem é o maior QB?', a: 'Depende do critério. Ajuste os pesos.', tag: 'Modelo' },
              { to: '/matchup?a=KC&b=LV', q: 'Chiefs × Raiders: quem leva?', a: 'Histórico de confrontos, jogo a jogo.', tag: 'História' },
            ].map((c) => (
              <li key={c.q}>
                <Link to={c.to}>
                  <span className="explain-tag">{c.tag}</span>
                  <strong>{c.q}</strong>
                  <span>{c.a}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Linhas pareadas por altura semelhante: cartões da mesma linha têm a mesma altura. */}
      <div className="home-split">
        <section className="card" aria-labelledby="h-lideres">
          <div className="card-title">
            <h2 id="h-lideres">
              <ChartIcon /> Líderes da temporada
            </h2>
            <Link to="/season?tab=leaders">Todos →</Link>
          </div>
          {stats.loading ? <Loading /> : regLines.length ? <LeadersPanel lines={regLines} compact /> : <Unavailable />}
        </section>
        <section className="card" aria-labelledby="h-titulos">
          <div className="card-title">
            <h2 id="h-titulos">
              <TrophyIcon /> Mais títulos de Super Bowl
            </h2>
            <Link to="/super-bowl">Todos →</Link>
          </div>
          <BarList
            ariaLabel="Franquias com mais Super Bowls"
            items={sbCounts.map(([t, n]) => ({ key: t, value: n, display: `${n}`, label: <TeamChip abbr={t} size={20} /> }))}
          />
        </section>
      </div>

      <div className="home-split">
        {featured && (
          <section className="card" aria-labelledby="h-destaque">
            <div className="card-title">
              <h2 id="h-destaque">
                <StarIcon /> Jogo em destaque
              </h2>
              <span className="badge accent">Critério: melhor aproveitamento combinado</span>
            </div>
            <div className="featured-game">
              <div className="featured-teams">
                {[featured.away, featured.home].map((t, i) => (
                  <div key={t} className="featured-team">
                    <TeamLogo abbr={t} size={76} />
                    <strong>
                      <TeamName abbr={t} />
                    </strong>
                    <span className="small muted">
                      {i === 0 ? 'Visitante' : 'Mandante'} · {rec(t) ? fmtRecord(rec(t)!) : 'sem jogos'}
                    </span>
                    <span className="xsmall muted">QB: {(i === 0 ? featured.awayQb : featured.homeQb) ?? 'a definir'}</span>
                  </div>
                ))}
              </div>
              <div className="stack-sm">
                <dl className="kv">
                  <dt>Data</dt>
                  <dd>{dateBR(featured.date, { weekday: 'long', day: '2-digit', month: 'long' })}</dd>
                  <dt>Estádio</dt>
                  <dd>{featured.stadium ?? 'Não disponível'}</dd>
                  {h2h && (
                    <>
                      <dt>
                        Confrontos desde 1999 <InfoTip title="Histórico do confronto" simple="Resultado de todos os jogos entre os dois times desde 1999 (início da cobertura detalhada)." />
                      </dt>
                      <dd>
                        {h2h.games.length} jogos · <TeamName abbr={featured.away} short /> {h2h.aWins} × {h2h.bWins} <TeamName abbr={featured.home} short />
                        {h2h.ties ? ` · ${h2h.ties} empate(s)` : ''}
                      </dd>
                    </>
                  )}
                </dl>
                <div className="featured-actions">
                  <Link className="btn sm primary" to={`/games/${featured.id}`}>
                    Game Center
                  </Link>
                  <Link className="btn sm" to={`/matchup?a=${franchiseOf(featured.away)}&b=${franchiseOf(featured.home)}`}>
                    Histórico completo
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
        {lastSb && (
          <section className="card sb-card" aria-labelledby="h-sb">
            <div className="card-title">
              <h2 id="h-sb">
                <TrophyIcon /> Último Super Bowl
              </h2>
              <Link to={`/super-bowl/${lastSb.number}`}>Detalhes →</Link>
            </div>
            <div className="sb-result">
              <TeamLogo abbr={lastSb.winner} size={64} />
              <div>
                <div className="eyebrow" style={{ marginBottom: 2 }}>
                  Super Bowl {lastSb.roman} · {dateBR(lastSb.date)}
                </div>
                <div className="sb-score">
                  {lastSb.winnerName} <span className="num">{lastSb.winnerScore}</span> × <span className="num">{lastSb.loserScore}</span> {lastSb.loserName}
                </div>
                <div className="small muted">
                  MVP: {lastSb.mvp} · {lastSb.stadium}, {lastSb.city}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <section aria-labelledby="h-explore" className="home-section">
        <div className="section-title">
          <h2 id="h-explore">
            <ChartIcon /> Explore mais
          </h2>
        </div>
        <div className="explore-grid">
          {[
            { to: '/explorer', t: 'Explorador de dados', d: 'Monte rankings e tabelas com filtros e exporte em CSV.', icon: <ChartIcon /> },
            { to: '/compare', t: 'Comparador', d: 'Jogador × jogador, time × time e temporadas lado a lado.', icon: <StarIcon /> },
            { to: '/history', t: 'História da NFL', d: 'Eras, regras que mudaram o jogo e a evolução em números.', icon: <BookIcon /> },
            { to: '/data', t: 'Fontes e qualidade', d: 'De onde vem cada número e como ele foi validado.', icon: <ShieldIcon /> },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="card card-link explore-card">
              <span className="explore-icon">{c.icon}</span>
              <h3>{c.t}</h3>
              <p className="small text-2">{c.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <li className="hero-stat">
      <strong className="hero-stat-value">{value}</strong>
      <span className="hero-stat-label">{label}</span>
    </li>
  );
}

function GamesRail({ games, live }: { games: Game[]; live: Map<string, LiveOverlay> }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="rail">
      <button type="button" className="icon-btn rail-btn prev" onClick={() => scroll(-1)} aria-label="Jogos anteriores" aria-controls="rail-jogos">
        <ChevronLeft />
      </button>
      <div className="rail-track" id="rail-jogos" ref={ref} role="list">
        {games.map((g) => (
          <div role="listitem" key={g.id}>
            <GameTile g={g} live={live.get(`${g.away}@${g.home}`)} />
          </div>
        ))}
      </div>
      <button type="button" className="icon-btn rail-btn next" onClick={() => scroll(1)} aria-label="Próximos jogos" aria-controls="rail-jogos">
        <ChevronRight />
      </button>
    </div>
  );
}

type StandView = 'league' | 'AFC' | 'NFC' | 'division';

function StandingsPanel({ rows, loading, expert }: { rows: StandingRow[]; loading: boolean; expert: boolean }) {
  const [view, setView] = useState<StandView>('league');
  const [lang] = useTermsLang();
  const en = lang === 'en';
  const divisions = useMemo(() => [...new Set(rows.map((r) => r.division))].sort(), [rows]);
  const [division, setDivision] = useState<string>('');
  const div = division || divisions[0] || '';
  const shown =
    view === 'league' ? rows.slice(0, 6) : view === 'division' ? rows.filter((r) => r.division === div) : rows.filter((r) => r.conf === view).slice(0, 6);
  const wlt = (r: [number, number, number]) => `${r[0]}-${r[1]}${r[2] ? `-${r[2]}` : ''}`;
  return (
    <>
      <div className="card-title">
        <h2 id="h-class">
          <ShieldIcon /> Classificação
        </h2>
        <div className="segmented" role="group" aria-label="Recorte da classificação">
          {(
            [
              ['league', 'Liga'],
              ['AFC', 'AFC'],
              ['NFC', 'NFC'],
              ['division', 'Divisão'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {view === 'division' && divisions.length > 0 && (
        <label className="field" style={{ marginBottom: 10, maxWidth: 220 }}>
          <span className="sr-only">Divisão</span>
          <select className="select" value={div} onChange={(e) => setDivision(e.target.value)}>
            {divisions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      )}
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Unavailable>A temporada ainda não tem jogos disputados.</Unavailable>
      ) : (
        <div className="table-wrap bare">
          <table className="data standings-mini">
            <caption className="sr-only">Classificação resumida</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  #
                </th>
                <th scope="col">Time</th>
                <th scope="col" className="num" title={en ? 'Vitórias (wins)' : 'Vitórias'}>
                  {en ? 'W' : 'V'}
                </th>
                <th scope="col" className="num" title={en ? 'Derrotas (losses)' : 'Derrotas'}>
                  {en ? 'L' : 'D'}
                </th>
                <th scope="col" className="num" title={en ? 'Empates (ties)' : 'Empates'}>
                  {en ? 'T' : 'E'}
                </th>
                <th scope="col" className="num" title="Aproveitamento">
                  %
                </th>
                {expert && (
                  <>
                    <th scope="col" className="num" title="Pontos marcados">
                      PF
                    </th>
                    <th scope="col" className="num" title="Pontos sofridos">
                      PA
                    </th>
                  </>
                )}
                <th scope="col" className="num" title="Saldo de pontos">
                  Saldo
                </th>
                {expert && (
                  <th scope="col" className="num" title="Campanha contra a própria divisão">
                    Div
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.team}>
                  <td className="num rank">{i + 1}</td>
                  <td>
                    <TeamChip abbr={r.team} short size={22} />
                  </td>
                  <td className="num">{r.w}</td>
                  <td className="num">{r.l}</td>
                  <td className="num">{r.t}</td>
                  <td className="num">{pct3(r.pct)}</td>
                  {expert && (
                    <>
                      <td className="num">{r.pf}</td>
                      <td className="num">{r.pa}</td>
                    </>
                  )}
                  <td className={`num ${r.diff > 0 ? 'good' : r.diff < 0 ? 'bad' : ''}`}>{signed(r.diff)}</td>
                  {expert && <td className="num">{wlt(r.div)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel-foot">
        {!expert && <span className="xsmall muted">V = vitórias, D = derrotas, E = empates; % é o aproveitamento (1.000 = venceu todas).</span>}
        <Link to="/season" className="small">
          Ver classificação completa →
        </Link>
      </div>
    </>
  );
}

interface HighlightCat {
  key: string;
  title: string;
  criterion: string;
  stat: keyof PlayerSeasonLine;
  items: (l: PlayerSeasonLine) => { label: string; value: string }[];
  expert?: (l: PlayerSeasonLine) => { label: string; value: string }[];
}

const CATS: HighlightCat[] = [
  {
    key: 'pass',
    title: 'Passe',
    criterion: 'jardas de passe',
    stat: 'passYds',
    items: (l) => [
      { label: 'Jardas', value: num(l.passYds) },
      { label: 'TDs', value: num(l.passTd) },
      { label: 'INTs', value: num(l.int) },
      { label: 'Rating', value: num(passerRating(l.cmp, l.att, l.passYds, l.passTd, l.int), 1) },
    ],
    expert: (l) => [
      { label: 'EPA de passe', value: num(l.passEpa, 1) },
      { label: 'CPOE', value: num(l.cpoe, 1) },
    ],
  },
  {
    key: 'rush',
    title: 'Corrida',
    criterion: 'jardas corridas',
    stat: 'rushYds',
    items: (l) => [
      { label: 'Jardas', value: num(l.rushYds) },
      { label: 'TDs', value: num(l.rushTd) },
      { label: 'Corridas', value: num(l.carries) },
      { label: 'Jardas/corrida', value: l.carries ? num(l.rushYds / l.carries, 1) : 'Não disponível' },
    ],
    expert: (l) => [{ label: 'EPA de corrida', value: num(l.rushEpa, 1) }],
  },
  {
    key: 'rec',
    title: 'Recepção',
    criterion: 'jardas recebidas',
    stat: 'recYds',
    items: (l) => [
      { label: 'Jardas', value: num(l.recYds) },
      { label: 'Recepções', value: num(l.rec) },
      { label: 'TDs', value: num(l.recTd) },
      { label: 'Alvos', value: num(l.tgt) },
    ],
    expert: (l) => [
      { label: 'YAC', value: num(l.yac) },
      { label: 'EPA de recepção', value: num(l.recEpa, 1) },
    ],
  },
  {
    key: 'def',
    title: 'Defesa',
    criterion: 'sacks',
    stat: 'sacks',
    items: (l) => [
      { label: 'Sacks', value: num(l.sacks, 1) },
      { label: 'Tackles', value: num(l.tackles) },
      { label: 'TFL', value: num(l.tfl) },
      { label: 'QB hits', value: num(l.qbHits) },
    ],
  },
];

function HighlightsPanel({ lines, season, loading, expert }: { lines: PlayerSeasonLine[]; season: number | null; loading: boolean; expert: boolean }) {
  const [i, setI] = useState(0);
  const cat = CATS[i];
  const leader = useMemo(
    () => [...lines].filter((l) => typeof l[cat.stat] === 'number').sort((a, b) => (b[cat.stat] as number) - (a[cat.stat] as number))[0],
    [lines, cat],
  );
  const career = useAsync(() => (leader ? api.career(leader.id) : Promise.resolve(null)), [leader?.id]);
  const photo = career.data?.bio.headshot ?? null;
  return (
    <>
      <div className="card-title">
        <h2 id="h-destaques">
          <StarIcon /> Destaques da temporada
        </h2>
        <span className="small muted">{cat.title}</span>
      </div>
      {loading ? (
        <Loading />
      ) : !leader || !(leader[cat.stat] as number) ? (
        <Unavailable>Ainda não há estatísticas desta temporada.</Unavailable>
      ) : (
        <div className="highlight" aria-live="polite">
          <Link to={`/players/${leader.id}`} className="highlight-head">
            <span className="highlight-photo">
              {photo ? (
                <img src={photo} alt="" width={96} height={96} loading="lazy" />
              ) : (
                <span className="highlight-initials" aria-hidden="true">
                  {leader.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              )}
            </span>
            <span className="highlight-id">
              <span className="badge accent">Líder em {cat.criterion}</span>
              <strong>{leader.name}</strong>
              <span className="small text-2">
                {leader.pos} · <TeamName abbr={leader.team} />
              </span>
            </span>
          </Link>
          <dl className="highlight-stats">
            {[...cat.items(leader), ...(expert && cat.expert ? cat.expert(leader) : [])].map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="xsmall muted" style={{ margin: 0 }}>
            Critério: maior total de {cat.criterion} na temporada regular {season ?? ''} ({num(leader.games)} jogos). Fonte: nflverse.
          </p>
        </div>
      )}
      <div className="carousel-nav">
        <button type="button" className="icon-btn" aria-label="Destaque anterior" onClick={() => setI((i + CATS.length - 1) % CATS.length)}>
          <ChevronLeft />
        </button>
        <div className="dots" role="group" aria-label="Categoria do destaque">
          {CATS.map((c, k) => (
            <button key={c.key} type="button" aria-pressed={k === i} aria-label={c.title} onClick={() => setI(k)} />
          ))}
        </div>
        <button type="button" className="icon-btn" aria-label="Próximo destaque" onClick={() => setI((i + 1) % CATS.length)}>
          <ChevronRight />
        </button>
      </div>
    </>
  );
}
