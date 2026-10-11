import { useEffect, useState } from 'react';
import { api } from './client';
import { useApp } from '../context/AppContext';
import { useTeamsCtx } from './TeamsContext';
import type { Team } from '../lib/types';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/** Executa um carregador assíncrono quando as dependências mudam (cancela respostas antigas). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ data: s.data, error: null, loading: true }));
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: Error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const useManifest = () => useAsync(() => api.manifest(), []);

/** Temporada efetiva: a escolhida no seletor global ou a atual dos dados. */
export function useSeason(): { season: number | null; current: number | null; first: number; isCurrent: boolean } {
  const { season } = useApp();
  const m = useManifest();
  const current = m.data?.coverage.currentSeason ?? null;
  const first = m.data?.coverage.firstSeason ?? 1999;
  const eff = season ?? current;
  return { season: eff, current, first, isCurrent: eff === current };
}

/** Times (inclui abreviações históricas) a partir do TeamsProvider. */
export function useTeams(): { data: Team[]; map: Map<string, Team>; loading: boolean } {
  const { teams, map, loading } = useTeamsCtx();
  return { data: teams, map, loading };
}
