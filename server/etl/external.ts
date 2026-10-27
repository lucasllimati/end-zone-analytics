/**
 * Fontes externas fora do nflverse, buscadas no máximo uma vez por semana (cache em data-raw/external):
 *  - resumo de cada time na Wikipedia em português (CC BY-SA 4.0, publicado com atribuição e link);
 *  - prêmios da AP extraídos da Wikipedia em inglês e conferidos com fatos conhecidos (awards.ts).
 * Falha de rede nunca derruba o pipeline: usa a cópia anterior e registra um aviso.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { RAW_DIR } from '../config';
import { AWARDS, missingKnown, parseAwardTable } from './awards';
import type { AwardsData, AwardWinner, PlayerSeasonLine, Team, TeamWiki } from '../../src/lib/types';

// A Wikimedia pede um User-Agent que identifique o projeto e como encontrá-lo.
const UA = 'end-zone-analytics/1.0 (https://end-zone-analytics.nfldata.workers.dev; dados abertos da NFL em português)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WEEK_MS = 7 * 86_400_000;
const DIR = () => path.join(RAW_DIR, 'external');

/** Uma requisição por vez, com pausa entre elas; em 429/503, espera o Retry-After (até 30 s) e tenta de novo. */
async function getJson(url: string): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    await sleep(attempt === 1 ? 250 : 0);
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status === 503) && attempt < 4) {
      await sleep(Math.min(Number(res.headers.get('retry-after')) || 5 * attempt, 30) * 1000);
      continue;
    }
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
}

/**
 * Lê o cache; se tiver menos de uma semana, nem consulta a fonte. Devolve também a data da consulta,
 * que entra no arquivo publicado (a data da execução faria cada carga parecer uma mudança).
 */
async function cachedWeekly<T>(name: string, fetcher: () => Promise<T>, log: (m: string) => void): Promise<{ at: string; data: T } | null> {
  const file = path.join(DIR(), name);
  let cached: { at: string; data: T } | null = null;
  try {
    cached = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    /* sem cache */
  }
  if (cached && Date.now() - Date.parse(cached.at) < WEEK_MS) return cached;
  try {
    const fresh = { at: new Date().toISOString(), data: await fetcher() };
    await fs.mkdir(DIR(), { recursive: true });
    await fs.writeFile(file, JSON.stringify(fresh));
    return fresh;
  } catch (e) {
    log(`  ! ${name}: ${e instanceof Error ? e.message : String(e)} — ${cached ? 'mantida a cópia anterior' : 'sem dados'}`);
    return cached;
  }
}

export async function teamWiki(teams: Team[], log: (m: string) => void): Promise<{ at: string; data: Record<string, TeamWiki> } | null> {
  return cachedWeekly(
    'wiki-teams.json',
    async () => {
      const out: Record<string, TeamWiki> = {};
      for (const t of teams.filter((x) => x.active)) {
        const j = await getJson(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.name.replace(/ /g, '_'))}`);
        if (j.type !== 'standard' || !j.extract) continue;
        out[t.abbr] = { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(j.title)}`, revisedAt: j.timestamp ?? null };
      }
      if (Object.keys(out).length < 30) throw new Error(`só ${Object.keys(out).length} resumos encontrados`);
      return out;
    },
    log,
  );
}

const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '')
    .replace(/[^a-z]/g, '');

export async function awards(lines: PlayerSeasonLine[], log: (m: string) => void): Promise<AwardsData | null> {
  const pages = await cachedWeekly(
    'wiki-awards.json',
    async () => {
      const out: Record<string, string> = {};
      for (const page of new Set(AWARDS.map((a) => a.page))) {
        const j = await getJson(`https://en.wikipedia.org/w/api.php?action=parse&page=${page}&prop=wikitext&redirects=1&format=json&formatversion=2`);
        if (!j.parse?.wikitext) throw new Error(`página ${page} sem conteúdo`);
        out[page] = j.parse.wikitext;
      }
      return out;
    },
    log,
  );
  if (!pages) return null;
  // Jogador da base por temporada + nome (o prêmio é da temporada em que ele jogou).
  // Plano B para apelidos (Pat × Patrick, Mike × Michael): inicial + sobrenome, se for único na temporada.
  const ids = new Map<string, string>();
  const short = new Map<string, string | null>();
  const initialLast = (n: string) => {
    const parts = n.replace(/(Jr|Sr|II|III|IV)\.?/g, '').trim().split(/\s+/);
    return `${normName(parts[0]).slice(0, 1)}${normName(parts.slice(1).join(''))}`;
  };
  for (const l of lines) {
    ids.set(`${l.season}|${normName(l.name)}`, l.id);
    const k = `${l.season}|${initialLast(l.name)}`;
    short.set(k, short.has(k) && short.get(k) !== l.id ? null : l.id);
  }
  const findId = (season: number, name: string) => ids.get(`${season}|${normName(name)}`) ?? short.get(`${season}|${initialLast(name)}`) ?? null;
  const winners: AwardWinner[] = [];
  const rejected: AwardsData['rejected'] = [];
  for (const a of AWARDS) {
    const rows = parseAwardTable(pages.data[a.page] ?? '', a.caption);
    const missing = missingKnown(a.key, rows);
    if (missing.length) {
      rejected.push({ key: a.key, missing });
      log(`  ! Prêmio ${a.label}: extração não confere (${missing.join(', ')}) — fora da publicação`);
      continue;
    }
    for (const r of rows) winners.push({ award: a.key, season: r.season, name: r.name, team: r.team, playerId: a.key === 'coy' ? null : findId(r.season, r.name) });
  }
  return {
    source: 'Wikipedia (listas de vencedores dos prêmios da Associated Press)',
    license: 'CC BY-SA 4.0',
    retrievedAt: pages.at,
    awards: AWARDS.map((a) => ({ key: a.key, label: a.label, url: `https://en.wikipedia.org/wiki/${a.page}` })),
    winners,
    rejected,
  };
}
