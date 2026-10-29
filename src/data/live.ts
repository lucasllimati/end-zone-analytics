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

/**
 * Consumo de requisições (o plano grátis do Worker tem 100 mil por dia; ver docs/DEPLOYMENT.md):
 *  - 30 s com jogo em andamento; 5 min fora deles (para perceber o início de um jogo);
 *  - aba oculta não consulta nada; ao voltar, atualiza na hora;
 *  - 30 min sem interação (toque, clique, tecla, rolagem) pausam as atualizações; qualquer
 *    interação, ou o botão "Continuar atualizando", retoma;
 *  - exceção: com o aviso de pontuação ligado, o placar segue (mesmo com a aba oculta) só enquanto o
 *    jogo do time favorito estiver em andamento — o custo fica limitado a esse jogo;
 *  - Game Center aberto antes do jogo confere a cada 5 min e passa a 30 s quando o jogo começa.
 */
export const LIVE_POLL_MS = 30_000;
const IDLE_POLL_MS = 300_000;
export const IDLE_PAUSE_MS = 30 * 60_000;

let lastActivity = Date.now();
let paused = false;
const pausedSubs = new Set<(p: boolean) => void>();
/** Consultas interrompidas (aba oculta ou inatividade), retomadas na próxima interação. */
const halted = new Set<() => void>();

function setPaused(p: boolean) {
  if (p === paused) return;
  paused = p;
  for (const f of pausedSubs) f(p);
}

/** Registra atividade e retoma o que estava parado. */
export function resumeLive() {
  lastActivity = Date.now();
  setPaused(false);
  const fns = [...halted];
  halted.clear();
  for (const f of fns) f();
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) window.addEventListener(ev, resumeLive, { passive: true });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && resumeLive());
}

/** Pode consultar agora? Se não, guarda `restart` para quando o visitante voltar. */
function mayFetch(restart: () => void, keepAlive = false): boolean {
  if (keepAlive) return true;
  if (document.visibilityState === 'hidden') {
    halted.add(restart);
    return false;
  }
  if (Date.now() - lastActivity > IDLE_PAUSE_MS) {
    setPaused(true);
    halted.add(restart);
    return false;
  }
  return true;
}

/** true quando as atualizações ao vivo estão pausadas por inatividade. */
export function useLivePaused(): boolean {
  const [p, setP] = useState(paused);
  useEffect(() => {
    pausedSubs.add(setP);
    setP(paused);
    return () => void pausedSubs.delete(setP);
  }, []);
  return p;
}

/*
 * Um único consultor do placar para a página inteira: a home, o "Meu time" e o aviso de pontuação
 * compartilham a mesma requisição.
 */
type Listener = (m: Map<string, LiveOverlay>) => void;
const listeners = new Set<Listener>();
let last = new Map<string, LiveOverlay>();
/** Assinatura do último placar: só avisa quem ouve quando algo mudou de fato (evita recalcular à toa). */
let lastSig = '';
let timer: number | undefined;
let running = false;
/** Time cujo jogo ao vivo mantém o placar atualizando em segundo plano (aviso de pontuação ligado). */
let watchedTeam: string | null = null;

const watchedGameLive = () => Boolean(watchedTeam) && [...last.entries()].some(([k, v]) => v.state === 'in' && k.split('@').includes(watchedTeam!));

/** Liga (ou desliga, com null) o acompanhamento em segundo plano do jogo de um time. */
export function watchTeamInBackground(team: string | null) {
  watchedTeam = team;
}

async function poll() {
  window.clearTimeout(timer);
  if (!listeners.size || !mayFetch(poll, watchedGameLive())) {
    running = false;
    return;
  }
  running = true;
  const sb = await apiGet<LiveScoreboard>('/api/live/scoreboard');
  if (sb) {
    const m = new Map<string, LiveOverlay>();
    for (const g of sb.games) {
      const home = g.teams.find((t) => t.side === 'home');
      const away = g.teams.find((t) => t.side === 'away');
      if (!home || !away) continue;
      m.set(`${fromEspn(away.abbr)}@${fromEspn(home.abbr)}`, { state: g.state, detail: g.detail, home: home.score, away: away.score });
    }
    const sig = JSON.stringify([...m.entries()]);
    if (sig !== lastSig) {
      lastSig = sig;
      last = m;
      for (const l of listeners) l(m);
    }
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
    return () => {
      listeners.delete(setMap);
      if (!listeners.size) {
        window.clearTimeout(timer);
        halted.delete(poll);
        running = false;
      }
    };
  }, [enabled]);
  return map;
}

/**
 * Detalhes de um jogo (Game Center). Com o jogo em andamento, atualiza a cada 30 s sem piscar a tela
 * (antes do jogo, a cada 5 min):
 * os dados atuais ficam visíveis até a resposta nova chegar. Segue as mesmas pausas do placar.
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
    const load = async (first = false) => {
      window.clearTimeout(timer);
      // A primeira carga sempre acontece; as atualizações respeitam aba oculta e inatividade.
      if (!alive || (!first && !mayFetch(load))) return;
      const d = await apiGet<T>(`/api/live/game/${espnId}`);
      if (!alive) return;
      if (d) lastState = d.state;
      setState((s) => ({ data: d ?? s.data, loading: false, updatedAt: d ? Date.now() : s.updatedAt }));
      // Uma falha no meio do jogo não interrompe: tenta de novo no próximo ciclo.
      // Antes do jogo, confere a cada 5 min: quem abriu a prévia vê o jogo começar sem recarregar.
      if (lastState === 'in') timer = window.setTimeout(load, LIVE_POLL_MS);
      else if (lastState === 'pre') timer = window.setTimeout(load, IDLE_POLL_MS);
    };
    void load(true);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      halted.delete(load);
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
