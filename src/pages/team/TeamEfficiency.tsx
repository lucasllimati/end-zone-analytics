/**
 * Aba "Eficiência" do time: cada métrica da temporada com o ranking na liga (ataque, defesa e times especiais).
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ModeNote } from '../../components/Bits';
import { InfoTip } from '../../components/InfoTip';
import { Loading, Unavailable } from '../../components/States';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { EFF_GROUPS, EFF_METRICS, efficiencyTable, fmtEff } from '../../lib/efficiency';
import type { StandingRow } from '../../lib/types';

export function TeamEfficiency({ code, season, standings }: { code: string; season: number; standings: StandingRow[] }) {
  const ts = useAsync(() => api.teamStats(season).catch(() => []), [season]);
  const rows = useMemo(() => (ts.data ? efficiencyTable(ts.data, standings) : []), [ts.data, standings]);
  if (ts.loading) return <Loading />;
  const me = rows.find((r) => r.team === code);
  if (!me) return <Unavailable>Estatísticas do time ainda não disponíveis para {season}.</Unavailable>;
  const n = rows.length;
  return (
    <div className="stack">
      <ModeNote
        beginner={<>Cada número vem com a posição do time entre os {n} da liga (1º = melhor). A barra cheia indica que o time está entre os melhores naquela métrica.</>}
        expert={<>Temporada regular de {season}. Ranking já invertido nas métricas em que menor é melhor (pontos sofridos, turnovers, EPA cedido…).</>}
      />
      <div className="grid eff-grid">
        {EFF_GROUPS.filter((g) => EFF_METRICS.some((m) => m.group === g.id && me.values[m.key] !== null)).map((g) => (
          <section className="card" key={g.id}>
            <div className="card-title">
              <h2>{g.label}</h2>
            </div>
            <ul className="eff-list">
              {EFF_METRICS.filter((m) => m.group === g.id).map((m) => {
                const rank = me.ranks[m.key];
                const share = rank === null ? 0 : (n - rank + 1) / n;
                return (
                  <li key={m.key}>
                    <div className="row between" style={{ flexWrap: 'nowrap', gap: 8 }}>
                      <span className="small text-2 row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        {m.label} {(m.metric || m.help) && <InfoTip metric={m.metric} title={m.label} simple={m.help} />}
                      </span>
                      <span className="nowrap">
                        <strong className="num">{fmtEff(m, me.values[m.key])}</strong>
                        <span className={`rank-tag${rank !== null && rank <= 5 ? ' top' : rank !== null && rank >= n - 4 ? ' bottom' : ''}`}>{rank === null ? '—' : `${rank}º`}</span>
                      </span>
                    </div>
                    <div className="meter" aria-hidden="true">
                      <span style={{ width: `${Math.round(share * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="xsmall muted">
        Compare com toda a liga em <Link to="/season?tab=efficiency">Temporada → Eficiência</Link>.
      </p>
    </div>
  );
}
