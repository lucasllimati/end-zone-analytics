import { useSearchParams } from 'react-router-dom';
import { ModeNote, PageHeader, Seo } from '../components/Bits';
import { PlayAnimator } from '../components/PlayAnimator';
import { PLAYS, PLAY_CATEGORIES } from '../content/playbook';
import { useApp, useModeSensitive } from '../context/AppContext';
import { PAGE_META } from '../content/pageMeta';

export default function Playbook() {
  const [params, setParams] = useSearchParams();
  const { mode } = useApp();
  useModeSensitive();
  const play = PLAYS.find((p) => p.id === params.get('play')) ?? PLAYS[0];
  return (
    <div className="stack">
      <Seo {...PAGE_META['/playbook']} />
      <PageHeader eyebrow="Aprenda" title="Playbook interativo" lede="Escolha uma jogada para ver a animação: rotas, bloqueios, leitura do quarterback e o objetivo de cada conceito." />
      <div className="two-col">
        <div className="stack-sm">
          <div className="card" style={{ padding: 12 }}>
            <PlayAnimator play={play} />
          </div>
          <div className="card">
            <div className="eyebrow">{play.category}</div>
            <h2>{play.name}</h2>
            <p className="text-2">{mode === 'expert' ? play.expert : play.simple}</p>
            <dl className="kv" style={{ gridTemplateColumns: 'minmax(110px, auto) 1fr' }}>
              <dt>Objetivo</dt>
              <dd style={{ textAlign: 'left' }}>{play.goal}</dd>
              <dt>Leitura</dt>
              <dd style={{ textAlign: 'left' }}>{play.read}</dd>
              <dt>Funciona contra</dt>
              <dd style={{ textAlign: 'left' }}>{play.beats}</dd>
              <dt>Ponto fraco</dt>
              <dd style={{ textAlign: 'left' }}>{play.weakness}</dd>
            </dl>
            <ModeNote beginner={<>Ative o modo Expert no topo para ver a explicação técnica desta jogada.</>} expert={<>Em palavras simples: {play.simple}</>} />
          </div>
        </div>
        <nav aria-label="Jogadas" className="card" style={{ alignSelf: 'start' }}>
          {PLAY_CATEGORIES.map((c) => (
            <div key={c} style={{ marginBottom: 12 }}>
              <h3 className="small muted">{c}</h3>
              <div className="chips">
                {PLAYS.filter((p) => p.category === c).map((p) => (
                  <button key={p.id} type="button" className="chip" aria-pressed={p.id === play.id} onClick={() => setParams({ play: p.id }, { replace: true })}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
