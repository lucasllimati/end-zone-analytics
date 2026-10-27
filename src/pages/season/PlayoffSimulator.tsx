/**
 * Simulador de playoffs da temporada atual: chances de cada time (Monte Carlo com os desempates oficiais),
 * classificação "se a temporada acabasse hoje" e "e se?" — o usuário escolhe vencedores dos jogos restantes.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, ModeNote } from '../../components/Bits';
import { DataTable, type Column } from '../../components/DataTable';
import { TeamChip, TeamLogo } from '../../components/TeamLogo';
import { useTeams } from '../../data/hooks';
import { homeWinProb, seedPlayoffs, simulate, Table, wildcardsFor, type Outcome, type Pending, type Result, type SimOdds, type TeamInfo } from '../../lib/playoffs';
import { fmtRecord } from '../../lib/standings';
import { franchiseOf } from '../../lib/teams';
import type { Game, StandingRow } from '../../lib/types';

const SIMS = 2000;
const CHUNKS = 4;

const pct = (v: number) => (v >= 0.995 && v < 1 ? '>99%' : v > 0 && v < 0.005 ? '<1%' : `${Math.round(v * 100)}%`);

/** Monta os insumos da simulação a partir dos jogos da temporada. */
export function simInputs(games: Game[], standings: StandingRow[]) {
  const info = new Map<string, TeamInfo>(standings.map((s) => [s.team, { team: s.team, conf: s.conf, division: s.division }]));
  const reg = games.filter((g) => g.type === 'REG');
  const played: Result[] = reg
    .filter((g) => g.homeScore !== null && g.awayScore !== null)
    .map((g) => ({ home: franchiseOf(g.home), away: franchiseOf(g.away), r: g.homeScore! > g.awayScore! ? 'H' : g.homeScore! < g.awayScore! ? 'A' : 'T' }));
  const perGame = new Map(standings.map((s) => [s.team, s.gamesPlayed ? s.diff / s.gamesPlayed : 0]));
  const pending: Pending[] = reg
    .filter((g) => g.homeScore === null)
    .map((g) => ({ id: g.id, week: g.week, home: franchiseOf(g.home), away: franchiseOf(g.away), pHome: homeWinProb(g.spread, perGame.get(franchiseOf(g.home)) ?? 0, perGame.get(franchiseOf(g.away)) ?? 0) }));
  return { info, played, pending, net: new Map(standings.map((s) => [s.team, s.diff])) };
}

export function PlayoffSimulator({ games, season, standings }: { games: Game[]; season: number; standings: StandingRow[] }) {
  const { info, played, pending, net } = useMemo(() => simInputs(games, standings), [games, standings]);
  const wildcards = wildcardsFor(season);
  const [forced, setForced] = useState<Record<string, Outcome>>({});
  const [odds, setOdds] = useState<SimOdds[] | null>(null);
  // Chances sem nenhuma escolha: referência para mostrar quanto cada "e se?" mudou.
  const [baseline, setBaseline] = useState<Map<string, number> | null>(null);
  const [progress, setProgress] = useState(0);
  const weeks = [...new Set(pending.map((g) => g.week))].sort((a, b) => a - b);
  const [week, setWeek] = useState(weeks[0]);
  const { map } = useTeams();

  // Simula em partes, cedendo a vez ao navegador entre elas: a página não trava e o progresso aparece.
  useEffect(() => {
    let cancelled = false;
    setProgress(0);
    const parts: SimOdds[][] = [];
    const run = (i: number) => {
      if (cancelled) return;
      parts.push(simulate(played, pending, forced, info, net, SIMS / CHUNKS, wildcards, i + 1));
      setProgress((i + 1) / CHUNKS);
      if (i + 1 < CHUNKS) window.setTimeout(() => run(i + 1), 0);
      else {
        const merged = parts[0].map((o, k) => {
          const avg = (f: (x: SimOdds) => number) => parts.reduce((s, p) => s + f(p[k]), 0) / parts.length;
          return { team: o.team, playoffs: avg((x) => x.playoffs), division: avg((x) => x.division), bye: avg((x) => x.bye), seeds: o.seeds.map((_, j) => avg((x) => x.seeds[j])) };
        });
        setOdds(merged);
        if (!Object.keys(forced).length) setBaseline(new Map(merged.map((o) => [o.team, o.playoffs])));
      }
    };
    const t = window.setTimeout(() => run(0), 30);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [played, pending, forced, info, net, wildcards]);

  const today = useMemo(() => seedPlayoffs(new Table(played, info, net), info, wildcards), [played, info, net, wildcards]);
  const rec = (t: string) => standings.find((s) => s.team === t);
  const nick = (t: string) => map.get(t)?.nick ?? t;
  const picks = Object.keys(forced).length;

  const cols: Column<SimOdds>[] = [
    { key: 'team', label: 'Time', render: (r) => <TeamChip abbr={r.team} short size={20} />, value: (r) => r.team },
    {
      key: 'playoffs',
      label: 'Playoffs',
      num: true,
      width: '8rem',
      help: 'Chance de terminar entre os classificados da conferência. Com escolhas no “E se?”, mostra também a mudança em pontos percentuais.',
      render: (r) => {
        const delta = picks && baseline?.has(r.team) ? Math.round((r.playoffs - baseline.get(r.team)!) * 100) : 0;
        return (
          <>
            {pct(r.playoffs)}
            {delta !== 0 && <span className={`xsmall ${delta > 0 ? 'good' : 'bad'}`}> {delta > 0 ? '+' : '−'}{Math.abs(delta)} p.p.</span>}
          </>
        );
      },
      value: (r) => r.playoffs,
    },
    { key: 'division', label: 'Divisão', num: true, width: '6rem', help: 'Chance de vencer a divisão (seeds 1 a 4).', render: (r) => pct(r.division), value: (r) => r.division },
    { key: 'bye', label: 'Folga', num: true, width: '5.5rem', help: wildcards === 3 ? 'Chance de ser o seed 1: folga na 1ª rodada e mando de campo até a final da conferência.' : 'Chance de ser seed 1 ou 2 (folga na 1ª rodada).', render: (r) => pct(r.bye), value: (r) => r.bye },
    { key: 'rec', label: 'Campanha', width: '6.5rem', render: (r) => (rec(r.team) ? fmtRecord(rec(r.team)!) : '—'), value: (r) => rec(r.team)?.pct ?? 0 },
  ];

  return (
    <div className="stack">
      <Callout title="Como funciona">
        Cada jogo que falta é sorteado {SIMS.toLocaleString('pt-BR')} vezes, com a chance de vitória vinda da linha de aposta (ou, sem linha, do saldo de pontos de cada time). A classificação de cada
        temporada simulada usa os <strong>critérios oficiais de desempate</strong> da NFL. Escolha vencedores em “E se?” para ver como as chances mudam.
      </Callout>

      <div className="grid grid-2">
        {(['AFC', 'NFC'] as const).map((conf) => [conf, today.seeds[conf] ?? []] as const).map(([conf, seeds]) => (
          <section key={conf} className="card">
            <h2>{conf}: se a temporada acabasse hoje</h2>
            <ol className="seed-list">
              {seeds.map((t, i) => (
                <li key={t}>
                  <span className="seed-n">{i + 1}</span>
                  <TeamChip abbr={t} size={20} />
                  <span className="small muted">
                    {rec(t) ? fmtRecord(rec(t)!) : ''} · {i < 4 ? 'campeão de divisão' : 'wild card'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="grid grid-2">
        {['AFC', 'NFC'].map((conf) => (
          <section key={conf} className="card">
            <div className="section-title">
              <h2>{conf}: chances</h2>
              {progress < 1 && (
                <span className="small muted" aria-live="polite">
                  Simulando… {Math.round(progress * 100)}%
                </span>
              )}
            </div>
            {odds && (
              <DataTable
                rows={odds.filter((o) => info.get(o.team)?.conf === conf)}
                rowKey={(r) => r.team}
                caption={`Chances de playoffs na ${conf}`}
                initialSort={{ key: 'playoffs', dir: 'desc' }}
                columns={cols}
                bare
              />
            )}
          </section>
        ))}
      </div>

      {pending.length > 0 && (
        <section className="card">
          <div className="section-title">
            <h2>E se?</h2>
            <div className="row" style={{ gap: 8 }}>
              {picks > 0 && (
                <button type="button" className="btn sm" onClick={() => setForced({})}>
                  Limpar {picks} escolha{picks > 1 ? 's' : ''}
                </button>
              )}
              <label className="field" style={{ minWidth: 150 }}>
                <span className="sr-only">Semana</span>
                <select className="select" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
                  {weeks.map((w) => (
                    <option key={w} value={w}>
                      Semana {w}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <p className="small text-2">Escolha quem vence. “Auto” deixa o jogo para o sorteio, com a chance mostrada.</p>
          <ul className="whatif-list">
            {pending
              .filter((g) => g.week === week)
              .map((g) => (
                <li key={g.id}>
                  <div className="segmented" role="group" aria-label={`${nick(g.away)} × ${nick(g.home)}`}>
                    {(
                      [
                        ['A', g.away, `${nick(g.away)} vence`],
                        [null, null, 'Sorteio pela chance'],
                        ['H', g.home, `${nick(g.home)} vence`],
                      ] as const
                    ).map(([o, t, label]) => (
                      <button
                        key={o ?? 'auto'}
                        type="button"
                        className={o ? 'pick' : 'auto'}
                        aria-pressed={(forced[g.id] ?? null) === o}
                        aria-label={label}
                        onClick={() =>
                          setForced((f) => {
                            const next = { ...f };
                            if (o) next[g.id] = o;
                            else delete next[g.id];
                            return next;
                          })
                        }
                      >
                        {t ? (
                          <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <TeamLogo abbr={t} size={18} /> {nick(t)}
                          </span>
                        ) : (
                          <span className="auto-label">
                            Auto
                            <span className="xsmall">
                              {pct(1 - g.pHome)} × {pct(g.pHome)}
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Link className="small" to={`/games/${g.id}`}>
                    Jogo
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
      <ModeNote
        beginner={<>Os 7 melhores de cada conferência vão aos playoffs: os 4 campeões de divisão e 3 “wild cards”, os melhores entre os demais.</>}
        expert={
          <>
            Desempate na divisão: confronto direto, divisão, adversários comuns, conferência, força das vitórias e da tabela. Wild card: o melhor de cada divisão segue; confronto direto só com
            varrida; adversários comuns exige 4 jogos. Conferido com os playoffs reais de 2002–2025.
          </>
        }
      />
    </div>
  );
}
