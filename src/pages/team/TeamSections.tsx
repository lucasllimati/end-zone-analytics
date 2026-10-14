/**
 * Seções da página do time alimentadas pelo perfil da franquia (data/teams/{CODE}.json) e pela temporada atual.
 * Tudo vem de dados publicados; ausências aparecem como "Não disponível".
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { Unavailable } from '../../components/States';
import { TeamChip, TeamLogo, TeamName } from '../../components/TeamLogo';
import { BarList } from '../../components/charts/BarList';
import { ChartFrame, MiniTable } from '../../components/charts/ChartFrame';
import { LineChart } from '../../components/charts/LineChart';
import { StatTile } from '../../components/Bits';
import { InfoTip } from '../../components/InfoTip';
import { dateBR, num, pct3, signed } from '../../lib/format';
import { fmtRecord } from '../../lib/standings';
import { franchiseOf, GAME_TYPE_LABEL } from '../../lib/teams';
import type { Game, StandingRow, TeamGameRef, TeamProfile, TeamSeason, WLT } from '../../lib/types';

const rec = (r: WLT) => `${r[0]}-${r[1]}${r[2] ? `-${r[2]}` : ''}`;
const pctOf = (r: WLT) => (r[0] + r[2] / 2) / Math.max(1, r[0] + r[1] + r[2]);
const range = (a: number, b: number) => (a === b ? String(a) : `${a}–${b}`);

/* ----------------------------- Agora: forma e próximo jogo ----------------------------- */

export function RecentForm({ code, games }: { code: string; games: Game[] }) {
  const mine = games.filter((g) => franchiseOf(g.home) === code || franchiseOf(g.away) === code).sort((a, b) => a.date.localeCompare(b.date));
  const done = mine.filter((g) => g.homeScore !== null && g.awayScore !== null);
  const next = mine.find((g) => g.homeScore === null);
  const last5 = done.slice(-5);
  const side = (g: Game) => {
    const home = franchiseOf(g.home) === code;
    const pf = (home ? g.homeScore : g.awayScore)!;
    const pa = (home ? g.awayScore : g.homeScore)!;
    return { home, opp: home ? g.away : g.home, pf, pa, res: pf > pa ? 'V' : pf < pa ? 'D' : 'E' };
  };
  return (
    <div className="team-now">
      <div className="card">
        <div className="card-title">
          <h2>Últimos jogos</h2>
        </div>
        {last5.length ? (
          <ol className="form-list">
            {[...last5].reverse().map((g) => {
              const s = side(g);
              return (
                <li key={g.id}>
                  <Link to={`/games/${g.id}`}>
                    <span className={`form-res res-${s.res}`} aria-label={s.res === 'V' ? 'Vitória' : s.res === 'D' ? 'Derrota' : 'Empate'}>
                      {s.res}
                    </span>
                    <span className="form-opp">
                      {s.home ? 'vs' : '@'} <TeamLogo abbr={s.opp} size={20} /> <TeamName abbr={s.opp} short />
                    </span>
                    <span className="form-score num">
                      {s.pf}–{s.pa}
                    </span>
                    <span className="form-date">{dateBR(g.date, { day: '2-digit', month: '2-digit' })}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <Unavailable>Nenhum jogo disputado nesta temporada.</Unavailable>
        )}
      </div>
      <div className="card">
        <div className="card-title">
          <h2>Próximo jogo</h2>
        </div>
        {next ? (
          <Link to={`/games/${next.id}`} className="next-game">
            <TeamLogo abbr={next.away} size={44} />
            <span className="next-vs">{franchiseOf(next.home) === code ? 'recebe' : 'visita'}</span>
            <TeamLogo abbr={next.home} size={44} />
            <span className="next-meta">
              <strong>
                <TeamName abbr={franchiseOf(next.home) === code ? next.away : next.home} />
              </strong>
              <span className="small text-2">
                {dateBR(next.date, { weekday: 'long', day: '2-digit', month: 'long' })}
                {next.type === 'REG' ? ` · semana ${next.week}` : ` · ${GAME_TYPE_LABEL[next.type]}`}
              </span>
              {next.stadium && <span className="xsmall muted">{next.stadium}</span>}
            </span>
          </Link>
        ) : (
          <Unavailable>Sem próximo jogo no calendário desta temporada.</Unavailable>
        )}
      </div>
    </div>
  );
}

export function DivisionTable({ code, rows, division }: { code: string; rows: StandingRow[]; division: string }) {
  const div = rows.filter((r) => r.division === division);
  if (!div.length) return null;
  return (
    <div className="card">
      <div className="card-title">
        <h2>{division}</h2>
        <Link to="/season">Classificação completa</Link>
      </div>
      <div className="table-wrap bare">
        <table className="data">
          <caption className="sr-only">Classificação da {division}</caption>
          <thead>
            <tr>
              <th scope="col" className="rank">
                #
              </th>
              <th scope="col">Time</th>
              <th scope="col" className="num">
                Campanha
              </th>
              <th scope="col" className="num">
                %
              </th>
              <th scope="col" className="num">
                Saldo
              </th>
              <th scope="col" className="num">
                Divisão
              </th>
            </tr>
          </thead>
          <tbody>
            {div.map((r, i) => (
              <tr key={r.team} className={r.team === code ? 'is-current' : undefined} aria-current={r.team === code ? 'true' : undefined}>
                <td className="rank num">{i + 1}</td>
                <td>
                  <TeamChip abbr={r.team} short size={20} />
                </td>
                <td className="num">{fmtRecord(r)}</td>
                <td className="num">{pct3(r.pct)}</td>
                <td className={`num ${r.diff > 0 ? 'good' : r.diff < 0 ? 'bad' : ''}`}>{signed(r.diff)}</td>
                <td className="num">{rec(r.div)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- Gráfico de pontos por temporada ----------------------------- */

export function PointsChart({ history, name }: { history: TeamSeason[]; name: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const perGame = (v: number, s: TeamSeason) => {
    const g = s.w + s.l + s.t;
    return g ? Math.round((v / g) * 10) / 10 : null;
  };
  return (
    <div className="card">
      <ChartFrame
        title="Pontos marcados × sofridos por jogo"
        subtitle={`Temporada regular, ${history[0]?.season ?? ''}–${history.at(-1)?.season ?? ''}. Quando a linha de marcados fica acima da de sofridos, o time pontuou mais do que cedeu.`}
        info={{ simple: 'Média de pontos que o time fez e levou por jogo em cada temporada.', expert: 'PF/jogo e PA/jogo da temporada regular; temporadas em andamento usam só os jogos já disputados.' }}
        svgRef={ref}
        rows={() => history.map((h) => ({ temporada: h.season, marcados_por_jogo: perGame(h.pf, h), sofridos_por_jogo: perGame(h.pa, h) }))}
        table={<MiniTable head={['Temporada', 'Marcados/j', 'Sofridos/j']} rows={history.map((h) => [String(h.season), num(perGame(h.pf, h), 1), num(perGame(h.pa, h), 1)])} />}
        source="nflverse games.csv"
      >
        <LineChart
          ref={ref}
          ariaLabel={`Pontos marcados e sofridos por jogo do ${name}`}
          series={[
            { id: 'pf', label: 'Marcados', slot: 0, points: history.map((h) => ({ x: h.season, y: perGame(h.pf, h) })) },
            { id: 'pa', label: 'Sofridos', slot: 1, points: history.map((h) => ({ x: h.season, y: perGame(h.pa, h) })) },
          ]}
          yZero
        />
      </ChartFrame>
    </div>
  );
}

/* ----------------------------- Recordes da franquia ----------------------------- */

export function FranchiseRecords({ profile }: { profile: TeamProfile }) {
  const [mode, setMode] = useState<'career' | 'season'>('career');
  const groups = mode === 'career' ? profile.leaders.career : profile.leaders.season;
  return (
    <div className="stack">
      <div className="row between">
        <p className="small text-2" style={{ margin: 0, maxWidth: '62ch' }}>
          Líderes da franquia na temporada regular, desde {profile.coverage.first} (início das estatísticas detalhadas). Jogadores trocados no meio de uma temporada contam
          para o último time daquele ano.
        </p>
        <div className="segmented" role="group" aria-label="Tipo de recorde">
          <button type="button" aria-pressed={mode === 'career'} onClick={() => setMode('career')}>
            Carreira no time
          </button>
          <button type="button" aria-pressed={mode === 'season'} onClick={() => setMode('season')}>
            Uma temporada
          </button>
        </div>
      </div>
      <div className="grid grid-3">
        {groups.map((g) => (
          <section className="card" key={g.stat}>
            <div className="card-title">
              <h2 style={{ fontSize: '1.0625rem' }}>{g.stat}</h2>
            </div>
            {g.entries.length ? (
              <BarList
                ariaLabel={`${g.stat}: líderes da franquia`}
                items={g.entries.map((e) => ({
                  key: `${e.id}-${'season' in e ? e.season : ''}`,
                  value: e.value,
                  display: num(e.value, Number.isInteger(e.value) ? 0 : 1),
                  label: <Link to={`/players/${e.id}`}>{e.name}</Link>,
                  sub: 'season' in e ? String(e.season) : range(e.from, e.to),
                }))}
              />
            ) : (
              <p className="small muted">Não disponível.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- História da franquia ----------------------------- */

function GameRefList<T extends TeamGameRef>({ title, rows, note }: { title: string; rows: T[]; note?: (g: T) => string }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2 style={{ fontSize: '1.0625rem' }}>{title}</h2>
      </div>
      <ol className="ref-list">
        {rows.map((g) => (
          <li key={g.id}>
            <Link to={`/games/${g.id}`}>
              <span className="ref-score num">
                {g.pf}–{g.pa}
              </span>
              <span>
                {g.home ? 'vs' : '@'} <TeamName abbr={g.opp} />
              </span>
              <span className="xsmall muted">
                {g.season}
                {g.type !== 'REG' ? ` · ${GAME_TYPE_LABEL[g.type] ?? g.type}` : ''}
                {note ? ` · ${note(g)}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FranchiseHistory({ profile, code }: { profile: TeamProfile; code: string }) {
  const { extremes: x } = profile;
  return (
    <div className="stack">
      <section>
        <div className="section-title">
          <h2>Ficha da franquia</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title">
              <h2 style={{ fontSize: '1.0625rem' }}>Nomes e cidades desde {profile.coverage.first}</h2>
            </div>
            <ul className="fact-list">
              {[...profile.identities].reverse().map((i) => (
                <li key={`${i.abbr}-${i.from}`}>
                  <TeamLogo abbr={i.abbr} size={24} />
                  <span>
                    <TeamName abbr={i.abbr} />
                  </span>
                  <span className="muted num">{range(i.from, i.to)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="card-title">
              <h2 style={{ fontSize: '1.0625rem' }}>Estádios como mandante</h2>
            </div>
            <ul className="fact-list">
              {profile.stadiums.map((s) => (
                <li key={s.name}>
                  <span>
                    <strong>{s.name}</strong>
                    {s.names.length > 0 && <span className="xsmall muted"> · também chamado de {s.names.join(', ')}</span>}
                  </span>
                  <span className="muted num">
                    {range(s.from, s.to)} · {s.games} jogos
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Momentos marcantes</h2>
        </div>
        <div className="tiles">
          <StatTile label="Melhor temporada" value={x.best ? rec(x.best.record) : 'Não disponível'} note={x.best ? `em ${x.best.season}` : undefined} />
          <StatTile label="Pior temporada" value={x.worst ? rec(x.worst.record) : 'Não disponível'} note={x.worst ? `em ${x.worst.season}` : undefined} />
          <StatTile
            label="Maior sequência de vitórias"
            value={x.winStreak ? `${x.winStreak.length} jogos` : 'Não disponível'}
            note={x.winStreak ? `${dateBR(x.winStreak.from)} a ${dateBR(x.winStreak.to)}` : undefined}
          />
          <StatTile
            label="Maior sequência de derrotas"
            value={x.lossStreak ? `${x.lossStreak.length} jogos` : 'Não disponível'}
            note={x.lossStreak ? `${dateBR(x.lossStreak.from)} a ${dateBR(x.lossStreak.to)}` : undefined}
          />
        </div>
        <div className="grid grid-2" style={{ marginTop: 'var(--space-4)' }}>
          <GameRefList title="Maiores vitórias" rows={x.biggestWins} />
          <GameRefList title="Derrotas mais duras" rows={x.worstLosses} />
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Técnicos</h2>
        </div>
        <DataTable
          rows={profile.coaches}
          rowKey={(r) => r.name}
          caption={`Técnicos do ${code} desde ${profile.coverage.first}`}
          columns={[
            { key: 'name', label: 'Técnico', render: (r) => <strong>{r.name}</strong>, value: (r) => r.name },
            { key: 'period', label: 'Período', render: (r) => range(r.from, r.to), value: (r) => r.to },
            { key: 'seasons', label: 'Temporadas', num: true, value: (r) => r.seasons, render: (r) => r.seasons },
            { key: 'record', label: 'Temporada regular', num: true, render: (r) => rec(r.record), value: (r) => r.record[0] },
            { key: 'pct', label: '%', num: true, render: (r) => pct3(pctOf(r.record)), value: (r) => pctOf(r.record) },
            { key: 'po', label: 'Playoffs', num: true, render: (r) => (r.playoff[0] + r.playoff[1] ? `${r.playoff[0]}-${r.playoff[1]}` : '—'), value: (r) => r.playoff[0] },
          ]}
        />
      </section>

      <section>
        <div className="section-title">
          <h2>Quarterbacks titulares</h2>
        </div>
        <DataTable
          rows={profile.qbs}
          rowKey={(r) => r.name}
          caption={`QBs titulares do ${code} (mín. 5 jogos)`}
          columns={[
            { key: 'name', label: 'QB', render: (r) => <strong>{r.name}</strong>, value: (r) => r.name },
            { key: 'period', label: 'Período', render: (r) => range(r.from, r.to), value: (r) => r.to },
            { key: 'starts', label: 'Jogos como titular', num: true, value: (r) => r.starts, render: (r) => r.starts },
            { key: 'record', label: 'Campanha', num: true, render: (r) => rec(r.record), value: (r) => r.record[0] },
            { key: 'pct', label: '%', num: true, render: (r) => pct3(pctOf(r.record)), value: (r) => pctOf(r.record) },
          ]}
        />
      </section>
    </div>
  );
}

/* ----------------------------- Confrontos e recortes ----------------------------- */

export function Matchups({ profile, code }: { profile: TeamProfile; code: string }) {
  return (
    <div className="stack">
      <section>
        <div className="section-title">
          <h2>Desempenho por situação</h2>
        </div>
        <div className="split-grid">
          {profile.splits.map((s) => {
            const p = pctOf(s.record);
            return (
              <div className="tile" key={s.label}>
                <div className="tile-label">{s.label}</div>
                <div className="tile-value">{rec(s.record)}</div>
                <div className="meter" aria-hidden="true">
                  <span style={{ width: `${Math.round(p * 100)}%` }} />
                </div>
                <div className="tile-note">
                  {pct3(p)} de aproveitamento{s.note ? ` · ${s.note}` : ''}
                </div>
              </div>
            );
          })}
        </div>
        <p className="xsmall muted">Temporada regular desde {profile.coverage.first}, exceto “Playoffs”.</p>
      </section>
      {profile.betting?.games > 0 && <MarketSection profile={profile} />}
      <section>
        <div className="section-title">
          <h2>Retrospecto contra cada adversário</h2>
        </div>
        <DataTable
          rows={profile.h2h}
          rowKey={(r) => r.opp}
          caption={`Confrontos do ${code} desde ${profile.coverage.first}`}
          initialSort={{ key: 'games', dir: 'desc' }}
          columns={[
            { key: 'opp', label: 'Adversário', render: (r) => <TeamChip abbr={r.opp} size={20} />, value: (r) => r.opp },
            { key: 'games', label: 'Jogos', num: true, value: (r) => r.games, render: (r) => r.games },
            { key: 'record', label: 'Campanha', num: true, render: (r) => rec(r.record), value: (r) => r.record[0] - r.record[1] },
            { key: 'pct', label: '%', num: true, render: (r) => pct3(pctOf(r.record)), value: (r) => pctOf(r.record) },
            { key: 'avg', label: 'Placar médio', num: true, render: (r) => `${num(r.pf / r.games, 1)}–${num(r.pa / r.games, 1)}`, value: (r) => (r.pf - r.pa) / r.games },
            { key: 'last', label: 'Último jogo', render: (r) => dateBR(r.last), value: (r) => r.last },
            {
              key: 'go',
              label: 'Histórico',
              sortable: false,
              render: (r) => (
                <Link to={`/matchup?a=${code}&b=${r.opp}`} aria-label={`Histórico completo contra ${r.opp}`}>
                  Ver jogos
                </Link>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

/* ------------------------- Expectativa do mercado ------------------------- */

const coverPct = (r: WLT) => (r[0] + r[1] ? r[0] / (r[0] + r[1]) : null);

function MarketSection({ profile }: { profile: TeamProfile }) {
  const b = profile.betting;
  return (
    <section className="stack">
      <div className="section-title">
        <h2 className="row" style={{ gap: 6 }}>
          Contra a expectativa do mercado{' '}
          <InfoTip
            title="Linhas de fechamento"
            simple="Antes de cada jogo, o mercado estima quem é favorito e por quantos pontos. “Cobriu a linha” = venceu por mais (ou perdeu por menos) do que o previsto. É uma medida de surpresa, não recomendação de aposta."
            expert="Linhas de fechamento (nflverse/schedules), temporada regular e playoffs. Pushes fora do %."
          />
        </h2>
      </div>
      <div className="tiles">
        <StatTile label="Contra a linha (ATS)" value={rec(b.ats)} note={`cobriu ${pct3(coverPct(b.ats))} dos jogos`} metric="ats" />
        <StatTile label="Como favorito" value={rec(b.favored)} note={`${pct3(pctOf(b.favored))} de vitórias`} />
        <StatTile label="Como azarão" value={rec(b.underdog)} note={`${pct3(pctOf(b.underdog))} de vitórias`} />
        <StatTile label="Over-Under" value={`${b.ou[0]}-${b.ou[1]}${b.ou[2] ? `-${b.ou[2]}` : ''}`} note="jogos acima × abaixo do total esperado" metric="overPct" />
      </div>
      <div className="two-col">
        <DataTable
          rows={b.bySeason}
          rowKey={(r) => String(r.season)}
          caption="Contra a linha por temporada"
          exportName={`${profile.team}-mercado`}
          pageSize={12}
          columns={[
            { key: 'season', label: 'Temporada', render: (r) => r.season, value: (r) => r.season },
            { key: 'ats', label: 'ATS', num: true, metric: 'ats', render: (r) => rec(r.ats), value: (r) => coverPct(r.ats) },
            { key: 'fav', label: 'Favorito', num: true, render: (r) => rec(r.favored), value: (r) => r.favored[0] },
            { key: 'dog', label: 'Azarão', num: true, render: (r) => rec(r.underdog), value: (r) => r.underdog[0] },
            { key: 'ou', label: 'O-U', num: true, metric: 'overPct', render: (r) => `${r.ou[0]}-${r.ou[1]}${r.ou[2] ? `-${r.ou[2]}` : ''}`, value: (r) => r.ou[0] },
          ]}
        />
        {b.upsets.length ? (
          <GameRefList title="Maiores zebras a favor" rows={b.upsets} note={(g) => `azarão por ${num(g.line, 1)}`} />
        ) : (
          <p className="small muted">Nenhuma vitória como azarão.</p>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Draft ----------------------------- */

export function DraftSection({ profile, code }: { profile: TeamProfile; code: string }) {
  const d = profile.draft;
  const cols = [
    { key: 'season', label: 'Draft', render: (r: (typeof d.best)[number]) => r.season, value: (r: (typeof d.best)[number]) => r.season },
    { key: 'pick', label: 'Escolha', num: true, render: (r: (typeof d.best)[number]) => `R${r.round} · #${r.pick}`, value: (r: (typeof d.best)[number]) => r.pick },
    {
      key: 'name',
      label: 'Jogador',
      render: (r: (typeof d.best)[number]) => (r.id ? <Link to={`/players/${r.id}`}>{r.name}</Link> : r.name),
      value: (r: (typeof d.best)[number]) => r.name,
    },
    { key: 'pos', label: 'Pos.', render: (r: (typeof d.best)[number]) => r.pos },
    { key: 'college', label: 'Universidade', render: (r: (typeof d.best)[number]) => r.college ?? 'Não disponível' },
    { key: 'av', label: 'AV no time', help: 'Approximate Value: soma do valor de cada temporada do jogador pelo time que o draftou (Pro Football Reference).', num: true, render: (r: (typeof d.best)[number]) => r.drAv ?? '—', value: (r: (typeof d.best)[number]) => r.drAv },
    {
      key: 'honors',
      label: 'Honrarias',
      render: (r: (typeof d.best)[number]) =>
        [r.hof ? 'Hall of Fame' : null, r.allPro ? `${r.allPro}× All-Pro` : null, r.proBowls ? `${r.proBowls}× Pro Bowl` : null].filter(Boolean).join(' · ') || '—',
    },
  ];
  return (
    <div className="stack">
      <div className="tiles">
        <StatTile label="Escolhas desde 1980" value={num(d.picks)} />
        <StatTile label="Na 1ª rodada" value={num(d.firstRound)} />
        <StatTile label="Chegaram ao Pro Bowl" value={num(d.proBowlers)} />
        <StatTile label="No Hall of Fame" value={num(d.hof.length)} />
      </div>
      {d.hof.length > 0 && (
        <section>
          <div className="section-title">
            <h2>Hall of Fame draftados pelo time</h2>
          </div>
          <div className="chips">
            {d.hof.map((h) => (
              <span className="chip" key={`${h.season}-${h.pick}`}>
                <strong>{h.name}</strong>
                <span className="muted">
                  {h.pos} · {h.season}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="section-title">
          <h2>Melhores escolhas</h2>
          <span className="small muted">pelo valor gerado para o time (AV)</span>
        </div>
        <DataTable rows={d.best} rowKey={(r) => `${r.season}-${r.pick}`} caption={`Melhores escolhas de draft do ${code}`} columns={cols} />
      </section>
      {d.recent.length > 0 && (
        <section>
          <div className="section-title">
            <h2>Classe do draft {d.recent[0].season}</h2>
          </div>
          <DataTable rows={d.recent} rowKey={(r) => `${r.season}-${r.pick}`} caption={`Draft ${d.recent[0].season} do ${code}`} columns={cols.filter((c) => c.key !== 'av' && c.key !== 'honors')} />
        </section>
      )}
      <p className="xsmall muted">Fonte: nflverse (derivado do Pro Football Reference). AV = Approximate Value, uma medida do valor de cada temporada do jogador.</p>
    </div>
  );
}
