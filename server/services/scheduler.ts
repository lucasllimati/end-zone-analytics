/**
 * Agendador interno das cargas de dados. Roda dentro do processo da API para que cada execução
 * apareça no painel administrativo (jobs, logs e alertas), com a mesma fila única das cargas manuais.
 *
 *   SYNC_PARTIAL_EVERY_HOURS=6   carga parcial (incremental) a cada N horas; 0 desliga
 *   SYNC_FULL_WEEKDAY=2          carga completa semanal (0 = domingo … 6 = sábado); vazio desliga
 *   SYNC_FULL_HOUR_UTC=7         hora (UTC) da carga completa semanal
 */
export interface ScheduleConfig {
  partialEveryHours: number;
  fullWeekday: number | null;
  fullHourUtc: number;
}

export interface ScheduleState {
  lastPartialAt: number | null;
  lastFullDay: string | null;
}

/** Decide o que rodar agora (função pura, testável). Carga completa tem prioridade. */
export function due(cfg: ScheduleConfig, st: ScheduleState, now: Date): 'full' | 'partial' | null {
  const day = now.toISOString().slice(0, 10);
  if (cfg.fullWeekday !== null && now.getUTCDay() === cfg.fullWeekday && now.getUTCHours() >= cfg.fullHourUtc && st.lastFullDay !== day) return 'full';
  if (cfg.partialEveryHours > 0 && (st.lastPartialAt === null || now.getTime() - st.lastPartialAt >= cfg.partialEveryHours * 3_600_000)) return 'partial';
  return null;
}

/** Próximas execuções previstas (para exibir no painel). */
export function nextRuns(cfg: ScheduleConfig, st: ScheduleState, now: Date): { partial: string | null; full: string | null } {
  const partial =
    cfg.partialEveryHours > 0 ? new Date(Math.max(now.getTime(), (st.lastPartialAt ?? now.getTime()) + cfg.partialEveryHours * 3_600_000)).toISOString() : null;
  let full: string | null = null;
  if (cfg.fullWeekday !== null) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), cfg.fullHourUtc));
    while (d.getUTCDay() !== cfg.fullWeekday || d.getTime() < now.getTime() || st.lastFullDay === d.toISOString().slice(0, 10)) d.setUTCDate(d.getUTCDate() + 1);
    full = d.toISOString();
  }
  return { partial, full };
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  readonly state: ScheduleState = { lastPartialAt: null, lastFullDay: null };

  constructor(
    readonly cfg: ScheduleConfig,
    private start: (mode: 'full' | 'partial') => boolean,
    private now: () => Date = () => new Date(),
  ) {}

  get enabled() {
    return this.cfg.partialEveryHours > 0 || this.cfg.fullWeekday !== null;
  }

  /** Inicia o relógio. A primeira parcial espera um intervalo completo (a carga inicial já acontece no boot). */
  run(intervalMs = 60_000) {
    if (!this.enabled || this.timer) return;
    this.state.lastPartialAt = this.now().getTime();
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.timer.unref();
  }

  tick() {
    const now = this.now();
    const what = due(this.cfg, this.state, now);
    if (!what) return null;
    // Se já houver uma carga em andamento, tenta de novo no próximo minuto.
    if (!this.start(what)) return null;
    this.state.lastPartialAt = now.getTime();
    if (what === 'full') this.state.lastFullDay = now.toISOString().slice(0, 10);
    return what;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  next() {
    return this.enabled ? nextRuns(this.cfg, this.state, this.now()) : null;
  }
}
