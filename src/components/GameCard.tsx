import { Link } from 'react-router-dom';
import type { Game } from '../lib/types';
import { TeamLogo, TeamName } from './TeamLogo';
import { dateBR, kickoffInstant, kickoffLocal, weekdayPt } from '../lib/format';
import { GAME_TYPE_LABEL } from '../lib/teams';
import { ChevronRight } from './Icons';

export interface LiveOverlay {
  state: 'pre' | 'in' | 'post';
  detail: string;
  home: number | null;
  away: number | null;
}

export type GameStatus = 'live' | 'halftime' | 'final' | 'scheduled' | 'postponed' | 'canceled' | 'unknown';

/**
 * Estado do jogo. "Ao vivo" só com confirmação da fonte ao vivo (ESPN) — nunca pela data.
 * Jogo passado sem placar na base = resultado indisponível (não é tratado como 0 × 0).
 */
export function gameStatus(g: Game, live?: LiveOverlay, now = Date.now()): GameStatus {
  if (live && /postpon|adiad/i.test(live.detail)) return 'postponed';
  if (live && /cancel/i.test(live.detail)) return 'canceled';
  if (live?.state === 'in') return /half/i.test(live.detail) ? 'halftime' : 'live';
  const hs = live?.state === 'post' ? live.home : g.homeScore;
  const as = live?.state === 'post' ? live.away : g.awayScore;
  if (hs !== null && as !== null) return 'final';
  const start = kickoffInstant(g.date, g.time)?.getTime() ?? Date.parse(`${g.date}T23:59:00Z`);
  // Mais de 6 h após o horário previsto e sem placar: a fonte ainda não informou o resultado.
  if (Number.isFinite(start) && now - start > 6 * 3_600_000) return 'unknown';
  return 'scheduled';
}

const STATUS_LABEL: Record<GameStatus, string> = {
  live: 'Ao vivo',
  halftime: 'Intervalo',
  final: 'Finalizado',
  scheduled: 'Agendado',
  postponed: 'Adiado',
  canceled: 'Cancelado',
  unknown: 'Resultado indisponível',
};

export function StatusBadge({ status, detail }: { status: GameStatus; detail?: string }) {
  const cls = status === 'live' || status === 'halftime' ? 'live' : status === 'final' ? 'final' : status === 'postponed' || status === 'canceled' ? 'warn' : '';
  return (
    <span className={`badge ${cls}`}>
      {STATUS_LABEL[status]}
      {status === 'live' && detail ? ` · ${detail}` : ''}
    </span>
  );
}

function scores(g: Game, live?: LiveOverlay) {
  const useLive = live?.state === 'in' || live?.state === 'post';
  return { hs: useLive ? live!.home : g.homeScore, as: useLive ? live!.away : g.awayScore };
}

function ariaLabel(g: Game, status: GameStatus, hs: number | null, as: number | null) {
  const score = hs !== null && as !== null ? ` ${as} a ${hs}` : '';
  return `${g.away} em ${g.home}${score} — ${STATUS_LABEL[status]}`;
}

/** Card compacto de placar (calendário, páginas de time). */
export function GameCard({ g, live }: { g: Game; live?: LiveOverlay }) {
  const { hs, as } = scores(g, live);
  const status = gameStatus(g, live);
  const played = hs !== null && as !== null;
  const homeWin = played && hs! > as!;
  const awayWin = played && as! > hs!;
  const local = kickoffLocal(g.date, g.time);
  const right =
    status === 'scheduled' ? (
      <span title={g.time ? `${g.time} no horário do Leste dos EUA` : undefined}>
        {g.weekday ? `${weekdayPt(g.weekday)} · ` : ''}
        {local ?? 'horário a definir'}
      </span>
    ) : (
      <StatusBadge status={status} detail={live?.detail} />
    );
  return (
    <Link to={`/games/${g.id}`} className="score-card" aria-label={ariaLabel(g, status, hs, as)}>
      <div className="meta">
        <span>
          {g.type === 'REG' ? `Semana ${g.week}` : GAME_TYPE_LABEL[g.type]} · {dateBR(g.date, { day: '2-digit', month: 'short' })}
          {status === 'final' && g.ot ? ' · prorrogação' : ''}
        </span>
        {right}
      </div>
      <div className={`score-line${played && !awayWin ? ' loser' : ''}`}>
        <TeamLogo abbr={g.away} size={24} />
        <span>
          <TeamName abbr={g.away} short />
        </span>
        <span className="pts">{as ?? ''}</span>
      </div>
      <div className={`score-line${played && !homeWin ? ' loser' : ''}`}>
        <TeamLogo abbr={g.home} size={24} />
        <span>
          <TeamName abbr={g.home} short />
          {g.neutral ? <span className="xsmall muted"> (campo neutro)</span> : null}
        </span>
        <span className="pts">{hs ?? ''}</span>
      </div>
    </Link>
  );
}

/** Card de destaque da página inicial: logos grandes, placar central e estado da partida. */
export function GameTile({ g, live }: { g: Game; live?: LiveOverlay }) {
  const { hs, as } = scores(g, live);
  const status = gameStatus(g, live);
  const played = hs !== null && as !== null;
  const local = kickoffLocal(g.date, g.time);
  const isLive = status === 'live' || status === 'halftime';
  return (
    <Link to={`/games/${g.id}`} className={`game-tile${isLive ? ' is-live' : ''}`} aria-label={ariaLabel(g, status, hs, as)}>
      <div className="game-tile-meta">
        {status === 'scheduled' ? <span className="badge">{STATUS_LABEL.scheduled}</span> : <StatusBadge status={status} detail={live?.detail} />}
        {!isLive && (
          <span className="game-tile-when">
            {dateBR(g.date, { weekday: 'short', day: '2-digit', month: 'short' })}
            {status === 'scheduled' && <> · {local ?? 'horário a definir'}</>}
          </span>
        )}
      </div>
      <div className="game-tile-teams">
        <span className={`game-tile-team${played && as! < hs! ? ' loser' : ''}`}>
          <TeamLogo abbr={g.away} size={46} />
          <span className="game-tile-name">
            <TeamName abbr={g.away} short />
          </span>
        </span>
        <span className="game-tile-score" aria-hidden="true">
          {played ? (
            <>
              <span className={as! < hs! ? 'loser' : ''}>{as}</span>
              <span className="sep">–</span>
              <span className={hs! < as! ? 'loser' : ''}>{hs}</span>
            </>
          ) : (
            <span className="vs">×</span>
          )}
        </span>
        <span className={`game-tile-team${played && hs! < as! ? ' loser' : ''}`}>
          <TeamLogo abbr={g.home} size={46} />
          <span className="game-tile-name">
            <TeamName abbr={g.home} short />
          </span>
        </span>
      </div>
      <div className="game-tile-foot">
        <span>{g.type === 'REG' ? (g.divGame ? 'Jogo de divisão' : g.neutral ? 'Campo neutro' : 'Temporada regular') : GAME_TYPE_LABEL[g.type]}</span>
        {status === 'final' && g.ot ? <span>Prorrogação</span> : null}
        <span className="game-tile-go" aria-hidden="true">
          <ChevronRight />
        </span>
      </div>
    </Link>
  );
}
