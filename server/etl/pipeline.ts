/**
 * Orquestrador do pipeline: SOURCE → RAW → NORMALIZED → ANALYTICS → data/ (servido pela API e pelo frontend).
 *
 * Modos:
 *  - full:    baixa novamente todas as fontes e todas as temporadas.
 *  - partial: incremental. Sem filtros, baixa apenas os arquivos cuja versão remota mudou.
 *             Com --datasets/--seasons, força o download desses itens.
 * Em ambos os casos os derivados são reconstruídos a partir do cache RAW — o job é idempotente.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CURATED_DIR, DATA_DIR, config } from '../config';
import { SOURCES, assetName } from '../../src/lib/sources';
import { CAREER_BUCKETS, careerBucket } from '../../src/lib/buckets';
import {
  BOX_COLS, DRAFT_COLS, GAME_COLS, GAME_LOG_COLS, INDEX_COLS, PLAYER_LINE_COLS, ROSTER_COLS, TEAM_LINE_COLS, TEAM_SEASON_COLS, pack,
} from '../../src/lib/pack';
import { sumLines } from '../../src/lib/stats';
import { currentWeek } from '../../src/lib/games';
import type {
  CuratedRecord, DatasetMeta, Manifest, PlayerCareer, PlayerGameLine, PlayerIndexEntry, PlayerSeasonLine, RosterEntry, TeamGameLine,
  TeamSeasonLine,
} from '../../src/lib/types';
import { getAsset, resetVersionCache, type RawFile } from './fetcher';
import { replaceFile } from './files';
import {
  parseCsv, qbStarts, toBios, toDraft, toGames, toPlayerGameLines, toPlayerLines, toRoster, toTeamGameLines, toTeamLines, toTeams,
} from './transform';
import { buildReferees, buildSpecialTeams, buildUpsets, enrichStadiums, fillAllowed } from './insights';
import { mergePbp, pbpSummaries } from './pbp';
import {
  buildQbModel, buildRecords, buildSimilarity, buildStadiums, buildSuperBowls, buildTeamSeasons, buildTrends, type CuratedSb,
} from './analytics';
import { runQuality } from './quality';
import { buildTeamProfile } from './teamProfiles';
import { ACTIVE_TEAMS } from '../../src/lib/teams';

export interface PipelineOptions {
  mode: 'full' | 'partial';
  datasets?: string[];
  seasons?: number[];
  log?: (msg: string) => void;
}

export interface PipelineResult {
  manifest: Manifest;
  downloaded: string[];
  /** Avisos não bloqueantes (ex.: cache local usado após falha de download). */
  warnings: string[];
  /** false = nenhum dado mudou; a publicação anterior foi mantida (sem nova versão). */
  changed: boolean;
  changedSets: { key: string; label: string; rows: number; delta: number | null }[];
  durationMs: number;
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

async function writeJson(rel: string, data: unknown) {
  const file = path.join(DATA_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data));
  await replaceFile(tmp, file);
}


export async function readManifest(): Promise<Manifest | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'manifest.json'), 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

export async function runPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const t0 = Date.now();
  const warnings: string[] = [];
  const log = (m: string) => {
    if (m.trimStart().startsWith('!')) warnings.push(m.trim().replace(/^!\s*/, ''));
    opts.log?.(m);
  };
  // Consulta as versões remotas de novo a cada execução (o servidor fica de pé entre cargas).
  resetVersionCache();
  const prev = await readManifest();
  const downloaded: string[] = [];
  const forced = (key: string, season?: number) => {
    if (opts.mode === 'full') return true;
    const dsOk = !opts.datasets?.length || opts.datasets.includes(key);
    const sOk = season === undefined || !opts.seasons?.length || opts.seasons.includes(season);
    const anyFilter = Boolean(opts.datasets?.length || opts.seasons?.length);
    return anyFilter && dsOk && sOk;
  };
  // Só nome/versão/hash de cada arquivo ficam em memória até o manifest (os CSVs semanais somam centenas de MB).
  const raw: Record<string, (Omit<RawFile, 'text'> & { hash: string })[]> = {};
  const fetchSource = async (key: string, season?: number) => {
    const src = SOURCES.find((s) => s.key === key)!;
    const files: RawFile[] = [];
    for (const tpl of src.assets) {
      const f = await getAsset(src.tag, assetName(tpl, season), forced(key, season), log);
      if (f) {
        files.push(f);
        if (f.downloaded) downloaded.push(f.name);
      }
    }
    raw[key] = [...(raw[key] ?? []), ...files.map(({ text, ...f }) => ({ ...f, hash: sha(text) }))];
    return files;
  };

  log(`▶ Pipeline (${opts.mode})`);
  log('• Times');
  const teams = toTeams(parseCsv((await fetchSource('teams'))[0].text));
  log('• Jogos');
  const gamesRows = parseCsv((await fetchSource('games'))[0].text);
  const games = toGames(gamesRows, config.firstSeason);
  const starts = qbStarts(gamesRows, config.firstSeason);
  const currentSeason = Math.max(...games.map((g) => g.season));
  const seasons = Array.from({ length: currentSeason - config.firstSeason + 1 }, (_, i) => config.firstSeason + i);

  log(`• Estatísticas por temporada (${seasons[0]}–${currentSeason})`);
  const lines: PlayerSeasonLine[] = [];
  const teamLines: TeamSeasonLine[] = [];
  const statsBySeason = new Map<number, { p: PlayerSeasonLine[]; t: TeamSeasonLine[] }>();
  const gameLines: PlayerGameLine[] = [];
  const teamGames: TeamGameLine[] = [];
  for (const s of seasons) {
    const pf = await fetchSource('playerStats', s);
    const tf = await fetchSource('teamStats', s);
    const p = pf.flatMap((f) => toPlayerLines(parseCsv(f.text), f.name.includes('_post_') ? 'POST' : 'REG'));
    const t = tf.flatMap((f) => toTeamLines(parseCsv(f.text), f.name.includes('_post_') ? 'POST' : 'REG'));
    lines.push(...p);
    teamLines.push(...t);
    statsBySeason.set(s, { p, t });
    // Por jogo: base do jogo a jogo, do box score e do que cada defesa cedeu.
    for (const f of await fetchSource('playerWeek', s)) gameLines.push(...toPlayerGameLines(parseCsv(f.text)));
    for (const f of await fetchSource('teamWeek', s)) teamGames.push(...toTeamGameLines(parseCsv(f.text)));
  }
  fillAllowed(teamLines, teamGames);

  log('• Play-by-play (3ª e 4ª descidas, red zone, taxa de sucesso)');
  const pbp = await pbpSummaries(seasons, (s) => forced('pbp', s), log);
  mergePbp(teamLines, pbp.rows);
  raw.pbp = pbp.files;
  for (const f of pbp.files) if (f.downloaded) downloaded.push(f.name);

  log('• Elencos por temporada');
  const rosters = new Map<number, RosterEntry[]>();
  for (const s of seasons) {
    const files = await fetchSource('rosters', s);
    if (files.length) rosters.set(s, toRoster(parseCsv(files[0].text)));
  }
  log('• Jogadores');
  const bios = toBios(parseCsv((await fetchSource('players'))[0].text));
  log('• Draft');
  const draft = toDraft(parseCsv((await fetchSource('draft'))[0].text));

  log('• Curadoria (Super Bowls, recordes)');
  const sbCurated = JSON.parse(await fs.readFile(path.join(CURATED_DIR, 'superbowls.json'), 'utf8')) as { source: string; games: CuratedSb[] };
  const recCurated = JSON.parse(await fs.readFile(path.join(CURATED_DIR, 'records.json'), 'utf8')) as {
    source: string; asOf: string; records: (Omit<CuratedRecord, 'asOf'> & { season?: number; verify?: string; knownDivergences?: { player: string; season: number; source: number; official: number; note: string }[] })[];
  };
  const curatedRecords = recCurated.records.map((r) => ({ ...r, asOf: recCurated.asOf }));

  log('• Analytics');
  const { list: superBowls, issues: sbIssues } = buildSuperBowls(sbCurated.games, games, 'NFL Record & Fact Book (curadoria)');
  const teamSeasons = buildTeamSeasons(games, teamLines);
  const trends = buildTrends(games, teamLines);
  const qbModel = buildQbModel(lines, teamLines, starts, draft);

  const byPlayer = new Map<string, PlayerSeasonLine[]>();
  for (const l of lines) byPlayer.set(l.id, [...(byPlayer.get(l.id) ?? []), l]);
  const regCareers = new Map<string, PlayerSeasonLine>();
  for (const [id, ls] of byPlayer) {
    const reg = ls.filter((l) => l.st === 'REG');
    if (reg.length) regCareers.set(id, { ...sumLines(reg)!, pos: reg[reg.length - 1].pos, name: reg[reg.length - 1].name });
  }
  const similar = buildSimilarity(regCareers);
  const records = buildRecords(lines, regCareers, teamSeasons, games);
  records.games.upsets = buildUpsets(games);
  records.specialTeams = buildSpecialTeams(lines, regCareers);
  const stadiums = enrichStadiums(buildStadiums(games), games, gameLines);
  const referees = buildReferees(games);

  log('• Qualidade de dados');
  const quality = runQuality({ teams, games, lines, draft, superBowls, sbIssues, teamSeasons, curatedRecords, currentSeason });

  log('• Publicando arquivos');
  await writeJson('teams.json', teams);
  await writeJson('games/all.json', pack(games, [...GAME_COLS]));
  for (const s of seasons) {
    await writeJson(`games/${s}.json`, pack(games.filter((g) => g.season === s), [...GAME_COLS]));
    const st = statsBySeason.get(s)!;
    await writeJson(`stats/players-${s}.json`, pack(st.p, [...PLAYER_LINE_COLS]));
    await writeJson(`stats/teams-${s}.json`, pack(st.t, [...TEAM_LINE_COLS]));
  }
  await writeJson('team-seasons.json', pack(teamSeasons, [...TEAM_SEASON_COLS]));
  await writeJson('trends.json', trends);
  await writeJson('draft.json', pack(draft, [...DRAFT_COLS]));
  // Perfil de cada franquia (página do time): um arquivo pequeno por time.
  for (const code of ACTIVE_TEAMS) await writeJson(`teams/${code}.json`, buildTeamProfile(code, games, teamSeasons, lines, draft));
  await writeJson('superbowls.json', superBowls);
  await writeJson('records-curated.json', { source: recCurated.source, asOf: recCurated.asOf, records: curatedRecords });
  await writeJson('records-computed.json', records);
  await writeJson('stadiums.json', stadiums);
  await writeJson('referees.json', referees);
  for (const [s, r] of rosters) await writeJson(`rosters/${s}.json`, pack(r, [...ROSTER_COLS]));
  await writeJson('models/qb-model.json', qbModel);
  await writeJson('quality.json', { checkedAt: new Date().toISOString(), checks: quality });

  // Índice de jogadores + perfis de carreira em buckets.
  const index: PlayerIndexEntry[] = [];
  const buckets: Record<string, PlayerCareer>[] = Array.from({ length: CAREER_BUCKETS }, () => ({}));
  for (const [id, ls] of byPlayer) {
    ls.sort((a, b) => a.season - b.season || a.st.localeCompare(b.st));
    const latest = ls[ls.length - 1];
    const bio = bios.get(id) ?? {
      id, name: latest.name, pos: latest.pos, posGroup: null, team: latest.team, first: null, last: null, headshot: null,
      college: null, height: null, weight: null, birth: null, draftYear: null, draftRound: null, draftPick: null,
      draftTeam: null, jersey: null, status: null, espnId: null, yearsExp: null,
    };
    const first = ls[0].season;
    const last = latest.season;
    index.push({ id, name: bio.name || latest.name, pos: latest.pos, team: latest.team, first, last });
    buckets[careerBucket(id)][id] = {
      bio: { ...bio, first: bio.first ?? first, last: Math.max(bio.last ?? last, last) },
      lines: ls,
      similar: similar.get(id) ?? [],
    };
  }
  index.sort((a, b) => (b.last ?? 0) - (a.last ?? 0) || a.name.localeCompare(b.name));

  // Jogo a jogo por jogador (mesmos buckets dos perfis) e box score por rodada.
  const logBuckets: Record<string, PlayerGameLine[]>[] = Array.from({ length: CAREER_BUCKETS }, () => ({}));
  const boxes = new Map<string, PlayerGameLine[]>();
  for (const l of gameLines) {
    const b = logBuckets[careerBucket(l.id)];
    (b[l.id] ??= []).push(l);
    const k = `${l.season}/${l.week}`;
    const box = boxes.get(k);
    if (box) box.push(l);
    else boxes.set(k, [l]);
  }
  for (let i = 0; i < CAREER_BUCKETS; i++) {
    const entries = Object.entries(logBuckets[i]).map(([id, ls]) => [id, pack(ls.sort((a, b) => a.season - b.season || a.week - b.week), [...GAME_LOG_COLS])]);
    await writeJson(`players/gamelogs/${String(i).padStart(2, '0')}.json`, Object.fromEntries(entries));
  }
  for (const [k, ls] of boxes) await writeJson(`boxscores/${k}.json`, pack(ls, [...BOX_COLS]));
  await writeJson('players/index.json', pack(index, [...INDEX_COLS]));
  for (let i = 0; i < CAREER_BUCKETS; i++) {
    const entries = Object.entries(buckets[i]).map(([id, c]) => [id, { bio: c.bio, similar: c.similar, lines: pack(c.lines, [...PLAYER_LINE_COLS]) }]);
    await writeJson(`players/careers/${String(i).padStart(2, '0')}.json`, Object.fromEntries(entries));
  }

  // Manifest + versionamento da ingestão.
  const now = new Date().toISOString();
  const datasets: Record<string, DatasetMeta> = {};
  const rowsOf: Record<string, number> = {
    teams: teams.length, games: games.length, players: bios.size, playerStats: lines.length, teamStats: teamLines.length, draft: draft.length,
    playerWeek: gameLines.length, teamWeek: teamGames.length, pbp: pbp.rows.length,
    rosters: [...rosters.values()].reduce((n, r) => n + r.length, 0),
  };
  for (const src of SOURCES) {
    const files = raw[src.key] ?? [];
    const assets = Object.fromEntries(files.map((f) => [f.name, f.version ?? '']));
    const anyDownloaded = files.some((f) => f.downloaded);
    datasets[src.key] = {
      key: src.key,
      label: src.label,
      source: 'nflverse',
      sourceUrl: `https://github.com/nflverse/nflverse-data/releases/tag/${src.tag}`,
      license: src.license,
      remoteVersion: Object.values(assets).filter(Boolean).sort().pop() ?? null,
      assets,
      retrievedAt: anyDownloaded || !prev?.datasets[src.key] ? now : prev.datasets[src.key].retrievedAt,
      sha256: sha(files.map((f) => f.hash).join('')),
      rows: rowsOf[src.key] ?? 0,
      seasons: src.seasonal ? seasons : null,
    };
  }
  const curatedText = JSON.stringify(sbCurated) + JSON.stringify(recCurated);
  datasets.curated = {
    key: 'curated',
    label: 'Curadoria histórica (Super Bowls I–LX, recordes)',
    source: 'NFL Record & Fact Book (curadoria manual, validada contra nflverse quando possível)',
    sourceUrl: 'https://operations.nfl.com/the-rules/nfl-record-and-fact-book/',
    license: 'Fatos históricos (não protegidos); texto próprio',
    remoteVersion: null,
    retrievedAt: now,
    sha256: sha(curatedText),
    rows: superBowls.length + curatedRecords.length,
    seasons: null,
  };
  const played = games.filter((g) => g.homeScore !== null).sort((a, b) => a.date.localeCompare(b.date));
  const qualityCounts = {
    pass: quality.filter((q) => q.status === 'pass').length,
    warn: quality.filter((q) => q.status === 'warn').length,
    fail: quality.filter((q) => q.status === 'fail').length,
  };
  // O que mudou de fato em relação à publicação anterior (conteúdo, não o simples fato de ter rodado).
  const changedSets = Object.values(datasets)
    .filter((d) => !prev || prev.datasets[d.key]?.sha256 !== d.sha256)
    .map((d) => ({ key: d.key, label: d.label, rows: d.rows, delta: prev?.datasets[d.key] ? d.rows - prev.datasets[d.key].rows : null }));
  const qualityChanged = !prev || (['pass', 'warn', 'fail'] as const).some((k) => prev.quality[k] !== qualityCounts[k]);
  if (prev && changedSets.length === 0 && !qualityChanged) {
    // Nada mudou: mantém a publicação (mesma data e versão, caches do navegador continuam válidos) e só registra a verificação.
    const kept: Manifest = { ...prev, lastCheckedAt: now, quality: { ...prev.quality, checkedAt: now } };
    await writeJson('manifest.json', kept);
    log(`✔ Concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s · sem mudanças nos dados — publicação mantida`);
    return { manifest: kept, downloaded, warnings, changed: false, changedSets: [], durationMs: Date.now() - t0 };
  }
  const manifest: Manifest = {
    schemaVersion: 1,
    app: 'End Zone Analytics',
    generatedAt: now,
    ingestionVersion: (prev?.ingestionVersion ?? 0) + 1,
    lastMode: opts.mode,
    coverage: {
      firstSeason: config.firstSeason,
      lastSeason: currentSeason,
      currentSeason,
      currentWeek: currentWeek(games, currentSeason),
      lastCompletedGame: played.at(-1)?.date ?? null,
    },
    datasets,
    quality: { ...qualityCounts, checkedAt: now },
    lastCheckedAt: now,
  };
  if (prev) {
    await writeJson(`history/manifest-${prev.ingestionVersion}.json`, prev);
    await pruneHistory();
  }
  const changeLog = await readChanges();
  changeLog.unshift({
    version: manifest.ingestionVersion,
    at: now,
    mode: opts.mode,
    downloaded,
    changed: changedSets,
    qualityChanged,
    quality: qualityCounts,
    rows: Object.fromEntries(Object.entries(datasets).map(([k, d]) => [k, { rows: d.rows, delta: prev?.datasets[k] ? d.rows - prev.datasets[k].rows : null }])),
  });
  await writeJson('history/changes.json', changeLog.slice(0, 50));
  await writeJson('manifest.json', manifest);
  log(`✔ Concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s · nova publicação: ${changedSets.map((c) => c.label).join(', ') || 'qualidade reavaliada'} · ${downloaded.length} arquivo(s) baixado(s) · qualidade: ${manifest.quality.pass} ok, ${manifest.quality.warn} alerta(s), ${manifest.quality.fail} falha(s)`);
  return { manifest, downloaded, warnings, changed: true, changedSets, durationMs: Date.now() - t0 };
}

async function readChanges(): Promise<unknown[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'history', 'changes.json'), 'utf8'));
  } catch {
    return [];
  }
}

/** Mantém apenas os 10 manifests anteriores mais recentes. */
async function pruneHistory() {
  const dir = path.join(DATA_DIR, 'history');
  const files = (await fs.readdir(dir)).filter((f) => /^manifest-\d+\.json$/.test(f));
  const sorted = files.sort((a, b) => Number(b.match(/\d+/)![0]) - Number(a.match(/\d+/)![0]));
  for (const f of sorted.slice(10)) await fs.unlink(path.join(dir, f));
}
