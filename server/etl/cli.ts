/**
 * CLI do pipeline de dados.
 *
 *   npm run data:full                                   # carga completa
 *   npm run data:partial                                # incremental: baixa só o que mudou
 *   npm run data:partial -- --datasets games,playerStats --seasons 2026
 *   npm run data:check                                  # verifica se há dados novos (não baixa nada)
 *   npm run data:quality                                # mostra o relatório de qualidade atual
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, OPS_DIR, config } from '../config';
import { OpsLog, recommendedAction, type OpsRun } from '../services/ops';
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
    // Registra a execução no log operacional (visível na área administrativa), com sucesso ou falha.
    const ops = new OpsLog(OPS_DIR, { url: config.alertWebhook, format: config.alertFormat, minSeverity: config.alertMinSeverity });
    const run: OpsRun = {
      id: crypto.randomUUID(), mode: cmd, trigger: 'cli', datasets: datasets ?? [], seasons: seasons ?? [], status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null, durationMs: null, downloaded: 0, warnings: [], error: null, ingestionVersion: null,
    };
    try {
      const r = await runPipeline({ mode: cmd, datasets, seasons, log: (m) => console.log(m) });
      Object.assign(run, { status: 'done', downloaded: r.downloaded.length, warnings: r.warnings, ingestionVersion: r.manifest.ingestionVersion, changed: r.changed });
      await ops.event({ severity: r.warnings.length ? 'warning' : 'info', component: 'pipeline', jobId: run.id, message: r.changed ? `Carga via terminal concluída: atualizado ${r.changedSets.map((c) => c.label).join(', ') || 'qualidade reavaliada'}` : 'Carga via terminal concluída: sem mudanças nos dados (publicação mantida)', detail: r.warnings.join('\n') || null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Object.assign(run, { status: 'error', error: msg });
      await ops.event({ severity: 'error', component: 'pipeline', jobId: run.id, message: 'Carga via terminal falhou; o manifest publicado não foi atualizado', detail: msg, action: recommendedAction(msg) });
      throw e;
    } finally {
      run.finishedAt = new Date().toISOString();
      run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
      await ops.saveRun(run);
    }
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
