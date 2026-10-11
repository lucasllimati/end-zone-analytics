/**
 * Sessão administrativa no navegador. A autorização real acontece no servidor; aqui só decidimos
 * o que exibir (ex.: o aviso de dados novos aparece apenas para administradores autenticados).
 */
import { useEffect, useState } from 'react';
import { apiGet } from './client';

export interface AdminSession {
  authenticated: boolean;
  method: 'local' | 'session' | 'token' | null;
  tokenConfigured: boolean;
}

let pending: Promise<AdminSession | null> | null = null;
const listeners = new Set<(s: AdminSession | null) => void>();

/** Sessão atual (null = API indisponível, ex.: hospedagem estática). */
export function fetchAdminSession(force = false): Promise<AdminSession | null> {
  if (!pending || force) {
    pending = apiGet<AdminSession>('/api/admin/session');
    void pending.then((s) => listeners.forEach((l) => l(s)));
  }
  return pending;
}

export function useAdminSession(): { session: AdminSession | null; loading: boolean; refresh: () => Promise<AdminSession | null> } {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const on = (s: AdminSession | null) => alive && setSession(s);
    listeners.add(on);
    void fetchAdminSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
      listeners.delete(on);
    };
  }, []);
  return { session, loading, refresh: () => fetchAdminSession(true) };
}

/** POST administrativo com cookie de sessão e cabeçalho anti-CSRF. */
export async function adminPost<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-EZA-Admin': '1' },
      body: JSON.stringify(body),
    });
    const data = (res.headers.get('content-type') ?? '').includes('json') ? ((await res.json()) as T) : null;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

/** GET administrativo: devolve status para diferenciar "não autorizado" de "API indisponível". */
export async function adminGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const json = (res.headers.get('content-type') ?? '').includes('json');
    return { status: res.status, data: res.ok && json ? ((await res.json()) as T) : null };
  } catch {
    return { status: 0, data: null };
  }
}
