/**
 * "Meu time" na página inicial: próximo jogo (ou o placar ao vivo), último resultado, posição na divisão,
 * lesões e notícias do time favorito. Sem favorito, um convite discreto para escolher um time.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameTile, type LiveOverlay } from './GameCard';
import { StarIcon } from './Icons';
import { TeamLogo } from './TeamLogo';
import { api } from '../data/client';
import { notificationsSupported, useFavoriteTeam, useScoreAlerts } from '../data/favorite';
import { useAsync, useTeams } from '../data/hooks';
import { fmtRecord } from '../lib/standings';
import { franchiseOf } from '../lib/teams';
import type { Game, StandingRow } from '../lib/types';
import { NewsList, useTeamNews } from '../pages/team/TeamExtras';
import { useTermsLang } from './TermsToggle';
import type { Team } from '../lib/types';

/** Lista dos 32 times para escolher o favorito. */
function TeamSelect({ teams, value, onChange, label }: { teams: Team[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="">Escolha um time…</option>}
        {teams
          .filter((t) => t.active)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => (
            <option key={t.abbr} value={t.abbr}>
              {t.name}
            </option>
          ))}
      </select>
    </label>
  );
}

export function MyTeam({ games, standings, live, season }: { games: Game[]; standings: StandingRow[]; live: Map<string, LiveOverlay>; season: number | null }) {
  const [fav, setFav] = useFavoriteTeam();
  const { data: teams, map } = useTeams();
  const news = useTeamNews(fav);
  const inj = useAsync(() => (fav && season ? api.injuries(season).catch(() => []) : Promise.resolve([])), [fav, season]);
  const [alerts, setAlerts] = useScoreAlerts();
  const [editing, setEditing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [lang] = useTermsLang();

  if (!fav)
    return (
      <section className="card my-team-empty" aria-labelledby="h-meu-time">
        <h2 id="h-meu-time">
          <StarIcon /> Meu time
        </h2>
        <p className="small text-2">Escolha seu time para ver aqui o próximo jogo, o placar ao vivo, a posição na divisão, lesões e notícias.</p>
        <TeamSelect teams={teams} value="" onChange={(v) => setFav(v || null)} label="Seu time" />
      </section>
    );

  const team = map.get(fav);
  const mine = games.filter((g) => franchiseOf(g.home) === fav || franchiseOf(g.away) === fav).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const liveGame = mine.find((g) => live.get(`${g.away}@${g.home}`)?.state === 'in');
  const next = liveGame ?? mine.find((g) => g.homeScore === null);
  const lastGame = [...mine].reverse().find((g) => g.homeScore !== null);
  const row = standings.find((s) => s.team === fav);
  const divRank = row ? standings.filter((s) => s.division === row.division).findIndex((s) => s.team === fav) + 1 : null;
  const out = (inj.data ?? []).filter((i) => i.team === fav && i.status === 'Out').length;

  return (
    <section className="card my-team" aria-labelledby="h-meu-time" style={{ ['--team-color' as string]: team?.color }}>
      <div className="card-title">
        <h2 id="h-meu-time">
          <StarIcon /> Meu time
        </h2>
        {/* Trocar só muda o favorito quando outro time é escolhido; Cancelar mantém o atual. */}
        {editing ? (
          <div className="row" style={{ gap: 8 }}>
            <TeamSelect
              teams={teams}
              value={fav}
              label="Trocar o time favorito"
              onChange={(v) => {
                setFav(v);
                setEditing(false);
              }}
            />
            <button type="button" className="btn sm ghost" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="button" className="btn sm ghost" onClick={() => setFav(null)}>
              Deixar de seguir
            </button>
          </div>
        ) : (
          <button type="button" className="btn sm ghost" onClick={() => setEditing(true)}>
            Trocar time
          </button>
        )}
      </div>
      <div className="my-team-grid">
        <div className="stack-sm">
          <Link to={`/teams/${fav.toLowerCase()}`} className="my-team-id">
            <TeamLogo abbr={fav} size={56} />
            <span>
              <strong>{team?.name ?? fav}</strong>
              <span className="small text-2">
                {row ? fmtRecord(row) : '0-0'}
                {divRank ? ` · ${divRank}º na ${row!.division}` : ''}
                {row && row.streak !== '—' ? ` · sequência ${lang === 'en' ? row.streak : row.streak.replace('W', 'V').replace('L', 'D').replace('T', 'E')}` : ''}
              </span>
            </span>
          </Link>
          <dl className="kv">
            {lastGame && (
              <>
                <dt>Último jogo</dt>
                <dd>
                  <Link to={`/games/${lastGame.id}`}>
                    {lastGame.away} {lastGame.awayScore} × {lastGame.homeScore} {lastGame.home}
                  </Link>
                </dd>
              </>
            )}
            {inj.data && (
              <>
                <dt>Lesões</dt>
                <dd>
                  <Link to={`/teams/${fav.toLowerCase()}`}>{out ? `${out} fora do próximo jogo` : 'Ninguém fora no relatório'}</Link>
                </dd>
              </>
            )}
          </dl>
          {notificationsSupported() && (
            <label className="row small" style={{ gap: 6 }}>
              <input
                type="checkbox"
                checked={alerts}
                onChange={async (e) => {
                  const want = e.target.checked;
                  setBlocked(!(await setAlerts(want)) && want);
                }}
              />{' '}
              Avisar quando o {team?.nick ?? fav} pontuar (com o site aberto)
            </label>
          )}
          {blocked && (
            <p className="small" role="alert" style={{ margin: 0, color: 'var(--warning, var(--text-2))' }}>
              As notificações estão bloqueadas neste navegador. Libere em Configurações do site (ícone ao lado do endereço) e marque de novo.
            </p>
          )}
        </div>
        <div>{next ? <GameTile g={next} live={live.get(`${next.away}@${next.home}`)} /> : <p className="small muted">Sem próximos jogos nesta temporada.</p>}</div>
        {news.data && news.data.length > 0 && (
          <div>
            <h3 className="small" style={{ margin: '0 0 8px' }}>
              Notícias
            </h3>
            <NewsList items={news.data} max={3} />
          </div>
        )}
      </div>
    </section>
  );
}
