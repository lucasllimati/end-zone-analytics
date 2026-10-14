/**
 * Seções extras do perfil do jogador: jogo a jogo (estatísticas semanais), melhores jogos,
 * field goals por distância, retornos e valor de draft.
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { Loading, Unavailable } from '../../components/States';
import { TeamLogo } from '../../components/TeamLogo';
import { StatTile } from '../../components/Bits';
import { ChartFrame, MiniTable } from '../../components/charts/ChartFrame';
import { ColumnChart } from '../../components/charts/ColumnChart';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { expectedCurve, MATURE } from '../../lib/draft';
import { num, percent, signed } from '../../lib/format';
import { positionBucket } from '../../lib/stats';
import { franchiseOf } from '../../lib/teams';
import type { Game, PlayerBio, PlayerGameLine, PlayerSeasonLine } from '../../lib/types';

type Log = Omit<PlayerGameLine, 'id' | 'name' | 'pos'>;

/** Estatística principal por jogo (gráfico e "melhores jogos"). */
function gameStat(pos: string): { key: keyof Log; label: string } {
  const b = positionBucket(pos);
  if (b === 'QB') return { key: 'passYds', label: 'Jardas de passe' };
  if (b === 'RB') return { key: 'rushYds', label: 'Jardas corridas' };
  if (b === 'WR' || b === 'TE') return { key: 'recYds', label: 'Jardas recebidas' };
  if (b === 'K') return { key: 'fgm', label: 'Field goals' };
  if (b === 'P') return { key: 'puntYds', label: 'Jardas de punt' };
  return { key: 'tackles', label: 'Tackles' };
}

const n = (key: keyof Log, label: string, digits = 0): Column<Log> => ({
  key: key as string,
  label,
  num: true,
  render: (l) => (l[key] === null ? '—' : num(l[key] as number, digits)),
  value: (l) => l[key] as number | null,
});

function logColumns(pos: string): Column<Log>[] {
  const b = positionBucket(pos);
  if (b === 'QB')
    return [n('cmp', 'CMP'), n('att', 'ATT'), n('passYds', 'Jardas'), n('passTd', 'TD'), n('int', 'INT'), n('sacked', 'SK'), { ...n('passEpa', 'EPA'), render: (l) => (l.passEpa === null ? '—' : signed(l.passEpa, 1)), expertOnly: true }, n('carries', 'Corr.'), n('rushYds', 'J. corr.'), n('rushTd', 'TD corr.')];
  if (b === 'RB') return [n('carries', 'Corr.'), n('rushYds', 'Jardas'), n('rushTd', 'TD'), n('tgt', 'Alvos'), n('rec', 'Rec'), n('recYds', 'J. rec.'), n('recTd', 'TD rec.'), n('fumLost', 'FL')];
  if (b === 'WR' || b === 'TE') return [n('tgt', 'Alvos'), n('rec', 'Rec'), n('recYds', 'Jardas'), n('recTd', 'TD'), { ...n('recEpa', 'EPA'), render: (l) => (l.recEpa === null ? '—' : signed(l.recEpa, 1)), expertOnly: true }, n('rushYds', 'J. corr.'), n('fumLost', 'FL')];
  if (b === 'K') return [n('fgm', 'FGM'), n('fga', 'FGA'), { ...n('fgLong', 'Longo'), render: (l) => (l.fgLong ? String(l.fgLong) : '—') }, n('xpm', 'XPM'), n('xpa', 'XPA')];
  if (b === 'P') return [n('punts', 'Punts'), n('puntYds', 'Jardas'), { key: 'avg', label: 'Média', num: true, render: (l) => (l.punts ? num(l.puntYds / l.punts, 1) : '—'), value: (l) => (l.punts ? l.puntYds / l.punts : null) }];
  return [n('tackles', 'Tackles'), n('sacks', 'Sacks', 1), n('qbHits', 'QB hits'), n('defInt', 'INT'), n('pd', 'PD'), n('ff', 'FF')];
}

/** Placar e resultado do jogo do ponto de vista do time do jogador. */
function resultOf(g: Game | undefined, team: string) {
  if (!g || g.homeScore === null || g.awayScore === null) return null;
  const home = franchiseOf(g.home) === franchiseOf(team);
  const pf = home ? g.homeScore : g.awayScore;
  const pa = home ? g.awayScore : g.homeScore;
  return { home, res: pf > pa ? 'V' : pf < pa ? 'D' : 'E', score: `${pf}–${pa}` };
}

export function GameLog({ id, name, pos, expert }: { id: string; name: string; pos: string; expert: boolean }) {
  const log = useAsync(() => api.gameLog(id), [id]);
  const games = useAsync(() => api.allGames(), []);
  const seasons = useMemo(() => [...new Set((log.data ?? []).map((l) => l.season))].sort((a, b) => b - a), [log.data]);
  const [season, setSeason] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const byId = useMemo(() => new Map((games.data ?? []).map((g) => [g.id, g])), [games.data]);

  if (log.loading) return <Loading height={200} label="Carregando jogo a jogo…" />;
  if (!log.data?.length) return <Unavailable>Sem estatísticas por jogo para este jogador.</Unavailable>;
  const s = season ?? seasons[0];
  const rows = log.data.filter((l) => l.season === s);
  const stat = gameStat(pos);
  const best = [...log.data].sort((a, b) => ((b[stat.key] as number) ?? 0) - ((a[stat.key] as number) ?? 0)).slice(0, 5);
  const label = (l: Log) => (l.st === 'POST' ? `Playoffs · sem. ${l.week}` : `Sem. ${l.week}`);
  const opp = (l: Log) => {
    const r = resultOf(byId.get(l.game), l.team);
    return (
      <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
        <span className="muted xsmall">{r?.home === false ? '@' : 'vs'}</span>
        <TeamLogo abbr={l.opp} size={18} /> {l.opp}
      </span>
    );
  };

  return (
    <div className="stack">
      <div className="section-title">
        <h2>Jogo a jogo</h2>
        <label className="field">
          Temporada
          <select className="select" value={s} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="card">
        <ChartFrame
          title={`${stat.label} por jogo em ${s}`}
          subtitle="Temporada regular e playoffs"
          info={{ simple: 'Cada coluna é um jogo da temporada. A mais alta é destacada.' }}
          svgRef={chartRef}
          table={<MiniTable head={['Jogo', 'Adversário', stat.label]} rows={rows.map((l) => [label(l), l.opp, (l[stat.key] as number) ?? 0])} />}
        >
          <ColumnChart
            ref={chartRef}
            ariaLabel={`${stat.label} por jogo de ${name} em ${s}`}
            data={rows.map((l) => ({ key: l.game, label: l.st === 'POST' ? `P${l.week}` : String(l.week), value: (l[stat.key] as number) ?? 0, tooltip: [`${label(l)} · ${l.opp}`, `${stat.label}: ${num(l[stat.key] as number)}`] }))}
          />
        </ChartFrame>
      </section>
      <DataTable
        rows={rows}
        rowKey={(l) => l.game}
        caption={`Jogo a jogo de ${name} em ${s}`}
        exportName={`${name}-jogo-a-jogo-${s}`}
        expert={expert}
        columns={[
          { key: 'week', label: 'Jogo', render: label, value: (l) => (l.st === 'POST' ? 100 + l.week : l.week) },
          { key: 'opp', label: 'Adversário', render: opp, value: (l) => l.opp },
          {
            key: 'res',
            label: 'Resultado',
            render: (l) => {
              const r = resultOf(byId.get(l.game), l.team);
              return r ? (
                <Link to={`/games/${l.game}`}>
                  <span className={`res-${r.res}`}>{r.res}</span> {r.score}
                </Link>
              ) : (
                '—'
              );
            },
            value: (l) => resultOf(byId.get(l.game), l.team)?.res ?? null,
          },
          ...logColumns(pos),
          { ...n('fptsPpr', 'Fantasy (PPR)', 1), expertOnly: true },
        ]}
      />
      <section className="card">
        <div className="card-title">
          <h2>Melhores jogos da carreira</h2>
        </div>
        <ol className="ref-list">
          {best.map((l) => {
            const r = resultOf(byId.get(l.game), l.team);
            return (
              <li key={l.game}>
                <Link to={`/games/${l.game}`}>
                  <span className="ref-score num">{num(l[stat.key] as number)}</span>
                  <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    {r?.home === false ? '@' : 'vs'} <TeamLogo abbr={l.opp} size={18} /> {l.opp}
                    <span className="muted small">· {stat.label.toLowerCase()}</span>
                  </span>
                  <span className="xsmall muted">
                    {l.season} · {label(l).toLowerCase()}
                    {r ? ` · ${r.res} ${r.score}` : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

const FG_LABELS = ['0–19', '20–29', '30–39', '40–49', '50–59', '60+'];

/** Field goals por faixa de distância (carreira e temporada mais recente). */
export function KickingSplits({ career, latest }: { career: PlayerSeasonLine; latest?: PlayerSeasonLine }) {
  if (!career.fgMade || !career.fgMiss) return null;
  const rows = FG_LABELS.map((label, i) => {
    const m = career.fgMade![i];
    const a = m + career.fgMiss![i];
    const lm = latest?.fgMade?.[i] ?? 0;
    const la = lm + (latest?.fgMiss?.[i] ?? 0);
    return { label, m, a, lm, la };
  }).filter((r) => r.a > 0);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Field goals por distância</h2>
      </div>
      <div className="tiles" style={{ marginBottom: 12 }}>
        <StatTile label="FGs da vitória" value={num(career.gwfgm)} note={career.gwfga ? `${career.gwfga} tentativa(s)` : undefined} metric="gwfgm" />
        <StatTile label="De 50+ jardas" value={num(career.fgMade[4] + career.fgMade[5])} metric="fg50" />
        <StatTile label="Mais longo" value={career.fgLong ?? '—'} metric="fgLong" />
      </div>
      <div className="table-wrap bare" tabIndex={0} role="region" aria-label="Field goals por distância">
        <table className="data">
          <caption className="sr-only">Aproveitamento de field goals por faixa de distância</caption>
          <thead>
            <tr>
              <th scope="col">Distância (jardas)</th>
              <th scope="col" className="num">Carreira</th>
              <th scope="col">Aproveitamento</th>
              {latest && <th scope="col" className="num">{latest.season}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">
                  {r.m}/{r.a}
                </td>
                <td style={{ minWidth: 140 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <div className="meter" style={{ flex: 1 }} aria-hidden="true">
                      <span style={{ width: `${(r.m / r.a) * 100}%` }} />
                    </div>
                    <span className="num small">{percent(r.m / r.a, 0)}</span>
                  </div>
                </td>
                {latest && <td className="num">{r.la ? `${r.lm}/${r.la}` : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Retornos de punt e kickoff (aparece para quem retornou ao menos 5 vezes). */
export function ReturnsSummary({ career }: { career: PlayerSeasonLine }) {
  if (career.pr + career.kr < 5) return null;
  return (
    <section aria-label="Retornos">
      <h2 style={{ fontSize: '1rem' }}>Retornos — temporada regular</h2>
      <div className="tiles">
        <StatTile label="Retornos de punt" value={num(career.pr)} note={career.pr ? `${num(career.prYds / career.pr, 1)} jardas por retorno` : undefined} />
        <StatTile label="Jardas (punt)" value={num(career.prYds)} metric="prYds" />
        <StatTile label="Retornos de kickoff" value={num(career.kr)} note={career.kr ? `${num(career.krYds / career.kr, 1)} jardas por retorno` : undefined} />
        <StatTile label="Jardas (kickoff)" value={num(career.krYds)} metric="krYds" />
        <StatTile label="TDs de times especiais" value={num(career.stTd)} metric="stTd" />
      </div>
    </section>
  );
}

/** Valor de draft: AV de carreira comparado ao esperado para aquele número de escolha. */
export function DraftValue({ bio }: { bio: PlayerBio }) {
  const draft = useAsync(() => (bio.draftYear ? api.draft() : Promise.resolve([])), [bio.draftYear]);
  if (!bio.draftYear || !draft.data?.length) return null;
  const pick = draft.data.find((d) => d.id === bio.id) ?? draft.data.find((d) => d.season === bio.draftYear && d.pick === bio.draftPick);
  if (!pick || pick.carAv === null) return null;
  const curve = expectedCurve(draft.data);
  const exp = curve.find((c) => c.x === pick.pick)?.y ?? null;
  const classmates = draft.data.filter((d) => d.season === pick.season && d.carAv !== null);
  const rankInClass = [...classmates].sort((a, b) => (b.carAv ?? 0) - (a.carAv ?? 0)).findIndex((d) => d === pick) + 1;
  const samePos = classmates.filter((d) => d.pos === pick.pos);
  const posRank = [...samePos].sort((a, b) => (b.carAv ?? 0) - (a.carAv ?? 0)).findIndex((d) => d === pick) + 1;
  const diff = exp === null ? null : pick.carAv - exp;
  const young = pick.season > MATURE;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Valor de draft</h2>
      </div>
      <div className="tiles">
        <StatTile label="Escolha" value={`#${pick.pick}`} note={`${pick.round}ª rodada · ${pick.season} · ${pick.team}`} />
        <StatTile label="AV de carreira" value={num(pick.carAv)} metric="carAv" note={exp !== null ? `esperado para a escolha: ${num(exp, 1)}` : undefined} />
        <StatTile label="Contra o esperado" value={diff === null ? '—' : signed(diff, 1)} note={diff === null ? undefined : diff >= 0 ? 'superou a posição em que foi escolhido' : 'abaixo do valor típico da escolha'} />
        <StatTile label="Na sua classe" value={`${rankInClass}º`} note={`de ${classmates.length} escolhidos · ${posRank}º entre ${samePos.length} ${pick.pos}`} />
      </div>
      {young && <p className="xsmall muted" style={{ marginTop: 8 }}>Carreira ainda em andamento: o AV continua crescendo, então a comparação tende a melhorar com o tempo.</p>}
    </section>
  );
}
