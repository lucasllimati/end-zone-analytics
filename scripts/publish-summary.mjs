// Resumo legível de uma execução de publicação (aparece na página da execução no GitHub Actions).
// Uso: node scripts/publish-summary.mjs <changed:true|false> <deployed:true|false>  >> "$GITHUB_STEP_SUMMARY"
import fs from 'node:fs';

const [changed = 'false', deployed = 'false'] = process.argv.slice(2);
const read = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const m = read('data/manifest.json');
const q = read('data/quality.json');
const changes = read('data/history/changes.json') ?? [];
const br = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

const out = ['## End Zone Analytics — publicação', ''];
if (!m) {
  out.push('❌ Nenhum dado foi gerado. Veja o passo "Carga de dados" acima.');
} else {
  out.push(
    `| | |`,
    `|---|---|`,
    `| Dados | ${changed === 'true' ? '🆕 **atualizados nesta execução**' : 'Sem mudanças nas fontes'} |`,
    `| Site | ${deployed === 'true' ? '🚀 publicado no Cloudflare' : 'não republicado (nada mudou)'} |`,
    `| Publicação atual | ${br(m.generatedAt)} (horário de Brasília) |`,
    `| Fontes verificadas | ${br(m.lastCheckedAt ?? m.generatedAt)} |`,
    `| Cobertura | ${m.coverage.firstSeason}–${m.coverage.lastSeason} · semana atual: ${m.coverage.currentWeek ?? '—'} |`,
    `| Qualidade | ✅ ${m.quality.pass} ok · ⚠️ ${m.quality.warn} alerta(s) · ❌ ${m.quality.fail} falha(s) |`,
    '',
  );
  const last = changes[0];
  if (changed === 'true' && last?.changed?.length) {
    out.push('### O que mudou', '');
    for (const c of last.changed) out.push(`- ${c.label}: ${c.delta === null ? `${c.rows} linhas` : c.delta === 0 ? 'valores atualizados' : `${c.delta > 0 ? '+' : ''}${c.delta} linhas`}`);
    out.push('');
  }
  const issues = (q?.checks ?? []).filter((c) => c.status !== 'pass');
  if (issues.length) {
    out.push('### Alertas de qualidade', '');
    for (const c of issues) out.push(`- ${c.status === 'fail' ? '❌' : '⚠️'} **${c.description}** — ${c.detail}`);
    out.push('');
  }
}
console.log(out.join('\n'));
