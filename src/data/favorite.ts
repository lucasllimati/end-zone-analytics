/**
 * "Meu time": time favorito e aviso de pontuação, guardados só no navegador (eza-team, eza-notify).
 * Mudanças valem na hora para todas as partes da página e para as outras abas abertas.
 */
import { useEffect, useState } from 'react';
import { ACTIVE_TEAMS } from '../lib/teams';

const TEAM_KEY = 'eza-team';
const NOTIFY_KEY = 'eza-notify';
const EVENT = 'eza-favorite-change';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: vale só nesta página */
  }
  window.dispatchEvent(new Event(EVENT));
}

function useStored(key: string): string | null {
  const [v, setV] = useState(() => read(key));
  useEffect(() => {
    const sync = () => setV(read(key));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);
  return v;
}

/** Time favorito (sigla nflverse, ex.: BUF) ou null. Valores fora dos 32 times são ignorados. */
export function useFavoriteTeam(): [string | null, (abbr: string | null) => void] {
  const v = useStored(TEAM_KEY);
  const team = v && (ACTIVE_TEAMS as readonly string[]).includes(v) ? v : null;
  return [team, (abbr) => write(TEAM_KEY, abbr)];
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** Aviso quando o time favorito pontuar (exige a permissão do navegador e a página aberta). */
export function useScoreAlerts(): [boolean, (on: boolean) => Promise<boolean>] {
  const on = useStored(NOTIFY_KEY) === '1' && notificationsSupported() && Notification.permission === 'granted';
  const set = async (want: boolean) => {
    if (!want) {
      write(NOTIFY_KEY, null);
      return true;
    }
    if (!notificationsSupported()) return false;
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') return false;
    write(NOTIFY_KEY, '1');
    return true;
  };
  return [on, set];
}
