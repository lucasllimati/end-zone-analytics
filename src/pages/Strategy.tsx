import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { DownSimulator } from '../components/DownSimulator';
import { STRATEGY } from '../content/strategy';
import { useApp } from '../context/AppContext';

export default function Strategy() {
  const { mode } = useApp();
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [loc.hash]);
  return (
    <div className="stack">
      <Seo title="Estratégia" description="Estratégia no futebol americano: gerenciamento do relógio, decisões de 4º down, red zone, blitz, coberturas e mais." />
      <PageHeader eyebrow="Nível avançado" title="Estratégia" lede="Por que os técnicos tomam cada decisão. Troque para o modo Expert para a explicação técnica de cada tema." />
      <div className="grid grid-2">
        {STRATEGY.map((s) => (
          <article key={s.id} id={s.id} className="card">
            <h2>{s.title}</h2>
            <p className="text-2">{mode === 'expert' ? s.expert : s.simple}</p>
            <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>
              {s.keys.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <section className="card" id="quarto-down">
        <h2>Teste uma decisão de 4º down</h2>
        <DownSimulator />
      </section>
    </div>
  );
}
