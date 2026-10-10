import { Link } from 'react-router-dom';
import type { Game } from '../lib/types';
import { TeamLogo, TeamName } from './TeamLogo';
import { dateBR, weekdayPt } from '../lib/format';
import { GAME_TYPE_LABEL } from '../lib/teams';

export interface LiveOverlay {
  state: 'pre' | 'in' | 'post';
  detail: string;
  home: number | null;
  away: number | null;
}

/** Card de placar. Mostra "AO VIVO" quando há dados ao vivo da API. */
export function GameCard({ g, live }: { g: Game; live?: LiveOverlay }) {
  const hs = live?.state === 'in' || live?.state === 'post' ? live.home : g.homeScore;
  const as = live?.state === 'in' || live?.state === 'post' ? live.away : g.awayScore;
  const played = hs !== null && as !== null;
  const homeWin = played && hs! > as!;
  const awayWin = played && as! > hs!;
  const status = live?.state === 'in' ? (
    <span className="badge live">AO VIVO · {live.detail}</span>
  ) : played ? (
    <span>Final{g.ot ? ' (prorrogação)' : ''}</span>
  ) : (
    <span>
      {g.weekday ? `${weekdayPt(g.weekday)} · ` : ''}
      {g.time ? `${g.time} ET` : 'horário a definir'}
    </span>
  );
  return (
    <Link to={`/games/${g.id}`} className="score-card" aria-label={`${g.away} ${as ?? ''} em ${g.home} ${hs ?? ''}`}>
      <div className="meta">
        <span>
          {g.type === 'REG' ? `Semana ${g.week}` : GAME_TYPE_LABEL[g.type]} · {dateBR(g.date, { day: '2-digit', month: 'short' })}
        </span>
        {status}
      </div>
      <div className={`score-line${played && !awayWin ? ' loser' : ''}`}>
        <TeamLogo abbr={g.away} size={22} />
        <span>
          <TeamName abbr={g.away} short />
        </span>
        <span className="pts">{as ?? ''}</span>
      </div>
      <div className={`score-line${played && !homeWin ? ' loser' : ''}`}>
        <TeamLogo abbr={g.home} size={22} />
        <span>
          <TeamName abbr={g.home} short />
          {g.neutral ? <span className="xsmall muted"> (campo neutro)</span> : null}
        </span>
        <span className="pts">{hs ?? ''}</span>
      </div>
    </Link>
  );
}
