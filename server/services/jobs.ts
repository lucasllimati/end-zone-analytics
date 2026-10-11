/**
 * Fila de sincronização com execução única (single-flight): só um job do pipeline roda por vez.
 * Cada execução é registrada no log operacional (ops/) com duração, volume, avisos e erros.
 */
import crypto from 'node:crypto';
import { runPipeline, type PipelineOptions } from '../etl/pipeline';
import { recommendedAction, type OpsLog, type OpsRun } from './ops';
import type { Manifest } from '../../src/lib/types';

export interface SyncJob {
  id: string;
  mode: 'full' | 'partial';
  datasets: string[];
  seasons: number[];
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt: string | null;
  log: string[];
  downloaded: string[];
  warnings: string[];
  error: string | null;
}

const jobs = new Map<string, SyncJob>();
let running: SyncJob | null = null;

export type Runner = (opts: PipelineOptions) => Promise<{ downloaded: string[]; warnings?: string[]; manifest?: Manifest }>;

export function startSync(
  opts: { mode: 'full' | 'partial'; datasets?: string[]; seasons?: number[] },
  onDone?: () => void,
  runner: Runner = runPipeline,
  ops?: OpsLog,
) {
  if (running) return { job: running, alreadyRunning: true };
  const job: SyncJob = {
    id: crypto.randomUUID(),
    mode: opts.mode,
    datasets: opts.datasets ?? [],
    seasons: opts.seasons ?? [],
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    log: [],
    downloaded: [],
    warnings: [],
    error: null,
  };
  jobs.set(job.id, job);
  running = job;
  const run: OpsRun = {
    id: job.id, mode: job.mode, trigger: 'admin', datasets: job.datasets, seasons: job.seasons, status: 'running', startedAt: job.startedAt,
    finishedAt: null, durationMs: null, downloaded: 0, warnings: [], error: null, ingestionVersion: null,
  };
  const record = (p: Promise<unknown> | undefined) => p?.catch(() => {});
  record(ops?.saveRun(run));
  record(ops?.event({ severity: 'info', component: 'pipeline', jobId: job.id, message: `Carga ${job.mode === 'full' ? 'completa' : 'parcial'} iniciada` }));

  runner({ ...opts, log: (m) => job.log.push(m) })
    .then((r) => {
      job.status = 'done';
      job.downloaded = r.downloaded;
      job.warnings = r.warnings ?? [];
      run.ingestionVersion = r.manifest?.ingestionVersion ?? null;
      const q = r.manifest?.quality;
      record(
        ops?.event({
          severity: job.warnings.length ? 'warning' : 'info',
          component: 'pipeline',
          jobId: job.id,
          message: `Carga concluída: ${r.downloaded.length} arquivo(s) novo(s)${job.warnings.length ? `, ${job.warnings.length} aviso(s)` : ''}`,
          detail: job.warnings.join('\n') || null,
        }),
      );
      if (q && (q.fail || q.warn))
        record(
          ops?.event({
            severity: q.fail ? 'error' : 'warning',
            component: 'quality',
            jobId: job.id,
            message: `Qualidade: ${q.fail} falha(s), ${q.warn} alerta(s)`,
            action: q.fail ? 'Revise as verificações com falha antes de divulgar os dados.' : 'Alertas não bloqueiam a publicação; confira os detalhes na aba Qualidade.',
          }),
        );
    })
    .catch((e: unknown) => {
      job.status = 'error';
      job.error = e instanceof Error ? e.message : String(e);
      record(
        ops?.event({ severity: 'error', component: 'pipeline', jobId: job.id, message: 'Carga falhou; o manifest publicado não foi atualizado', detail: job.error, action: recommendedAction(job.error) }),
      );
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
      running = null;
      Object.assign(run, {
        status: job.status,
        finishedAt: job.finishedAt,
        durationMs: Date.parse(job.finishedAt) - Date.parse(job.startedAt),
        downloaded: job.downloaded.length,
        warnings: job.warnings,
        error: job.error,
      });
      record(ops?.saveRun(run));
      onDone?.();
      // Mantém somente os 20 jobs mais recentes em memória (o histórico completo fica em ops/).
      const ids = [...jobs.keys()];
      for (const id of ids.slice(0, Math.max(0, ids.length - 20))) jobs.delete(id);
    });
  return { job, alreadyRunning: false };
}

export const getJob = (id: string) => jobs.get(id) ?? null;
export const listJobs = () => [...jobs.values()].reverse();
export const currentJob = () => running;
