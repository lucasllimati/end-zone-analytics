import { Link, useParams } from 'react-router-dom';
import { Seo } from '../components/Bits';
import { Loading, Unavailable } from '../components/States';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../data/client';
import { useAsync } from '../data/hooks';
import { dateBR } from '../lib/format';

export default function SuperBowlDetail() {
  const { n = '' } = useParams();
  const sbs = useAsync(() => api.superBowls(), []);
  if (sbs.loading) return <Loading height={300} />;
  const list = sbs.data ?? [];
  const s = list.find((x) => x.number === Number(n));
  if (!s) return <Unavailable>Super Bowl não encontrado. <Link to="/super-bowl">Ver todos</Link></Unavailable>;
  const prev = list.find((x) => x.number === s.number - 1);
  const next = list.find((x) => x.number === s.number + 1);
  const winnerTitles = list.filter((x) => x.winner === s.winner && x.number <= s.number).length;
  const na = 'Não disponível';
  return (
    <div className="stack">
      <Seo title={`Super Bowl ${s.roman}`} description={`Super Bowl ${s.roman} (temporada ${s.season}): ${s.winnerName} ${s.winnerScore} × ${s.loserScore} ${s.loserName}. MVP: ${s.mvp}.`} />
      <div className="breadcrumb">
        <Link to="/super-bowl">Super Bowl</Link> / {s.roman}
      </div>
      <section className="card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">Temporada {s.season}</div>
        <h1 style={{ marginBottom: 0 }}>Super Bowl {s.roman}</h1>
        <div className="row" style={{ justifyContent: 'center', gap: 32, margin: '16px 0' }}>
          <div>
            <TeamLogo abbr={s.winner} size={88} />
            <div style={{ fontWeight: 650, marginTop: 6 }}>{s.winnerName}</div>
            <span className="badge gold">Campeão · {winnerTitles}º título</span>
          </div>
          <div className="hero-number">
            {s.winnerScore} – {s.loserScore}
          </div>
          <div>
            <TeamLogo abbr={s.loser} size={88} />
            <div style={{ fontWeight: 650, marginTop: 6 }}>{s.loserName}</div>
            <span className="badge">Vice</span>
          </div>
        </div>
        {s.ot && <p className="small">Decidido na prorrogação.</p>}
      </section>
      <div className="grid grid-2">
        <section className="card">
          <h2>Ficha</h2>
          <dl className="kv">
            <dt>Data</dt>
            <dd>{dateBR(s.date, { day: '2-digit', month: 'long', year: 'numeric' })}</dd>
            <dt>Estádio</dt>
            <dd>{s.stadium}</dd>
            <dt>Cidade</dt>
            <dd>{s.city}</dd>
            <dt>MVP</dt>
            <dd>{s.mvp}</dd>
            <dt>Técnico campeão</dt>
            <dd>{s.winnerCoach ?? na}</dd>
            <dt>Técnico vice</dt>
            <dd>{s.loserCoach ?? na}</dd>
            <dt>QB campeão</dt>
            <dd>{s.winnerQb ?? na}</dd>
            <dt>QB vice</dt>
            <dd>{s.loserQb ?? na}</dd>
            <dt>Público</dt>
            <dd>{na}</dd>
          </dl>
          <p className="xsmall muted" style={{ marginTop: 12 }}>
            Fonte: {s.source}. Campos “{na}” não constam na base para esta edição — não são estimados.
          </p>
        </section>
        <section className="card stack-sm">
          <h2>Explore</h2>
          {s.gameId ? (
            <Link className="btn primary wrap" to={`/games/${s.gameId}`}>
              Game Center: placar por quarto, drives e probabilidade de vitória
            </Link>
          ) : (
            <p className="small muted">Detalhes jogada a jogada disponíveis apenas a partir do Super Bowl XXXIV (temporada 1999).</p>
          )}
          <Link className="btn" to={`/teams/${s.winner.toLowerCase()}`}>
            Página do {s.winnerName.split(' ').pop()}
          </Link>
          <Link className="btn" to={`/matchup?a=${s.winner}&b=${s.loser}`}>
            Confronto {s.winner} × {s.loser}
          </Link>
          <div className="row between" style={{ marginTop: 12 }}>
            {prev ? <Link to={`/super-bowl/${prev.number}`}>← SB {prev.roman}</Link> : <span />}
            {next ? <Link to={`/super-bowl/${next.number}`}>SB {next.roman} →</Link> : <span />}
          </div>
        </section>
      </div>
    </div>
  );
}
