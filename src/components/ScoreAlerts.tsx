/**
 * Aviso do navegador quando o time favorito pontua (opt-in em "Meu time"). Funciona com o site aberto
 * em qualquer aba; usa o placar compartilhado (data/live.ts), sem servidor de notificações.
 */
import { useEffect, useRef } from 'react';
import { useFavoriteTeam, useScoreAlerts } from '../data/favorite';
import { useLiveScores } from '../data/live';
import { useTeams } from '../data/hooks';

async function notify(title: string, body: string, tag: string) {
  const opts = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  try {
    // Com o app instalado (PWA), a notificação sai pelo service worker (exigido no Android).
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* sem permissão ou sem suporte: nada a fazer */
  }
}

export function ScoreAlerts() {
  const [team] = useFavoriteTeam();
  const [on] = useScoreAlerts();
  const live = useLiveScores(Boolean(on && team));
  const { map } = useTeams();
  const seen = useRef(new Map<string, number>());

  useEffect(() => {
    if (!on || !team) return;
    for (const [key, g] of live) {
      const [away, home] = key.split('@');
      if (away !== team && home !== team) continue;
      const score = (home === team ? g.home : g.away) ?? 0;
      const before = seen.current.get(key);
      seen.current.set(key, score);
      // A primeira leitura só registra o placar (não avisa pontos marcados antes de abrir o site).
      if (before === undefined || score <= before || g.state !== 'in') continue;
      const nick = (t: string) => map.get(t)?.nick ?? t;
      notify(`${nick(team)} pontuou! (+${score - before})`, `${nick(away)} ${g.away ?? 0} × ${g.home ?? 0} ${nick(home)} · ${g.detail}`, `eza-score-${key}`);
    }
  }, [live, on, team, map]);

  return null;
}
