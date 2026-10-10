import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const RAW_DIR = path.join(ROOT, 'data-raw');
export const CURATED_DIR = path.join(ROOT, 'data-curated');
export const DIST_DIR = path.join(ROOT, 'dist');

export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  host: process.env.HOST ?? '127.0.0.1',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  githubToken: process.env.GITHUB_TOKEN ?? '',
  firstSeason: Number(process.env.FIRST_SEASON ?? 1999),
  isProd: process.env.NODE_ENV === 'production',
};
