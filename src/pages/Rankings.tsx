import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, ModeNote, PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/States';
import { InfoTip } from '../components/InfoTip';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { DEFAULT_QB_WEIGHTS, QB_COMPONENTS, rankQbs, type QbWeights } from '../lib/models';
import { num, signed } from '../lib/format';
import { PAGE_META } from '../content/pageMeta';

const PRESETS: { label: string; w: QbWeights }[] = [
  { label: 'Equilibrado (padrão)', w: DEFAULT_QB_WEIGHTS },
  { label: 'Só títulos', w: { championships: 60, playoffs: 30, production: 0, efficiency: 0, longevity: 10, era: 0, honors: 0 } },
  { label: 'Só eficiência', w: { championships: 0, playoffs: 0, production: 0, efficiency: 60, longevity: 0, era: 40, honors: 0 } },
  { label: 'Volume e longevidade', w: { championships: 0, playoffs: 10, production: 50, efficiency: 0, longevity: 40, era: 0, honors: 0 } },
];

export default function Rankings() {
  const model = useAsync(() => api.qbModel(), []);
  const [w, setW] = useState<QbWeights>(DEFAULT_QB_WEIGHTS);
  const ranked = useMemo(() => (model.data ? rankQbs(model.data, w) : []), [model.data, w]);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return (
    <div className="stack">
      <Seo {...PAGE_META['/rankings']} />
      <PageHeader eyebrow="Modelo EZA-QB v1" title="Quem é o maior quarterback?" lede="Não existe resposta única: depende do que você valoriza. Ajuste os pesos e o ranking é recalculado na hora." />
      <Callout title="Ranking baseado em modelo, não em opinião">
        Cada componente vira um <strong>percentil</strong> (0–100) entre os {model.data?.length ?? '…'} QBs com 1.500+ tentativas desde 1999; o score é a média ponderada pelos seus pesos.
        Carreiras anteriores a 1999 (ex.: Joe Montana, Dan Marino) não estão na base; carreiras que começaram antes (ex.: Peyton Manning em 1998) contam só a partir de 1999.
      </Callout>
      <div className="two-col">
        <div>
          {model.loading ? (
            <Loading height={400} />
          ) : (
            <DataTable
              rows={ranked}
              rowKey={(r) => r.id}
              caption="Ranking de quarterbacks"
              rank
              pageSize={25}
              exportName="ranking-qbs"
              columns={[
                { key: 'name', label: 'QB', className: 'wrap', render: (r) => <Link to={`/players/${r.id}`}><strong>{r.name}</strong></Link>, value: (r) => r.name, sortable: false },
                { key: 'span', label: 'Anos', className: 'wrap', render: (r) => `${r.first}–${r.last}`, sortable: false },
                { key: 'score', label: 'Score', num: true, help: 'Média ponderada dos percentis dos componentes (0–100).', render: (r) => <strong>{num(r.score, 1)}</strong>, value: (r) => r.score },
                { key: 'sb', label: 'SB', num: true, help: 'Super Bowls vencidos como QB titular (participações entre parênteses).', render: (r) => `${r.sbWins} (${r.sbApps})`, value: (r) => r.sbWins },
                { key: 'po', label: 'Playoffs', num: true, help: 'Vitórias-derrotas em playoffs como titular.', render: (r) => `${r.playoffW}-${r.playoffL}`, value: (r) => r.playoffW },
                { key: 'passYds', label: 'Jardas', metric: 'passYds', num: true, render: (r) => num(r.passYds), value: (r) => r.passYds },
                { key: 'passTd', label: 'TD', metric: 'passTd', num: true },
                { key: 'rating', label: 'Rating', metric: 'rating', num: true, render: (r) => num(r.rating, 1), value: (r) => r.rating },
                { key: 'epa', label: 'EPA/DB', metric: 'epaPerDb', num: true, render: (r) => signed(r.epaPerDb, 3), value: (r) => r.epaPerDb },
                { key: 'era', label: '+Era', num: true, help: 'Passer rating da carreira acima da média da liga nas mesmas temporadas.', render: (r) => signed(r.eraRating, 1), value: (r) => r.eraRating },
              ]}
            />
          )}
        </div>
        <aside className="card" style={{ alignSelf: 'start', position: 'sticky', top: 'calc(var(--header-h) + 16px)' }}>
          <h2>Pesos do modelo</h2>
          <div className="chips" style={{ marginBottom: 12 }}>
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="chip" onClick={() => setW(p.w)} aria-pressed={JSON.stringify(p.w) === JSON.stringify(w)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="stack-sm">
            {QB_COMPONENTS.map((c) => (
              <label key={c.key} className="field" style={{ color: 'var(--text-2)' }}>
                <span className="row between">
                  <span className="row" style={{ gap: 4 }}>
                    {c.label} <InfoTip title={c.label} simple={c.how} />
                  </span>
                  <span className="num">{total ? Math.round((w[c.key] / total) * 100) : 0}%</span>
                </span>
                <input type="range" min={0} max={60} step={5} value={w[c.key]} onChange={(e) => setW({ ...w, [c.key]: Number(e.target.value) })} aria-valuetext={`${w[c.key]} pontos`} />
              </label>
            ))}
          </div>
          <ModeNote
            beginner={<>Arraste os controles: quanto mais peso, mais aquele critério influencia o ranking. As porcentagens mostram o peso relativo final.</>}
            expert={<>Percentil com empates contando metade. Honrarias vêm do draft (Pro Bowls/All-Pro do PFR) e são nulas para não draftados, que ficam com percentil 0 nesse componente.</>}
          />
        </aside>
      </div>
    </div>
  );
}
