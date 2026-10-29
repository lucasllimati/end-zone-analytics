/**
 * Registro operacional (privado): execuções do pipeline, eventos/alertas e auditoria de ações administrativas.
 * Fica em ops/ — fora de data/, que é público. Nunca registra tokens ou segredos.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { replaceFile } from '../etl/files';

export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type Component = 'pipeline' | 'sources' | 'quality' | 'auth' | 'api' | 'client';

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
  trigger: 'admin' | 'cli' | 'scheduler';
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
  /** true = gerou nova publicação; false = nada mudou; null = falhou ou em andamento. */
  changed?: boolean | null;
}

const MAX_RUNS = 100;
const MAX_EVENTS = 500;
/** Cota dos relatos do navegador dentro do log (anônimos: não podem apagar a auditoria). */
const MAX_CLIENT_EVENTS = 100;

export interface Notifier {
  url: string;
  format: 'ntfy' | 'discord' | 'slack';
  minSeverity: Severity;
}

const RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2, critical: 3 };

/** Monta a requisição do webhook no formato do serviço escolhido. */
export function webhookRequest(n: Notifier, e: OpsEvent, site = 'End Zone Analytics'): { body: string; headers: Record<string, string> } {
  const title = `[${site}] ${e.severity.toUpperCase()} · ${e.component}`;
  const text = [e.message, e.action ? `Ação: ${e.action}` : null, e.detail ? e.detail.slice(0, 600) : null].filter(Boolean).join('\n');
  // Texto de evento pode conter dados externos: no Discord, nenhuma menção (@everyone, @here, cargos)
  // é ativada; no Slack, <, > e & são escapados (sem <!channel> nem links disfarçados).
  if (n.format === 'discord') return { body: JSON.stringify({ content: `**${title}**\n${text}`, allowed_mentions: { parse: [] } }), headers: { 'Content-Type': 'application/json' } };
  const slackEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (n.format === 'slack') return { body: JSON.stringify({ text: `*${slackEsc(title)}*\n${slackEsc(text)}` }), headers: { 'Content-Type': 'application/json' } };
  // ntfy: cabeçalhos HTTP só aceitam ASCII — o título vai sem acentos/símbolos.
  const asciiTitle = title.normalize('NFD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ');
  return {
    body: text,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: asciiTitle, Priority: RANK[e.severity] >= 2 ? 'high' : 'default', Tags: e.severity === 'info' ? 'football' : 'warning' },
  };
}

export class OpsLog {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private dir: string, private notifier?: Notifier) {}

  /** Envia alertas acima da severidade mínima para o webhook configurado. Falhas de envio são ignoradas. */
  private notify(e: OpsEvent) {
    const n = this.notifier;
    if (!n?.url || RANK[e.severity] < RANK[n.minSeverity]) return;
    const { body, headers } = webhookRequest(n, e);
    void fetch(n.url, { method: 'POST', body, headers, signal: AbortSignal.timeout(10_000) }).catch(() => {});
  }

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
    this.notify(full);
    return this.exclusive(async () => {
      const list = await this.events();
      list.unshift(full);
      // Relatos do navegador (anônimos) têm cota própria: só os MAX_CLIENT_EVENTS mais recentes ficam,
      // e eles nunca empurram para fora os eventos de login, carga e fontes (a trilha de auditoria).
      let clients = 0;
      const own = list.filter((x) => x.component !== 'client');
      const client = list.filter((x) => x.component === 'client' && ++clients <= MAX_CLIENT_EVENTS);
      const keep = new Set([...own.slice(0, MAX_EVENTS - client.length), ...client]);
      await this.write('events.json', list.filter((x) => keep.has(x)));
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
