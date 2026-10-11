import { useEffect, useState } from 'react';
import { apiGet } from './client';
import type { LiveOverlay } from '../components/GameCard';

interface LiveScoreboard {
  week: number | null;
  season: number | null;
  games: { id: string; state: 'pre' | 'in' | 'post'; detail: string; teams: { side: 'home' | 'away'; abbr: string; score: number | null }[] }[];
}

/** Abreviações da ESPN → nflverse. */
const ESPN_TO_NFLVERSE: Record<string, string> = { WSH: 'WAS', LAR: 'LA' };
export const fromEspn = (a: string) => ESPN_TO_NFLVERSE[a] ?? a;

/** Placar ao vivo (via API). Atualiza a cada 60 s enquanto houver jogo em andamento. */
export function useLiveScores(): Map<string, LiveOverlay> {
  const [map, setMap] = useState<Map<string, LiveOverlay>>(new Map());
  useEffect(() => {
    let timer: number | undefined;
    let alive = true;
    const load = async () => {
      const sb = await apiGet<LiveScoreboard>('/api/live/scoreboard');
      if (!alive || !sb) return;
      const m = new Map<string, LiveOverlay>();
      for (const g of sb.games) {
        const home = g.teams.find((t) => t.side === 'home');
        const away = g.teams.find((t) => t.side === 'away');
        if (!home || !away) continue;
        m.set(`${fromEspn(away.abbr)}@${fromEspn(home.abbr)}`, { state: g.state, detail: g.detail, home: home.score, away: away.score });
      }
      setMap(m);
      if ([...m.values()].some((v) => v.state === 'in')) timer = window.setTimeout(load, 60_000);
    };
    void load();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);
  return map;
}
