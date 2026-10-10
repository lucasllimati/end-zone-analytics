/**
 * Fila de sincronização com execução única (single-flight): só um job do pipeline roda por vez.
 */
import crypto from 'node:crypto';
import { runPipeline, type PipelineOptions } from '../etl/pipeline';

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
  error: string | null;
}

const jobs = new Map<string, SyncJob>();
let running: SyncJob | null = null;

export type Runner = (opts: PipelineOptions) => Promise<{ downloaded: string[] }>;

export function startSync(opts: { mode: 'full' | 'partial'; datasets?: string[]; seasons?: number[] }, onDone?: () => void, runner: Runner = runPipeline) {
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
    error: null,
  };
  jobs.set(job.id, job);
  running = job;
  runner({ ...opts, log: (m) => job.log.push(m) })
    .then((r) => {
      job.status = 'done';
      job.downloaded = r.downloaded;
    })
    .catch((e: unknown) => {
      job.status = 'error';
      job.error = e instanceof Error ? e.message : String(e);
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
      running = null;
      onDone?.();
      // Mantém somente os 20 jobs mais recentes.
      const ids = [...jobs.keys()];
      for (const id of ids.slice(0, Math.max(0, ids.length - 20))) jobs.delete(id);
    });
  return { job, alreadyRunning: false };
}

export const getJob = (id: string) => jobs.get(id) ?? null;
export const listJobs = () => [...jobs.values()].reverse();
export const currentJob = () => running;
