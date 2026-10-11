import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from './hooks';
import { franchiseOf } from '../lib/teams';
import { readableTeamColor } from '../lib/color';

/** Retorna uma função que dá a cor do time com contraste garantido no tema atual. */
export function useTeamColor() {
  const { map } = useTeams();
  const { theme } = useApp();
  return useCallback(
    (abbr: string, slot = 0) => {
      const t = map.get(abbr) ?? map.get(franchiseOf(abbr));
      return readableTeamColor([t?.color, t?.color2], theme, `var(--series-${slot + 1})`);
    },
    [map, theme],
  );
}
