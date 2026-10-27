/**
 * Dados ao vivo/detalhados de jogos via API pública do site da ESPN (não oficial, sem garantia).
 * Normaliza o JSON para um formato estável usado pelo Game Center. Falhas viram "indisponível" no frontend.
 */
import { TtlCache } from './ttlCache';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const cache = new TtlCache<unknown>();

async function get(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': 'end-zone-analytics/1.0' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  return res.json();
}

export interface LiveGame {
  id: string;
  state: 'pre' | 'in' | 'post';
  detail: string;
  date: string;
  teams: { side: 'home' | 'away'; abbr: string; name: string; score: number | null; logo: string | null; record: string | null }[];
}

export async function scoreboard(): Promise<{ week: number | null; season: number | null; games: LiveGame[] }> {
  return cache.get('scoreboard', 15_000, async () => {
    const j = await get(`${BASE}/scoreboard`);
    return {
      week: j.week?.number ?? null,
      season: j.season?.year ?? null,
      games: (j.events ?? []).map((e: any) => {
        const c = e.competitions?.[0] ?? {};
        return {
          id: String(e.id),
          state: c.status?.type?.state ?? e.status?.type?.state ?? 'pre',
          detail: c.status?.type?.shortDetail ?? e.status?.type?.shortDetail ?? '',
          date: e.date,
          teams: (c.competitors ?? []).map((t: any) => ({
            side: t.homeAway,
            abbr: t.team?.abbreviation,
            name: t.team?.displayName,
            score: t.score !== undefined && t.score !== '' ? Number(t.score) : null,
            logo: t.team?.logo ?? null,
            record: t.records?.[0]?.summary ?? null,
          })),
        } satisfies LiveGame;
      }),
    };
  }) as Promise<{ week: number | null; season: number | null; games: LiveGame[] }>;
}

export interface GameDetail {
  id: string;
  state: string;
  detail: string;
  venue: { name: string | null; city: string | null; attendance: number | null };
  teams: { side: 'home' | 'away'; abbr: string; name: string; score: number | null; linescores: number[]; color: string | null }[];
  scoringPlays: { period: number; clock: string; team: string; type: string; text: string; away: number; home: number }[];
  drives: { team: string; description: string; result: string; yards: number; plays: number; start: string; end: string; time: string; period: number; isScore: boolean }[];
  /** `key` = identificador estável da ESPN (ex.: firstDowns), usado para traduzir o rótulo. */
  teamStats: { key?: string; label: string; away: string; home: string }[];
  leaders: { key?: string; category: string; side: 'home' | 'away'; team: string; athlete: string; value: string }[];
  winProbability: { play: number; home: number }[];
  officials: string[];
}

export async function gameDetail(espnId: string): Promise<GameDetail> {
  return cache.get(`game:${espnId}`, 15_000, async () => {
    const j = await get(`${BASE}/summary?event=${encodeURIComponent(espnId)}`);
    const comp = j.header?.competitions?.[0] ?? {};
    const competitors: any[] = comp.competitors ?? [];
    const sideOf = (teamId: string) => competitors.find((c) => c.team?.id === teamId)?.homeAway ?? 'home';
    const box: any[] = j.boxscore?.teams ?? [];
    const home = box.find((b) => b.homeAway === 'home' || sideOf(b.team?.id) === 'home');
    const away = box.find((b) => b !== home);
    // A ESPN repete algumas estatísticas (ex.: "interceptions" aparece duas vezes): mantém a primeira de cada.
    const seen = new Set<string>();
    const statRows = (home?.statistics ?? [])
      .filter((s: any) => (s.name && seen.has(s.name) ? false : (seen.add(s.name), true)))
      .map((s: any) => ({
        key: s.name,
        label: s.label,
        home: s.displayValue,
        away: away?.statistics?.find((x: any) => x.name === s.name)?.displayValue ?? '—',
      }));
    return {
      id: espnId,
      state: comp.status?.type?.state ?? 'pre',
      detail: comp.status?.type?.detail ?? '',
      venue: {
        name: j.gameInfo?.venue?.fullName ?? null,
        city: j.gameInfo?.venue?.address ? `${j.gameInfo.venue.address.city}, ${j.gameInfo.venue.address.state ?? ''}`.trim() : null,
        attendance: j.gameInfo?.attendance ?? null,
      },
      teams: competitors.map((c) => ({
        side: c.homeAway,
        abbr: c.team?.abbreviation,
        name: c.team?.displayName,
        score: c.score !== undefined ? Number(c.score) : null,
        linescores: (c.linescores ?? []).map((l: any) => Number(l.displayValue ?? l.value ?? 0)),
        color: c.team?.color ? `#${c.team.color}` : null,
      })),
      scoringPlays: (j.scoringPlays ?? []).map((p: any) => ({
        period: p.period?.number ?? 0,
        clock: p.clock?.displayValue ?? '',
        team: p.team?.abbreviation ?? '',
        type: p.type?.abbreviation ?? p.type?.text ?? '',
        text: p.text ?? '',
        away: p.awayScore ?? 0,
        home: p.homeScore ?? 0,
      })),
      drives: (j.drives?.previous ?? []).map((d: any) => ({
        team: d.team?.abbreviation ?? '',
        description: d.description ?? '',
        result: d.displayResult ?? d.result ?? '',
        yards: d.yards ?? 0,
        plays: d.offensivePlays ?? 0,
        start: d.start?.text ?? '',
        end: d.end?.text ?? '',
        time: d.timeElapsed?.displayValue ?? '',
        period: d.start?.period?.number ?? 0,
        isScore: Boolean(d.isScore),
      })),
      teamStats: statRows,
      leaders: (j.leaders ?? []).flatMap((t: any) =>
        (t.leaders ?? []).map((cat: any) => ({
          key: cat.name,
          category: cat.displayName ?? cat.name,
          side: sideOf(t.team?.id),
          team: t.team?.abbreviation,
          athlete: cat.leaders?.[0]?.athlete?.displayName ?? '—',
          value: cat.leaders?.[0]?.displayValue ?? '',
        })),
      ),
      winProbability: (j.winprobability ?? []).map((w: any, i: number) => ({ play: i, home: Math.round((w.homeWinPercentage ?? 0) * 1000) / 10 })),
      officials: (j.gameInfo?.officials ?? []).map((o: any) => `${o.displayName}${o.position?.displayName ? ` (${o.position.displayName})` : ''}`),
    } satisfies GameDetail;
  }) as Promise<GameDetail>;
}

export interface NewsItem {
  headline: string;
  description: string | null;
  published: string;
  url: string;
  image: string | null;
}

/** Abreviações da ESPN que diferem das do nflverse. */
const ESPN_ABBR: Record<string, string> = { WSH: 'WAS', LAR: 'LA' };

/** ID ESPN de cada time (a lista muda raramente: cache de um dia). */
async function espnTeamIds(): Promise<Map<string, string>> {
  return cache.get('teams', 86_400_000, async () => {
    const j = await get(`${BASE}/teams`);
    const out = new Map<string, string>();
    for (const t of j.sports?.[0]?.leagues?.[0]?.teams ?? []) {
      const abbr = String(t.team?.abbreviation ?? '');
      if (abbr && t.team?.id) out.set(ESPN_ABBR[abbr] ?? abbr, String(t.team.id));
    }
    return out;
  }) as Promise<Map<string, string>>;
}

/**
 * Notícias do time (ESPN). O filtro por time da ESPN também traz matérias sobre a liga inteira
 * (ex.: odds dos 32 times): ficam só as marcadas com no máximo 3 times, incluindo este.
 */
export async function teamNews(abbr: string): Promise<NewsItem[]> {
  return cache.get(`news:${abbr}`, 15 * 60_000, async () => {
    const id = (await espnTeamIds()).get(abbr);
    if (!id) return [];
    const j = await get(`${BASE}/news?team=${id}&limit=50`);
    return (j.articles ?? [])
      .filter((a: any) => {
        const teams = (a.categories ?? []).filter((c: any) => c.type === 'team');
        return teams.length > 0 && teams.length <= 3 && teams.some((c: any) => String(c.teamId) === id);
      })
      .slice(0, 6)
      .map((a: any) => ({
        headline: String(a.headline ?? ''),
        description: a.description ?? null,
        published: a.published ?? a.lastModified ?? '',
        url: a.links?.web?.href ?? '',
        image: a.images?.[0]?.url ?? null,
      }))
      .filter((a: NewsItem) => a.headline && a.url.startsWith('https://www.espn.com/'));
  }) as Promise<NewsItem[]>;
}
