/**
 * Página do time: "Meu time" (favorito), notícias (ESPN), relatório de lesões (nflverse), resumo da
 * Wikipedia e prêmios da AP. Cada cartão some quando não há dados (sem cartão vazio).
 */
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { StarIcon } from '../../components/Icons';
import { api, apiGet } from '../../data/client';
import { useFavoriteTeam } from '../../data/favorite';
import { useAsync } from '../../data/hooks';
import { relativeTime } from '../../lib/format';
import type { AwardsData, InjuryEntry, Team } from '../../lib/types';

export interface NewsItem {
  headline: string;
  description: string | null;
  published: string;
  url: string;
  image: string | null;
}

export function FavoriteButton({ code, nick }: { code: string; nick: string }) {
  const [fav, setFav] = useFavoriteTeam();
  const on = fav === code;
  return (
    <button type="button" className={`btn sm${on ? ' primary' : ''}`} aria-pressed={on} onClick={() => setFav(on ? null : code)} title={on ? 'Deixar de seguir' : `Seguir o ${nick} na página inicial`}>
      <StarIcon /> {on ? 'Meu time' : 'Seguir time'}
    </button>
  );
}

/** Notícias do time (ESPN, em inglês). Só aparece com a API no ar e com notícias recentes. */
export function useTeamNews(code: string | null) {
  return useAsync(() => (code ? apiGet<NewsItem[]>(`/api/news/${code}`) : Promise.resolve(null)), [code]);
}

export function NewsList({ items, max = 6 }: { items: NewsItem[]; max?: number }) {
  return (
    <ul className="news-list">
      {items.slice(0, max).map((n) => (
        <li key={n.url}>
          <a href={n.url} target="_blank" rel="noopener noreferrer">
            {n.headline}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <span className="xsmall muted">
            {n.published ? relativeTime(n.published) : ''} · ESPN (em inglês) <span aria-hidden="true">↗</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TeamNews({ code }: { code: string }) {
  const news = useTeamNews(code);
  if (!news.data?.length) return null;
  return (
    <section className="card">
      <h2>Notícias</h2>
      <NewsList items={news.data} />
    </section>
  );
}

const STATUS: Record<string, { pt: string; cls: string }> = {
  Out: { pt: 'Fora', cls: 'bad' },
  Doubtful: { pt: 'Improvável', cls: 'warn' },
  Questionable: { pt: 'Dúvida', cls: 'warn' },
};
const PRACTICE: [RegExp, string][] = [
  [/^Did Not Participate/i, 'Não treinou'],
  [/^Limited/i, 'Treino limitado'],
  [/^Full/i, 'Treino completo'],
  [/^Out/i, 'Fora'],
];
const BODY: Record<string, string> = {
  Knee: 'Joelho', Ankle: 'Tornozelo', Hamstring: 'Posterior da coxa', Shoulder: 'Ombro', Concussion: 'Concussão', Groin: 'Virilha', Back: 'Costas', Hip: 'Quadril',
  Foot: 'Pé', Calf: 'Panturrilha', Quadricep: 'Quadríceps', Illness: 'Doença', Hand: 'Mão', Wrist: 'Punho', Elbow: 'Cotovelo', Neck: 'Pescoço', Chest: 'Peito',
  Ribs: 'Costelas', Toe: 'Dedo do pé', Thigh: 'Coxa', Achilles: 'Tendão de Aquiles', Oblique: 'Oblíquo', Abdomen: 'Abdômen', Finger: 'Dedo', Thumb: 'Polegar',
  Heel: 'Calcanhar', Shin: 'Canela', Pectoral: 'Peitoral', Forearm: 'Antebraço', Biceps: 'Bíceps', Triceps: 'Tríceps', 'Personal Matter': 'Motivo pessoal',
  'Not injury related - resting player': 'Descanso (sem lesão)', 'Not injury related': 'Sem lesão',
};
export const injuryPt = (s: string | null) => (s ? s.split(/,\s*|\s*\/\s*/).map((p) => BODY[p] ?? p).join(', ') : '—');
const practicePt = (s: string | null) => (s ? (PRACTICE.find(([re]) => re.test(s))?.[1] ?? s) : '—');

const injuryCols: Column<InjuryEntry>[] = [
  { key: 'name', label: 'Jogador', render: (r) => (r.id ? <Link to={`/players/${r.id}`}>{r.name}</Link> : r.name), value: (r) => r.name },
  { key: 'pos', label: 'Pos.' },
  { key: 'injury', label: 'Lesão', render: (r) => <span title={r.injury ?? undefined}>{injuryPt(r.injury)}</span>, value: (r) => r.injury ?? '' },
  { key: 'practice', label: 'Treino', render: (r) => <span title={r.practice ?? undefined}>{practicePt(r.practice)}</span>, value: (r) => r.practice ?? '' },
  {
    key: 'status',
    label: 'Jogo',
    render: (r) => (r.status ? <span className={`badge ${STATUS[r.status]?.cls ?? ''}`}>{STATUS[r.status]?.pt ?? r.status}</span> : <span className="muted">—</span>),
    value: (r) => r.status ?? '',
  },
];

export function TeamInjuries({ code, season }: { code: string; season: number | null }) {
  const inj = useAsync(() => (season ? api.injuries(season).catch(() => []) : Promise.resolve([])), [season]);
  const rows = (inj.data ?? []).filter((r) => r.team === code);
  if (!rows.length) return null;
  return (
    <section className="card">
      <h2>Lesões · semana {rows[0].week}</h2>
      <p className="small text-2">Relatório oficial do time antes do jogo: “Fora” não joga; “Dúvida” e “Improvável” dependem da recuperação até o jogo.</p>
      <DataTable rows={rows} rowKey={(r) => `${r.id ?? r.name}`} caption={`Lesões do time na semana ${rows[0].week}`} columns={injuryCols} bare />
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Fonte: nflverse (relatório oficial de lesões da NFL).
      </p>
    </section>
  );
}

export function TeamWikiCard({ code }: { code: string }) {
  const wiki = useAsync(() => api.teamWiki().catch(() => null), []);
  const w = wiki.data?.[code];
  if (!w) return null;
  return (
    <section className="card prose">
      <h2>Sobre o time</h2>
      <p>{w.extract}</p>
      <p className="xsmall muted">
        Texto da Wikipedia, artigo{' '}
        <a href={w.url} target="_blank" rel="noopener noreferrer">
          “{w.title}”
        </a>
        , sob licença{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noopener noreferrer license">
          CC BY-SA 4.0
        </a>
        .
      </p>
    </section>
  );
}

/** Nomes antigos das franquias, como aparecem nas listas de prêmios. */
const ALIASES: Record<string, string[]> = { WAS: ['Redskins', 'Football Team'], TEN: ['Oilers'], LV: ['Raiders'], LAC: ['Chargers'], LA: ['Rams'], IND: ['Colts'], ARI: ['Cardinals'] };

export function teamAwards(data: AwardsData | null | undefined, team: Team) {
  if (!data) return [];
  const nicks = [team.nick, ...(ALIASES[team.abbr] ?? [])];
  return data.winners.filter((w) => w.team && nicks.some((n) => w.team!.endsWith(n))).sort((a, b) => b.season - a.season);
}

export function TeamAwards({ team }: { team: Team }) {
  const awards = useAsync(() => api.awards().catch(() => null), []);
  const rows = teamAwards(awards.data, team);
  if (!rows.length) return null;
  const label = new Map(awards.data!.awards.map((a) => [a.key, a.label]));
  return (
    <section className="card">
      <h2>Prêmios da AP</h2>
      <DataTable
        rows={rows}
        rowKey={(r) => `${r.award}-${r.season}-${r.name}`}
        caption={`Prêmios da AP de jogadores e técnicos do ${team.name}`}
        columns={[
          { key: 'season', label: 'Temporada', num: true, width: '6.5rem' },
          { key: 'award', label: 'Prêmio', render: (r) => label.get(r.award) ?? r.award, value: (r) => label.get(r.award) ?? r.award },
          { key: 'name', label: 'Vencedor', render: (r) => (r.playerId ? <Link to={`/players/${r.playerId}`}>{r.name}</Link> : r.name), value: (r) => r.name },
        ]}
        bare
      />
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Fonte: listas de vencedores da Associated Press na Wikipedia (CC BY-SA 4.0), conferidas antes da publicação. <Link to="/awards">Todos os prêmios</Link>.
      </p>
    </section>
  );
}
