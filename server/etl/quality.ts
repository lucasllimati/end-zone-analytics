/**
 * Validações de qualidade de dados (data_quality_status).
 * Cada verificação retorna pass/warn/fail com detalhe legível. Falhas não bloqueiam a publicação,
 * mas ficam visíveis no Centro de Dados e no manifest.
 */
import type { CuratedRecord, DraftPick, Game, PlayerSeasonLine, QualityCheck, SuperBowl, Team, TeamSeason } from '../../src/lib/types';
import { franchiseOf } from '../../src/lib/teams';
import { isPlayed } from '../../src/lib/standings';
import { passerRating } from '../../src/lib/stats';

const check = (id: string, dataset: string, description: string, problems: string[], warnOnly = false, ok = 'Sem problemas'): QualityCheck => ({
  id,
  dataset,
  description,
  status: problems.length === 0 ? 'pass' : warnOnly ? 'warn' : 'fail',
  detail: problems.length === 0 ? ok : `${problems.length} ocorrência(s): ${problems.slice(0, 5).join('; ')}${problems.length > 5 ? '…' : ''}`,
});

export interface QualityInput {
  teams: Team[];
  games: Game[];
  lines: PlayerSeasonLine[];
  draft: DraftPick[];
  superBowls: SuperBowl[];
  sbIssues: string[];
  teamSeasons: TeamSeason[];
  curatedRecords: (CuratedRecord & { season?: number; verify?: string })[];
  currentSeason: number;
}

export function runQuality(q: QualityInput): QualityCheck[] {
  const out: QualityCheck[] = [];
  const teamSet = new Set(q.teams.map((t) => t.abbr));

  out.push(check('teams-32', 'teams', 'Existem exatamente 32 franquias ativas', q.teams.filter((t) => t.active).length === 32 ? [] : [`${q.teams.filter((t) => t.active).length} ativas`]));

  const ids = new Set<string>();
  const dup: string[] = [];
  for (const g of q.games) {
    if (ids.has(g.id)) dup.push(g.id);
    ids.add(g.id);
  }
  out.push(check('games-unique', 'games', 'IDs de jogos são únicos', dup));
  out.push(check('games-teams', 'games', 'Todos os times dos jogos existem no cadastro', q.games.filter((g) => !teamSet.has(g.home) || !teamSet.has(g.away)).map((g) => g.id)));
  out.push(check('games-scores', 'games', 'Placares são não negativos e completos (ambos ou nenhum)', q.games.filter((g) => (g.homeScore === null) !== (g.awayScore === null) || (g.homeScore ?? 0) < 0 || (g.awayScore ?? 0) < 0).map((g) => g.id)));
  out.push(check('games-self', 'games', 'Nenhum time joga contra si mesmo', q.games.filter((g) => franchiseOf(g.home) === franchiseOf(g.away)).map((g) => g.id)));
  out.push(check('games-future', 'games', 'Jogos com placar não estão no futuro', q.games.filter((g) => isPlayed(g) && new Date(`${g.date}T00:00:00Z`).getTime() > Date.now() + 86400000).map((g) => g.id)));

  // Cada time deve ter 16 (até 2020) ou 17 (2021+) jogos em temporadas completas.
  // Exceção conhecida: BUF × CIN (semana 17 de 2022) foi cancelado após a parada cardíaca de Damar Hamlin.
  const KNOWN_SHORT = new Set(['BUF|2022', 'CIN|2022']);
  const counts: string[] = [];
  for (const ts of q.teamSeasons) {
    if (ts.season >= q.currentSeason || KNOWN_SHORT.has(`${ts.team}|${ts.season}`)) continue;
    const expected = ts.season >= 2021 ? 17 : 16;
    const g = ts.w + ts.l + ts.t;
    if (g !== expected) counts.push(`${ts.team} ${ts.season}: ${g}`);
  }
  out.push(check('games-per-team', 'games', 'Times têm 16/17 jogos em temporadas encerradas', counts, true));

  const wc: string[] = [];
  for (const s of new Set(q.games.map((g) => g.season))) {
    if (s >= q.currentSeason) continue;
    const n = q.games.filter((g) => g.season === s && g.type === 'WC').length;
    const exp = s >= 2020 ? 6 : 4;
    if (n !== exp) wc.push(`${s}: ${n} jogos de Wild Card (esperado ${exp})`);
  }
  out.push(check('playoffs-format', 'games', 'Formato de playoffs por temporada (4 ou 6 jogos de Wild Card)', wc, true));

  const lineKeys = new Set<string>();
  const dupLines: string[] = [];
  for (const l of q.lines) {
    const k = `${l.id}|${l.season}|${l.st}`;
    if (lineKeys.has(k)) dupLines.push(k);
    lineKeys.add(k);
  }
  out.push(check('players-dup', 'playerStats', 'Uma linha por jogador/temporada/tipo', dupLines));
  out.push(check('players-impossible', 'playerStats', 'Estatísticas possíveis (completos ≤ tentativas, valores ≥ 0)', q.lines.filter((l) => l.cmp > l.att || l.att < 0 || l.carries < 0 || (l.tgt > 0 && l.rec > l.tgt) || l.fgm > l.fga).map((l) => `${l.name} ${l.season}`), true));
  out.push(check('players-rating', 'playerStats', 'Passer rating dentro de 0–158,3', q.lines.filter((l) => {
    const r = passerRating(l.cmp, l.att, l.passYds, l.passTd, l.int);
    return r !== null && (r < 0 || r > 158.34);
  }).map((l) => `${l.name} ${l.season}`)));
  out.push(check('players-names', 'playerStats', 'Todos os jogadores têm nome', q.lines.filter((l) => !l.name).map((l) => l.id)));

  const picks = new Set<string>();
  const dupPicks: string[] = [];
  for (const d of q.draft) {
    const k = `${d.season}-${d.pick}`;
    if (picks.has(k)) dupPicks.push(k);
    picks.add(k);
  }
  out.push(check('draft-unique', 'draft', 'Número de escolha único por draft', dupPicks, true));

  const nums = q.superBowls.map((s) => s.number);
  const gaps = nums.filter((n, i) => n !== i + 1).map(String);
  out.push(check('sb-sequence', 'superBowls', 'Super Bowls numerados em sequência a partir do I', gaps));
  out.push(check('sb-crosscheck', 'superBowls', 'Placar e campeão (1999+) conferem com o nflverse', q.sbIssues));

  const recordIssues: string[] = [];
  const recordNotes: string[] = [];
  for (const r of q.curatedRecords) {
    if (!r.verify || !r.season) continue;
    if (r.verify === 'teamPoints') {
      const max = Math.max(...q.teamSeasons.filter((t) => t.season === r.season).map((t) => t.pf));
      if (max !== r.value) recordIssues.push(`${r.label}: curadoria ${r.value}, dados ${max}`);
      continue;
    }
    const k = r.verify as keyof PlayerSeasonLine;
    const all = q.lines.filter((l) => l.st === 'REG');
    const seasonMax = Math.max(...all.filter((l) => l.season === r.season).map((l) => l[k] as number));
    const globalMax = Math.max(...all.map((l) => l[k] as number));
    if (seasonMax !== r.value) recordIssues.push(`${r.label}: curadoria ${r.value}, dados ${seasonMax}`);
    else if (globalMax > r.value) {
      const who = all.find((l) => (l[k] as number) === globalMax)!;
      recordNotes.push(`${r.label}: nflverse registra ${globalMax} para ${who.name} (${who.season}), acima do oficial ${r.value} — divergência de contagem play-by-play ou novo recorde a confirmar`);
    }
  }
  out.push(check('records-crosscheck', 'records', 'Recordes de temporada (1999+) conferem com o nflverse', recordIssues));
  out.push(check('records-divergence', 'records', 'Estatísticas do nflverse não superam recordes oficiais (divergências de contagem)', recordNotes, true));

  return out;
}
