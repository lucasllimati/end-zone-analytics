/**
 * Seções do Game Center alimentadas pelos dados publicados: expectativa do mercado, descanso,
 * perfil do árbitro e box score (estatísticas por jogo da nflverse).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { InfoTip } from '../../components/InfoTip';
import { Loading } from '../../components/States';
import { TeamLogo } from '../../components/TeamLogo';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { ATS_LABEL, OU_LABEL, atsResult, fairProbs, favoriteOf, ouResult, spreadLabel } from '../../lib/betting';
import { num, percent, signed } from '../../lib/format';
import type { Game, PlayerGameLine } from '../../lib/types';

const ml = (v: number | null) => (v === null ? '—' : v > 0 ? `+${v}` : String(v));

export function MarketCard({ g, nick }: { g: Game; nick: (t: string) => string }) {
  if (g.spread === null && g.total === null) return null;
  const fav = favoriteOf(g);
  const probs = fairProbs(g);
  const played = g.homeScore !== null && g.awayScore !== null;
  const ats = fav ? atsResult(g, fav) : null;
  const ou = ouResult(g);
  return (
    <section className="card">
      <h2 className="row" style={{ gap: 6 }}>
        Expectativa do mercado{' '}
        <InfoTip
          title="Linhas de fechamento"
          simple="Antes do jogo, o mercado estima quem é favorito e por quantos pontos, além do total de pontos. Usamos esses números só como medida de expectativa — para ver quem surpreendeu."
          expert="Linhas de fechamento (nflverse/schedules). Probabilidades derivadas da moneyline, normalizadas para remover a margem da casa."
        />
      </h2>
      <dl className="kv">
        <dt>Favorito</dt>
        <dd>{fav ? `${nick(fav)} (${spreadLabel(g)})` : spreadLabel(g)}</dd>
        <dt>Total esperado</dt>
        <dd>{g.total === null ? 'Não disponível' : `${num(g.total, 1)} pontos`}</dd>
        {probs && (
          <>
            <dt>Chance de vitória</dt>
            <dd>
              {nick(g.away)} {percent(probs.away, 0)} · {nick(g.home)} {percent(probs.home, 0)}
            </dd>
            <dt>Moneyline</dt>
            <dd className="num">
              {g.away} {ml(g.awayMl)} · {g.home} {ml(g.homeMl)}
            </dd>
          </>
        )}
        {played && fav && ats && (
          <>
            <dt>Contra a linha</dt>
            <dd>
              {nick(fav)}: {ATS_LABEL[ats].toLowerCase()}
            </dd>
          </>
        )}
        {played && ou && (
          <>
            <dt>Total</dt>
            <dd>
              {OU_LABEL[ou]} · {g.homeScore! + g.awayScore!} pontos
            </dd>
          </>
        )}
      </dl>
      {played && fav && g.homeScore !== g.awayScore && (g.homeScore! > g.awayScore! ? g.home : g.away) !== fav && (
        <p className="small" style={{ marginTop: 8 }}>
          <span className="badge gold">Zebra</span> O azarão venceu: {nick(fav)} era favorito por {num(Math.abs(g.spread!), 1)}.
        </p>
      )}
    </section>
  );
}

/** Descanso de cada time (dias desde o jogo anterior). */
export function RestRows({ g, nick }: { g: Game; nick: (t: string) => string }) {
  if (g.homeRest === null || g.awayRest === null) return null;
  const tag = (d: number) => (d >= 10 ? ' · após folga' : d <= 5 ? ' · curto' : '');
  const diff = g.homeRest - g.awayRest;
  // Uma linha por time (antes, as duas informações quebravam em 3 linhas na coluna lateral).
  return (
    <>
      <dt>Descanso ({nick(g.away)})</dt>
      <dd>
        {g.awayRest} dias{tag(g.awayRest)}
      </dd>
      <dt>Descanso ({nick(g.home)})</dt>
      <dd>
        {g.homeRest} dias{tag(g.homeRest)}
      </dd>
      {Math.abs(diff) >= 3 && (
        <>
          <dt>Vantagem de descanso</dt>
          <dd>
            {nick(diff > 0 ? g.home : g.away)}, {Math.abs(diff)} dias
          </dd>
        </>
      )}
    </>
  );
}

/** Retrospecto do árbitro principal (jogos com ele no comando). */
export function RefereeCard({ name }: { name: string | null }) {
  const refs = useAsync(() => api.referees().catch(() => []), []);
  if (!name) return null;
  const r = refs.data?.find((x) => x.name === name);
  if (!r) return null;
  return (
    <section className="card">
      <h2>Árbitro: {r.name}</h2>
      <dl className="kv">
        <dt>Jogos apitados</dt>
        <dd>{r.games}</dd>
        <dt>Período</dt>
        <dd>{r.from === r.to ? r.from : `${r.from}–${r.to}`}</dd>
        {r.playoffs > 0 && (
          <>
            <dt>Playoffs</dt>
            <dd>
              {r.playoffs}
              {r.superBowls ? ` (${r.superBowls} Super Bowl${r.superBowls > 1 ? 's' : ''})` : ''}
            </dd>
          </>
        )}
        <dt>Pontos por jogo</dt>
        <dd>{num(r.avgPts, 1)}</dd>
        <dt>Vitórias do mandante</dt>
        <dd>{percent(r.homeWinPct, 1)}</dd>
        <dt>Jogos acima do total</dt>
        <dd>{percent(r.overPct, 1)}</dd>
      </dl>
      <Link className="btn sm" to="/referees" style={{ marginTop: 8 }}>
        Todos os árbitros
      </Link>
    </section>
  );
}

type Row = PlayerGameLine;
/* Colunas com largura fixa: as tabelas dos dois times (lado a lado) ficam com a mesma grade. */
const c = (key: keyof Row, label: string, digits = 0, width = '3.25rem'): Column<Row> => ({
  key: key as string,
  label,
  num: true,
  width,
  render: (r) => (r[key] === null ? '—' : num(r[key] as number, digits)),
  value: (r) => r[key] as number | null,
});
const player: Column<Row> = { key: 'name', label: 'Jogador', render: (r) => <Link to={`/players/${r.id}`}>{r.name}</Link>, value: (r) => r.name };
const pos: Column<Row> = { key: 'pos', label: 'Pos.', width: '3rem' };

const SECTIONS: { title: string; when: (r: Row) => boolean; sort: keyof Row; cols: Column<Row>[] }[] = [
  { title: 'Passe', when: (r) => r.att > 0, sort: 'passYds', cols: [player, c('cmp', 'CMP'), c('att', 'ATT'), c('passYds', 'Jardas', 0, '4.5rem'), c('passTd', 'TD'), c('int', 'INT'), c('sacked', 'SK'), { ...c('passEpa', 'EPA', 0, '4rem'), render: (r) => (r.passEpa === null ? '—' : signed(r.passEpa, 1)) }] },
  { title: 'Corrida', when: (r) => r.carries > 0, sort: 'rushYds', cols: [player, pos, c('carries', 'Corr.'), c('rushYds', 'Jardas', 0, '4.5rem'), { key: 'ypc', label: 'Y/C', num: true, width: '3.25rem', render: (r) => num(r.rushYds / r.carries, 1), value: (r) => r.rushYds / r.carries }, c('rushTd', 'TD'), c('fumLost', 'FL')] },
  { title: 'Recepção', when: (r) => r.tgt > 0 || r.rec > 0, sort: 'recYds', cols: [player, pos, c('tgt', 'Alvos'), c('rec', 'Rec'), c('recYds', 'Jardas', 0, '4.5rem'), c('recTd', 'TD')] },
  { title: 'Defesa', when: (r) => r.tackles + r.sacks + r.defInt + r.pd > 0, sort: 'tackles', cols: [player, pos, c('tackles', 'Tackles', 0, '4rem'), c('sacks', 'Sacks', 1), c('qbHits', 'QB hits', 0, '4rem'), c('defInt', 'INT'), c('pd', 'PD'), c('ff', 'FF')] },
  { title: 'Chutes', when: (r) => r.fga + r.xpa > 0, sort: 'fgm', cols: [player, c('fgm', 'FGM'), c('fga', 'FGA'), { ...c('fgLong', 'Longo', 0, '4rem'), render: (r) => (r.fgLong ? String(r.fgLong) : '—') }, c('xpm', 'XPM'), c('xpa', 'XPA')] },
  { title: 'Punts', when: (r) => r.punts > 0, sort: 'punts', cols: [player, c('punts', 'Punts'), c('puntYds', 'Jardas', 0, '4.5rem'), { key: 'avg', label: 'Média', num: true, width: '4.5rem', render: (r) => num(r.puntYds / r.punts, 1), value: (r) => r.puntYds / r.punts }] },
  { title: 'Retornos', when: (r) => r.prYds + r.krYds > 0, sort: 'krYds', cols: [player, pos, { ...c('prYds', 'Punt', 0, '5.5rem'), help: 'Jardas em retornos de punt.' }, { ...c('krYds', 'Kickoff', 0, '6rem'), help: 'Jardas em retornos de kickoff.' }] },
];

/** Box score completo (estatísticas individuais por time). */
export function BoxScore({ g, nick }: { g: Game; nick: (t: string) => string }) {
  const played = g.homeScore !== null && g.awayScore !== null;
  const box = useAsync(() => (played ? api.boxScore(g.season, g.week).catch(() => []) : Promise.resolve([])), [g.season, g.week, played]);
  const [side, setSide] = useState<'away' | 'home'>('away');
  if (!played) return null;
  if (box.loading) return <Loading height={200} label="Carregando box score…" />;
  const rows = (box.data ?? []).filter((r) => r.game === g.id);
  if (!rows.length) return null;
  const sides = [
    { key: 'away' as const, team: g.away },
    { key: 'home' as const, team: g.home },
  ];
  return (
    <section className="card">
      <div className="section-title">
        <h2>Box score</h2>
        {/* Em telas largas os dois times aparecem lado a lado; o seletor só existe nas estreitas. */}
        <div className="segmented box-toggle" role="group" aria-label="Time">
          {(['away', 'home'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)}>
              <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <TeamLogo abbr={s === 'away' ? g.away : g.home} size={18} /> {nick(s === 'away' ? g.away : g.home)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack">
        {SECTIONS.map((sec) => {
          const lists = sides.map((s) => rows.filter((r) => r.team === s.team && sec.when(r)).sort((a, b) => ((b[sec.sort] as number) ?? 0) - ((a[sec.sort] as number) ?? 0)));
          if (!lists.some((l) => l.length)) return null;
          // Uma seção por linha, com os dois times lado a lado: as seções ficam alinhadas entre os times.
          return (
            <div key={sec.title}>
              <h3 style={{ fontSize: '0.95rem' }}>{sec.title}</h3>
              <div className="box-pair">
                {sides.map((s, i) => (
                  <div key={s.key} className="box-panel" data-active={side === s.key}>
                    <div className="box-team small">
                      <TeamLogo abbr={s.team} size={18} /> {nick(s.team)}
                    </div>
                    {lists[i].length ? (
                      <DataTable rows={lists[i]} rowKey={(r) => r.id} caption={`${sec.title} — ${nick(s.team)}`} columns={sec.cols} bare />
                    ) : (
                      <p className="small muted">Sem registros.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Fonte: nflverse (estatísticas por jogo, derivadas do play-by-play).
      </p>
    </section>
  );
}
