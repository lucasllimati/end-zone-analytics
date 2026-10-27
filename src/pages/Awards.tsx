import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading, Unavailable } from '../components/States';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { dateBR } from '../lib/format';
import type { AwardKey } from '../lib/types';
import { PAGE_META } from '../content/pageMeta';

export default function Awards() {
  const data = useAsync(() => api.awards().catch(() => null), []);
  const [key, setKey] = useState<AwardKey>('mvp');
  const a = data.data;
  const rows = useMemo(() => (a?.winners ?? []).filter((w) => w.award === key).sort((x, y) => y.season - x.season || x.name.localeCompare(y.name)), [a, key]);
  const most = useMemo(() => {
    const m = new Map<string, { n: number; id: string | null }>();
    for (const w of rows) m.set(w.name, { n: (m.get(w.name)?.n ?? 0) + 1, id: w.playerId ?? m.get(w.name)?.id ?? null });
    return [...m.entries()].filter(([, v]) => v.n > 1).sort((x, y) => y[1].n - x[1].n).slice(0, 8);
  }, [rows]);
  const meta = a?.awards.find((x) => x.key === key);

  return (
    <div className="stack">
      <Seo {...PAGE_META['/awards']} />
      <PageHeader eyebrow="História" title="Prêmios da temporada" lede="Os prêmios individuais da Associated Press (AP), votados por jornalistas ao fim de cada temporada regular. O MVP é o mais importante prêmio individual da NFL." />
      {data.loading ? (
        <Loading height={320} />
      ) : !a ? (
        <Unavailable>Lista de prêmios indisponível no momento.</Unavailable>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Prêmio">
            {a.awards
              .filter((x) => !a.rejected.some((r) => r.key === x.key))
              .map((x) => (
                <button key={x.key} type="button" className="chip" aria-pressed={key === x.key} onClick={() => setKey(x.key)}>
                  {x.label}
                </button>
              ))}
          </div>
          <div className="two-col">
            <section className="card">
              <h2>{meta?.label}</h2>
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.season}-${r.name}`}
                caption={`Vencedores: ${meta?.label ?? ''}`}
                pageSize={30}
                exportName={`premios-${key}`}
                bare
                columns={[
                  { key: 'season', label: 'Temporada', num: true, width: '6.5rem' },
                  { key: 'name', label: key === 'coy' ? 'Técnico' : 'Jogador', render: (r) => (r.playerId ? <Link to={`/players/${r.playerId}`}>{r.name}</Link> : r.name), value: (r) => r.name },
                  { key: 'team', label: 'Time', render: (r) => r.team ?? '—', value: (r) => r.team ?? '' },
                ]}
              />
            </section>
            <aside className="stack">
              {most.length > 0 && (
                <section className="card">
                  <h2>Mais vezes premiados</h2>
                  <BarList ariaLabel={`Mais vezes premiados: ${meta?.label ?? ''}`} items={most.map(([name, v]) => ({ key: name, value: v.n, display: `${v.n}×`, label: v.id ? <Link to={`/players/${v.id}`}>{name}</Link> : name }))} />
                </section>
              )}
              <section className="card">
                <h2>Fonte</h2>
                <p className="small text-2">
                  Listas de vencedores da AP na Wikipedia em inglês (
                  <a href={meta?.url} target="_blank" rel="noopener noreferrer">
                    artigo
                  </a>
                  , licença CC BY-SA 4.0), consultadas em {dateBR(a.retrievedAt)}. Antes de publicar, cada prêmio é conferido com fatos conhecidos; um prêmio que não confere fica de fora em vez de aparecer
                  errado.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
