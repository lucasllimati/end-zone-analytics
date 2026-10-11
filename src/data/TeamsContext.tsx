import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './client';
import type { Team } from '../lib/types';

interface TeamsState {
  teams: Team[];
  map: Map<string, Team>;
  loading: boolean;
}

const Ctx = createContext<TeamsState>({ teams: [], map: new Map(), loading: true });

/** Carrega o cadastro de times uma única vez para toda a aplicação. */
export function TeamsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamsState>({ teams: [], map: new Map(), loading: true });
  useEffect(() => {
    api
      .teams()
      .then((teams) => setState({ teams, map: new Map(teams.map((t) => [t.abbr, t])), loading: false }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useTeamsCtx = () => useContext(Ctx);
