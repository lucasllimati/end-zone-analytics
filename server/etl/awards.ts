/**
 * Prêmios individuais da AP (MVP, jogador ofensivo/defensivo do ano, novatos, retorno e técnico do ano),
 * extraídos das listas da Wikipedia em inglês (texto sob CC BY-SA 4.0; os fatos em si não têm proteção).
 *
 * O Wikidata (CC0) foi avaliado e descartado: listas incompletas e com erros (ex.: Kyler Murray como
 * jogador ofensivo do ano de 2019 — ele foi novato ofensivo do ano). Por isso, cada prêmio passa por
 * fatos conhecidos (KNOWN) antes de ser publicado; um prêmio que falha fica de fora, em vez de sair errado.
 */
import type { AwardKey } from '../../src/lib/types';

export const AWARDS: { key: AwardKey; label: string; page: string; caption?: RegExp }[] = [
  { key: 'mvp', label: 'MVP (jogador mais valioso)', page: 'AP_NFL_Most_Valuable_Player' },
  { key: 'opoy', label: 'Jogador ofensivo do ano', page: 'AP_NFL_Offensive_Player_of_the_Year' },
  { key: 'dpoy', label: 'Jogador defensivo do ano', page: 'AP_NFL_Defensive_Player_of_the_Year' },
  { key: 'oroy', label: 'Novato ofensivo do ano', page: 'AP_NFL_Rookie_of_the_Year', caption: /offensive/i },
  { key: 'droy', label: 'Novato defensivo do ano', page: 'AP_NFL_Rookie_of_the_Year', caption: /defensive/i },
  { key: 'cpoy', label: 'Volta por cima do ano (Comeback)', page: 'AP_NFL_Comeback_Player_of_the_Year' },
  { key: 'coy', label: 'Técnico do ano', page: 'AP_NFL_Coach_of_the_Year' },
];

/** Fatos conferidos: se a extração não reproduzir todos, o prêmio não é publicado. */
export const KNOWN: Record<AwardKey, [number, string][]> = {
  mvp: [[2003, 'Peyton Manning'], [2003, 'Steve McNair'], [2010, 'Tom Brady'], [2019, 'Lamar Jackson'], [2024, 'Josh Allen']],
  opoy: [[2021, 'Cooper Kupp'], [2017, 'Todd Gurley'], [2023, 'Christian McCaffrey']],
  dpoy: [[2023, 'Myles Garrett'], [2012, 'J. J. Watt'], [2022, 'Nick Bosa']],
  oroy: [[2017, 'Alvin Kamara'], [2019, 'Kyler Murray'], [2023, 'C. J. Stroud']],
  droy: [[2017, 'Marshon Lattimore'], [2021, 'Micah Parsons'], [2003, 'Terrell Suggs']],
  cpoy: [[2021, 'Joe Burrow'], [2022, 'Geno Smith'], [2023, 'Joe Flacco']],
  coy: [[2003, 'Bill Belichick'], [2021, 'Mike Vrabel'], [2022, 'Brian Daboll']],
};

const NICK = /(Cardinals|Falcons|Ravens|Bills|Panthers|Bears|Bengals|Browns|Cowboys|Broncos|Lions|Packers|Texans|Colts|Jaguars|Chiefs|Raiders|Chargers|Rams|Dolphins|Vikings|Patriots|Saints|Giants|Jets|Eagles|Steelers|49ers|Seahawks|Buccaneers|Titans|Oilers|Redskins|Commanders|Football Team)$/;
/** Temporada: "[[2023 NFL season|2023]]" ou "{{NFL year|2023}}". */
const SEASON = /\[\[(\d{4}) NFL season|\{\{NFL year\|(\d{4})/;
const IGNORE_LINK = /NFL season|^(Quarterback|Running back|Wide receiver|Tight end|Defensive|Linebacker|Cornerback|Safety|Fullback|Halfback|Offensive|Placekicker|Kicker|Punter|Head coach)/i;

/** Remove referências, notas e destaques que não fazem parte do texto da célula. */
const clean = (s: string) =>
  s
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{(efn|small|sup|ref)[^{}]*\}\}/gi, '')
    .replace(/'''?/g, '');

/** Nomes em uma célula: {{sortname|Nome|Sobrenome}} ou [[Link|Texto]], separados por <br />. */
function names(cell: string): string[] {
  const out: string[] = [];
  for (const part of cell.split(/<br\s*\/?>/i)) {
    const sn = part.match(/\{\{\s*sortname\s*\|([^|}]+)\|([^|}]+)/i);
    if (sn) {
      out.push(`${sn[1].trim()} ${sn[2].trim()}`);
      continue;
    }
    const link = [...part.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].find((m) => !IGNORE_LINK.test(m[1]));
    if (link) out.push((link[2] ?? link[1]).replace(/\s*\(.*?\)\s*$/, '').trim());
  }
  return out;
}

/** Times de uma linha: "[[2023 Cleveland Browns season|Cleveland]]" → "Cleveland Browns"; ou link direto do time. */
function teams(row: string): string[] {
  const out: string[] = [];
  for (const m of row.matchAll(/\[\[(?:\d{4} )?([^\]|]+?)(?: season)?(?:\|[^\]]*)?\]\]/g)) if (NICK.test(m[1].trim())) out.push(m[1].trim());
  return out;
}

/** Vencedores de uma tabela "Temporada | Vencedor | …" (tabelas sem coluna de temporada são ignoradas). */
/** Página e linha acima disso não são lidas: limita o custo das regexes com texto vandalizado. */
export const MAX_WIKITEXT = 600_000;
const MAX_ROW = 5_000;

export function parseAwardTable(wikitext: string, caption?: RegExp): { season: number; name: string; team: string | null }[] {
  if (wikitext.length > MAX_WIKITEXT) return [];
  const tables: string[] = [];
  for (let i = wikitext.indexOf('{|'); i >= 0; i = wikitext.indexOf('{|', i + 2)) {
    const end = wikitext.indexOf('\n|}', i);
    if (end < 0) break;
    tables.push(wikitext.slice(i, end));
  }
  // Algumas páginas têm mais de uma tabela (legenda, prêmios antigos): fica a com mais vencedores.
  let best: { season: number; name: string; team: string | null }[] = [];
  for (const t of tables) {
    const out: { season: number; name: string; team: string | null }[] = [];
    if (caption && !caption.test(t.match(/\n\|\+([^\n]*)/)?.[1] ?? '')) continue;
    let lastTeam: string | null = null;
    for (const raw of t.split(/\n\|-[^\n]*/).slice(1)) {
      if (raw.length > MAX_ROW) continue;
      // Células: começam em nova linha com | ou !, ou em || / !! na mesma linha.
      const cells = clean(raw)
        .split(/\n[|!]|\|\||!!/)
        .map((c) => c.replace(/^\s*[|!]?\s*(scope="row"\s*\||style="[^"]*"\s*\||align="[^"]*"\s*\||rowspan="\d+"\s*\|)*/i, '').trim())
        .filter(Boolean);
      const si = cells.findIndex((c) => SEASON.test(c));
      if (si < 0 || si + 1 >= cells.length) continue;
      const m = cells[si].match(SEASON)!;
      const season = Number(m[1] ?? m[2]);
      const who = names(cells[si + 1]);
      const tm = teams(cells.slice(si + 2).join('\n'));
      if (tm.length) lastTeam = tm[0];
      who.forEach((name, k) => out.push({ season, name, team: tm[k] ?? tm[0] ?? lastTeam }));
    }
    if (out.length > best.length) best = out;
  }
  return best;
}

/** Confere os fatos conhecidos; devolve o que faltou (vazio = prêmio aprovado). */
export function missingKnown(key: AwardKey, rows: { season: number; name: string }[]): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  return KNOWN[key].filter(([s, n]) => !rows.some((r) => r.season === s && norm(r.name) === norm(n))).map(([s, n]) => `${s} ${n}`);
}
