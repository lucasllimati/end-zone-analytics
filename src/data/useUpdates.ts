import { useCallback, useEffect, useRef, useState } from 'react';
import { invalidateData } from './client';
import { adminGet, adminPost } from './admin';
import type { UpdateCheckResult } from '../lib/types';

export interface SyncJobView {
  id: string;
  status: 'running' | 'done' | 'error';
  mode: 'full' | 'partial';
  log: string[];
  error: string | null;
  downloaded: string[];
  warnings?: string[];
  startedAt?: string;
  finishedAt?: string | null;
}

const SESSION_KEY = 'eza-update-check';

function cached(): UpdateCheckResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as UpdateCheckResult;
    return Date.now() - new Date(v.checkedAt).getTime() < 10 * 60_000 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Verificação de dados novos + disparo de carga completa/parcial. Somente para administradores:
 * todas as chamadas passam pela API autenticada (/api/admin/*).
 */
export function useUpdates(auto = false) {
  const [result, setResult] = useState<UpdateCheckResult | null>(() => cached());
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [job, setJob] = useState<SyncJobView | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const timer = useRef<number>();

  const check = useCallback(async (force = false) => {
    setChecking(true);
    setCheckError(null);
    try {
      const r = await adminGet<UpdateCheckResult>(`/api/admin/check${force ? '?force=1' : ''}`);
      if (!r.data) {
        setCheckError(r.status === 401 ? 'Sessão expirada. Entre novamente.' : r.status === 0 ? 'API indisponível.' : `Falha na verificação (HTTP ${r.status}).`);
        return null;
      }
      setResult(r.data);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(r.data));
      } catch {
        /* sem sessionStorage */
      }
      return r.data;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!auto || result) return;
    const t = window.setTimeout(() => void check().catch(() => {}), 2500);
    return () => window.clearTimeout(t);
  }, [auto, result, check]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const watch = useCallback((id: string, onFinish?: (j: SyncJobView) => void) => {
    window.clearInterval(timer.current);
    timer.current = window.setInterval(async () => {
      const { data: j } = await adminGet<SyncJobView>(`/api/admin/jobs/${id}`);
      if (!j) return;
      setJob(j);
      if (j.status !== 'running') {
        window.clearInterval(timer.current);
        if (j.status === 'done') {
          invalidateData();
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {
            /* ignore */
          }
          setResult(null);
        }
        onFinish?.(j);
      }
    }, 1500);
  }, []);

  const sync = useCallback(
    async (body: { mode: 'full' | 'partial'; datasets?: string[]; seasons?: number[] }, onFinish?: (j: SyncJobView) => void) => {
      setSyncError(null);
      const res = await adminPost<{ job: SyncJobView; alreadyRunning: boolean; message?: string }>('/api/admin/sync', body);
      if (res.status === 0 || res.status === 404) return setSyncError('A API não está disponível neste ambiente. Rode o comando indicado no terminal.');
      if (res.status === 401 || res.status === 403) return setSyncError('Não autorizado: entre novamente na área administrativa.');
      if (res.status === 429) return setSyncError('Muitas solicitações seguidas. Aguarde um minuto.');
      if (!res.data?.job) return setSyncError(`Falha ao iniciar a carga (HTTP ${res.status}).`);
      if (res.data.alreadyRunning) setSyncError('Já existe uma carga em andamento; acompanhando o progresso dela.');
      setJob(res.data.job);
      watch(res.data.job.id, onFinish);
    },
    [watch],
  );

  return { result, checking, check, checkError, sync, job, syncError, watch };
}
