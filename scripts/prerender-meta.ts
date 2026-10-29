/**
 * Gera um HTML por rota pública (dist/teams/buf.html, dist/super-bowl/60.html…) com título, descrição,
 * OpenGraph e canonical próprios. O conteúdo continua sendo montado pelo React; o que muda é o <head>,
 * que buscadores e prévias de links (WhatsApp, X, Slack) leem antes de qualquer JavaScript.
 *
 * A Cloudflare serve /teams/buf a partir de teams/buf.html (html_handling "auto-trailing-slash"),
 * e o servidor Fastify faz o mesmo (server/app.ts). Rotas sem arquivo continuam caindo no index.html.
 *
 * Com SITE_URL definido, também grava URLs absolutas (og:image, og:url, canonical) — exigência das prévias —
 * e o sitemap.xml. Com CF_ANALYTICS_TOKEN, inclui o Cloudflare Web Analytics (sem cookies) e libera o
 * script dele na CSP de public/_headers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_META, gameMeta, type PageMeta } from '../src/content/pageMeta';
import { isPacked, unpack } from '../src/lib/pack';
import type { Game } from '../src/lib/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const site = process.env.SITE_URL?.replace(/\/$/, '') ?? '';
const analytics = process.env.CF_ANALYTICS_TOKEN?.trim() ?? '';
const BRAND = 'End Zone Analytics';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Rotas viram nomes de arquivo: só letras, números, _ e - (nada de ".." vindo dos dados). */
const SAFE_ROUTE = /^(\/[A-Za-z0-9_-]+)+$/;
const read = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, 'data', rel), 'utf8')) as T;

/** Mesmo formato do componente <Seo>: "Título · End Zone Analytics"; a home usa o título padrão. */
function render(base: string, route: string, meta: PageMeta): string {
  const title = meta.title ? `${meta.title} · ${BRAND}` : `${BRAND} — dados, história e analytics da NFL`;
  let html = base
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, (_m, p1: string) => `${p1}${esc(meta.description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, (_m, p1: string) => `${p1}${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, (_m, p1: string) => `${p1}${esc(meta.description)}`);
  if (analytics)
    html = html.replace('</body>', () => `  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${esc(JSON.stringify({ token: analytics }))}'></script>\n  </body>`);
  if (!site) return html;
  html = html.replace(/(<meta property="og:image" content=")\/?/, (_m, p1: string) => `${p1}${site}/`);
  // O index.html também atende as rotas sem arquivo próprio (jogadores, jogos): ali o canonical
  // apontaria tudo para a home. Nessas rotas, o <Seo> define o canonical no navegador.
  if (route === '/') return html;
  const url = `${site}${route}`;
  return html.replace('</head>', () => `  <meta property="og:url" content="${esc(url)}" />\n    <link rel="canonical" href="${esc(url)}" />\n  </head>`);
}

const indexFile = path.join(dist, 'index.html');
const base = fs.readFileSync(indexFile, 'utf8');
const routes: [string, PageMeta][] = Object.entries(PAGE_META);
routes.push(['/matchup', { title: 'Confrontos e rivalidades', description: 'Histórico de confrontos entre dois times da NFL desde 1999: vitórias, placares, playoffs e linha do tempo.' }]);
routes.push(['/season', { title: 'Temporada', description: 'Classificação, calendário, líderes, playoffs, força de tabela e power ranking da temporada da NFL.' }]);
for (const t of read<{ abbr: string; name: string; active: boolean }[]>('teams.json').filter((t) => t.active))
  routes.push([`/teams/${t.abbr.toLowerCase()}`, { title: t.name, description: `${t.name}: perfil, campanha da temporada, analytics, histórico desde 1999 e Super Bowls.` }]);
for (const s of read<{ number: number; roman: string; season: number; winnerName: string; loserName: string; winnerScore: number; loserScore: number; mvp: string | null }[]>('superbowls.json'))
  routes.push([
    `/super-bowl/${s.number}`,
    { title: `Super Bowl ${s.roman}`, description: `Super Bowl ${s.roman} (temporada ${s.season}): ${s.winnerName} ${s.winnerScore} × ${s.loserScore} ${s.loserName}.${s.mvp ? ` MVP: ${s.mvp}.` : ''}` },
  ]);
// Jogos da temporada atual e da anterior (os mais compartilhados): título e descrição de cada um.
const teamNick = new Map(read<{ abbr: string; nick: string }[]>('teams.json').map((t) => [t.abbr, t.nick]));
const current = read<{ coverage: { currentSeason: number } }>('manifest.json').coverage.currentSeason;
for (const season of [current - 1, current]) {
  const file = path.join(root, 'data', 'games', `${season}.json`);
  if (!fs.existsSync(file)) continue;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const g of isPacked(raw) ? unpack<Game>(raw) : (raw as Game[])) if (/^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/.test(g.id)) routes.push([`/games/${g.id}`, gameMeta(g, (t) => teamNick.get(t) ?? t)]);
}

for (const [route, meta] of routes) {
  // A home reescreve o próprio index.html (que também é o fallback das demais rotas).
  if (route !== '/' && !SAFE_ROUTE.test(route)) throw new Error(`Rota inválida para gerar arquivo: ${route}`);
  const file = route === '/' ? indexFile : path.join(dist, `${route}.html`);
  if (path.resolve(file) !== path.resolve(indexFile) && !path.resolve(file).startsWith(path.resolve(dist) + path.sep)) throw new Error(`Arquivo fora de dist: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(base, route, meta));
}

if (analytics) {
  // Libera o script e o envio do Web Analytics na CSP (só quando o token existe).
  const headers = path.join(dist, '_headers');
  const csp = fs.readFileSync(headers, 'utf8');
  fs.writeFileSync(
    headers,
    csp.replace("script-src 'self'", "script-src 'self' https://static.cloudflareinsights.com").replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com"),
  );
}

if (site) {
  const urls = routes.map(([r]) => `  <url><loc>${esc(site + r)}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  fs.appendFileSync(path.join(dist, 'robots.txt'), `Sitemap: ${site}/sitemap.xml\n`);
}
console.log(`HTML com metadados próprios para ${routes.length} rotas${site ? ` (URLs absolutas em ${site})` : ' (SITE_URL ausente: sem URLs absolutas)'}.`);
