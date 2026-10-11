import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const RAW_DIR = path.join(ROOT, 'data-raw');
export const CURATED_DIR = path.join(ROOT, 'data-curated');
export const DIST_DIR = path.join(ROOT, 'dist');
/** Registros operacionais privados (execuções, alertas, auditoria). Nunca servido publicamente. */
export const OPS_DIR = process.env.OPS_DIR ?? path.join(ROOT, 'ops');

export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  host: process.env.HOST ?? '127.0.0.1',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  githubToken: process.env.GITHUB_TOKEN ?? '',
  firstSeason: Number(process.env.FIRST_SEASON ?? 1999),
  isProd: process.env.NODE_ENV === 'production',
  /** Agendamento das cargas (ver services/scheduler.ts). */
  schedule: {
    partialEveryHours: Number(process.env.SYNC_PARTIAL_EVERY_HOURS ?? 0),
    fullWeekday: process.env.SYNC_FULL_WEEKDAY ? Number(process.env.SYNC_FULL_WEEKDAY) : null,
    fullHourUtc: Number(process.env.SYNC_FULL_HOUR_UTC ?? 7),
  },
  /** Alertas externos (opcional): URL de webhook e formato (ntfy, discord ou slack). */
  alertWebhook: process.env.ALERT_WEBHOOK_URL ?? '',
  alertFormat: (process.env.ALERT_WEBHOOK_FORMAT ?? 'ntfy') as 'ntfy' | 'discord' | 'slack',
  alertMinSeverity: (process.env.ALERT_MIN_SEVERITY ?? 'warning') as 'info' | 'warning' | 'error' | 'critical',
};
