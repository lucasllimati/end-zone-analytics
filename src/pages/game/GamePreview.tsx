/**
 * Game Center antes do jogo: o que a ESPN e a base têm para um jogo ainda não disputado, organizado como
 * prévia (momento dos times, médias da temporada comparadas e destaques de cada time lado a lado).
 */
import { Link } from 'react-router-dom';
import { TeamLogo } from '../../components/TeamLogo';
import { TermsToggle, TermText, type TermsLang } from '../../components/TermsToggle';
import { decimalBR, leaderTerm, teamStatTerm, translateLeaderValue } from '../../content/espnTerms';
import { fromEspn } from '../../data/live';
import { fmtRecord, resultFor } from '../../lib/standings';
import { franchiseOf } from '../../lib/teams';
import type { Game } from '../../lib/types';

interface TeamStat {
  key?: string;
  label: string;
  away: string;
  home: string;
}
interface Leader {
  key?: string;
  category: string;
  side: 'home' | 'away';
  team: string;
  athlete: string;
  value: string;
}

const LETTER: Record<TermsLang, Record<string, string>> = { pt: { W: 'V', L: 'D', T: 'E' }, en: { W: 'W', L: 'L', T: 'T' } };

/** Campanha e últimos jogos de cada time na temporada, até a data deste jogo. */
export function TeamForm({ g, all, nick, lang }: { g: Game; all: Game[]; nick: (t: string) => string; lang: TermsLang }) {
  const before = all.filter((x) => x.season === g.season && x.type === 'REG' && x.date < g.date && x.homeScore !== null);
  const teams = [g.away, g.home].map((t) => {
    const code = franchiseOf(t);
    const res = before
      .filter((x) => franchiseOf(x.home) === code || franchiseOf(x.away) === code)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((x) => resultFor(x, code))
      .filter((r): r is 'W' | 'L' | 'T' => r !== null);
    const rec = { w: res.filter((r) => r === 'W').length, l: res.filter((r) => r === 'L').length, t: res.filter((r) => r === 'T').length };
    return { t, code, res, rec };
  });
  if (!teams.some((x) => x.res.length)) return null;
  const tone: Record<string, string> = { W: 'good', L: 'bad' };
  return (
    <section className="card">
      <h2>Momento dos times</h2>
      <dl className="kv">
        {teams.map((x) => (
          <div key={x.t} style={{ display: 'contents' }}>
            <dt>
              <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <TeamLogo abbr={x.t} size={18} /> {nick(x.t)}
              </span>
            </dt>
            <dd>
              <span className="row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                <strong>{fmtRecord(x.rec)}</strong>
                <span className="sr-only">Últimos jogos: {x.res.slice(-5).map((r) => (r === 'W' ? 'vitória' : r === 'L' ? 'derrota' : 'empate')).join(', ')}</span>
                <span className="last5" aria-hidden="true">
                  {x.res.slice(-5).map((r, i) => (
                    <span key={i} className={tone[r] ?? 'muted'}>
                      {LETTER[lang][r]}
                    </span>
                  ))}
                </span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Temporada regular {g.season} até este jogo; últimos 5 resultados, do mais antigo ao mais recente.
      </p>
    </section>
  );
}

/** Nas médias da temporada, menor é melhor para o que a defesa cede; maior é melhor no resto. */
const lowerIsBetter = (key?: string) => Boolean(key && /Allowed$/.test(key));
const toNumber = (v: string) => {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Estatísticas dos dois times lado a lado; antes do jogo (médias), destaca o melhor valor de cada linha. */
export function StatsCompare({ g, rows, pre, lang }: { g: Game; rows: TeamStat[]; pre: boolean; lang: TermsLang }) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>{pre ? 'Médias da temporada' : 'Estatísticas dos times'}</h2>
        <TermsToggle />
      </div>
      <div className="table-wrap bare" tabIndex={0} role="region" aria-label={pre ? 'Médias da temporada' : 'Estatísticas dos times'}>
        <table className="data stats-compare">
          <caption className="sr-only">{pre ? 'Médias da temporada de cada time' : 'Estatísticas comparadas'}</caption>
          <thead>
            <tr>
              <th scope="col" className="num">
                <span className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  <TeamLogo abbr={g.away} size={18} /> {g.away}
                </span>
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                Estatística
              </th>
              <th scope="col">
                <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <TeamLogo abbr={g.home} size={18} /> {g.home}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const a = toNumber(s.away);
              const h = toNumber(s.home);
              const better = pre && a !== null && h !== null && a !== h ? ((lowerIsBetter(s.key) ? a < h : a > h) ? 'away' : 'home') : null;
              const cell = (v: string, side: 'away' | 'home') => <span className={better === side ? 'stat-better' : undefined}>{lang === 'en' ? v : decimalBR(v)}</span>;
              return (
                <tr key={`${s.key ?? s.label}-${i}`}>
                  <td className="num">{cell(s.away, 'away')}</td>
                  <td className="muted small" style={{ textAlign: 'center', whiteSpace: 'normal' }}>
                    <TermText term={teamStatTerm(s.key, s.label)} fallback={s.label} lang={lang} />
                  </td>
                  <td>{cell(s.home, 'home')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pre && <p className="xsmall muted" style={{ marginTop: 8 }}>Em destaque, o melhor valor de cada linha (no que a defesa cede, o menor). Fonte: ESPN.</p>}
    </section>
  );
}

/** Valor do destaque; só um número (sacks, tackles) ganha a unidade: "6" → "6 sacks". */
function leaderValue(l: Leader, lang: TermsLang): string {
  const v = lang === 'en' ? l.value : translateLeaderValue(l.value);
  if (!/^[\d.,]+$/.test(v.trim())) return v;
  const term = leaderTerm(l.key, l.category);
  return `${v} ${(lang === 'en' ? (term?.en ?? l.category) : (term?.pt ?? l.category)).toLowerCase()}`;
}

/** Destaques da temporada de cada time, em duas colunas (visitante | mandante). */
export function LeadersByTeam({ g, leaders, nick, lang }: { g: Game; leaders: Leader[]; nick: (t: string) => string; lang: TermsLang }) {
  const sides = (['away', 'home'] as const).map((side) => ({ side, team: side === 'away' ? g.away : g.home, list: leaders.filter((l) => l.side === side) })).filter((s) => s.list.length);
  if (!sides.length) return null;
  return (
    <section className="card">
      <div className="section-title">
        <h2>Destaques da temporada</h2>
        <TermsToggle />
      </div>
      <div className="leaders-pair">
        {sides.map((s) => (
          <div key={s.side}>
            <h3 className="row small" style={{ gap: 6, margin: '0 0 10px' }}>
              <TeamLogo abbr={s.team} size={20} /> {nick(s.team)}
            </h3>
            <ul className="leader-list">
              {s.list.map((l, i) => (
                <li key={i}>
                  <span className="muted xsmall">
                    <TermText term={leaderTerm(l.key, l.category)} fallback={l.category} lang={lang} />
                  </span>
                  <strong>{l.athlete}</strong>
                  <span className="small text-2">{leaderValue(l, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="xsmall muted" style={{ marginTop: 8 }}>
        Líderes de cada time na temporada. Fonte: ESPN. Páginas dos times: <Link to={`/teams/${franchiseOf(fromEspn(g.away)).toLowerCase()}`}>{nick(g.away)}</Link> ·{' '}
        <Link to={`/teams/${franchiseOf(fromEspn(g.home)).toLowerCase()}`}>{nick(g.home)}</Link>
      </p>
    </section>
  );
}
