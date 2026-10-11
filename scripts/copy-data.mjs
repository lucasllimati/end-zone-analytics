// Copia data/ para dist/data — para hospedar o site como estático (sem a API).
// Sem a API, o site funciona com os dados já gerados; placar ao vivo e a sincronização pelo navegador ficam indisponíveis.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'data');
const to = path.join(root, 'dist', 'data');
if (!fs.existsSync(path.join(from, 'manifest.json'))) {
  console.error('Sem dados em data/. Rode antes: npm run data:full');
  process.exit(1);
}
fs.cpSync(from, to, { recursive: true, filter: (src) => !/manifest-\d+\.json$/.test(src) });
console.log(`Dados copiados para ${to}`);

// Sitemap (somente rotas públicas) — requer a URL pública do site em SITE_URL (ex.: https://endzone.example).
const site = process.env.SITE_URL?.replace(/\/$/, '');
if (site) {
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(from, rel), 'utf8'));
  const routes = ['/', '/season', '/teams', '/players', '/compare', '/matchup', '/stadiums', '/super-bowl', '/records', '/draft', '/hall-of-fame', '/history', '/rankings', '/explorer', '/learn', '/rules', '/positions', '/playbook', '/strategy', '/glossary', '/data'];
  for (const t of read('teams.json').filter((t) => t.active)) routes.push(`/teams/${t.abbr.toLowerCase()}`);
  for (const s of read('superbowls.json')) routes.push(`/super-bowl/${s.number}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${site}${r}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(root, 'dist', 'sitemap.xml'), xml);
  fs.appendFileSync(path.join(root, 'dist', 'robots.txt'), `Sitemap: ${site}/sitemap.xml\n`);
  console.log(`Sitemap com ${routes.length} URLs gerado.`);
} else {
  console.log('SITE_URL não definido: sitemap.xml não gerado.');
}
