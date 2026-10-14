/**
 * Play-by-play (nflverse/pbp): ~19 MB comprimidos por temporada. O arquivo é lido em fluxo
 * (download → gunzip → CSV) e reduzido a um resumo situacional por time — 3ª descida, 4ª descida,
 * red zone, taxa de sucesso e EPA por jogada (ataque e defesa). Só o resumo fica em cache
 * (data-raw/pbp_summary_{ano}.json); cada temporada é reprocessada apenas quando a versão remota muda.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { parse } from 'csv-parse';
import { RAW_DIR } from '../config';
import { RELEASE_BASE } from '../../src/lib/sources';
import type { SeasonType, TeamSeasonLine } from '../../src/lib/types';
import { releaseVersions } from './fetcher';

/** Resumo situacional de um time em uma fase da temporada. */
export interface TeamPbp {
  team: string;
  season: number;
  st: SeasonType;
  plays: number;
  epa: number;
  success: number;
  thirdAtt: number;
  thirdConv: number;
  fourthOpp: number;
  fourthAtt: number;
  fourthConv: number;
  rzTrips: number;
  rzTd: number;
  dPlays: number;
  dEpa: number;
  dSuccess: number;
  dThirdAtt: number;
  dThirdConv: number;
  dRzTrips: number;
  dRzTd: number;
}

export const PBP_TAG = 'pbp';
/** Versão da lógica do resumo: ao mudar a forma de contar, os resumos em cache são refeitos. */
const SUMMARY_SCHEMA = 2;
export const pbpAsset = (season: number) => `play_by_play_${season}.csv.gz`;

const COLS = [
  'game_id', 'season_type', 'posteam', 'defteam', 'down', 'play_type', 'yardline_100', 'epa', 'success', 'pass', 'rush',
  'third_down_converted', 'third_down_failed', 'fourth_down_converted', 'fourth_down_failed', 'fixed_drive', 'fixed_drive_result',
  'two_point_attempt',
] as const;
type Col = (typeof COLS)[number];

const RZ_PLAYS = new Set(['pass', 'run', 'field_goal', 'qb_kneel', 'qb_spike']);

const blank = (team: string, season: number, st: SeasonType): TeamPbp => ({
  team, season, st, plays: 0, epa: 0, success: 0, thirdAtt: 0, thirdConv: 0, fourthOpp: 0, fourthAtt: 0, fourthConv: 0, rzTrips: 0,
  rzTd: 0, dPlays: 0, dEpa: 0, dSuccess: 0, dThirdAtt: 0, dThirdConv: 0, dRzTrips: 0, dRzTd: 0,
});

/** Reduz as linhas de jogada de uma temporada ao resumo por time (função pura, testável). */
export function summarizePbp(season: number, rows: Iterable<Record<Col, string>>): TeamPbp[] {
  const acc = new Map<string, TeamPbp>();
  const get = (team: string, st: SeasonType) => {
    const k = `${team}|${st}`;
    let t = acc.get(k);
    if (!t) acc.set(k, (t = blank(team, season, st)));
    return t;
  };
  const drives = new Map<string, { off: string; def: string; st: SeasonType; minYl: number; td: boolean }>();
  for (const r of rows) {
    const off = r.posteam;
    const def = r.defteam;
    if (!off || off === 'NA' || !def || def === 'NA') continue;
    const st: SeasonType = r.season_type === 'POST' ? 'POST' : 'REG';
    const o = get(off, st);
    const d = get(def, st);
    const pt = r.play_type;
    const scrimmage = (r.pass === '1' || r.rush === '1') && pt !== 'no_play';
    if (scrimmage) {
      const epa = Number(r.epa);
      const ok = Number.isFinite(epa);
      o.plays++;
      d.dPlays++;
      if (ok) {
        o.epa += epa;
        d.dEpa += epa;
      }
      if (r.success === '1') {
        o.success++;
        d.dSuccess++;
      }
    }
    if (r.down === '3' && (r.third_down_converted === '1' || r.third_down_failed === '1')) {
      o.thirdAtt++;
      d.dThirdAtt++;
      if (r.third_down_converted === '1') {
        o.thirdConv++;
        d.dThirdConv++;
      }
    }
    if (r.down === '4' && pt !== 'no_play') {
      if (pt === 'pass' || pt === 'run' || pt === 'punt' || pt === 'field_goal') o.fourthOpp++;
      if ((pt === 'pass' || pt === 'run') && (r.fourth_down_converted === '1' || r.fourth_down_failed === '1')) {
        o.fourthAtt++;
        if (r.fourth_down_converted === '1') o.fourthConv++;
      }
    }
    // Red zone: posse com um snap de scrimmage (ou FG) dentro da 20 do adversário, uma vez por drive.
    // Ponto extra e conversão de 2 pontos saem da 15/2 e não contam — senão todo drive de TD viraria "red zone".
    if (r.fixed_drive && r.fixed_drive !== 'NA' && RZ_PLAYS.has(pt) && r.two_point_attempt !== '1') {
      const k = `${r.game_id}|${off}|${r.fixed_drive}`;
      const yl = Number(r.yardline_100);
      const dr = drives.get(k) ?? { off, def, st, minYl: 100, td: false };
      if (Number.isFinite(yl) && yl < dr.minYl) dr.minYl = yl;
      if (r.fixed_drive_result === 'Touchdown') dr.td = true;
      drives.set(k, dr);
    }
  }
  for (const dr of drives.values()) {
    if (dr.minYl > 20) continue;
    const o = get(dr.off, dr.st);
    const d = get(dr.def, dr.st);
    o.rzTrips++;
    d.dRzTrips++;
    if (dr.td) {
      o.rzTd++;
      d.dRzTd++;
    }
  }
  return [...acc.values()].map((t) => ({ ...t, epa: Math.round(t.epa * 100) / 100, dEpa: Math.round(t.dEpa * 100) / 100 }));
}

/** Lê o CSV comprimido em fluxo, mantendo só as colunas necessárias. */
async function* streamRows(url: string): AsyncGenerator<Record<Col, string>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} em ${url}`);
  const parser = Readable.fromWeb(res.body as never).pipe(createGunzip()).pipe(parse({ relax_quotes: true, skip_empty_lines: true }));
  let idx: number[] | null = null;
  for await (const rec of parser as AsyncIterable<string[]>) {
    if (!idx) {
      idx = COLS.map((c) => rec.indexOf(c));
      const missing = COLS.filter((_, i) => idx![i] < 0);
      if (missing.length) throw new Error(`Colunas ausentes no play-by-play: ${missing.join(', ')}`);
      continue;
    }
    const row = {} as Record<Col, string>;
    COLS.forEach((c, i) => (row[c] = rec[idx![i]] ?? ''));
    yield row;
  }
}

async function collect(season: number, url: string) {
  const rows: Record<Col, string>[] = [];
  for await (const r of streamRows(url)) rows.push(r);
  return summarizePbp(season, rows);
}

export interface PbpResult {
  rows: TeamPbp[];
  /** Metadados por temporada para o manifest (nome do asset, versão, se baixou, hash do resumo). */
  files: { name: string; version: string | null; downloaded: boolean; hash: string }[];
}

/**
 * Resumos de todas as temporadas. Baixa somente quando a versão remota difere do resumo em cache
 * (ou quando `force(season)`); sem lista de versões, reaproveita o cache existente.
 */
export async function pbpSummaries(seasons: number[], force: (season: number) => boolean, log: (m: string) => void): Promise<PbpResult> {
  const versions = await releaseVersions(PBP_TAG);
  const out: PbpResult = { rows: [], files: [] };
  for (const s of seasons) {
    const name = pbpAsset(s);
    const cacheFile = path.join(RAW_DIR, `pbp_summary_${s}.json`);
    const remote = versions[name] ?? null;
    let cached: { version: string | null; schema?: number; rows: TeamPbp[] } | null = null;
    try {
      cached = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch {
      /* sem cache */
    }
    const hasList = Object.keys(versions).length > 0;
    if (hasList && !remote) continue; // temporada ainda sem play-by-play publicado
    const fresh = cached && cached.schema === SUMMARY_SCHEMA && (!hasList || cached.version === remote) && !force(s);
    let rows: TeamPbp[];
    let downloaded = false;
    if (fresh) rows = cached!.rows;
    else {
      log(`  ↓ ${name} (play-by-play, processado em fluxo)`);
      try {
        rows = await collect(s, `${RELEASE_BASE}/${PBP_TAG}/${name}`);
        downloaded = true;
        await fs.mkdir(RAW_DIR, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify({ version: remote, schema: SUMMARY_SCHEMA, retrievedAt: new Date().toISOString(), rows }));
      } catch (e) {
        if (!cached) throw e;
        log(`  ! falha ao processar ${name}; usando resumo em cache (${e instanceof Error ? e.message : String(e)})`);
        rows = cached.rows;
      }
    }
    out.rows.push(...rows);
    out.files.push({ name, version: fresh ? cached!.version : remote, downloaded, hash: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex') });
  }
  return out;
}

/** Copia o resumo situacional para as linhas de time (mesmo time, temporada e fase). */
export function mergePbp(teamLines: TeamSeasonLine[], rows: TeamPbp[]) {
  const m = new Map(rows.map((r) => [`${r.team}|${r.season}|${r.st}`, r]));
  for (const t of teamLines) {
    const r = m.get(`${t.team}|${t.season}|${t.st}`);
    if (!r) continue;
    const { team: _t, season: _s, st: _st, ...fields } = r;
    Object.assign(t, fields);
  }
}
