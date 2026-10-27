import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { DownSimulator } from '../components/DownSimulator';
import { HorizontalField } from '../components/Field';
import { BASICS, GAME_FLOW, SCORING } from '../content/rules';
import { PAGE_META } from '../content/pageMeta';

export default function Learn() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [loc.hash]);
  return (
    <div className="stack">
      <Seo {...PAGE_META['/learn']} />
      <PageHeader
        eyebrow="Para iniciantes"
        title="A NFL em 10 minutos"
        lede="Nunca assistiu a um jogo? Leia na ordem. Em cada tela do site, o botão ⓘ explica qualquer número ou sigla."
      />
      <nav className="chips" aria-label="Nesta página">
        {BASICS.map((l) => (
          <a key={l.id} className="chip" href={`#${l.id}`}>
            {l.title}
          </a>
        ))}
        <a className="chip" href="#simulador">
          Simulador de down
        </a>
      </nav>

      <section className="card">
        <h2>O campo</h2>
        <p className="text-2">100 jardas de jogo (≈ 91 m) e uma end zone de 10 jardas em cada ponta. As linhas a cada 5 jardas ajudam a medir o avanço; o número no gramado indica a distância até a end zone mais próxima.</p>
        <HorizontalField label="Campo de futebol americano com end zones" ballYtg={75} firstDownYtg={65} />
        <p className="xsmall muted">Linha azul: onde está a bola (linha de scrimmage). Linha amarela: onde o ataque precisa chegar para o first down.</p>
      </section>

      <div className="grid grid-2">
        {BASICS.map((l) => (
          <section key={l.id} id={l.id} className="card">
            <h2>{l.title}</h2>
            {l.body.map((p) => (
              <p key={p} className="text-2">
                {p}
              </p>
            ))}
            {l.example && (
              <div className="callout info">
                <div className="callout-title">Exemplo</div>
                {l.example}
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="card">
        <h2>Como se pontua</h2>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          {SCORING.map((s) => (
            <div key={s.id} className="tile">
              <div className="tile-value">
                {s.pts} <span className="small muted">ponto{s.pts > 1 ? 's' : ''}</span>
              </div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div className="small text-2">{s.how}</div>
            </div>
          ))}
        </div>
        <p className="small text-2" style={{ marginTop: 12 }}>
          Combinações comuns: 7 (TD + ponto extra), 3 (field goal), 8 (TD + 2 pontos). Por isso “uma posse de diferença” significa até 8 pontos.
        </p>
      </section>

      <section id="simulador" className="card">
        <h2>Simulador de Down & Distance</h2>
        <p className="text-2">Escolha a tentativa, a distância e a posição da bola. O simulador explica o que o ataque precisa fazer, quais são as opções e o risco de cada uma.</p>
        <DownSimulator />
      </section>

      <section className="card">
        <h2>O fluxo de um jogo</h2>
        <ol className="timeline" style={{ listStyle: 'none', margin: 0 }}>
          {GAME_FLOW.map((f) => (
            <li key={f.step} className="timeline-item">
              <strong>{f.step}</strong>
              <div className="small text-2">{f.text}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-3">
        {[
          { to: '/positions', t: 'Posições', d: 'Quem é quem em campo, com um campo interativo.' },
          { to: '/rules', t: 'Regras e faltas', d: 'O nível seguinte: regras avançadas e todas as penalidades.' },
          { to: '/playbook', t: 'Playbook', d: 'Jogadas e coberturas animadas, passo a passo.' },
          { to: '/glossary', t: 'Glossário', d: 'Todos os termos técnicos, do básico ao avançado.' },
          { to: '/strategy', t: 'Estratégia', d: 'Relógio, 4º down, red zone e mais.' },
          { to: '/season', t: 'Veja a temporada', d: 'Aplique o que aprendeu na classificação e nos jogos.' },
        ].map((c) => (
          <Link key={c.to} className="card card-link" to={c.to}>
            <h3>{c.t} →</h3>
            <p className="small text-2" style={{ margin: 0 }}>
              {c.d}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
