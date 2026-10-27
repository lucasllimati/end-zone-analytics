import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Callout, ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable, type Column } from '../components/DataTable';
import { GameCard } from '../components/GameCard';
import { LeadersPanel } from '../components/Leaders';
import { Loading, Unavailable } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip, TeamLogo, TeamName } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { ChartFrame, MiniTable } from '../components/charts/ChartFrame';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync, useSeason } from '../data/hooks';
import { useLiveScores, withLiveFinals } from '../data/live';
import { computeStandings, fmtRecord, groupByDivision, isPlayed } from '../lib/standings';
import { currentWeek, playoffBracket } from '../lib/games';
import { POWER_WEIGHTS, powerRankings, strengthOfSchedule } from '../lib/models';
import { DIVISION_ORDER, franchiseOf } from '../lib/teams';
import { dateBR, num, pct3, signed } from '../lib/format';
import { useApp, useModeSensitive } from '../context/AppContext';
import type { Game, StandingRow } from '../lib/types';
import { EfficiencyView, MarketView } from './season/SeasonInsights';
import { TermsToggle, useTermsLang, type TermsLang } from '../components/TermsToggle';
import { PlayoffSimulator } from './season/PlayoffSimulator';

type Tab = 'standings' | 'schedule' | 'leaders' | 'playoffs' | 'simulator' | 'power' | 'sos' | 'efficiency' | 'market';
const TABS: { id: Tab; label: string }[] = [
  { id: 'standings', label: 'Classificação' },
  { id: 'schedule', label: 'Calendário' },
  { id: 'leaders', label: 'Líderes' },
  { id: 'playoffs', label: 'Playoffs' },
  { id: 'simulator', label: 'Simulador' },
  { id: 'power', label: 'Power ranking' },
  { id: 'sos', label: 'Força de tabela' },
  { id: 'efficiency', label: 'Eficiência' },
  { id: 'market', label: 'Zebras e expectativa' },
];

const wlt = (r: [number, number, number]) => fmtRecord(r);

export default function Season() {
  const [params, setParams] = useSearchParams();
  const { season, isCurrent } = useSeason();
  const loaded = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([] as Game[])), [season]);
  const live = useLiveScores(isCurrent);
  // Só o array muda quando um placar final chega: classificação e simulador não recalculam à toa.
  const merged = useMemo(() => (loaded.data ? withLiveFinals(loaded.data, live) : loaded.data), [loaded.data, live]);
  const games = { ...loaded, data: merged };
  const standings = useMemo(() => (games.data && season ? computeStandings(games.data, season) : []), [games.data, season]);
  // Simulador só com temporada regular em andamento (sem aba que leva a uma tela vazia).
  const canSimulate = Boolean(games.data?.some((g) => g.type === 'REG' && g.homeScore === null) && games.data?.some((g) => g.type === 'REG' && g.homeScore !== null));
  const tabs = TABS.filter((t) => t.id !== 'simulator' || canSimulate);
  const asked = (params.get('tab') as Tab) || 'standings';
  const tab = tabs.some((t) => t.id === asked) || games.loading ? asked : 'standings';

  return (
    <div>
      <Seo title={`Temporada ${season ?? ''}`} description={`Classificação, calendário, líderes, playoffs e power ranking da temporada ${season} da NFL.`} />
      <PageHeader
        eyebrow={isCurrent ? 'Temporada atual' : 'Viagem no tempo'}
        title={`Temporada ${season ?? ''}`}
        lede="Tudo da temporada em um lugar. Troque o ano no seletor do topo para viajar no tempo (dados detalhados desde 1999)."
      />
      <Tabs label="Seções da temporada" tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      <TabPanel id={tab}>
        {games.loading ? (
          <Loading height={300} />
        ) : !games.data?.length ? (
          <Unavailable>Dados não disponíveis para esta temporada.</Unavailable>
        ) : (
          <>
            {tab === 'standings' && <StandingsView rows={standings} />}
            {tab === 'schedule' && <ScheduleView games={games.data} season={season!} />}
            {tab === 'leaders' && <LeadersView season={season!} />}
            {tab === 'playoffs' && <PlayoffsView games={games.data} season={season!} standings={standings} />}
            {tab === 'simulator' && canSimulate && <PlayoffSimulator games={games.data} season={season!} standings={standings} />}
            {tab === 'power' && <PowerView games={games.data} season={season!} standings={standings} />}
            {tab === 'sos' && <SosView games={games.data} season={season!} standings={standings} />}
            {tab === 'efficiency' && <EfficiencyView season={season!} standings={standings} />}
            {tab === 'market' && <MarketView games={games.data} season={season!} />}
          </>
        )}
      </TabPanel>
    </div>
  );
}

/* ------------------------------ Classificação ------------------------------ */

/** Letras de resultado: W/L/T (inglês, padrão da NFL) ou V/D/E (português). */
const RESULT_LETTER: Record<TermsLang, Record<string, string>> = { en: { W: 'W', L: 'L', T: 'T' }, pt: { W: 'V', L: 'D', T: 'E' } };
const letters = (s: string, lang: TermsLang) => s.replace(/[WLT]/g, (c) => RESULT_LETTER[lang][c]);

/** Últimos 5 jogos: casas uniformes coloridas por resultado (a letra garante leitura sem depender da cor). */
function Last5({ seq, lang }: { seq: string; lang: TermsLang }) {
  if (!seq) return <>—</>;
  const tone: Record<string, string> = { W: 'good', L: 'bad' };
  return (
    <>
      <span className="sr-only">Últimos jogos: {seq.split('').map((c) => (c === 'W' ? 'vitória' : c === 'L' ? 'derrota' : 'empate')).join(', ')}</span>
      <span className="last5" aria-hidden="true">
        {seq.split('').map((c, i) => (
          <span key={i} className={tone[c] ?? 'muted'}>
            {RESULT_LETTER[lang][c] ?? c}
          </span>
        ))}
      </span>
    </>
  );
}

export function standingColumns(expert: boolean, lang: TermsLang = 'pt'): Column<StandingRow>[] {
  const pt = lang === 'pt';
  return [
    { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short />, value: (r) => r.team },
    { key: 'w', label: pt ? 'V' : 'W', metric: 'w', num: true, width: '3.5rem' },
    { key: 'l', label: pt ? 'D' : 'L', metric: 'l', num: true, width: '3.5rem' },
    { key: 't', label: pt ? 'E' : 'T', metric: 't', num: true, width: '3.5rem' },
    { key: 'pct', label: 'PCT', metric: 'pct', num: true, width: '5.25rem', render: (r) => pct3(r.pct), value: (r) => r.pct },
    { key: 'pf', label: 'PF', metric: 'pf', num: true, width: '4.25rem' },
    { key: 'pa', label: 'PA', metric: 'pa', num: true, width: '4.25rem' },
    { key: 'diff', label: 'DIFF', metric: 'diff', num: true, width: '4.75rem', render: (r) => <span className={r.diff > 0 ? 'good' : r.diff < 0 ? 'bad' : ''}>{signed(r.diff)}</span>, value: (r) => r.diff },
    { key: 'home', label: 'Casa', metric: 'home', num: true, width: '4.75rem', render: (r) => wlt(r.home), value: (r) => r.home[0] - r.home[1] },
    { key: 'away', label: 'Fora', metric: 'away', num: true, width: '4.75rem', render: (r) => wlt(r.away), value: (r) => r.away[0] - r.away[1] },
    { key: 'div', label: 'Div', metric: 'div', num: true, width: '4.75rem', render: (r) => wlt(r.div), value: (r) => r.div[0] - r.div[1] },
    { key: 'conf', label: 'Conf', metric: 'conf', num: true, width: '4.75rem', render: (r) => wlt(r.confRec), value: (r) => r.confRec[0] - r.confRec[1] },
    { key: 'streak', label: 'Seq.', metric: 'streak', width: '4.5rem', render: (r) => letters(r.streak, lang), value: (r) => r.streak },
    { key: 'last5', label: 'Últ. 5', metric: 'last5', expertOnly: !expert, width: '8.25rem', render: (r) => <Last5 seq={r.last5} lang={lang} />, value: (r) => r.last5 },
  ];
}

function StandingsView({ rows }: { rows: StandingRow[] }) {
  const [view, setView] = useState<'div' | 'conf' | 'league'>('div');
  const [conf, setConf] = useState<'all' | 'AFC' | 'NFC'>('all');
  const { mode } = useApp();
  useModeSensitive();
  const [lang] = useTermsLang();
  const cols = standingColumns(true, lang);
  const filtered = conf === 'all' ? rows : rows.filter((r) => r.conf === conf);
  const divs = groupByDivision(filtered);
  const order = DIVISION_ORDER.filter((d) => divs.has(d));
  return (
    <div className="stack">
      <ModeNote
        beginner={
          <>
            Cada linha é um time. {lang === 'pt' ? (
              <>
                <strong>V</strong> = vitórias, <strong>D</strong> = derrotas, <strong>E</strong> = empates (em inglês: W, L e T — troque em <strong>PT | EN</strong>).
              </>
            ) : (
              <>
                <strong>W</strong> = vitórias (wins), <strong>L</strong> = derrotas (losses), <strong>T</strong> = empates (ties).
              </>
            )} <strong>PCT</strong> é o aproveitamento. Passe o mouse
            (ou toque) no <strong>ⓘ</strong> de cada coluna para entender. Os 4 campeões de divisão e 3 melhores restantes de cada conferência vão aos playoffs.
          </>
        }
        expert={<>Ordenação: PCT → saldo de pontos → pontos marcados. Os desempates oficiais (confronto direto, divisão, adversários comuns, força de vitória…) não são reproduzidos integralmente.</>}
      />
      <div className="filters">
        <TermsToggle />
        <div className="chips" role="group" aria-label="Agrupar por">
          {(
            [
              ['div', 'Divisões'],
              ['conf', 'Conferências'],
              ['league', 'Liga'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className="chip" aria-pressed={view === k} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
        <label className="field">
          Conferência
          <select className="select" value={conf} onChange={(e) => setConf(e.target.value as typeof conf)}>
            <option value="all">AFC e NFC</option>
            <option value="AFC">AFC</option>
            <option value="NFC">NFC</option>
          </select>
        </label>
      </div>
      {view === 'div' &&
        order.map((d) => (
          <section key={d}>
            <h2 style={{ fontSize: '1rem' }}>{d}</h2>
            <DataTable rows={divs.get(d)!} columns={cols} rowKey={(r) => r.team} caption={`Classificação da ${d}`} initialSort={{ key: 'pct', dir: 'desc' }} expert={mode === 'expert'} />
          </section>
        ))}
      {view === 'conf' &&
        (['AFC', 'NFC'] as const)
          .filter((c) => conf === 'all' || conf === c)
          .map((c) => (
            <section key={c}>
              <h2 style={{ fontSize: '1rem' }}>{c}</h2>
              <DataTable rows={rows.filter((r) => r.conf === c)} columns={cols} rowKey={(r) => r.team} caption={`Classificação da ${c}`} initialSort={{ key: 'pct', dir: 'desc' }} rank expert={mode === 'expert'} />
            </section>
          ))}
      {view === 'league' && <DataTable rows={filtered} columns={cols} rowKey={(r) => r.team} caption="Classificação geral" initialSort={{ key: 'pct', dir: 'desc' }} rank exportName="classificacao" expert={mode === 'expert'} />}
    </div>
  );
}

/* -------------------------------- Calendário -------------------------------- */

function ScheduleView({ games, season }: { games: Game[]; season: number }) {
  const weeks = [...new Set(games.map((g) => `${g.type === 'REG' ? 'R' : 'P'}${String(g.week).padStart(2, '0')}`))].sort();
  const cur = currentWeek(games, season);
  const [week, setWeek] = useState<number | null>(cur);
  const [team, setTeam] = useState('');
  const live = useLiveScores();
  const list = games
    .filter((g) => (team ? franchiseOf(g.home) === team || franchiseOf(g.away) === team : g.week === week))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const byDate = new Map<string, Game[]>();
  for (const g of list) byDate.set(g.date, [...(byDate.get(g.date) ?? []), g]);
  const teams = [...new Set(games.flatMap((g) => [franchiseOf(g.home), franchiseOf(g.away)]))].sort();
  return (
    <div className="stack">
      <div className="filters">
        <label className="field">
          Semana
          <select className="select" value={team ? '' : String(week ?? '')} onChange={(e) => (setTeam(''), setWeek(Number(e.target.value)))} disabled={!!team}>
            {weeks.map((w) => {
              const n = Number(w.slice(1));
              const g = games.find((x) => x.week === n)!;
              return (
                <option key={w} value={n}>
                  {g.type === 'REG' ? `Semana ${n}` : { WC: 'Wild Card', DIV: 'Divisional', CON: 'Final de Conferência', SB: 'Super Bowl' }[g.type]}
                </option>
              );
            })}
          </select>
        </label>
        <label className="field">
          Time (temporada inteira)
          <select className="select" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Todos</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {[...byDate.entries()].map(([d, gs]) => (
        <section key={d}>
          {/* Só a primeira letra maiúscula ("Quinta-feira, 22 de outubro"), como se escreve em português. */}
          <h3 className="small muted">
            {((s) => s.charAt(0).toUpperCase() + s.slice(1))(dateBR(d, { weekday: 'long', day: '2-digit', month: 'long' }))}
          </h3>
          <div className="grid grid-3">
            {gs.map((g) => (
              <GameCard key={g.id} g={g} live={live.get(`${g.away}@${g.home}`)} />
            ))}
          </div>
        </section>
      ))}
      <p className="xsmall muted">Horários no fuso do leste dos EUA (ET). Clique em um jogo para abrir o Game Center.</p>
    </div>
  );
}

/* --------------------------------- Líderes --------------------------------- */

function LeadersView({ season }: { season: number }) {
  const [phase, setSt] = useState<'REG' | 'POST'>('REG');
  const stats = useAsync(() => api.playerStats(season), [season]);
  // Playoffs só aparecem quando a temporada já tem jogos de playoffs (nada de aba que leva a uma tela vazia).
  const hasPost = (stats.data ?? []).some((l) => l.st === 'POST');
  const st = hasPost ? phase : 'REG';
  const lines = (stats.data ?? []).filter((l) => l.st === st);
  return (
    <div className="stack">
      {hasPost && (
        <div className="chips" role="group" aria-label="Fase">
          <button type="button" className="chip" aria-pressed={st === 'REG'} onClick={() => setSt('REG')}>
            Temporada regular
          </button>
          <button type="button" className="chip" aria-pressed={st === 'POST'} onClick={() => setSt('POST')}>
            Playoffs
          </button>
        </div>
      )}
      {stats.loading ? <Loading /> : lines.length ? <LeadersPanel lines={lines} n={10} /> : <Unavailable>Ainda não há dados de {st === 'POST' ? 'playoffs' : 'temporada regular'} para {season}.</Unavailable>}
      <p className="xsmall muted">
        Métricas de taxa exigem volume mínimo (ex.: QBs com 14+ tentativas por jogo). Estatísticas do nflverse são derivadas do play-by-play e podem diferir levemente das oficiais.
      </p>
    </div>
  );
}

/* --------------------------------- Playoffs --------------------------------- */

function PlayoffsView({ games, season, standings }: { games: Game[]; season: number; standings: StandingRow[] }) {
  const rounds = playoffBracket(games, season);
  const any = rounds.some((r) => r.games.length);
  if (!any) {
    // Projeção simplificada "se a temporada terminasse hoje".
    const seeds = (conf: 'AFC' | 'NFC') => {
      const rows = standings.filter((s) => s.conf === conf);
      const divs = groupByDivision(rows);
      const leaders = [...divs.values()].map((d) => d[0]).sort((a, b) => b.pct - a.pct || b.diff - a.diff);
      const rest = rows.filter((r) => !leaders.includes(r)).sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, 3);
      return [...leaders, ...rest];
    };
    return (
      <div className="stack">
        <Callout title="Playoffs ainda não disputados">
          Abaixo, a chave <strong>se a temporada terminasse hoje</strong>, usando desempate simplificado (PCT → saldo). É uma projeção, não uma previsão.
        </Callout>
        <div className="grid grid-2">
          {(['AFC', 'NFC'] as const).map((c) => (
            <div className="card" key={c}>
              <h3>{c}</h3>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {seeds(c).map((s, i) => (
                  <li key={s.team} style={{ padding: '4px 0' }}>
                    <span className="row" style={{ gap: 8 }}>
                      <TeamChip abbr={s.team} />
                      <span className="small muted">
                        {fmtRecord(s)} {i < 4 ? '· líder de divisão' : '· wild card'} {i === 0 ? '· folga no Wild Card' : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="stack">
      <ModeNote beginner={<>Os playoffs são mata-mata: quem perde está fora. O vencedor de cada conferência (AFC e NFC) disputa o Super Bowl.</>} />
      <div className="bracket" role="list" aria-label={`Chave dos playoffs de ${season}`}>
        {rounds.map((r) => (
          <div className="bracket-col" key={r.type} role="listitem">
            <h4>{r.label}</h4>
            {r.games.length ? r.games.map((g) => <GameCard key={g.id} g={g} />) : <div className="empty small">A definir</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Power ranking ------------------------------ */

function PowerView({ games, season, standings }: { games: Game[]; season: number; standings: StandingRow[] }) {
  const ts = useAsync(() => api.teamStats(season).catch(() => []), [season]);
  const rows = useMemo(() => (ts.data ? powerRankings(games, standings, ts.data, season) : []), [games, standings, ts.data, season]);
  if (ts.loading) return <Loading />;
  if (!rows.length) return <Unavailable>Ainda não há jogos suficientes nesta temporada.</Unavailable>;
  return (
    <div className="stack">
      <Callout title="Como é calculado?">
        Power Score do modelo <strong>EZA-Power v1</strong>: cada componente vira um z-score (quantos desvios-padrão acima da média da liga) e é ponderado —
        aproveitamento {POWER_WEIGHTS.record}%, saldo de pontos por jogo {POWER_WEIGHTS.diff}%, força de tabela {POWER_WEIGHTS.sos}%, EPA por jogada do ataque {POWER_WEIGHTS.epa}%, forma
        recente (últimos 4 jogos) {POWER_WEIGHTS.form}%. É um modelo, não uma verdade absoluta.
      </Callout>
      <DataTable
        rows={rows}
        rowKey={(r) => r.team}
        caption="Power ranking"
        rank
        exportName={`power-ranking-${season}`}
        columns={[
          { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} />, value: (r) => r.team },
          { key: 'score', label: 'Power Score', num: true, help: 'Soma ponderada dos z-scores. 0 = time médio; +1 = muito acima da média.', render: (r) => <strong>{signed(r.score, 2)}</strong>, value: (r) => r.score },
          { key: 'record', label: 'Campanha', render: (r) => r.record, value: (r) => r.pct },
          { key: 'diffPg', label: 'Saldo/jogo', num: true, metric: 'diff', render: (r) => signed(r.diffPg, 1), value: (r) => r.diffPg },
          { key: 'sos', label: 'SOS', num: true, metric: 'sos', render: (r) => pct3(r.sos), value: (r) => r.sos },
          { key: 'epa', label: 'EPA/jogada', num: true, metric: 'epaPlay', render: (r) => (r.epaPerPlay === null ? 'N/D' : signed(r.epaPerPlay, 3)), value: (r) => r.epaPerPlay },
          { key: 'form', label: 'Forma (4 j.)', num: true, help: 'Aproveitamento nos últimos 4 jogos.', render: (r) => pct3(r.form), value: (r) => r.form },
        ]}
      />
    </div>
  );
}

/* ----------------------------- Força de tabela ----------------------------- */

function SosView({ games, season, standings }: { games: Game[]; season: number; standings: StandingRow[] }) {
  const rows = standings
    .map((s) => ({
      team: s.team,
      record: fmtRecord(s),
      played: strengthOfSchedule(s.team, games, standings, season, true).sos,
      remaining: strengthOfSchedule(s.team, games, standings, season, false).sos,
      left: games.filter((g) => g.type === 'REG' && !isPlayed(g) && (franchiseOf(g.home) === s.team || franchiseOf(g.away) === s.team)).length,
    }))
    .sort((a, b) => (b.played ?? 0) - (a.played ?? 0));
  const chartRows = rows.filter((r) => r.played !== null);
  return (
    <div className="stack">
      <ModeNote
        beginner={<>A força de tabela mostra quão bons foram os adversários. Um valor de .600 significa que os rivais venceram 60% dos seus jogos — caminho difícil.</>}
        expert={<>SOS = média simples do PCT dos adversários (jogos disputados). Não pondera por local nem ajusta pelo próprio confronto.</>}
      />
      <div className="two-col">
        <DataTable
          rows={rows}
          rowKey={(r) => r.team}
          caption="Força de tabela"
          rank
          exportName={`forca-de-tabela-${season}`}
          initialSort={{ key: 'played', dir: 'desc' }}
          columns={[
            { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short />, value: (r) => r.team },
            { key: 'record', label: 'Campanha', render: (r) => r.record },
            { key: 'played', label: 'SOS (jogado)', num: true, metric: 'sos', render: (r) => (r.played === null ? 'N/D' : pct3(r.played)), value: (r) => r.played },
            { key: 'remaining', label: 'SOS (restante)', num: true, help: 'Aproveitamento atual dos adversários que ainda faltam enfrentar.', render: (r) => (r.remaining === null ? '—' : pct3(r.remaining)), value: (r) => r.remaining },
            { key: 'left', label: 'Jogos restantes', num: true },
          ]}
        />
        <div className="card">
          <ChartFrame
            title="Tabela mais difícil até agora"
            info={{ simple: 'Times ordenados pelo aproveitamento médio dos adversários já enfrentados.' }}
            table={<MiniTable head={['Time', 'SOS']} rows={chartRows.map((r) => [r.team, Number((r.played ?? 0).toFixed(3))])} />}
          >
            <BarList
              ariaLabel="Força de tabela"
              items={chartRows.slice(0, 10).map((r) => ({ key: r.team, value: r.played ?? 0, display: pct3(r.played), label: <span className="row" style={{ gap: 6 }}><TeamLogo abbr={r.team} size={16} /><TeamName abbr={r.team} short /></span> }))}
            />
          </ChartFrame>
        </div>
      </div>
      <p className="xsmall muted">
        <InfoTip metric="sos" /> Valores calculados com os resultados disponíveis em {num(standings.reduce((s, r) => s + r.gamesPlayed, 0) / 2)} jogos. <Link to="/glossary">Glossário</Link>
      </p>
    </div>
  );
}
