import type { Manifest, UpdateCheckItem, UpdateCheckResult } from './types';
import { RELEASE_API, SOURCES, assetName } from './sources';

interface ReleaseAsset {
  name: string;
  updated_at: string;
  size: number;
}

export type FetchJson = (url: string) => Promise<unknown>;

/** Versões remotas por asset para um release (nome → updated_at). */
export async function remoteAssetVersions(tag: string, fetchJson: FetchJson): Promise<Record<string, string>> {
  const data = (await fetchJson(`${RELEASE_API}/${tag}`)) as { assets?: ReleaseAsset[] };
  const out: Record<string, string> = {};
  for (const a of data.assets ?? []) out[a.name] = a.updated_at;
  return out;
}

/**
 * Compara as versões locais (manifest) com as remotas.
 * Para fontes por temporada, informa quais temporadas mudaram — base da carga parcial.
 */
export async function checkForUpdates(manifest: Manifest, fetchJson: FetchJson): Promise<UpdateCheckResult> {
  const items: UpdateCheckItem[] = [];
  const seasons = range(manifest.coverage.firstSeason, manifest.coverage.currentSeason);
  await Promise.all(
    SOURCES.map(async (src) => {
      const local = manifest.datasets[src.key];
      try {
        const remote = await remoteAssetVersions(src.tag, fetchJson);
        const localAssets = local?.assets ?? {};
        const names = src.seasonal ? seasons.flatMap((s) => src.assets.map((a) => assetName(a, s))) : src.assets;
        const changed = names.filter((n) => remote[n] && remote[n] !== localAssets[n]);
        const changedSeasons = src.seasonal
          ? [...new Set(changed.map((n) => Number(n.match(/(\d{4})\.csv$/)?.[1])).filter(Boolean))].sort()
          : undefined;
        const remoteVersion = names.map((n) => remote[n]).filter(Boolean).sort().pop() ?? null;
        items.push({
          key: src.key,
          label: src.label,
          localVersion: local?.remoteVersion ?? null,
          remoteVersion,
          hasUpdate: changed.length > 0,
          seasons: changedSeasons,
        });
      } catch (e) {
        items.push({
          key: src.key,
          label: src.label,
          localVersion: local?.remoteVersion ?? null,
          remoteVersion: null,
          hasUpdate: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }),
  );
  items.sort((a, b) => SOURCES.findIndex((s) => s.key === a.key) - SOURCES.findIndex((s) => s.key === b.key));
  return { checkedAt: new Date().toISOString(), hasUpdates: items.some((i) => i.hasUpdate), items };
}

export function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}
