import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { GLOSSARY, glossaryById } from '../content/glossary';
import { norm } from '../lib/search';
import { useApp, useModeSensitive } from '../context/AppContext';
import { PAGE_META } from '../content/pageMeta';

const CATS = ['Todos', 'Jogo', 'Ataque', 'Defesa', 'Times especiais', 'Regras', 'Analytics'] as const;

export default function Glossary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todos');
  const { mode } = useApp();
  useModeSensitive();
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [loc.hash]);
  const list = useMemo(() => {
    const t = norm(q.trim());
    return GLOSSARY.filter((g) => (cat === 'Todos' || g.category === cat) && (!t || norm(`${g.term} ${g.simple} ${g.advanced}`).includes(t))).sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'));
  }, [q, cat]);
  return (
    <div className="stack">
      <Seo {...PAGE_META['/glossary']} />
      <PageHeader eyebrow="Aprenda" title="Glossário" lede={`${GLOSSARY.length} termos com definição simples, definição avançada, exemplo e relações.`} />
      <div className="filters">
        <label className="field" style={{ flex: '1 1 260px' }}>
          Buscar termo
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: sack, EPA, nickel…" />
        </label>
      </div>
      <div className="chips" role="group" aria-label="Categoria">
        {CATS.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-2">
        {list.map((g) => (
          <article key={g.id} id={g.id} className="card" style={loc.hash === `#${g.id}` ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="row between">
              <h2 style={{ margin: 0 }}>{g.term}</h2>
              <span className="badge">{g.category}</span>
            </div>
            <p className="text-2" style={{ marginTop: 8 }}>
              <strong>{mode === 'expert' ? 'Definição avançada: ' : 'Em palavras simples: '}</strong>
              {mode === 'expert' ? g.advanced : g.simple}
            </p>
            <details className="more">
              <summary>{mode === 'expert' ? 'Versão simples' : 'Versão avançada'}</summary>
              <p className="small text-2">{mode === 'expert' ? g.simple : g.advanced}</p>
            </details>
            <div className="callout info" style={{ marginTop: 8 }}>
              <div className="callout-title">Exemplo</div>
              {g.example}
            </div>
            {g.related.length > 0 && (
              <div className="chips" style={{ marginTop: 10 }}>
                <span className="xsmall muted">Relacionados:</span>
                {g.related.map((r) => {
                  const rel = glossaryById(r);
                  return rel ? (
                    <a key={r} className="chip" href={`#${r}`} onClick={() => (setQ(''), setCat('Todos'))}>
                      {rel.term}
                    </a>
                  ) : null;
                })}
              </div>
            )}
          </article>
        ))}
      </div>
      {list.length === 0 && <div className="empty">Nenhum termo encontrado.</div>}
    </div>
  );
}
