import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { HorizontalField } from '../components/Field';
import { ADVANCED, OFFICIALS } from '../content/rules';
import { PENALTIES } from '../content/penalties';
import { penaltyOutcome } from '../lib/penalty';

export default function Rules() {
  const loc = useLocation();
  const [side, setSide] = useState<'all' | 'Ataque' | 'Defesa'>('all');
  const [open, setOpen] = useState<string | null>(loc.hash.startsWith('#falta-') ? loc.hash.slice(7) : null);
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150);
  }, [loc.hash]);
  const list = PENALTIES.filter((p) => side === 'all' || p.side === side || p.side === 'Ambos');
  return (
    <div className="stack">
      <Seo title="Regras e faltas" description="Regras avançadas da NFL, tabela completa de penalidades com visualização no campo e a equipe de arbitragem." />
      <PageHeader eyebrow="Nível 2" title="Regras, faltas e arbitragem" lede={<>Depois do <Link to="/learn">básico</Link>, os detalhes: o que é uma recepção, como funciona o relógio, prorrogação, replay e cada falta com o efeito no campo.</>} />

      <section className="grid grid-2">
        {ADVANCED.map((l) => (
          <article key={l.id} id={l.id} className="card">
            <h2>{l.title}</h2>
            {l.body.map((p) => (
              <p key={p} className="text-2 small">
                {p}
              </p>
            ))}
          </article>
        ))}
      </section>

      <section id="faltas" className="stack-sm">
        <div className="section-title">
          <h2>Penalidades</h2>
          <div className="chips" role="group" aria-label="Filtrar por lado">
            {(['all', 'Ataque', 'Defesa'] as const).map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={side === s} onClick={() => setSide(s)}>
                {s === 'all' ? 'Todas' : s}
              </button>
            ))}
          </div>
        </div>
        <ModeNote
          beginner={<>Clique em uma falta para ver no campo onde a bola fica depois da punição. Exemplo usado: ataque com 1st & 10 na própria linha de 40.</>}
          expert={<>Valores de temporada regular conforme o regulamento oficial. Metade da distância até o gol se aplica quando a penalidade ultrapassaria essa marca.</>}
        />
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela">
          <table className="data">
            <caption className="sr-only">Tabela de penalidades</caption>
            <thead>
              <tr>
                <th scope="col">Penalidade</th>
                <th scope="col">Quem comete</th>
                <th scope="col" className="num">
                  Jardas
                </th>
                <th scope="col">Efeito</th>
                <th scope="col">Explicação</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const o = penaltyOutcome(p);
                const isOpen = open === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr id={`falta-${p.id}`}>
                      <td style={{ whiteSpace: 'normal' }}>
                        <button type="button" className="sort-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)} style={{ fontWeight: 600, textAlign: 'left' }}>
                          {isOpen ? '▾' : '▸'} {p.name}
                        </button>
                        <div className="xsmall muted">{p.pt}</div>
                      </td>
                      <td>{p.side}</td>
                      <td className="num">{p.yards ? p.yards : 'No local'}</td>
                      <td style={{ whiteSpace: 'normal' }}>
                        <span className="row" style={{ gap: 4 }}>
                          {p.autoFirst && <span className="badge good">1st down auto.</span>}
                          {p.lossOfDown && <span className="badge live">perde o down</span>}
                          {p.deadBall && <span className="badge">bola morta</span>}
                          {p.spot && <span className="badge">no local</span>}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 260 }} className="small text-2">
                        {p.simple}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={{ whiteSpace: 'normal' }}>
                          <div className="grid grid-2" style={{ alignItems: 'center' }}>
                            <HorizontalField label={`Efeito da falta ${p.name} no campo`} ballYtg={o.afterYtg} marks={[{ ytg: o.beforeYtg, label: 'Antes', color: '#ffffff' }]} />
                            <div className="small">
                              <p>
                                <strong>Resultado:</strong> {o.result}
                              </p>
                              <p className="text-2">{p.detail}</p>
                              <p className="text-2">
                                <strong>Sinal do árbitro:</strong> {p.signal}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Equipe de arbitragem</h2>
        <p className="text-2 small">Sete árbitros em campo, cada um com uma área de responsabilidade, mais o replay central em Nova York.</p>
        <div className="grid grid-3">
          {OFFICIALS.map((o) => (
            <div key={o.id} className="tile">
              <div style={{ fontWeight: 650 }}>
                {o.name} <span className="muted small">({o.id})</span>
              </div>
              <div className="small muted">{o.pt}</div>
              <div className="small text-2" style={{ marginTop: 4 }}>
                {o.role}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
