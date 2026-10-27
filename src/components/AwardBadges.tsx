import { Link } from 'react-router-dom';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import type { AwardKey } from '../lib/types';

const SHORT: Record<AwardKey, string> = { mvp: 'MVP', opoy: 'Jogador ofensivo do ano', dpoy: 'Jogador defensivo do ano', oroy: 'Novato ofensivo do ano', droy: 'Novato defensivo do ano', cpoy: 'Volta por cima do ano', coy: 'Técnico do ano' };

/** Prêmios da AP do jogador (ex.: "MVP 2024"), no topo do perfil. Nada aparece sem prêmios. */
export function AwardBadges({ playerId }: { playerId: string }) {
  const awards = useAsync(() => api.awards().catch(() => null), []);
  const mine = (awards.data?.winners ?? []).filter((w) => w.playerId === playerId).sort((a, b) => a.season - b.season);
  if (!mine.length) return null;
  return (
    <div className="row" style={{ gap: 6, marginTop: 10 }}>
      {mine.map((w) => (
        <Link key={`${w.award}-${w.season}`} to="/awards" className="badge gold" title="Prêmio da Associated Press">
          {SHORT[w.award]} {w.season}
        </Link>
      ))}
    </div>
  );
}
