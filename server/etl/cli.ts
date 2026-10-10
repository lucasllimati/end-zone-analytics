/**
 * CLI do pipeline de dados.
 *
 *   npm run data:full                                   # carga completa
 *   npm run data:partial                                # incremental: baixa só o que mudou
 *   npm run data:partial -- --datasets games,playerStats --seasons 2026
 *   npm run data:check                                  # verifica se há dados novos (não baixa nada)
 *   npm run data:quality                                # mostra o relatório de qualidade atual
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../config';
import { SOURCES } from '../../src/lib/sources';
import { checkForUpdates } from '../../src/lib/updates';
import type { QualityCheck } from '../../src/lib/types';
import { fetchJson } from './fetcher';
import { readManifest, runPipeline } from './pipeline';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq?.split('=')[1];
}

const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined);

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'full' || cmd === 'partial') {
    const datasets = list(arg('datasets'));
    const unknown = datasets?.filter((d) => !SOURCES.some((s) => s.key === d));
    if (unknown?.length) {
      console.error(`Dataset(s) desconhecido(s): ${unknown.join(', ')}. Válidos: ${SOURCES.map((s) => s.key).join(', ')}`);
      process.exit(2);
    }
    const seasons = list(arg('seasons'))?.map(Number);
    await runPipeline({ mode: cmd, datasets, seasons, log: (m) => console.log(m) });
    return;
  }
  if (cmd === 'check') {
    const manifest = await readManifest();
    if (!manifest) {
      console.log('Nenhum dado local. Execute: npm run data:full');
      return;
    }
    const res = await checkForUpdates(manifest, fetchJson);
    console.table(
      res.items.map((i) => ({
        dataset: i.key,
        atualização: i.error ? `erro: ${i.error}` : i.hasUpdate ? 'SIM' : 'não',
        temporadas: i.seasons?.join(', ') ?? '',
        local: i.localVersion ?? '—',
        remoto: i.remoteVersion ?? '—',
      })),
    );
    console.log(res.hasUpdates ? 'Há dados novos. Rode: npm run data:partial' : 'Dados locais estão atualizados.');
    return;
  }
  if (cmd === 'quality') {
    const q = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'quality.json'), 'utf8')) as { checks: QualityCheck[] };
    console.table(q.checks.map((c) => ({ status: c.status, dataset: c.dataset, verificação: c.description, detalhe: c.detail })));
    return;
  }
  console.log('Uso: tsx server/etl/cli.ts <full|partial|check|quality> [--datasets a,b] [--seasons 2025,2026]');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
