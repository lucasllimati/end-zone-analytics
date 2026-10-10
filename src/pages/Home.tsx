import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Seo, StatTile } from '../components/Bits';
import { GameCard } from '../components/GameCard';
import { LeadersPanel } from '../components/Leaders';
import { Loading, Unavailable } from '../components/States';
import { TeamChip, TeamLogo, TeamName } from '../components/TeamLogo';
import { BarList } from '../components/charts/BarList';
import { InfoTip } from '../components/InfoTip';
import { api } from '../data/client';
import { useAsync, useManifest, useSeason } from '../data/hooks';
import { useLiveScores } from '../data/live';
import { computeStandings, fmtRecord } from '../lib/standings';
import { currentWeek, headToHead } from '../lib/games';
import { dateBR, pct3, relativeTime } from '../lib/format';
import { franchiseOf } from '../lib/teams';
import { useApp } from '../context/AppContext';

export default function Home() {
  const { season } = useSeason();
  const manifest = useManifest();
  const { mode } = useApp();
  const live = useLiveScores();
  const games = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([])), [season]);
  const stats = useAsync(() => (season ? api.playerStats(season) : Promise.resolve([])), [season]);
  const sbs = useAsync(() => api.superBowls(), []);
  const all = useAsync(() => api.allGames(), []);

  const week = games.data && season ? currentWeek(games.data, season) : null;
  const weekGames = useMemo(() => (games.data ?? []).filter((g) => g.week === week).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')), [games.data, week]);
  const standings = useMemo(() => (games.data && season ? computeStandings(games.data, season) : []), [games.data, season]);
  const regLines = useMemo(() => (stats.data ?? []).filter((l) => l.st === 'REG'), [stats.data]);

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
  const top = (conf: 'AFC' | 'NFC') => standings.filter((s) => s.conf === conf).slice(0, 5);
  const rec = (t: string) => standings.find((s) => s.team === franchiseOf(t));

  return (
    <div className="stack">
      <Seo title="" description="Estatísticas, classificação, jogos, Super Bowls, recordes e explicações da NFL para iniciantes e especialistas." />
      <section className="card" style={{ padding: 'clamp(20px, 4vw, 40px)', background: 'linear-gradient(135deg, var(--surface-1), var(--bg))' }}>
        <div className="eyebrow">
          {season ? `Temporada ${season}` : 'NFL'}
          {week ? ` · Semana ${week}` : ''}
        </div>
        <h1 style={{ maxWidth: '18ch' }}>A NFL em dados, do primeiro snap ao EPA.</h1>
        <p className="lede">
          Classificação, jogos, jogadores, Super Bowls e recordes — com explicações em cada número. Use o modo <strong>Iniciante</strong> para aprender o jogo ou o modo <strong>Expert</strong> para métricas avançadas.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <Link to="/learn" className="btn primary wrap">
            Nunca vi um jogo: comece aqui
          </Link>
          <Link to="/season" className="btn">
            Ver a temporada
          </Link>
          <Link to="/compare" className="btn ghost">
            Comparar jogadores
          </Link>
        </div>
        {manifest.data && (
          <p className="xsmall muted" style={{ marginTop: 16, marginBottom: 0 }}>
            Dados atualizados {relativeTime(manifest.data.generatedAt)} · último jogo registrado em {dateBR(manifest.data.coverage.lastCompletedGame)} ·{' '}
            <Link to="/data">fontes e qualidade</Link>
          </p>
        )}
      </section>

      <section aria-labelledby="h-semana">
        <div className="section-title">
          <h2 id="h-semana">{week ? `Jogos da semana ${week}` : 'Jogos'}</h2>
          <Link to="/season?tab=schedule">Calendário completo →</Link>
        </div>
        {games.loading ? (
          <Loading height={120} />
        ) : weekGames.length ? (
          <div className="scroller">
            {weekGames.map((g) => (
              <GameCard key={g.id} g={g} live={live.get(`${g.away}@${g.home}`)} />
            ))}
          </div>
        ) : (
          <Unavailable>Sem jogos para esta seleção.</Unavailable>
        )}
      </section>

      {featured && (
        <section className="card" aria-labelledby="h-destaque">
          <div className="card-title">
            <h2 id="h-destaque">Jogo em destaque</h2>
            <span className="badge gold">Critério: melhor aproveitamento combinado</span>
          </div>
          <div className="grid grid-2" style={{ alignItems: 'center' }}>
            <div className="row" style={{ justifyContent: 'space-around', gap: 24 }}>
              {[featured.away, featured.home].map((t, i) => (
                <div key={t} style={{ textAlign: 'center' }}>
                  <TeamLogo abbr={t} size={72} />
                  <div style={{ fontWeight: 650, marginTop: 6 }}>
                    <TeamName abbr={t} />
                  </div>
                  <div className="small muted">
                    {i === 0 ? 'Visitante' : 'Mandante'} · {rec(t) ? fmtRecord(rec(t)!) : '0-0'}
                  </div>
                  <div className="xsmall muted">QB: {(i === 0 ? featured.awayQb : featured.homeQb) ?? 'a definir'}</div>
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
              <div className="row">
                <Link className="btn sm" to={`/games/${featured.id}`}>
                  Game Center
                </Link>
                <Link className="btn sm ghost" to={`/matchup?a=${franchiseOf(featured.away)}&b=${franchiseOf(featured.home)}`}>
                  Histórico completo
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="two-col">
        <section className="card" aria-labelledby="h-lideres">
          <div className="card-title">
            <h2 id="h-lideres">Líderes da temporada</h2>
            <Link to="/season?tab=leaders" className="small">
              Todos os líderes →
            </Link>
          </div>
          {stats.loading ? <Loading /> : regLines.length ? <LeadersPanel lines={regLines} compact /> : <Unavailable />}
        </section>
        <section className="card" aria-labelledby="h-class">
          <div className="card-title">
            <h2 id="h-class">Classificação</h2>
            <Link to="/season" className="small">
              Completa →
            </Link>
          </div>
          {(['AFC', 'NFC'] as const).map((c) => (
            <div key={c} style={{ marginBottom: 12 }}>
              <h3 className="small muted" style={{ margin: '4px 0 6px' }}>
                {c}
              </h3>
              <table className="data">
                <caption className="sr-only">Melhores campanhas da {c}</caption>
                <tbody>
                  {top(c).map((s) => (
                    <tr key={s.team}>
                      <td>
                        <TeamChip abbr={s.team} short size={18} />
                      </td>
                      <td className="num">{fmtRecord(s)}</td>
                      <td className="num muted">{pct3(s.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {mode === 'beginner' && <p className="xsmall muted">“10-3” = 10 vitórias e 3 derrotas. PCT é o aproveitamento (1.000 = venceu todas).</p>}
        </section>
      </div>

      <section aria-labelledby="h-aprenda">
        <div className="section-title">
          <h2 id="h-aprenda">Perguntas que o site responde</h2>
        </div>
        <div className="grid grid-3">
          {[
            { to: '/learn#downs', q: 'O que significa 3rd & 7?', a: 'Terceira tentativa, faltando 7 jardas para um novo first down.' },
            { to: '/playbook?play=cover-3', q: 'Como funciona a Cover 3?', a: 'Três defensores dividem o fundo do campo. Veja animado.' },
            { to: '/glossary#epa', q: 'O que é EPA?', a: 'Quanto cada jogada muda os pontos esperados de um time.' },
            { to: '/super-bowl', q: 'Quem tem mais Super Bowls?', a: 'Patriots e Steelers, com 6 cada. Veja todas as edições.' },
            { to: '/rankings', q: 'Quem é o maior QB?', a: 'Depende do critério. Ajuste os pesos e veja o ranking.' },
            { to: '/matchup?a=KC&b=LV', q: 'Chiefs × Raiders: quem leva?', a: 'Histórico de confrontos, jogo a jogo.' },
          ].map((c) => (
            <Link key={c.q} to={c.to} className="card card-link">
              <h3>{c.q}</h3>
              <p className="small text-2" style={{ margin: 0 }}>
                {c.a}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="two-col even">
        {lastSb && (
          <section className="card" aria-labelledby="h-sb">
            <div className="card-title">
              <h2 id="h-sb">Último Super Bowl</h2>
              <Link to={`/super-bowl/${lastSb.number}`} className="small">
                Detalhes →
              </Link>
            </div>
            <div className="row" style={{ gap: 16 }}>
              <TeamLogo abbr={lastSb.winner} size={56} />
              <div>
                <div className="eyebrow" style={{ marginBottom: 2 }}>
                  Super Bowl {lastSb.roman} · {dateBR(lastSb.date)}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 650 }}>
                  {lastSb.winnerName} {lastSb.winnerScore} × {lastSb.loserScore} {lastSb.loserName}
                </div>
                <div className="small muted">
                  MVP: {lastSb.mvp} · {lastSb.stadium}, {lastSb.city}
                </div>
              </div>
            </div>
          </section>
        )}
        <section className="card" aria-labelledby="h-titulos">
          <div className="card-title">
            <h2 id="h-titulos">Mais títulos de Super Bowl</h2>
            <Link to="/super-bowl" className="small">
              Todos →
            </Link>
          </div>
          <BarList
            ariaLabel="Franquias com mais Super Bowls"
            items={sbCounts.map(([t, n]) => ({ key: t, value: n, display: `${n}`, label: <TeamChip abbr={t} size={18} /> }))}
          />
        </section>
      </div>
      {manifest.data && (
        <div className="tiles">
          <StatTile label="Temporadas com dados detalhados" value={`${manifest.data.coverage.firstSeason}–${manifest.data.coverage.lastSeason}`} />
          <StatTile label="Jogos na base" value={manifest.data.datasets.games?.rows.toLocaleString('pt-BR') ?? '—'} />
          <StatTile label="Linhas de estatística de jogadores" value={manifest.data.datasets.playerStats?.rows.toLocaleString('pt-BR') ?? '—'} />
          <StatTile label="Verificações de qualidade" value={`${manifest.data.quality.pass} ok`} note={`${manifest.data.quality.warn} alerta(s), ${manifest.data.quality.fail} falha(s)`} />
        </div>
      )}
    </div>
  );
}
