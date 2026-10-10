/**
 * Acesso aos dados publicados (data/) com cache em memória.
 * O cache é invalidado automaticamente quando o manifest muda (nova ingestão).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../config';
import { isPacked, unpack } from '../../src/lib/pack';
import { bucketFile } from '../../src/lib/buckets';
import type {
  DraftPick, Game, Manifest, PlayerCareer, PlayerIndexEntry, PlayerSeasonLine, QbModelEntry, SuperBowl, Team, TeamSeason, TeamSeasonLine,
} from '../../src/lib/types';

export class DataStore {
  private cache = new Map<string, unknown>();
  private version: string | null = null;

  constructor(private dir = DATA_DIR) {}

  /** Lê o manifest e limpa o cache se houve nova ingestão. */
  async manifest(): Promise<Manifest | null> {
    try {
      const m = JSON.parse(await fs.readFile(path.join(this.dir, 'manifest.json'), 'utf8')) as Manifest;
      if (m.generatedAt !== this.version) {
        this.cache.clear();
        this.version = m.generatedAt;
      }
      return m;
    } catch {
      return null;
    }
  }

  invalidate() {
    this.cache.clear();
    this.version = null;
  }

  async read<T>(rel: string): Promise<T> {
    await this.manifest();
    if (this.cache.has(rel)) return this.cache.get(rel) as T;
    const raw = JSON.parse(await fs.readFile(path.join(this.dir, rel), 'utf8'));
    const val = isPacked(raw) ? unpack(raw) : raw;
    this.cache.set(rel, val);
    return val as T;
  }

  async exists(rel: string) {
    try {
      await fs.access(path.join(this.dir, rel));
      return true;
    } catch {
      return false;
    }
  }

  teams = () => this.read<Team[]>('teams.json');
  allGames = () => this.read<Game[]>('games/all.json');
  seasonGames = (s: number) => this.read<Game[]>(`games/${s}.json`);
  playerStats = (s: number) => this.read<PlayerSeasonLine[]>(`stats/players-${s}.json`);
  teamStats = (s: number) => this.read<TeamSeasonLine[]>(`stats/teams-${s}.json`);
  teamSeasons = () => this.read<TeamSeason[]>('team-seasons.json');
  playerIndex = () => this.read<PlayerIndexEntry[]>('players/index.json');
  draft = () => this.read<DraftPick[]>('draft.json');
  superBowls = () => this.read<SuperBowl[]>('superbowls.json');
  qbModel = () => this.read<QbModelEntry[]>('models/qb-model.json');

  async career(id: string): Promise<PlayerCareer | null> {
    const bucket = await this.read<Record<string, { bio: PlayerCareer['bio']; similar: PlayerCareer['similar']; lines: unknown }>>(bucketFile(id));
    const c = bucket[id];
    if (!c) return null;
    return { bio: c.bio, similar: c.similar, lines: isPacked(c.lines) ? unpack<PlayerSeasonLine>(c.lines) : (c.lines as PlayerSeasonLine[]) };
  }
}
