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
  return cache.get('scoreboard', 30_000, async () => {
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
  teamStats: { label: string; away: string; home: string }[];
  leaders: { category: string; side: 'home' | 'away'; team: string; athlete: string; value: string }[];
  winProbability: { play: number; home: number }[];
  officials: string[];
}

export async function gameDetail(espnId: string): Promise<GameDetail> {
  return cache.get(`game:${espnId}`, 60_000, async () => {
    const j = await get(`${BASE}/summary?event=${encodeURIComponent(espnId)}`);
    const comp = j.header?.competitions?.[0] ?? {};
    const competitors: any[] = comp.competitors ?? [];
    const sideOf = (teamId: string) => competitors.find((c) => c.team?.id === teamId)?.homeAway ?? 'home';
    const box: any[] = j.boxscore?.teams ?? [];
    const home = box.find((b) => b.homeAway === 'home' || sideOf(b.team?.id) === 'home');
    const away = box.find((b) => b !== home);
    const statRows = (home?.statistics ?? []).map((s: any) => ({
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
