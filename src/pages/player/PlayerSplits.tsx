/**
 * Recortes do jogador (casa/fora, vitórias/derrotas, fase), desempenho contra cada adversário e
 * recordes pessoais em um jogo. Tudo a partir do jogo a jogo (estatísticas semanais do nflverse).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StatTile } from '../../components/Bits';
import { DataTable, type Column } from '../../components/DataTable';
import { Loading, Unavailable } from '../../components/States';
import { TeamLogo } from '../../components/TeamLogo';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { num } from '../../lib/format';
import { positionBucket } from '../../lib/stats';
import { franchiseOf } from '../../lib/teams';
import type { PlayerGameLine } from '../../lib/types';
import { resultOf } from './PlayerSections';

type Log = Omit<PlayerGameLine, 'id' | 'name' | 'pos'>;

/** Estatísticas por posição usadas nas divisões e nos recordes pessoais. */
function splitStats(pos: string): { key: keyof Log; label: string; digits?: number }[] {
  const b = positionBucket(pos);
  if (b === 'QB') return [{ key: 'passYds', label: 'Jardas de passe' }, { key: 'passTd', label: 'TD de passe' }, { key: 'int', label: 'Interceptações' }, { key: 'rushYds', label: 'Jardas corridas' }];
  if (b === 'RB') return [{ key: 'carries', label: 'Corridas' }, { key: 'rushYds', label: 'Jardas corridas' }, { key: 'rushTd', label: 'TD corridos' }, { key: 'rec', label: 'Recepções' }, { key: 'recYds', label: 'Jardas recebidas' }];
  if (b === 'WR' || b === 'TE') return [{ key: 'tgt', label: 'Alvos' }, { key: 'rec', label: 'Recepções' }, { key: 'recYds', label: 'Jardas recebidas' }, { key: 'recTd', label: 'TD recebidos' }];
  if (b === 'K') return [{ key: 'fgm', label: 'Field goals' }, { key: 'fga', label: 'Tentativas de FG' }, { key: 'xpm', label: 'Pontos extras' }];
  if (b === 'P') return [{ key: 'punts', label: 'Punts' }, { key: 'puntYds', label: 'Jardas de punt' }];
  return [{ key: 'tackles', label: 'Tackles' }, { key: 'sacks', label: 'Sacks', digits: 1 }, { key: 'qbHits', label: 'QB hits' }, { key: 'defInt', label: 'Interceptações' }];
}

interface SplitRow {
  key: string;
  label: ReactNode;
  games: Log[];
  wins: number;
  losses: number;
}

export function PlayerSplits({ id, name, pos }: { id: string; name: string; pos: string }) {
  const log = useAsync(() => api.gameLog(id), [id]);
  const games = useAsync(() => api.allGames(), []);
  const byId = useMemo(() => new Map((games.data ?? []).map((g) => [g.id, g])), [games.data]);
  const seasons = useMemo(() => [...new Set((log.data ?? []).map((l) => l.season))].sort((a, b) => b - a), [log.data]);
  const [season, setSeason] = useState(0);
  if (log.loading || games.loading) return <Loading height={200} label="Calculando recortes…" />;
  if (!log.data?.length) return <Unavailable>Sem estatísticas por jogo para este jogador.</Unavailable>;

  const all = season ? log.data.filter((l) => l.season === season) : log.data;
  const stats = splitStats(pos);
  const res = (l: Log) => resultOf(byId.get(l.game), l.team);
  const make = (key: string, label: ReactNode, list: Log[]): SplitRow => ({
    key,
    label,
    games: list,
    wins: list.filter((l) => res(l)?.res === 'V').length,
    losses: list.filter((l) => res(l)?.res === 'D').length,
  });
  const splits = [
    make('home', 'Em casa', all.filter((l) => res(l)?.home === true)),
    make('away', 'Fora de casa', all.filter((l) => res(l)?.home === false)),
    make('win', 'Em vitórias', all.filter((l) => res(l)?.res === 'V')),
    make('loss', 'Em derrotas', all.filter((l) => res(l)?.res === 'D')),
    make('reg', 'Temporada regular', all.filter((l) => l.st === 'REG')),
    make('post', 'Playoffs', all.filter((l) => l.st === 'POST')),
  ].filter((r) => r.games.length);
  const opps = [...new Set(all.map((l) => franchiseOf(l.opp)))].map((o) =>
    make(
      o,
      <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
        <TeamLogo abbr={o} size={18} /> {o}
      </span>,
      all.filter((l) => franchiseOf(l.opp) === o),
    ),
  );
  const avg = (r: SplitRow, k: keyof Log) => r.games.reduce((s, l) => s + ((l[k] as number) ?? 0), 0) / r.games.length;
  const cols: Column<SplitRow>[] = [
    { key: 'games', label: 'J', num: true, width: '3.5rem', render: (r) => r.games.length, value: (r) => r.games.length },
    { key: 'wl', label: 'V-D', width: '5rem', render: (r) => `${r.wins}-${r.losses}`, value: (r) => r.wins / Math.max(1, r.wins + r.losses) },
    ...stats.map((s): Column<SplitRow> => ({ key: s.key as string, label: `${s.label}/jogo`, num: true, render: (r) => num(avg(r, s.key), 1), value: (r) => avg(r, s.key) })),
    { key: 'fpts', label: 'Fantasy/jogo', num: true, help: 'Pontos de fantasy (PPR) por jogo.', render: (r) => num(avg(r, 'fptsPpr'), 1), value: (r) => avg(r, 'fptsPpr') },
  ];
  // Recordes pessoais: o melhor jogo da carreira em cada estatística (com link para o jogo).
  const records = stats.map((s) => ({ s, best: log.data!.reduce((m, l) => (((l[s.key] as number) ?? 0) > ((m[s.key] as number) ?? 0) ? l : m), log.data![0]) }));
  const scope = season ? `em ${season}` : 'na carreira';

  return (
    <div className="stack">
      <div className="section-title">
        <h2>Recortes e recordes</h2>
        <label className="field">
          Período
          <select className="select" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            <option value={0}>Carreira</option>
            {seasons.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="card">
        <h3>Recortes {scope}</h3>
        <p className="small text-2">Casa, fora, vitórias e derrotas incluem os jogos de playoffs; as duas últimas linhas separam temporada regular e playoffs.</p>
        <DataTable rows={splits} rowKey={(r) => r.key} caption={`Recortes de ${name} ${scope}`} columns={[{ key: 'label', label: 'Situação', render: (r) => r.label, sortable: false }, ...cols]} bare />
      </section>
      <section className="card">
        <h3>Contra cada adversário {scope}</h3>
        <DataTable
          rows={opps}
          rowKey={(r) => r.key}
          caption={`${name} contra cada adversário ${scope}`}
          initialSort={{ key: 'games', dir: 'desc' }}
          pageSize={12}
          columns={[{ key: 'opp', label: 'Adversário', render: (r) => r.label, value: (r) => r.key }, ...cols]}
          bare
        />
      </section>
      <section className="card">
        <h3>Recordes pessoais em um jogo (carreira)</h3>
        <div className="tiles">
          {records.map(({ s, best }) => {
            const r = resultOf(byId.get(best.game), best.team);
            return (
              <StatTile
                key={s.key as string}
                label={s.label}
                value={num(best[s.key] as number, s.digits ?? 0)}
                note={
                  <Link to={`/games/${best.game}`}>
                    {r?.home === false ? '@' : 'vs'} {best.opp} · {best.season}, {best.st === 'POST' ? 'playoffs' : `sem. ${best.week}`}
                  </Link>
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
