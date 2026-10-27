import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, ModeNote, PageHeader, Seo } from '../components/Bits';
import { Loading } from '../components/States';
import { TabPanel, Tabs } from '../components/Tabs';
import { TeamChip, TeamLogo } from '../components/TeamLogo';
import { InfoTip } from '../components/InfoTip';
import { BarList } from '../components/charts/BarList';
import { api } from '../data/client';
import { useAsync, useManifest } from '../data/hooks';
import { metric } from '../content/metrics';
import { num } from '../lib/format';
import type { LeaderEntryShape } from '../data/shapes';
import { PAGE_META } from '../content/pageMeta';

type Tab = 'official' | 'season' | 'career' | 'post' | 'team' | 'game' | 'st';

/** Recordes de times especiais (carreira na temporada regular, exceto o FG mais longo). */
const ST_RECORDS: { k: string; t: string; metric?: string; digits?: number; season?: boolean; note?: string }[] = [
  { k: 'fgMade', t: 'Mais field goals', metric: 'fgm' },
  { k: 'fg50', t: 'Mais FGs de 50+ jardas', metric: 'fg50' },
  { k: 'gwfg', t: 'Mais FGs da vitória', metric: 'gwfgm' },
  { k: 'fgPct', t: 'Melhor aproveitamento de FG (%)', metric: 'fgPct', digits: 1, note: 'mínimo de 150 tentativas' },
  { k: 'longestFg', t: 'Field goals mais longos (jardas)', metric: 'fgLong', season: true },
  { k: 'puntNet', t: 'Melhor média líquida de punt', metric: 'puntNet', digits: 1, note: 'mínimo de 250 punts' },
  { k: 'puntIn20', t: 'Mais punts dentro da 20', metric: 'ptIn20' },
  { k: 'returnYds', t: 'Mais jardas em retornos (punt + kickoff)' },
  { k: 'stTd', t: 'Mais TDs de times especiais', metric: 'stTd' },
];
const STATS = ['passYds', 'passTd', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'sacks', 'defInt', 'tackles', 'ff', 'fgm'];

function LeaderList({ items, showSeason = true, digits = 0 }: { items: LeaderEntryShape[]; showSeason?: boolean; digits?: number }) {
  return (
    <BarList
      ariaLabel="Ranking"
      items={items.map((l, i) => ({
        key: `${l.id ?? l.name}-${l.season ?? i}`,
        value: l.value,
        display: num(l.value, digits),
        label: (
          <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            {l.team && <TeamLogo abbr={l.team} size={16} />}
            {l.id && !l.id.includes('_') ? <Link to={`/players/${l.id}`}>{l.name}</Link> : l.id ? <Link to={`/games/${l.id}`}>{l.name}</Link> : l.name}
            {showSeason && l.season && <span className="muted small">· {l.season}</span>}
          </span>
        ),
        sub: l.detail,
      }))}
    />
  );
}

export default function Records() {
  const [tab, setTab] = useState<Tab>('official');
  const [stat, setStat] = useState('passYds');
  const curated = useAsync(() => api.curatedRecords(), []);
  const computed = useAsync(() => api.computedRecords(), []);
  const m = useManifest();
  const current = m.data?.coverage.currentSeason;
  const curStats = useAsync(() => (current ? api.playerStats(current) : Promise.resolve([])), [current]);

  // Detecção de recordes: líder da temporada atual × recorde oficial (inclui ritmo projetado para 17 jogos).
  const alerts = useMemo(() => {
    if (!curated.data || !curStats.data?.length) return [];
    const out: { label: string; holder: string; value: number; record: number; projected: number; broken: boolean }[] = [];
    for (const r of curated.data.records.filter((x) => x.category === 'season')) {
      const key = (r as unknown as { verify?: string }).verify;
      if (!key || key === 'teamPoints') continue;
      const top = curStats.data.filter((l) => l.st === 'REG').sort((a, b) => (b[key as keyof typeof b] as number) - (a[key as keyof typeof a] as number))[0];
      if (!top) continue;
      const v = top[key as keyof typeof top] as number;
      const projected = top.games ? (v / top.games) * 17 : 0;
      if (v >= r.value || projected >= r.value) out.push({ label: r.label, holder: top.name, value: v, record: r.value, projected, broken: v > r.value });
    }
    return out;
  }, [curated.data, curStats.data]);

  if (curated.loading || computed.loading) return <Loading height={400} />;
  const c = computed.data!;
  const groups = { career: 'Carreira', season: 'Temporada', team: 'Times', game: 'Jogos' } as const;
  return (
    <div className="stack">
      <Seo {...PAGE_META['/records']} />
      <PageHeader eyebrow="Recordes" title="Recordes da NFL" lede="Recordes oficiais de todos os tempos (curadoria) e rankings calculados a partir dos dados detalhados desde 1999." />
      {alerts.map((a) => (
        <Callout key={a.label} title={a.broken ? '🏆 NOVO RECORDE DA NFL (a confirmar)' : `Em ritmo de recorde em ${current}`}>
          <strong>{a.holder}</strong> — {a.label}: {num(a.value, 1)} {a.broken ? `(recorde anterior: ${num(a.record)})` : `até agora; ritmo projetado para 17 jogos ≈ ${num(a.projected)} (recorde: ${num(a.record)})`}. Projeção simples, não previsão.
        </Callout>
      ))}
      <Tabs
        label="Tipos de recorde"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'official', label: 'Oficiais (todos os tempos)' },
          { id: 'season', label: 'Temporada (1999+)' },
          { id: 'career', label: 'Carreira (1999+)' },
          { id: 'post', label: 'Playoffs (1999+)' },
          { id: 'team', label: 'Times' },
          { id: 'game', label: 'Jogos' },
          { id: 'st', label: 'Times especiais' },
        ]}
      />
      <TabPanel id={tab}>
        {tab === 'official' && (
          <div className="stack">
            <ModeNote beginner={<>Estes são os recordes oficiais da história da NFL, de 1920 até hoje.</>} expert={<>Fonte: {curated.data!.source} Situação: {curated.data!.asOf}.</>} />
            {(Object.keys(groups) as (keyof typeof groups)[]).map((g) => {
              const recs = curated.data!.records.filter((r) => r.category === g);
              if (!recs.length) return null;
              return (
                <section key={g}>
                  <h2 style={{ fontSize: '1rem' }}>{groups[g]}</h2>
                  <div className="grid grid-3 balance">
                    {recs.map((r) => (
                      <div className="card tight" key={r.id}>
                        <div className="small muted">{r.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 650 }}>
                          {num(r.value)} <span className="small muted">{r.unit}</span>
                        </div>
                        <div className="small">{r.holder}</div>
                        <div className="xsmall muted">{r.detail}</div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            <p className="xsmall muted">
              Situação: {curated.data!.asOf}. Os recordes de temporada desde 1999 são conferidos automaticamente contra o nflverse na carga de dados (ver <Link to="/data">qualidade de dados</Link>).
            </p>
          </div>
        )}
        {(tab === 'season' || tab === 'career' || tab === 'post') && (
          <div className="stack">
            <div className="chips" role="group" aria-label="Estatística">
              {STATS.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={stat === s} onClick={() => setStat(s)}>
                  {metric(s).label}
                </button>
              ))}
            </div>
            <div className="card">
              <h2 className="row" style={{ gap: 6 }}>
                {metric(stat).label} — top 10 {tab === 'season' ? 'em uma temporada' : tab === 'career' ? 'na carreira (temporada regular)' : 'em playoffs na carreira'}
                <InfoTip metric={stat} />
              </h2>
              <LeaderList items={(tab === 'season' ? c.seasonLeaders : tab === 'career' ? c.careerLeaders : c.postseasonCareer)[stat] ?? []} showSeason={tab === 'season'} digits={stat === 'sacks' ? 1 : 0} />
              <p className="xsmall muted" style={{ marginTop: 12 }}>
                Cobertura {c.coverage}. Carreiras iniciadas antes de 1999 aparecem só com as temporadas desde 1999. Valores derivados do play-by-play (nflverse) podem diferir levemente das estatísticas oficiais.
              </p>
            </div>
          </div>
        )}
        {tab === 'team' && (
          <div className="grid grid-2">
            {[
              { k: 'mostWins', t: 'Mais vitórias em uma temporada' },
              { k: 'mostPoints', t: 'Mais pontos em uma temporada' },
              { k: 'fewestAllowed', t: 'Menos pontos sofridos' },
              { k: 'bestDiff', t: 'Maior saldo de pontos' },
              { k: 'mostLosses', t: 'Mais derrotas em uma temporada' },
            ].map(({ k, t }) => (
              <div className="card" key={k}>
                <h3>{t}</h3>
                <BarList
                  ariaLabel={t}
                  items={(c.teamSeason[k] ?? []).map((l, i) => ({ key: `${l.team}-${l.season}-${i}`, value: l.value, label: <span className="row" style={{ gap: 6 }}><TeamChip abbr={l.team!} short size={16} /><span className="muted small">· {l.season}</span></span>, sub: l.detail }))}
                />
              </div>
            ))}
          </div>
        )}
        {tab === 'game' && (
          <div className="grid grid-3">
            {[
              { k: 'totalPoints', t: 'Mais pontos somados' },
              { k: 'teamPoints', t: 'Mais pontos de um time' },
              { k: 'margin', t: 'Maiores diferenças' },
            ].map(({ k, t }) => (
              <div className="card" key={k}>
                <h3>{t}</h3>
                <LeaderList items={c.games[k] ?? []} />
              </div>
            ))}
            {c.games.upsets?.length ? (
              <div className="card span-all">
                <h3 className="row" style={{ gap: 6 }}>
                  Maiores zebras (pontos de linha){' '}
                  <InfoTip title="Zebra" simple="Jogos em que o azarão venceu. O número é por quantos pontos o perdedor era favorito antes do jogo, segundo o mercado (linha de fechamento)." />
                </h3>
                <LeaderList items={c.games.upsets} digits={1} />
              </div>
            ) : null}
          </div>
        )}
        {tab === 'st' && (
          <div className="stack">
            <ModeNote
              beginner={<>Times especiais são os chutes (field goals, pontos extras, punts) e os retornos. Desde 1999, temporada regular.</>}
              expert={<>Carreira na temporada regular desde 1999 (nflverse); “FG mais longo” é por temporada. FGs da vitória seguem a definição da nflverse (game-winning FG).</>}
            />
            {c.specialTeams ? (
              <div className="grid grid-3">
                {ST_RECORDS.map(({ k, t, metric: mk, digits, season, note }) => (
                  <div className="card" key={k}>
                    <h3 className="row" style={{ gap: 6 }}>
                      {t} {mk && <InfoTip metric={mk} />}
                    </h3>
                    <LeaderList items={c.specialTeams![k] ?? []} showSeason={Boolean(season)} digits={digits ?? 0} />
                    {note && <p className="xsmall muted" style={{ marginTop: 8 }}>{note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">Recordes de times especiais ainda não gerados.</p>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
}
