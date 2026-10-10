import { useState } from 'react';
import { Callout, ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { Loading } from '../components/States';
import { RefreshIcon } from '../components/Icons';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { useUpdates } from '../data/useUpdates';
import { SOURCES } from '../lib/sources';
import { dateBR, relativeTime } from '../lib/format';

const STATUS: Record<string, { cls: string; label: string }> = {
  pass: { cls: 'good', label: '✓ ok' },
  warn: { cls: 'warn', label: '! alerta' },
  fail: { cls: 'live', label: '✕ falha' },
};

export default function DataCenter() {
  const m = useManifest();
  const quality = useAsync(() => api.quality(), []);
  const changes = useAsync(() => api.changes().catch(() => []), []);
  const { result, checking, check, apiAvailable, sync, job, syncError } = useUpdates(false);
  const [mode, setMode] = useState<'partial' | 'full'>('partial');
  const [datasets, setDatasets] = useState<string[]>([]);
  const [seasons, setSeasons] = useState('');
  const [token, setToken] = useState('');
  const [checkError, setCheckError] = useState<string | null>(null);

  if (m.loading) return <Loading height={400} />;
  const man = m.data!;
  const toggle = (k: string) => setDatasets((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  const seasonList = seasons
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1999 && n <= 2100);
  const cli =
    mode === 'full'
      ? 'npm run data:full'
      : `npm run data:partial${datasets.length ? ` -- --datasets ${datasets.join(',')}` : ''}${seasonList.length ? `${datasets.length ? '' : ' --'} --seasons ${seasonList.join(',')}` : ''}`;

  return (
    <div className="stack">
      <Seo title="Dados, fontes e atualização" description="Fontes de dados, licenças, versões, qualidade dos dados e atualização (carga completa ou parcial)." />
      <PageHeader eyebrow="Plataforma" title="Dados, fontes e atualização" lede="Transparência total: de onde vem cada número, quando foi atualizado, o que foi validado e como atualizar." />
      <div className="tiles">
        <StatTile label="Última atualização" value={<span style={{ fontSize: '1.1rem' }}>{dateBR(man.generatedAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>} note={relativeTime(man.generatedAt)} />
        <StatTile label="Cobertura detalhada" value={`${man.coverage.firstSeason}–${man.coverage.lastSeason}`} note={`Semana atual: ${man.coverage.currentWeek ?? '—'}`} />
        <StatTile label="Versão da ingestão" value={`v${man.ingestionVersion}`} note={`Último modo: ${man.lastMode === 'full' ? 'completo' : 'parcial'}`} />
        <StatTile label="Qualidade" value={`${man.quality.pass}/${man.quality.pass + man.quality.warn + man.quality.fail}`} note={`${man.quality.warn} alerta(s), ${man.quality.fail} falha(s)`} />
      </div>

      <section className="card">
        <div className="card-title">
          <h2>Verificar e atualizar</h2>
          <button
            type="button"
            className="btn"
            disabled={checking}
            onClick={() => {
              setCheckError(null);
              check(true).catch((e: Error) => setCheckError(e.message));
            }}
          >
            <RefreshIcon /> {checking ? 'Verificando…' : 'Verificar dados novos'}
          </button>
        </div>
        <ModeNote
          beginner={<>Os dados vêm de fontes abertas que são atualizadas toda semana. Aqui você confere se há algo novo e atualiza só o que mudou (carga parcial) ou tudo (carga completa).</>}
          expert={<>A verificação compara o <code>updated_at</code> de cada arquivo dos releases do nflverse (API do GitHub) com as versões registradas no manifest. Carga parcial sem filtros = incremental (baixa só o que mudou); com filtros, força os itens escolhidos.</>}
        />
        {checkError && <p className="bad small">{checkError}</p>}
        {result && (
          <div className="table-wrap" style={{ marginTop: 12 }} tabIndex={0} role="region" aria-label="Tabela">
            <table className="data">
              <caption className="sr-only">Resultado da verificação</caption>
              <thead>
                <tr>
                  <th scope="col">Fonte</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Temporadas com novidade</th>
                  <th scope="col">Versão local</th>
                  <th scope="col">Versão remota</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((i) => (
                  <tr key={i.key}>
                    <td>{i.label}</td>
                    <td>{i.error ? <span className="badge live">erro</span> : i.hasUpdate ? <span className="badge warn">dados novos</span> : <span className="badge good">atualizado</span>}</td>
                    <td>{i.seasons?.join(', ') || '—'}</td>
                    <td className="mono xsmall">{i.localVersion ? dateBR(i.localVersion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="mono xsmall">{i.remoteVersion ? dateBR(i.remoteVersion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : i.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="xsmall muted" style={{ padding: '8px 10px', margin: 0 }}>
              Verificado {relativeTime(result.checkedAt)} {apiAvailable === false ? '· consulta feita direto do navegador (API indisponível)' : ''}
            </p>
          </div>
        )}

        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <fieldset className="stack-sm" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <legend className="small" style={{ padding: '0 6px' }}>
              Tipo de carga
            </legend>
            <label className="row small" style={{ gap: 6 }}>
              <input type="radio" name="mode" checked={mode === 'partial'} onChange={() => setMode('partial')} /> <strong>Parcial</strong> — só o que mudou, ou os itens escolhidos abaixo (rápida)
            </label>
            <label className="row small" style={{ gap: 6 }}>
              <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} /> <strong>Completa</strong> — baixa e reprocessa tudo (~1 min, ~40 MB)
            </label>
            {mode === 'partial' && (
              <>
                <div className="small muted">Forçar fontes (opcional):</div>
                <div className="chips">
                  {SOURCES.map((s) => (
                    <button key={s.key} type="button" className="chip" aria-pressed={datasets.includes(s.key)} onClick={() => toggle(s.key)}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <label className="field">
                  Temporadas (opcional, ex.: 2025, 2026)
                  <input className="input" value={seasons} onChange={(e) => setSeasons(e.target.value)} placeholder={String(man.coverage.currentSeason)} />
                </label>
              </>
            )}
          </fieldset>
          <div className="stack-sm">
            <button type="button" className="btn primary" disabled={job?.status === 'running'} onClick={() => sync({ mode, datasets: datasets.length ? datasets : undefined, seasons: seasonList.length ? seasonList : undefined }, token || undefined)}>
              {job?.status === 'running' ? 'Atualizando…' : mode === 'full' ? 'Iniciar carga completa' : 'Iniciar carga parcial'}
            </button>
            <label className="field">
              Token de administrador (só necessário fora do servidor local)
              <input className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
            </label>
            {syncError && <Callout title="Não foi possível iniciar">{syncError}</Callout>}
            <div className="small muted">Ou pelo terminal:</div>
            <code className="mono small" style={{ display: 'block', padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
              {cli}
            </code>
          </div>
        </div>
        {job && (
          <div style={{ marginTop: 16 }}>
            <div className="row small">
              <strong>Job {job.id.slice(0, 8)}</strong>
              <span className={`badge ${job.status === 'done' ? 'good' : job.status === 'error' ? 'live' : 'warn'}`}>{job.status === 'running' ? 'em execução' : job.status === 'done' ? 'concluído' : 'erro'}</span>
              {job.status === 'done' && (
                <button type="button" className="btn sm" onClick={() => window.location.reload()}>
                  Recarregar com os dados novos
                </button>
              )}
            </div>
            <pre className="mono xsmall" style={{ maxHeight: 220, overflow: 'auto', background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-sm)' }} aria-live="polite">
              {job.log?.join('\n')}
              {job.error ? `\nERRO: ${job.error}` : ''}
            </pre>
          </div>
        )}
      </section>

      <section>
        <h2>Fontes e licenças</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
          <table className="data">
            <caption className="sr-only">Fontes de dados</caption>
            <thead>
              <tr>
                <th scope="col">Conjunto</th>
                <th scope="col">Fonte</th>
                <th scope="col">Licença</th>
                <th scope="col" className="num">
                  Linhas
                </th>
                <th scope="col">Versão da fonte</th>
                <th scope="col">Baixado em</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(man.datasets).map((d) => (
                <tr key={d.key}>
                  <td style={{ whiteSpace: 'normal' }}>{d.label}</td>
                  <td>
                    <a href={d.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {d.source.split(' (')[0]}
                    </a>
                  </td>
                  <td className="small" style={{ whiteSpace: 'normal', maxWidth: 280 }}>
                    {d.license}
                  </td>
                  <td className="num">{d.rows.toLocaleString('pt-BR')}</td>
                  <td className="mono xsmall">{d.remoteVersion ? dateBR(d.remoteVersion, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="mono xsmall">{dateBR(d.retrievedAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="xsmall muted">
          Dados ao vivo (placar, drives, probabilidade de vitória) vêm da API pública do site da ESPN, sem garantia de disponibilidade. Logos: CDN da ESPN (marcas registradas dos times, usadas apenas para identificação).
        </p>
      </section>

      <section>
        <h2>Qualidade dos dados</h2>
        {quality.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
            <table className="data">
              <caption className="sr-only">Verificações de qualidade</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Conjunto</th>
                  <th scope="col">Verificação</th>
                  <th scope="col">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {quality.data!.checks.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`badge ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                    </td>
                    <td>{c.dataset}</td>
                    <td style={{ whiteSpace: 'normal' }}>{c.description}</td>
                    <td className="small text-2" style={{ whiteSpace: 'normal', minWidth: 260 }}>
                      {c.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="xsmall muted">Alertas não bloqueiam a publicação, mas ficam visíveis aqui. Dados ausentes são exibidos como “Não disponível”, nunca como zero.</p>
      </section>

      {changes.data && changes.data.length > 0 && (
        <section>
          <h2>Histórico de ingestões</h2>
          <div className="timeline">
            {changes.data.slice(0, 10).map((c) => (
              <div className="timeline-item" key={c.version}>
                <div className="when">{dateBR(c.at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <strong>v{c.version}</strong> · carga {c.mode === 'full' ? 'completa' : 'parcial'} · {c.downloaded.length} arquivo(s) baixado(s)
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>API</h2>
        <p className="small text-2">
          API REST somente leitura com documentação OpenAPI em <a href="/api/openapi.json">/api/openapi.json</a>. Exemplos: <code>/api/teams</code>, <code>/api/standings?season=2025</code>,{' '}
          <code>/api/players?q=mahomes</code>, <code>/api/super-bowls</code>, <code>/api/rankings/qb</code>. Saúde: <code>/health</code> e <code>/ready</code>.
        </p>
      </section>
    </div>
  );
}
