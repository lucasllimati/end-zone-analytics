// @vitest-environment node
/** Agendador de cargas e formato dos alertas externos. */
import { Scheduler, due, nextRuns } from '../../server/services/scheduler';
import { webhookRequest, type OpsEvent } from '../../server/services/ops';

const cfg = { partialEveryHours: 6, fullWeekday: 2, fullHourUtc: 7 };

describe('agendador', () => {
  it('parcial a cada N horas; completa no dia/hora configurados, uma vez por dia', () => {
    const mon = new Date('2026-10-12T10:00:00Z'); // segunda
    expect(due(cfg, { lastPartialAt: null, lastFullDay: null }, mon)).toBe('partial');
    expect(due(cfg, { lastPartialAt: mon.getTime() - 5 * 3_600_000, lastFullDay: null }, mon)).toBeNull();
    expect(due(cfg, { lastPartialAt: mon.getTime() - 6 * 3_600_000, lastFullDay: null }, mon)).toBe('partial');
    const tue6 = new Date('2026-10-13T06:59:00Z');
    const tue7 = new Date('2026-10-13T07:00:00Z');
    expect(due(cfg, { lastPartialAt: tue6.getTime(), lastFullDay: null }, tue6)).toBeNull();
    expect(due(cfg, { lastPartialAt: tue6.getTime(), lastFullDay: null }, tue7)).toBe('full');
    expect(due(cfg, { lastPartialAt: tue7.getTime(), lastFullDay: '2026-10-13' }, tue7)).toBeNull();
  });

  it('não marca como executado se já houver carga em andamento (tenta no próximo minuto)', () => {
    let now = new Date('2026-10-12T10:00:00Z');
    let busy = true;
    const started: string[] = [];
    const s = new Scheduler({ partialEveryHours: 1, fullWeekday: null, fullHourUtc: 0 }, (m) => (busy ? false : (started.push(m), true)), () => now);
    s.state.lastPartialAt = now.getTime() - 2 * 3_600_000;
    expect(s.tick()).toBeNull();
    busy = false;
    now = new Date(now.getTime() + 60_000);
    expect(s.tick()).toBe('partial');
    expect(s.tick()).toBeNull();
    expect(started).toEqual(['partial']);
  });

  it('informa as próximas execuções e fica desligado sem configuração', () => {
    const now = new Date('2026-10-12T10:00:00Z');
    const n = nextRuns(cfg, { lastPartialAt: now.getTime(), lastFullDay: null }, now);
    expect(n.partial).toBe('2026-10-12T16:00:00.000Z');
    expect(n.full).toBe('2026-10-13T07:00:00.000Z');
    expect(new Scheduler({ partialEveryHours: 0, fullWeekday: null, fullHourUtc: 7 }, () => true).enabled).toBe(false);
  });
});

describe('alertas externos (webhook)', () => {
  const e: OpsEvent = {
    id: 'x', at: '2026-10-11T00:00:00Z', severity: 'error', component: 'pipeline', jobId: null,
    message: 'Carga falhou', detail: 'HTTP 403', action: 'Configure GITHUB_TOKEN',
  };
  it('formata para ntfy (texto + título ASCII + prioridade), Discord e Slack', () => {
    const ntfy = webhookRequest({ url: 'u', format: 'ntfy', minSeverity: 'warning' }, e);
    expect(ntfy.body).toContain('Ação: Configure GITHUB_TOKEN');
    expect(ntfy.headers.Title).toMatch(/^[\x20-\x7E]+$/);
    expect(ntfy.headers.Priority).toBe('high');
    expect(JSON.parse(webhookRequest({ url: 'u', format: 'discord', minSeverity: 'warning' }, e).body).content).toContain('Carga falhou');
    expect(JSON.parse(webhookRequest({ url: 'u', format: 'slack', minSeverity: 'warning' }, e).body).text).toContain('HTTP 403');
  });
});
