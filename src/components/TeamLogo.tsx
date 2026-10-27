import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTeams } from '../data/hooks';
import { HISTORICAL_NAMES, draftFranchise, draftHistoricName, franchiseOf, teamSlug } from '../lib/teams';

/**
 * Alguns logos originais têm 4096 px (~500 KB). O redimensionador da CDN da ESPN entrega a imagem
 * já no tamanho exibido (2× para telas retina), reduzindo o download em ~99%.
 */
export function resized(url: string, size: number): string {
  const m = url.match(/^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/.+\.png)$/);
  if (!m) return url;
  const px = Math.min(500, Math.ceil((size * 2) / 16) * 16);
  return `https://a.espncdn.com/combiner/i?img=${m[1]}&w=${px}&h=${px}`;
}

interface Props {
  abbr: string;
  size?: number;
}

/**
 * Logo oficial do time (CDN da ESPN, via nflverse). Usa a versão para fundo escuro no tema escuro.
 * Se a imagem falhar, mostra um monograma com as cores do time — a interface nunca fica quebrada.
 */
export function TeamLogo({ abbr, size = 28 }: Props) {
  const { map } = useTeams();
  const { theme } = useApp();
  const [failed, setFailed] = useState<0 | 1 | 2>(0);
  const team = map.get(abbr) ?? map.get(franchiseOf(abbr));
  const name = HISTORICAL_NAMES[abbr] ?? team?.name ?? abbr;
  if (!team || failed === 2) {
    return (
      <span
        className="team-logo team-mono"
        role="img"
        aria-label={name}
        // Fonte proporcional ao número de letras: a sigla cabe no círculo (antes, 3 letras estouravam).
        style={{ width: size, height: size, background: team?.color ?? '#555', fontSize: size * (abbr.length > 2 ? 0.34 : 0.42), overflow: 'hidden' }}
      >
        {abbr}
      </span>
    );
  }
  const full = theme === 'dark' && failed === 0 ? team.logoDark : team.logo;
  const src = resized(full, size);
  return (
    <img
      className="team-logo"
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed((f) => (f === 0 && theme === 'dark' ? 1 : 2))}
    />
  );
}

export function TeamName({ abbr, short = false }: { abbr: string; short?: boolean }) {
  const { map } = useTeams();
  const team = map.get(abbr) ?? map.get(franchiseOf(abbr));
  if (HISTORICAL_NAMES[abbr]) return <>{short ? HISTORICAL_NAMES[abbr].split(' ').pop() : HISTORICAL_NAMES[abbr]}</>;
  return <>{team ? (short ? team.nick : team.name) : abbr}</>;
}

/** Logo + nome com link para a página do time. */
export function TeamChip({ abbr, short = false, size = 22, link = true }: { abbr: string; short?: boolean; size?: number; link?: boolean }) {
  const inner = (
    <>
      <TeamLogo abbr={abbr} size={size} />
      <span className="team-name">
        <TeamName abbr={abbr} short={short} />
      </span>
    </>
  );
  return link ? (
    <Link className="team-chip" to={`/teams/${teamSlug(franchiseOf(abbr))}`}>
      {inner}
    </Link>
  ) : (
    <span className="team-chip">{inner}</span>
  );
}

/**
 * Time que fez a escolha no draft (códigos do Pro Football Reference): logo da franquia atual e, quando
 * a franquia tinha outro nome na época, ele aparece na dica e para leitores de tela
 * (ex.: John Elway, 1983 → "Baltimore Colts, hoje Indianapolis Colts").
 */
export function DraftTeamLogo({ code, season, size = 20 }: { code: string; season: number; size?: number }) {
  const { map } = useTeams();
  const franchise = draftFranchise(code, season) ?? code;
  const old = draftHistoricName(code, season);
  const label = old ? `${old}, hoje ${map.get(franchise)?.name ?? franchise}` : (map.get(franchise)?.name ?? franchise);
  return (
    <span title={label} style={{ display: 'inline-flex' }}>
      <TeamLogo abbr={franchise} size={size} />
      {old && <span className="sr-only">{label}</span>}
    </span>
  );
}
