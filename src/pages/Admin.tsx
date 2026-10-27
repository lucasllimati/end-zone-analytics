import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Callout, PageHeader, Seo, StatTile } from '../components/Bits';
import { Loading } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { LockIcon, RefreshIcon } from '../components/Icons';
import { adminGet, adminPost, fetchAdminSession, useAdminSession } from '../data/admin';
import { useUpdates, type SyncJobView } from '../data/useUpdates';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { SOURCES } from '../lib/sources';
import { dateBR, relativeTime } from '../lib/format';

interface Run {
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
  changed?: boolean | null;
}

interface Overview {
  api: { status: string; uptime: number; node: string; env: string };
  githubTokenConfigured: boolean;
  alertsConfigured: boolean;
  schedule: { partialEveryHours: number; fullWeekday: number | null; fullHourUtc: number; next: { partial: string | null; full: string | null } | null } | null;
  data: {
    generatedAt: string;
    ingestionVersion: number;
    lastCheckedAt?: string;
    lastMode: 'full' | 'partial';
    coverage: { firstSeason: number; lastSeason: number; currentSeason: number; currentWeek: number | null };
    quality: { pass: number; warn: number; fail: number };
    datasets: { key: string; label: string; rows: number; retrievedAt: string; remoteVersion: string | null; sha256: string }[];
  } | null;
  files: { expected: number; missing: string[] };
  running: SyncJobView | null;
  lastSuccess: Run | null;
  lastAttempt: Run | null;
  runs: Run[];
}

interface OpsEvent {
  id: string;
  at: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: 'pipeline' | 'sources' | 'quality' | 'auth' | 'api' | 'client';
  jobId: string | null;
  message: string;
  detail: string | null;
  action: string | null;
  resolved: boolean | null;
}

const SEV: Record<OpsEvent['severity'], { cls: string; label: string }> = {
  info: { cls: '', label: 'Informativo' },
  warning: { cls: 'warn', label: 'Atenção' },
  error: { cls: 'bad', label: 'Erro' },
  critical: { cls: 'bad', label: 'Crítico' },
};
const COMPONENT: Record<OpsEvent['component'], string> = { pipeline: 'Pipeline', sources: 'Fontes', quality: 'Qualidade', auth: 'Acesso', api: 'API', client: 'Navegador' };
const fmt = (iso: string | null | undefined) => (iso ? dateBR(iso, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const dur = (ms: number | null) => (ms === null ? '—' : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${(ms / 60_000).toFixed(1)} min`);

function RunStatus({ s }: { s: Run['status'] }) {
  return <span className={`badge ${s === 'done' ? 'good' : s === 'error' ? 'bad' : 'warn'}`}>{s === 'done' ? 'Concluída' : s === 'error' ? 'Falhou' : 'Em execução'}</span>;
}

/** Área administrativa: protegida no servidor (sessão em cookie HttpOnly ou acesso local em desenvolvimento). */
export default function Admin() {
  const { session, loading, refresh } = useAdminSession();
  if (loading) return <Loading height={300} />;
  if (session === null)
    return (
      <div className="stack">
        <Seo title="Administração" />
        <PageHeader eyebrow="Administração" title="Área administrativa indisponível" lede="Esta versão do site é estática (sem servidor). As operações de dados só existem com a API em execução." />
      </div>
    );
  if (!session.authenticated) return <Login tokenConfigured={session.tokenConfigured} onDone={() => void refresh()} />;
  return <Dashboard method={session.method} onLogout={() => void refresh()} />;
}

function Login({ tokenConfigured, onDone }: { tokenConfigured: boolean; onDone: () => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await adminPost<{ message?: string }>('/api/admin/login', { token });
    setBusy(false);
    setToken('');
    if (r.status === 200) return onDone();
    setError(r.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' : r.data?.message ?? `Falha no login (HTTP ${r.status}).`);
  };
  return (
    <div className="stack">
      <Seo title="Administração" />
      <div className="login-card card">
        <span className="explore-icon" aria-hidden="true">
          <LockIcon />
        </span>
        <h1>Administração</h1>
        <p className="text-2 small">Acesso restrito à operação dos dados. A sessão expira em 8 horas.</p>
        {!tokenConfigured ? (
          <Callout title="Login não configurado">
            Defina <code>ADMIN_TOKEN</code> no arquivo <code>.env</code> do servidor e reinicie a API. Em desenvolvimento, o acesso pelo próprio computador (localhost) é liberado.
          </Callout>
        ) : (
          <form onSubmit={submit} className="stack-sm">
            <label className="field">
              Token de administrador
              <input className="input" type="password" autoComplete="current-password" required value={token} onChange={(e) => setToken(e.target.value)} />
            </label>
            {error && (
              <p className="bad small" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary" type="submit" disabled={busy || !token}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

type Tab = 'overview' | 'ops' | 'events' | 'history';

function Dashboard({ method, onLogout }: { method: string | null; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [ov, setOv] = useState<Overview | null>(null);
  const [ovError, setOvError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await adminGet<Overview>('/api/admin/overview');
    if (r.data) setOv(r.data);
    else setOvError(r.status === 401 ? 'Sessão expirada.' : `Falha ao carregar (HTTP ${r.status}).`);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    await adminPost('/api/admin/logout', {});
    await fetchAdminSession(true);
    onLogout();
  };

  return (
    <div className="stack">
      <Seo title="Administração" />
      <PageHeader eyebrow="Administração" title="Operação dos dados" lede="Saúde da aplicação, fontes, cargas, alertas e histórico. Nada desta página é visível ao público.">
        <div className="row" style={{ marginTop: 12 }}>
          <span className="badge accent">{method === 'local' ? 'Acesso local (desenvolvimento)' : method === 'token' ? 'Token' : 'Sessão autenticada'}</span>
          {method === 'session' && (
            <button type="button" className="btn sm" onClick={() => void logout()}>
              Sair
            </button>
          )}
          <button type="button" className="btn sm ghost" onClick={() => void load()}>
            <RefreshIcon /> Atualizar painel
          </button>
        </div>
      </PageHeader>
      {ovError && <Callout title="Erro">{ovError}</Callout>}
      <Tabs
        label="Seções da administração"
        tabs={[
          { id: 'overview', label: 'Visão geral' },
          { id: 'ops', label: 'Fontes e cargas' },
          { id: 'events', label: 'Logs e alertas' },
          { id: 'history', label: 'Histórico' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as Tab)}
      />
      {!ov ? (
        <Loading height={260} />
      ) : (
        <TabPanel id={tab}>
          {tab === 'overview' && <OverviewView ov={ov} />}
          {tab === 'ops' && <OpsView ov={ov} onFinished={() => void load()} />}
          {tab === 'events' && <EventsView />}
          {tab === 'history' && <HistoryView ov={ov} />}
        </TabPanel>
      )}
    </div>
  );
}

function OverviewView({ ov }: { ov: Overview }) {
  const d = ov.data;
  const lastFailed = ov.lastAttempt?.status === 'error';
  return (
    <div className="stack">
      <div className="tiles">
        <StatTile label="API" value={<span className="good">Operacional</span>} note={`${ov.api.env} · ${ov.api.node} · no ar há ${dur(ov.api.uptime * 1000)}`} />
        <StatTile
          label="Arquivos publicados"
          value={ov.files.missing.length ? <span className="bad">{ov.files.missing.length} ausente(s)</span> : <span className="good">Completos</span>}
          note={`${ov.files.expected - ov.files.missing.length}/${ov.files.expected} esperados`}
        />
        <StatTile label="Última publicação bem-sucedida" value={<span style={{ fontSize: '1.1rem' }}>{fmt(d?.generatedAt)}</span>} note={d ? `${relativeTime(d.generatedAt)} · fontes verificadas ${relativeTime(d.lastCheckedAt ?? d.generatedAt)}` : 'Sem dados'} />
        <StatTile
          label="Última tentativa de carga"
          value={ov.lastAttempt ? <RunStatus s={ov.lastAttempt.status} /> : '—'}
          note={ov.lastAttempt ? `${fmt(ov.lastAttempt.startedAt)} · ${ov.lastAttempt.trigger === 'cli' ? 'terminal' : ov.lastAttempt.trigger === 'scheduler' ? 'agendada' : 'painel'}` : 'Nenhuma registrada'}
        />
        <StatTile label="Qualidade" value={d ? `${d.quality.pass}/${d.quality.pass + d.quality.warn + d.quality.fail}` : '—'} note={d ? `${d.quality.warn} alerta(s), ${d.quality.fail} falha(s)` : undefined} />
        <StatTile
          label="Cargas automáticas"
          value={ov.schedule ? <span className="good">Ativas</span> : <span className="warn-text">Desligadas</span>}
          note={
            ov.schedule
              ? `Parcial a cada ${ov.schedule.partialEveryHours} h · próxima ${fmt(ov.schedule.next?.partial)}${ov.schedule.next?.full ? ` · completa ${fmt(ov.schedule.next.full)}` : ''}`
              : 'Defina SYNC_PARTIAL_EVERY_HOURS no servidor'
          }
        />
        <StatTile label="Alertas externos" value={ov.alertsConfigured ? <span className="good">Configurados</span> : <span className="warn-text">Desligados</span>} note={ov.alertsConfigured ? 'Falhas chegam no seu celular' : 'Defina ALERT_WEBHOOK_URL (ntfy, Discord ou Slack)'} />
        <StatTile label="Token do GitHub" value={ov.githubTokenConfigured ? <span className="good">Configurado</span> : <span className="warn-text">Ausente</span>} note={ov.githubTokenConfigured ? '5.000 consultas/hora' : '60 consultas/hora por IP'} />
      </div>
      {ov.running && (
        <Callout title="Carga em execução">
          Job {ov.running.id.slice(0, 8)} ({ov.running.mode === 'full' ? 'completa' : 'parcial'}) iniciado {relativeTime(ov.running.startedAt ?? null)}.
        </Callout>
      )}
      {lastFailed && (
        <div className="callout bad">
          <div className="callout-title">A última carga falhou</div>
          {ov.lastAttempt!.error}
          <br />
          Os dados publicados continuam sendo os de {fmt(d?.generatedAt)}.
        </div>
      )}
      {!ov.githubTokenConfigured && (
        <div className="callout warn">
          <div className="callout-title">Recomendado: configure GITHUB_TOKEN</div>
          Sem token, a verificação de versões fica limitada a 60 consultas por hora e cargas seguidas podem falhar com HTTP 403. Crie um token sem permissões em github.com/settings/tokens e
          adicione <code>GITHUB_TOKEN=...</code> ao <code>.env</code>.
        </div>
      )}
      {ov.files.missing.length > 0 && (
        <Callout title="Arquivos ausentes">
          <span className="mono xsmall">{ov.files.missing.slice(0, 12).join(', ')}</span>
        </Callout>
      )}
      {d && (
        <section>
          <div className="section-title">
            <h2>Conjuntos publicados</h2>
          </div>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Conjuntos publicados">
            <table className="data">
              <caption className="sr-only">Conjuntos publicados</caption>
              <thead>
                <tr>
                  <th scope="col">Conjunto</th>
                  <th scope="col" className="num">
                    Linhas
                  </th>
                  <th scope="col">Versão da fonte</th>
                  <th scope="col">Baixado em</th>
                  <th scope="col">sha256</th>
                </tr>
              </thead>
              <tbody>
                {d.datasets.map((x) => (
                  <tr key={x.key}>
                    <td>{x.label}</td>
                    <td className="num">{x.rows.toLocaleString('pt-BR')}</td>
                    <td className="small">{x.remoteVersion ? fmt(x.remoteVersion) : <span className="warn-text">sem versão registrada</span>}</td>
                    <td className="small">{fmt(x.retrievedAt)}</td>
                    <td className="mono xsmall">{x.sha256.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="xsmall muted">“Sem versão registrada” indica que a carga foi feita sem acesso à lista de versões (ex.: limite do GitHub). A próxima carga parcial bem-sucedida corrige.</p>
        </section>
      )}
    </div>
  );
}

function OpsView({ ov, onFinished }: { ov: Overview; onFinished: () => void }) {
  const { result, checking, check, checkError, sync, job, syncError } = useUpdates(false);
  const [mode, setMode] = useState<'partial' | 'full'>('partial');
  const [datasets, setDatasets] = useState<string[]>([]);
  const [seasons, setSeasons] = useState('');
  const [confirming, setConfirming] = useState(false);
  const toggle = (k: string) => setDatasets((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  const seasonList = seasons
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1999 && n <= 2100);
  const cli =
    mode === 'full'
      ? 'npm run data:full'
      : `npm run data:partial${datasets.length || seasonList.length ? ' --' : ''}${datasets.length ? ` --datasets ${datasets.join(',')}` : ''}${seasonList.length ? ` --seasons ${seasonList.join(',')}` : ''}`;
  const running = job?.status === 'running' || Boolean(ov.running);
  const start = () => {
    setConfirming(false);
    void sync({ mode, datasets: mode === 'partial' && datasets.length ? datasets : undefined, seasons: mode === 'partial' && seasonList.length ? seasonList : undefined }, onFinished);
  };
  const hasErrors = result?.items.some((i) => i.error);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-title">
          <h2>Verificar dados novos</h2>
          <button type="button" className="btn" disabled={checking} onClick={() => void check(true)}>
            <RefreshIcon /> {checking ? 'Verificando…' : 'Verificar agora'}
          </button>
        </div>
        <p className="small text-2">
          Compara a versão de cada arquivo nos releases do nflverse (API do GitHub) com a registrada no manifest. Resultado em cache por 10 minutos; respostas iguais usam ETag e não consomem o
          limite da API.
        </p>
        {checkError && <Callout title="Falha na verificação">{checkError}</Callout>}
        {hasErrors && (
          <div className="callout bad">
            <div className="callout-title">Fonte indisponível</div>
            Não foi possível confirmar se há dados novos em algumas fontes. Isso <strong>não</strong> significa que os dados estão atualizados.
          </div>
        )}
        {result && (
          <div className="table-wrap" style={{ marginTop: 12 }} tabIndex={0} role="region" aria-label="Resultado da verificação">
            <table className="data">
              <caption className="sr-only">Resultado da verificação</caption>
              <thead>
                <tr>
                  <th scope="col">Fonte</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Temporadas com novidade</th>
                  <th scope="col">Versão local</th>
                  <th scope="col">Versão remota / erro</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((i) => (
                  <tr key={i.key}>
                    <td>{i.label}</td>
                    <td>
                      {i.error ? <span className="badge bad">indisponível</span> : i.hasUpdate ? <span className="badge warn">dados novos</span> : <span className="badge good">atualizado</span>}
                    </td>
                    <td>{i.seasons?.join(', ') || '—'}</td>
                    <td className="small">{fmt(i.localVersion)}</td>
                    <td className="small" style={{ whiteSpace: 'normal', minWidth: 240 }}>
                      {i.error ? <span className="bad">{i.error}</span> : fmt(i.remoteVersion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="xsmall muted" style={{ padding: '8px 12px', margin: 0 }}>
              Verificado {relativeTime(result.checkedAt)}
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title">
          <h2>Executar carga</h2>
        </div>
        <div className="grid grid-2">
          <fieldset className="stack-sm admin-fieldset">
            <legend className="small">Tipo de carga</legend>
            <label className="row small" style={{ gap: 6 }}>
              <input type="radio" name="mode" checked={mode === 'partial'} onChange={() => setMode('partial')} /> <strong>Parcial</strong> — só o que mudou, ou os itens escolhidos (rápida)
            </label>
            <label className="row small" style={{ gap: 6 }}>
              <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} /> <strong>Completa</strong> — baixa e reprocessa tudo
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
                  <input className="input" value={seasons} onChange={(e) => setSeasons(e.target.value)} placeholder={ov.data ? String(ov.data.coverage.currentSeason) : ''} />
                </label>
              </>
            )}
          </fieldset>
          <div className="stack-sm">
            {mode === 'full' && confirming ? (
              <div className="callout warn" role="alertdialog" aria-labelledby="confirm-full">
                <div className="callout-title" id="confirm-full">
                  Confirmar carga completa?
                </div>
                Baixa ~114 arquivos (~40 MB) e reprocessa tudo (cerca de 1 minuto). Sem GITHUB_TOKEN, cargas completas seguidas podem esgotar o limite da API. Os dados publicados só são
                substituídos se a carga terminar.
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="button" className="btn primary sm" onClick={start}>
                    Sim, iniciar
                  </button>
                  <button type="button" className="btn sm" onClick={() => setConfirming(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn primary" disabled={running} onClick={() => (mode === 'full' ? setConfirming(true) : start())}>
                {running ? 'Carga em andamento…' : mode === 'full' ? 'Iniciar carga completa…' : 'Iniciar carga parcial'}
              </button>
            )}
            {syncError && <Callout title="Não foi possível iniciar">{syncError}</Callout>}
            <div className="small muted">Equivalente no terminal:</div>
            <code className="code-block">{cli}</code>
          </div>
        </div>
        {job && (
          <div style={{ marginTop: 16 }}>
            <div className="row small">
              <strong>Job {job.id.slice(0, 8)}</strong>
              <RunStatus s={job.status} />
              {job.status === 'done' && (
                <span className="small">
                  {job.downloaded.length} arquivo(s) novo(s){job.warnings?.length ? ` · ${job.warnings.length} aviso(s)` : ''}
                </span>
              )}
            </div>
            <pre className="log-box" aria-live="polite">
              {job.log?.join('\n')}
              {job.error ? `\nERRO: ${job.error}` : ''}
            </pre>
          </div>
        )}
      </section>

      <section>
        <div className="section-title">
          <h2>Execuções recentes</h2>
        </div>
        <RunsTable runs={ov.runs} />
      </section>
    </div>
  );
}

function RunsTable({ runs }: { runs: Run[] }) {
  if (!runs.length) return <p className="empty">Nenhuma execução registrada ainda.</p>;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Execuções recentes">
      <table className="data">
        <caption className="sr-only">Execuções recentes do pipeline</caption>
        <thead>
          <tr>
            <th scope="col">Início</th>
            <th scope="col">Tipo</th>
            <th scope="col">Origem</th>
            <th scope="col">Situação</th>
            <th scope="col" className="num">
              Duração
            </th>
            <th scope="col" className="num">
              Arquivos
            </th>
            <th scope="col">Resultado</th>
            <th scope="col">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td className="small">{fmt(r.startedAt)}</td>
              <td>{r.mode === 'full' ? 'Completa' : 'Parcial'}</td>
              <td className="small">{r.trigger === 'cli' ? 'Terminal' : r.trigger === 'scheduler' ? 'Agendada' : 'Painel'}</td>
              <td>
                <RunStatus s={r.status} />
              </td>
              <td className="num">{dur(r.durationMs)}</td>
              <td className="num">{r.downloaded}</td>
              <td className="small">{r.status !== 'done' ? '—' : r.changed === false ? 'Sem mudanças' : r.changed ? 'Nova publicação' : '—'}</td>
              <td className="small text-2" style={{ whiteSpace: 'normal', minWidth: 220 }}>
                {r.error ?? (r.warnings.length ? `${r.warnings.length} aviso(s): ${r.warnings[0]}` : [r.datasets.join(', '), r.seasons.join(', ')].filter(Boolean).join(' · ') || '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsView() {
  const [severity, setSeverity] = useState('');
  const [component, setComponent] = useState('');
  const [days, setDays] = useState('7');
  const [events, setEvents] = useState<OpsEvent[] | null>(null);
  useEffect(() => {
    const qs = new URLSearchParams();
    if (severity) qs.set('severity', severity);
    if (component) qs.set('component', component);
    if (days) qs.set('days', days);
    setEvents(null);
    void adminGet<OpsEvent[]>(`/api/admin/events?${qs}`).then((r) => setEvents(r.data ?? []));
  }, [severity, component, days]);
  return (
    <div className="stack">
      <div className="filters">
        <label className="field">
          Severidade
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(SEV).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Componente
          <select className="select" value={component} onChange={(e) => setComponent(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(COMPONENT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Período
          <select className="select" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">Últimas 24 h</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="">Tudo</option>
          </select>
        </label>
      </div>
      {!events ? (
        <Loading />
      ) : events.length === 0 ? (
        <p className="empty">Nenhum evento neste filtro.</p>
      ) : (
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id} className={`event sev-${e.severity}`}>
              <div className="event-head">
                <span className={`badge ${SEV[e.severity].cls}`}>{SEV[e.severity].label}</span>
                <span className="badge">{COMPONENT[e.component]}</span>
                {e.resolved === true && <span className="badge good">Resolvido</span>}
                {e.resolved === false && <span className="badge bad">Em aberto</span>}
                <span className="xsmall muted">{fmt(e.at)}</span>
                {e.jobId && <span className="xsmall muted mono">job {e.jobId.slice(0, 8)}</span>}
              </div>
              <strong>{e.message}</strong>
              {e.action && <p className="small">Ação recomendada: {e.action}</p>}
              {e.detail && (
                <details>
                  <summary className="xsmall muted">Detalhes técnicos</summary>
                  <pre className="log-box">{e.detail}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Change = Awaited<ReturnType<typeof api.changes>>[number];
const LABEL: Record<string, string> = Object.fromEntries(SOURCES.map((x) => [x.key, x.label]));

/** O que mudou numa publicação, em linguagem legível (registros antigos são reconstruídos pelas variações de linhas). */
function describe(c: Change): { label: string; detail: string }[] {
  if (c.changed)
    return c.changed.map((x) => ({
      label: x.label,
      detail: x.delta === null ? `${x.rows.toLocaleString('pt-BR')} linhas` : x.delta === 0 ? 'valores atualizados' : `${x.delta > 0 ? '+' : ''}${x.delta.toLocaleString('pt-BR')} linhas`,
    }));
  const rows = Object.entries(c.rows ?? {}).filter(([, r]) => r.delta);
  if (rows.length) return rows.map(([k, r]) => ({ label: LABEL[k] ?? k, detail: `${r.delta! > 0 ? '+' : ''}${r.delta!.toLocaleString('pt-BR')} linhas` }));
  if (c.downloaded.length) return [{ label: `${c.downloaded.length} arquivo(s) da fonte`, detail: 'valores atualizados' }];
  return [];
}

function HistoryView({ ov }: { ov: Overview }) {
  const changes = useAsync(() => api.changes().catch(() => []), []);
  const list = changes.data ?? [];
  // Agrupa execuções consecutivas sem mudança em uma única linha discreta.
  const items: ({ kind: 'pub'; c: Change; what: ReturnType<typeof describe> } | { kind: 'quiet'; n: number; from: string; to: string })[] = [];
  for (const c of list.slice(0, 40)) {
    const what = describe(c);
    const last = items.at(-1);
    if (what.length || c.qualityChanged) items.push({ kind: 'pub', c, what });
    else if (last?.kind === 'quiet') {
      last.n += 1;
      last.from = c.at;
    } else items.push({ kind: 'quiet', n: 1, from: c.at, to: c.at });
  }
  return (
    <div className="stack">
      <section>
        <div className="section-title">
          <h2>Atualizações publicadas</h2>
          {ov.data && <span className="small muted">Fontes verificadas pela última vez {relativeTime(ov.data.lastCheckedAt ?? ov.data.generatedAt)}</span>}
        </div>
        <p className="small text-2">Uma nova publicação só é criada quando o conteúdo dos dados muda. Execuções sem mudança apenas registram a verificação.</p>
        {changes.loading ? (
          <Loading />
        ) : (
          <div className="timeline">
            {items.map((it, k) =>
              it.kind === 'quiet' ? (
                <div className="timeline-item quiet" key={`q${k}`}>
                  <div className="when">{it.n > 1 ? `${fmt(it.from)} – ${fmt(it.to)}` : fmt(it.to)}</div>
                  <span className="small muted">{it.n > 1 ? `${it.n} verificações sem mudanças nos dados` : 'Verificação sem mudanças nos dados'}</span>
                </div>
              ) : (
                <div className="timeline-item" key={it.c.version} title={`Publicação interna nº ${it.c.version}`}>
                  <div className="when">
                    {fmt(it.c.at)} · carga {it.c.mode === 'full' ? 'completa' : 'parcial'}
                  </div>
                  <strong>{it.what.length ? 'Dados atualizados' : 'Verificações de qualidade reavaliadas'}</strong>
                  {it.what.length > 0 && (
                    <ul className="change-list">
                      {it.what.map((w) => (
                        <li key={w.label}>
                          {w.label} <span className="muted">· {w.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </section>
      <section>
        <div className="section-title">
          <h2>Todas as execuções</h2>
          <Link to="/data">Página pública de qualidade →</Link>
        </div>
        <RunsTable runs={ov.runs} />
      </section>
    </div>
  );
}
