import { Link } from 'react-router-dom';
import { ModeNote, PageHeader, Seo, StatTile } from '../components/Bits';
import { Loading } from '../components/States';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { dateBR, relativeTime } from '../lib/format';
import { PAGE_META } from '../content/pageMeta';

/** Site estático (Cloudflare Pages): sem a API completa, os dados são servidos como arquivos JSON. */
const STATIC_SITE = import.meta.env.VITE_PUBLIC_STATIC === '1';

const STATUS: Record<string, { cls: string; label: string }> = {
  pass: { cls: 'good', label: '✓ ok' },
  warn: { cls: 'warn', label: '! alerta' },
  fail: { cls: 'bad', label: '✕ falha' },
};

/**
 * Página pública de transparência: fontes, licenças, cobertura, limitações e qualidade.
 * Operações (verificar, carregar, jobs, logs) ficam na área administrativa, protegida no servidor.
 */
export default function DataCenter() {
  const m = useManifest();
  const quality = useAsync(() => api.quality(), []);

  if (m.loading) return <Loading height={400} />;
  if (!m.data) return <p className="empty">Dados ainda não publicados.</p>;
  const man = m.data;
  const total = man.quality.pass + man.quality.warn + man.quality.fail;
  const sources = Object.values(man.datasets);

  return (
    <div className="stack">
      <Seo {...PAGE_META['/data']} />
      <PageHeader
        eyebrow="Transparência"
        title="Fontes e qualidade dos dados"
        lede="De onde vem cada número, quando foi atualizado, o que foi validado e quais são os limites da cobertura. Dados ausentes aparecem como “Não disponível” — nunca como zero."
      />
      <div className="tiles">
        <StatTile
          label="Última atualização publicada"
          value={<span style={{ fontSize: '1.15rem' }}>{dateBR(man.generatedAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          note={relativeTime(man.generatedAt)}
        />
        <StatTile label="Cobertura detalhada" value={`${man.coverage.firstSeason}–${man.coverage.lastSeason}`} note={`Último jogo registrado: ${dateBR(man.coverage.lastCompletedGame)}`} />
        <StatTile label="Verificações de qualidade" value={`${man.quality.pass}/${total}`} note={`${man.quality.warn} alerta(s), ${man.quality.fail} falha(s)`} />
        <StatTile label="Conjuntos de dados" value={sources.length} note="Todos de fontes abertas ou curadoria documentada" />
      </div>

      <section className="card">
        <div className="card-title">
          <h2>Como os números chegam aqui</h2>
        </div>
        <ol className="flow-steps">
          <li>
            <strong>Coleta</strong>
            <span>Arquivos públicos do nflverse (licença CC-BY 4.0), atualizados semanalmente durante a temporada.</span>
          </li>
          <li>
            <strong>Transformação</strong>
            <span>Conversão de tipos, ausência tratada como “Não disponível”, cálculo de métricas derivadas (rating, percentuais, modelos).</span>
          </li>
          <li>
            <strong>Validação</strong>
            <span>{total} verificações automáticas: placares, duplicidades, estatísticas impossíveis, cruzamento com recordes oficiais.</span>
          </li>
          <li>
            <strong>Publicação</strong>
            <span>Arquivos versionados com data e assinatura (sha256). Alertas ficam visíveis abaixo; nada é escondido.</span>
          </li>
        </ol>
        <ModeNote
          beginner={<>Os dados não são digitados à mão: vêm de bases abertas usadas por analistas do mundo todo e passam por conferências automáticas antes de aparecer no site.</>}
          expert={
            <>
              Fonte primária: releases do <code>nflverse-data</code> (derivados do play-by-play). Métricas como EPA e CPOE vêm do modelo do nflverse; rating, aproveitamentos e modelos
              próprios (ranking de QBs, power ranking) são calculados aqui, com metodologia descrita em cada página.
            </>
          }
        />
      </section>

      <section>
        <div className="section-title">
          <h2>Fontes e licenças</h2>
        </div>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Fontes e licenças">
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
                <th scope="col">Cobertura</th>
                <th scope="col">Atualizado em</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((d) => (
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
                  <td className="small">{d.seasons?.length ? `${d.seasons[0]}–${d.seasons.at(-1)}` : d.key === 'draft' ? '1980–hoje' : d.key === 'curated' ? 'Todos os tempos' : 'Atual'}</td>
                  <td className="small">{dateBR(d.retrievedAt, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="xsmall muted">
          Dados ao vivo (placar, drives, probabilidade de vitória) vêm da API pública do site da ESPN, sem garantia de disponibilidade. Logos: CDN da ESPN (marcas registradas dos times,
          usadas apenas para identificação).
        </p>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>Limitações conhecidas</h2>
        </div>
        <ul className="limits">
          <li>
            <strong>Estatísticas detalhadas começam em {man.coverage.firstSeason}.</strong> Antes disso, só fatos históricos curados (Super Bowls, recordes oficiais). Carreiras iniciadas
            antes de {man.coverage.firstSeason} aparecem como “carreira parcial”.
          </li>
          <li>
            <strong>Contagens do play-by-play podem divergir das oficiais</strong> em poucas jardas (ex.: Drew Brees 2011: 5.535 no nflverse × 5.476 oficiais). Recordes oficiais são
            mostrados à parte.
          </li>
          <li>
            <strong>Alvos (targets) de 2003–2008 incompletos na fonte:</strong> quando o nflverse registra menos alvos do que recepções, o valor aparece como “Não disponível” (e o
            aproveitamento de recepção não é calculado), em vez de um número errado.
          </li>
          <li>
            <strong>Classificação com desempate simplificado</strong> (aproveitamento → saldo → pontos), informado na própria tabela.
          </li>
          <li>
            <strong>Hall of Fame</strong> cobre membros draftados a partir de 1980.
          </li>
          <li>
            <strong>Placar ao vivo</strong> depende da disponibilidade da ESPN; sem confirmação, o jogo nunca é exibido como “ao vivo”.
          </li>
        </ul>
      </section>

      <section>
        <div className="section-title">
          <h2>Qualidade dos dados</h2>
          <span className="small muted">Verificado {relativeTime(man.quality.checkedAt)}</span>
        </div>
        {quality.loading ? (
          <Loading />
        ) : quality.data ? (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Verificações de qualidade">
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
                {quality.data.checks.map((c) => (
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
        ) : (
          <p className="empty">Relatório de qualidade indisponível.</p>
        )}
        <p className="xsmall muted">Alertas não bloqueiam a publicação, mas ficam visíveis aqui.</p>
      </section>

      {STATIC_SITE ? (
        <section className="card">
          <div className="card-title">
            <h2>Dados abertos</h2>
          </div>
          <p className="small text-2" style={{ margin: 0 }}>
            Todos os números do site estão disponíveis em arquivos JSON, a partir de <a href="/data/manifest.json">/data/manifest.json</a> (fontes, versões e cobertura). Exemplos:{' '}
            <code>/data/teams.json</code>, <code>/data/superbowls.json</code>, <code>/data/games/{man.coverage.currentSeason}.json</code>. Metodologia das métricas:{' '}
            <Link to="/glossary">glossário</Link>.
          </p>
        </section>
      ) : (
        <section className="card">
          <div className="card-title">
            <h2>API pública</h2>
          </div>
          <p className="small text-2" style={{ margin: 0 }}>
            API REST somente leitura com documentação OpenAPI em <a href="/api/openapi.json">/api/openapi.json</a>. Exemplos: <code>/api/teams</code>, <code>/api/standings?season=2025</code>,{' '}
            <code>/api/players?q=mahomes</code>, <code>/api/super-bowls</code>, <code>/api/rankings/qb</code>. Metodologia das métricas: <Link to="/glossary">glossário</Link>.
          </p>
        </section>
      )}
    </div>
  );
}
