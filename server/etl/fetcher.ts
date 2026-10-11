import fs from 'node:fs/promises';
import path from 'node:path';
import { RAW_DIR, config } from '../config';
import { replaceFile } from './files';
import { RELEASE_BASE } from '../../src/lib/sources';
import { remoteAssetVersions } from '../../src/lib/updates';

const UA = 'end-zone-analytics/1.0 (+https://github.com/)';

/** Erro de fonte com contexto acionável (ex.: limite da API do GitHub e horário de liberação). */
export class SourceError extends Error {
  constructor(message: string, public status: number, public resetAt: string | null = null) {
    super(message);
  }
}

/** Mensagem legível para respostas 403/429 da API do GitHub (limite de requisições). */
export function rateLimitMessage(status: number, headers: Headers, url: string): SourceError {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = Number(headers.get('x-ratelimit-reset'));
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : null;
  if ((status === 403 || status === 429) && (remaining === '0' || status === 429)) {
    const when = resetAt ? ` Libera às ${new Date(resetAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : '';
    const hint = config.githubToken ? '' : ' Configure GITHUB_TOKEN para 5.000 consultas/hora.';
    return new SourceError(`Limite de consultas da API do GitHub atingido (HTTP ${status}).${when}${hint}`, status, resetAt);
  }
  return new SourceError(`HTTP ${status} em ${url}`, status, resetAt);
}

/* Requisições condicionais (ETag): respostas 304 não consomem o limite da API do GitHub. */
const ETAG_FILE = () => path.join(RAW_DIR, '.github-etags.json');
let etags: Record<string, { etag: string; body: unknown }> | null = null;
async function etagStore() {
  if (!etags) {
    try {
      etags = JSON.parse(await fs.readFile(ETAG_FILE(), 'utf8'));
    } catch {
      etags = {};
    }
  }
  return etags!;
}
async function saveEtags() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(ETAG_FILE(), JSON.stringify(etags ?? {}));
}

export async function fetchJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  const isGithubApi = url.includes('api.github.com');
  if (config.githubToken && isGithubApi) headers.Authorization = `Bearer ${config.githubToken}`;
  const store = isGithubApi ? await etagStore() : null;
  const cached = store?.[url];
  if (cached) headers['If-None-Match'] = cached.etag;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (res.status === 304 && cached) return cached.body;
  if (!res.ok) throw rateLimitMessage(res.status, res.headers, url);
  const body = await res.json();
  const etag = res.headers.get('etag');
  if (store && etag) {
    store[url] = { etag, body };
    await saveEtags().catch(() => {});
  }
  return body;
}

const versionCache = new Map<string, Record<string, string>>();
const versionErrors = new Map<string, string>();

/** Versões remotas por asset (cacheado durante uma execução do pipeline). Falhas ficam registradas em `versionErrors`. */
export async function releaseVersions(tag: string): Promise<Record<string, string>> {
  if (!versionCache.has(tag)) {
    try {
      versionCache.set(tag, await remoteAssetVersions(tag, fetchJson));
      versionErrors.delete(tag);
    } catch (e) {
      versionCache.set(tag, {});
      versionErrors.set(tag, e instanceof Error ? e.message : String(e));
    }
  }
  return versionCache.get(tag)!;
}

/** Limpa o cache de versões (cada execução do pipeline consulta de novo). */
export function resetVersionCache() {
  versionCache.clear();
  versionErrors.clear();
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
 * Sem a lista de versões remotas, uma carga incremental não consegue saber o que mudou: nesse caso
 * falha com erro explícito em vez de reportar sucesso sem atualizar nada.
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

  if (!hasRemoteList && haveLocal && !force) {
    const why = versionErrors.get(tag) ?? 'lista de versões indisponível';
    throw new SourceError(`Não foi possível verificar se "${name}" mudou: ${why}`, 503);
  }
  if (!hasRemoteList) log(`  ! versões remotas indisponíveis para ${tag} (${versionErrors.get(tag) ?? 'motivo desconhecido'}); baixando sem versão`);

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
