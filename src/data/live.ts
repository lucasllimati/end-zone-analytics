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

/** Intervalos: 20 s com jogo em andamento; 5 min fora deles (para perceber o início de um jogo). */
export const LIVE_POLL_MS = 20_000;
const IDLE_POLL_MS = 300_000;

/*
 * Um único consultor do placar para a página inteira: a home, o "Meu time" e o aviso de pontuação
 * compartilham a mesma requisição. Só consulta enquanto houver alguém inscrito e a aba estiver visível.
 */
type Listener = (m: Map<string, LiveOverlay>) => void;
const listeners = new Set<Listener>();
let last = new Map<string, LiveOverlay>();
let timer: number | undefined;
let running = false;

async function poll() {
  running = true;
  window.clearTimeout(timer);
  const sb = document.visibilityState === 'hidden' && last.size ? null : await apiGet<LiveScoreboard>('/api/live/scoreboard');
  if (sb) {
    const m = new Map<string, LiveOverlay>();
    for (const g of sb.games) {
      const home = g.teams.find((t) => t.side === 'home');
      const away = g.teams.find((t) => t.side === 'away');
      if (!home || !away) continue;
      m.set(`${fromEspn(away.abbr)}@${fromEspn(home.abbr)}`, { state: g.state, detail: g.detail, home: home.score, away: away.score });
    }
    last = m;
    for (const l of listeners) l(m);
  }
  const anyLive = [...last.values()].some((v) => v.state === 'in');
  running = listeners.size > 0;
  if (running) timer = window.setTimeout(poll, anyLive ? LIVE_POLL_MS : IDLE_POLL_MS);
}

/** Placar ao vivo (via API), por "visitante@mandante". Vazio na hospedagem sem API ou fora de dia de jogo. */
export function useLiveScores(enabled = true): Map<string, LiveOverlay> {
  const [map, setMap] = useState<Map<string, LiveOverlay>>(last);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setMap);
    setMap(last);
    if (!running) void poll();
    // Ao voltar para a aba, atualiza na hora (o navegador atrasa temporizadores em abas ocultas).
    const onVisible = () => document.visibilityState === 'visible' && void poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      listeners.delete(setMap);
      document.removeEventListener('visibilitychange', onVisible);
      if (!listeners.size) {
        window.clearTimeout(timer);
        running = false;
      }
    };
  }, [enabled]);
  return map;
}

/**
 * Detalhes de um jogo (Game Center). Com o jogo em andamento, atualiza a cada 20 s sem piscar a tela:
 * os dados atuais ficam visíveis até a resposta nova chegar.
 */
export function useGameDetail<T extends { state: string }>(espnId: string | null | undefined): { data: T | null; loading: boolean; updatedAt: number | null } {
  const [state, setState] = useState<{ data: T | null; loading: boolean; updatedAt: number | null }>({ data: null, loading: Boolean(espnId), updatedAt: null });
  useEffect(() => {
    if (!espnId) {
      setState({ data: null, loading: false, updatedAt: null });
      return;
    }
    let alive = true;
    let timer: number | undefined;
    let lastState = '';
    setState({ data: null, loading: true, updatedAt: null });
    const load = async () => {
      const d = await apiGet<T>(`/api/live/game/${espnId}`);
      if (!alive) return;
      if (d) lastState = d.state;
      setState((s) => ({ data: d ?? s.data, loading: false, updatedAt: d ? Date.now() : s.updatedAt }));
      // Uma falha no meio do jogo não interrompe: tenta de novo no próximo ciclo.
      if (lastState === 'in') timer = window.setTimeout(load, LIVE_POLL_MS);
    };
    void load();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [espnId]);
  return state;
}

/**
 * Jogos encerrados no placar ao vivo, mas ainda sem resultado na base (o nflverse atualiza depois):
 * aplica o placar final para classificação, simulador e "Meu time" não tratarem o jogo como pendente.
 */
export function withLiveFinals<G extends { away: string; home: string; homeScore: number | null; awayScore: number | null }>(games: G[], live: Map<string, LiveOverlay>): G[] {
  if (!live.size) return games;
  let changed = false;
  const out = games.map((g) => {
    if (g.homeScore !== null) return g;
    const l = live.get(`${g.away}@${g.home}`);
    if (l?.state !== 'post' || l.home === null || l.away === null) return g;
    changed = true;
    return { ...g, homeScore: l.home, awayScore: l.away };
  });
  return changed ? out : games;
}
