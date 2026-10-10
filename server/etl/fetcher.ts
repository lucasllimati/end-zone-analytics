import fs from 'node:fs/promises';
import path from 'node:path';
import { RAW_DIR, config } from '../config';
import { replaceFile } from './files';
import { RELEASE_BASE } from '../../src/lib/sources';
import { remoteAssetVersions } from '../../src/lib/updates';

const UA = 'end-zone-analytics/1.0 (+https://github.com/)';

export async function fetchJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (config.githubToken && url.includes('api.github.com')) headers.Authorization = `Bearer ${config.githubToken}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

const versionCache = new Map<string, Record<string, string>>();

/** Versões remotas por asset (cacheado durante uma execução do pipeline). */
export async function releaseVersions(tag: string): Promise<Record<string, string>> {
  if (!versionCache.has(tag)) {
    try {
      versionCache.set(tag, await remoteAssetVersions(tag, fetchJson));
    } catch {
      versionCache.set(tag, {});
    }
  }
  return versionCache.get(tag)!;
}

export interface RawFile {
  name: string;
  text: string;
  version: string | null;
  downloaded: boolean;
}

/**
 * Obtém um asset do nflverse com cache em data-raw/.
 * Baixa somente se `force` ou se a versão remota difere da registrada localmente.
 * Retorna null se o asset não existir remotamente (ex.: playoffs de uma temporada em andamento).
 */
export async function getAsset(tag: string, name: string, force: boolean, log: (m: string) => void): Promise<RawFile | null> {
  await fs.mkdir(RAW_DIR, { recursive: true });
  const file = path.join(RAW_DIR, name);
  const metaFile = `${file}.meta.json`;
  const versions = await releaseVersions(tag);
  const remoteVersion = versions[name] ?? null;
  const hasRemoteList = Object.keys(versions).length > 0;
  if (hasRemoteList && !remoteVersion) return null;

  let localVersion: string | null = null;
  let haveLocal = false;
  try {
    localVersion = JSON.parse(await fs.readFile(metaFile, 'utf8')).version ?? null;
    await fs.access(file);
    haveLocal = true;
  } catch {
    /* sem cache */
  }

  const needs = force || !haveLocal || (remoteVersion !== null && remoteVersion !== localVersion);
  if (!needs) return { name, text: await fs.readFile(file, 'utf8'), version: localVersion, downloaded: false };

  const url = `${RELEASE_BASE}/${tag}/${name}`;
  log(`  ↓ ${name}`);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Arquivo temporário + rename = escrita atômica (não corrompe o cache se o processo cair).
      await fs.writeFile(`${file}.tmp`, text);
      await replaceFile(`${file}.tmp`, file);
      await fs.writeFile(metaFile, JSON.stringify({ version: remoteVersion, retrievedAt: new Date().toISOString(), url }));
      return { name, text, version: remoteVersion, downloaded: true };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  if (haveLocal) {
    log(`  ! falha ao baixar ${name}; usando cache local`);
    return { name, text: await fs.readFile(file, 'utf8'), version: localVersion, downloaded: false };
  }
  throw new Error(`Falha ao baixar ${url}: ${String(lastErr)}`);
}
