import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { Loading } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync, useSeason, useTeams } from '../data/hooks';
import { computeStandings, fmtRecord } from '../lib/standings';
import { DIVISIONS_CURRENT, DIVISION_ORDER } from '../lib/teams';
import { PAGE_META } from '../content/pageMeta';

export default function Teams() {
  const { data: teams, loading } = useTeams();
  const { season } = useSeason();
  const [conf, setConf] = useState<'all' | 'AFC' | 'NFC'>('all');
  const games = useAsync(() => (season ? api.seasonGames(season) : Promise.resolve([])), [season]);
  const sbs = useAsync(() => api.superBowls(), []);
  const standings = useMemo(() => (games.data && season ? computeStandings(games.data, season) : []), [games.data, season]);
  const recOf = (t: string) => standings.find((s) => s.team === t);
  const titles = (t: string) => (sbs.data ?? []).filter((s) => s.winner === t).length;
  const active = teams.filter((t) => t.active && (conf === 'all' || t.conf === conf));
  const divisions = DIVISION_ORDER.filter((d) => active.some((t) => DIVISIONS_CURRENT[t.abbr] === d));
  return (
    <div>
      <Seo {...PAGE_META['/teams']} />
      <PageHeader eyebrow="32 franquias" title="Times" lede="Cada time tem uma página com perfil, analytics da temporada, histórico desde 1999, Super Bowls e confrontos." />
      <div className="filters">
        <div className="chips" role="group" aria-label="Conferência">
          {(['all', 'AFC', 'NFC'] as const).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={conf === c} onClick={() => setConf(c)}>
              {c === 'all' ? 'Todas' : c}
            </button>
          ))}
        </div>
        <span className="small muted">Campanha da temporada {season}</span>
      </div>
      {loading ? (
        <Loading height={400} />
      ) : (
        <div className="stack">
          {divisions.map((d) => (
            <section key={d}>
              <h2 style={{ fontSize: '1rem' }}>{d}</h2>
              <div className="grid grid-4">
                {active
                  .filter((t) => DIVISIONS_CURRENT[t.abbr] === d)
                  .sort((a, b) => (recOf(b.abbr)?.pct ?? 0) - (recOf(a.abbr)?.pct ?? 0))
                  .map((t) => {
                    const r = recOf(t.abbr);
                    const n = titles(t.abbr);
                    return (
                      <Link key={t.abbr} to={`/teams/${t.abbr.toLowerCase()}`} className="team-card" style={{ ['--team-color' as string]: t.color }}>
                        <TeamLogo abbr={t.abbr} size={44} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 650 }}>{t.name}</div>
                          <div className="small muted">
                            {r ? fmtRecord(r) : '0-0'} {n ? `· ${n} Super Bowl${n > 1 ? 's' : ''}` : ''}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
