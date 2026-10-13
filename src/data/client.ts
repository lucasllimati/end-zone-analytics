/**
 * Cliente de dados do frontend. Lê os JSON estáticos publicados pelo pipeline (/data/*),
 * com cache em memória e deduplicação. Funciona com ou sem a API (hospedagem estática).
 */
import { isPacked, unpack } from '../lib/pack';
import { bucketFile } from '../lib/buckets';
import type {
  CuratedRecord, DraftPick, Game, LeagueTrend, Manifest, PlayerCareer, PlayerIndexEntry, PlayerSeasonLine, QbModelEntry,
  QualityCheck, Stadium, SuperBowl, Team, TeamProfile, TeamSeason, TeamSeasonLine,
} from '../lib/types';
import type { ComputedRecordsShape } from './shapes';

const cache = new Map<string, Promise<unknown>>();
let dataVersion = '';

export class DataError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchData<T>(rel: string): Promise<T> {
  const url = `/data/${rel}${dataVersion ? `?v=${encodeURIComponent(dataVersion)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new DataError(res.status, res.status === 404 ? 'Dados não encontrados para esta seleção.' : `Erro ${res.status} ao carregar dados.`);
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json')) throw new DataError(404, 'Dados não encontrados para esta seleção.');
  const raw = await res.json();
  return (isPacked(raw) ? unpack(raw) : raw) as T;
}

export function load<T>(rel: string): Promise<T> {
  if (!cache.has(rel)) {
    const p = fetchData<T>(rel);
    cache.set(rel, p);
    p.catch(() => cache.delete(rel));
  }
  return cache.get(rel) as Promise<T>;
}

/** Limpa o cache (após uma sincronização) e força nova versão dos arquivos. */
export function invalidateData(version?: string) {
  cache.clear();
  dataVersion = version ?? String(Date.now());
}

export async function getManifest(): Promise<Manifest> {
  const m = await load<Manifest>('manifest.json');
  if (!dataVersion) dataVersion = m.generatedAt;
  return m;
}

export const api = {
  manifest: getManifest,
  teams: () => load<Team[]>('teams.json'),
  allGames: () => load<Game[]>('games/all.json'),
  seasonGames: (s: number) => load<Game[]>(`games/${s}.json`),
  playerStats: (s: number) => load<PlayerSeasonLine[]>(`stats/players-${s}.json`),
  teamStats: (s: number) => load<TeamSeasonLine[]>(`stats/teams-${s}.json`),
  teamSeasons: () => load<TeamSeason[]>('team-seasons.json'),
  trends: () => load<LeagueTrend[]>('trends.json'),
  draft: () => load<DraftPick[]>('draft.json'),
  superBowls: () => load<SuperBowl[]>('superbowls.json'),
  curatedRecords: () => load<{ source: string; asOf: string; records: CuratedRecord[] }>('records-curated.json'),
  computedRecords: () => load<ComputedRecordsShape>('records-computed.json'),
  stadiums: () => load<Stadium[]>('stadiums.json'),
  qbModel: () => load<QbModelEntry[]>('models/qb-model.json'),
  quality: () => load<{ checkedAt: string; checks: QualityCheck[] }>('quality.json'),
  changes: () =>
    load<
      {
        version: number;
        at: string;
        mode: string;
        downloaded: string[];
        changed?: { key: string; label: string; rows: number; delta: number | null }[];
        qualityChanged?: boolean;
        rows?: Record<string, { rows: number; delta: number | null }>;
      }[]
    >('history/changes.json'),
  playerIndex: () => load<PlayerIndexEntry[]>('players/index.json'),
  teamProfile: (code: string) => load<TeamProfile>(`teams/${code}.json`),
  async career(id: string): Promise<PlayerCareer | null> {
    const bucket = await load<Record<string, { bio: PlayerCareer['bio']; similar: PlayerCareer['similar']; lines: unknown }>>(bucketFile(id));
    const c = bucket[id];
    if (!c) return null;
    return { bio: c.bio, similar: c.similar, lines: isPacked(c.lines) ? unpack<PlayerSeasonLine>(c.lines) : (c.lines as PlayerSeasonLine[]) };
  },
};

/** Chamadas à API (opcional). Retornam null se a API não estiver disponível (ex.: hospedagem estática). */
export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = (res.headers.get('content-type') ?? '').includes('json') ? ((await res.json()) as T) : null;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}
