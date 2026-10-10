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
