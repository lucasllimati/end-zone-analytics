import type { Column } from './DataTable';
import type { PlayerSeasonLine } from '../lib/types';
import { derived, positionBucket } from '../lib/stats';
import { num, percent, signed } from '../lib/format';

type C = Column<PlayerSeasonLine>;

const n = (key: keyof PlayerSeasonLine, label: string, metricKey = key as string, digits = 0, expertOnly = false): C => ({
  key: key as string,
  label,
  metric: metricKey,
  num: true,
  expertOnly,
  render: (l) => num(l[key] as number, digits),
  value: (l) => l[key] as number,
});
const d = (key: keyof ReturnType<typeof derived>, label: string, kind: 'pct' | 'num' | 'signed' = 'num', digits = 1, expertOnly = false): C => ({
  key,
  label,
  metric: key,
  num: true,
  expertOnly,
  render: (l) => {
    const v = derived(l)[key];
    return v === null ? '—' : kind === 'pct' ? percent(v) : kind === 'signed' ? signed(v, digits) : num(v, digits);
  },
  value: (l) => derived(l)[key],
});
/** Participação (0–1) exibida em %; ausente em carreiras e temporadas antigas. */
const share = (key: 'tgtShare' | 'airShare', label: string): C => ({
  key,
  label,
  metric: key,
  num: true,
  expertOnly: true,
  render: (l) => (l[key] == null ? '—' : percent(l[key])),
  value: (l) => l[key] ?? null,
});
const epa = (key: 'passEpa' | 'rushEpa' | 'recEpa', label: string): C => ({
  key,
  label,
  metric: key,
  num: true,
  expertOnly: true,
  render: (l) => (l[key] === null ? '—' : signed(l[key], 1)),
  value: (l) => l[key],
});

/** Colunas de estatística por grupo de posição. Colunas avançadas só aparecem no modo Expert. */
export function statColumns(pos: string): C[] {
  const b = positionBucket(pos);
  const games = n('games', 'J', 'games');
  if (b === 'QB')
    return [games, n('cmp', 'CMP', 'cmp'), n('att', 'ATT', 'att'), d('cmpPct', 'CMP%', 'pct'), n('passYds', 'Jardas', 'passYds'), n('passTd', 'TD', 'passTd'), n('int', 'INT', 'int'), d('rating', 'Rating', 'num', 1), n('sacked', 'SK', 'sacked'), epa('passEpa', 'EPA'), d('epaPerDb', 'EPA/DB', 'signed', 3, true), { ...n('cpoe', 'CPOE', 'cpoe', 1, true), render: (l) => (l.cpoe === null ? '—' : signed(l.cpoe, 1)) }, n('airYds', 'Air yds', 'airYds', 0, true), n('pass20', '20+', 'pass20', 0, true), n('passFd', '1D', 'passFd', 0, true), n('rushYds', 'J. corr.', 'rushYds'), n('rushTd', 'TD corr.', 'rushTd')];
  if (b === 'RB') return [games, n('carries', 'Corr.', 'carries'), n('rushYds', 'Jardas', 'rushYds'), d('ypc', 'Y/C'), n('rushTd', 'TD', 'rushTd'), epa('rushEpa', 'EPA corr.'), n('rush20', '20+', 'rush20', 0, true), n('rushFd', '1D', 'rushFd', 0, true), n('rec', 'Rec', 'rec'), n('recYds', 'J. rec.', 'recYds'), n('recTd', 'TD rec.', 'recTd'), n('fumLost', 'FL', 'fumLost')];
  if (b === 'WR' || b === 'TE') return [games, n('tgt', 'Alvos', 'tgt'), n('rec', 'Rec', 'rec'), d('catchRate', 'Catch%', 'pct', 1, true), n('recYds', 'Jardas', 'recYds'), d('ypr', 'Y/R'), n('recTd', 'TD', 'recTd'), n('yac', 'YAC', 'yac', 0, true), epa('recEpa', 'EPA'), share('tgtShare', 'TGT%'), share('airShare', 'AIR%'), { ...n('wopr', 'WOPR', 'wopr', 2, true), render: (l) => (l.wopr == null ? '—' : num(l.wopr, 2)), value: (l) => l.wopr ?? null }, n('rec20', '20+', 'rec20', 0, true), n('recFd', '1D', 'recFd', 0, true), n('rushYds', 'J. corr.', 'rushYds')];
  if (b === 'K') return [games, n('fgm', 'FGM', 'fgm'), n('fga', 'FGA', 'fga'), d('fgPct', 'FG%', 'pct'), { ...n('fgLong', 'Longo', 'fgLong'), render: (l) => (l.fgLong === null ? '—' : String(l.fgLong)) }, { ...d('fg50', '50+', 'num', 0), render: (l) => (derived(l).fg50 === null ? '—' : String(derived(l).fg50)) }, n('gwfgm', 'Da vitória', 'gwfgm'), n('xpm', 'XPM', 'xpm'), n('xpa', 'XPA', 'xpa')];
  if (b === 'P') return [games, n('punts', 'Punts', 'punts'), d('puntAvg', 'Média'), d('puntNet', 'Líquida'), n('ptIn20', 'Dentro da 20', 'ptIn20'), n('ptTb', 'TB', 'ptTb')];
  if (['DL', 'LB', 'DB'].includes(b)) return [games, n('tackles', 'Tackles', 'tackles'), n('tfl', 'TFL', 'tfl'), n('sacks', 'Sacks', 'sacks', 1), n('qbHits', 'QB hits', 'qbHits', 0, true), n('defInt', 'INT', 'defInt'), n('pd', 'PD', 'pd'), n('ff', 'FF', 'ff'), n('defTd', 'TD', 'defTd')];
  return [games];
}

/** Estatística principal por posição (para gráficos de evolução). */
export function primaryStat(pos: string): { key: keyof PlayerSeasonLine; label: string }[] {
  const b = positionBucket(pos);
  if (b === 'QB') return [{ key: 'passYds', label: 'Jardas de passe' }, { key: 'passTd', label: 'TDs de passe' }, { key: 'int', label: 'Interceptações' }, { key: 'rushYds', label: 'Jardas corridas' }];
  if (b === 'RB') return [{ key: 'rushYds', label: 'Jardas corridas' }, { key: 'rushTd', label: 'TDs corridos' }, { key: 'recYds', label: 'Jardas recebidas' }];
  if (b === 'WR' || b === 'TE') return [{ key: 'recYds', label: 'Jardas recebidas' }, { key: 'rec', label: 'Recepções' }, { key: 'recTd', label: 'TDs' }];
  if (b === 'K') return [{ key: 'fgm', label: 'Field goals' }];
  if (b === 'P') return [{ key: 'punts', label: 'Punts' }];
  return [{ key: 'tackles', label: 'Tackles' }, { key: 'sacks', label: 'Sacks' }, { key: 'defInt', label: 'Interceptações' }];
}
