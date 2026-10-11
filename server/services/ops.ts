/**
 * Registro operacional (privado): execuções do pipeline, eventos/alertas e auditoria de ações administrativas.
 * Fica em ops/ — fora de data/, que é público. Nunca registra tokens ou segredos.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { replaceFile } from '../etl/files';

export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type Component = 'pipeline' | 'sources' | 'quality' | 'auth' | 'api';

export interface OpsEvent {
  id: string;
  at: string;
  severity: Severity;
  component: Component;
  jobId: string | null;
  message: string;
  detail: string | null;
  action: string | null;
}

export interface OpsRun {
  id: string;
  mode: 'full' | 'partial';
  trigger: 'admin' | 'cli';
  datasets: string[];
  seasons: number[];
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  downloaded: number;
  warnings: string[];
  error: string | null;
  ingestionVersion: number | null;
}

const MAX_RUNS = 100;
const MAX_EVENTS = 500;

export class OpsLog {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private dir: string) {}

  private async read<T>(file: string): Promise<T[]> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.dir, file), 'utf8')) as T[];
    } catch {
      return [];
    }
  }

  private async write(file: string, data: unknown) {
    await fs.mkdir(this.dir, { recursive: true });
    const target = path.join(this.dir, file);
    await fs.writeFile(`${target}.tmp`, JSON.stringify(data));
    await replaceFile(`${target}.tmp`, target);
  }

  /** Serializa as escritas (evita perder registros com chamadas concorrentes). */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }

  runs = () => this.read<OpsRun>('runs.json');
  events = () => this.read<OpsEvent>('events.json');

  event(e: Omit<OpsEvent, 'id' | 'at' | 'jobId' | 'detail' | 'action'> & Partial<Pick<OpsEvent, 'jobId' | 'detail' | 'action'>>) {
    const full: OpsEvent = { id: crypto.randomUUID(), at: new Date().toISOString(), jobId: null, detail: null, action: null, ...e };
    return this.exclusive(async () => {
      const list = await this.events();
      list.unshift(full);
      await this.write('events.json', list.slice(0, MAX_EVENTS));
      return full;
    });
  }

  saveRun(run: OpsRun) {
    return this.exclusive(async () => {
      const list = (await this.runs()).filter((r) => r.id !== run.id);
      list.unshift(run);
      await this.write('runs.json', list.slice(0, MAX_RUNS));
    });
  }
}

/** Ação recomendada para mensagens de erro conhecidas. */
export function recommendedAction(message: string): string | null {
  if (/limite de consultas|rate limit|HTTP 403|HTTP 429/i.test(message))
    return 'Aguarde o horário de liberação ou configure GITHUB_TOKEN no .env (5.000 consultas/hora).';
  if (/EPERM|EBUSY|EACCES/i.test(message)) return 'Outro processo está usando os arquivos; tente novamente em alguns segundos.';
  if (/fetch failed|ENOTFOUND|ECONNRESET|timeout|aborted/i.test(message)) return 'Verifique a conexão com a internet e tente de novo.';
  if (/versões|verificar se/i.test(message)) return 'Sem a lista de versões não dá para saber o que mudou. Tente mais tarde ou rode uma carga com fontes forçadas.';
  return null;
}
