/**
 * Tradução dos termos que chegam em inglês da ESPN (Game Center e placares ao vivo).
 * Cada termo tem o nome em português, o original em inglês e uma descrição curta, exibidos ao passar o mouse
 * (ou tocar). O seletor "Português | Inglês" permite ver os termos originais.
 * As chaves são os identificadores estáveis da ESPN (`name`), não o rótulo em inglês.
 */

export interface Term {
  pt: string;
  en: string;
  desc: string;
}

/** Estatísticas dos times (boxscore.teams[].statistics[].name). */
export const TEAM_STATS: Record<string, Term> = {
  firstDowns: { pt: 'First downs', en: '1st Downs', desc: 'Vezes em que o ataque conquistou uma nova série de 4 descidas (avançou as 10 jardas).' },
  firstDownsPassing: { pt: 'First downs por passe', en: 'Passing 1st downs', desc: 'First downs conquistados com passes completos.' },
  firstDownsRushing: { pt: 'First downs por corrida', en: 'Rushing 1st downs', desc: 'First downs conquistados com corridas.' },
  firstDownsPenalty: { pt: 'First downs por falta', en: '1st downs from penalties', desc: 'First downs ganhos por falta da defesa, sem jogada do ataque.' },
  thirdDownEff: { pt: 'Conversões na 3ª descida', en: '3rd down efficiency', desc: 'Conversões ÷ tentativas na 3ª descida. É o momento decisivo da série: falhar costuma significar punt.' },
  fourthDownEff: { pt: 'Conversões na 4ª descida', en: '4th down efficiency', desc: 'Conversões ÷ tentativas quando o time arriscou a 4ª descida em vez de chutar.' },
  totalOffensivePlays: { pt: 'Jogadas do ataque', en: 'Total Plays', desc: 'Total de jogadas de passe e corrida do ataque (inclui sacks).' },
  totalYards: { pt: 'Jardas totais', en: 'Total Yards', desc: 'Jardas de passe + jardas corridas. 1 jarda ≈ 0,91 m.' },
  yardsPerPlay: { pt: 'Jardas por jogada', en: 'Yards per Play', desc: 'Jardas totais ÷ jogadas do ataque. Mede a eficiência, não o volume.' },
  totalDrives: { pt: 'Posses de bola (drives)', en: 'Total Drives', desc: 'Quantas vezes o time teve a bola no ataque.' },
  netPassingYards: { pt: 'Jardas de passe', en: 'Passing', desc: 'Jardas por passe, já descontadas as jardas perdidas em sacks.' },
  completionAttempts: { pt: 'Passes completos/tentados', en: 'Comp/Att', desc: 'Passes pegos pelo recebedor ÷ passes lançados.' },
  yardsPerPass: { pt: 'Jardas por passe', en: 'Yards per pass', desc: 'Jardas de passe ÷ passes tentados (com sacks).' },
  interceptions: { pt: 'Interceptações lançadas', en: 'Interceptions thrown', desc: 'Passes pegos pela defesa adversária: o ataque perde a bola.' },
  sacksYardsLost: { pt: 'Sacks sofridos (jardas perdidas)', en: 'Sacks-Yards Lost', desc: 'Vezes em que o QB foi derrubado antes de lançar, e as jardas perdidas nessas jogadas.' },
  rushingYards: { pt: 'Jardas corridas', en: 'Rushing', desc: 'Jardas ganhas em corridas.' },
  rushingAttempts: { pt: 'Corridas', en: 'Rushing Attempts', desc: 'Número de tentativas de corrida.' },
  yardsPerRushAttempt: { pt: 'Jardas por corrida', en: 'Yards per rush', desc: 'Jardas corridas ÷ corridas.' },
  redZoneAttempts: { pt: 'Red zone (TDs/visitas)', en: 'Red Zone (Made-Att)', desc: 'Touchdowns ÷ visitas à red zone (dentro da linha de 20 do adversário). Converter em TD, e não em field goal, decide jogos.' },
  totalPenaltiesYards: { pt: 'Faltas (jardas)', en: 'Penalties', desc: 'Faltas cometidas e as jardas perdidas por elas.' },
  turnovers: { pt: 'Perdas de posse (turnovers)', en: 'Turnovers', desc: 'Interceptações lançadas + fumbles perdidos: vezes em que o ataque entregou a bola.' },
  fumblesLost: { pt: 'Fumbles perdidos', en: 'Fumbles lost', desc: 'Bolas soltas recuperadas pelo adversário.' },
  defensiveTouchdowns: { pt: 'TDs de defesa e times especiais', en: 'Defensive / Special Teams TDs', desc: 'Touchdowns marcados pela defesa (interceptação ou fumble) ou em retornos de chute.' },
  possessionTime: { pt: 'Tempo de posse', en: 'Possession', desc: 'Tempo total com a bola no ataque (de 60 minutos de jogo).' },
};

/** Categorias de destaques (leaders[].leaders[].name). */
export const LEADER_CATEGORIES: Record<string, Term> = {
  passingYards: { pt: 'Jardas de passe', en: 'Passing Yards', desc: 'Quem mais lançou: completos/tentativas, jardas, TDs e interceptações.' },
  rushingYards: { pt: 'Jardas corridas', en: 'Rushing Yards', desc: 'Quem mais correu: corridas, jardas e TDs.' },
  receivingYards: { pt: 'Jardas recebidas', en: 'Receiving Yards', desc: 'Quem mais recebeu: recepções, jardas e TDs.' },
  sacks: { pt: 'Sacks', en: 'Sacks', desc: 'Derrubadas do QB adversário antes do passe.' },
  totalTackles: { pt: 'Tackles', en: 'Tackles', desc: 'Vezes em que o defensor parou o portador da bola.' },
};

/** Tipos de pontuação (scoringPlays[].type.abbreviation). */
export const SCORE_TYPES: Record<string, Term> = {
  TD: { pt: 'TD', en: 'Touchdown', desc: 'Touchdown: 6 pontos, mais a tentativa de 1 (chute) ou 2 pontos (jogada).' },
  FG: { pt: 'FG', en: 'Field Goal', desc: 'Field goal: chute entre as traves, 3 pontos.' },
  SF: { pt: 'Safety', en: 'Safety', desc: 'Safety: o ataque é parado na própria end zone. 2 pontos para a defesa.' },
  XP: { pt: 'Ponto extra', en: 'Extra Point', desc: 'Chute após o touchdown, 1 ponto.' },
  D2P: { pt: 'Conversão de 2 pontos (defesa)', en: 'Defensive Two-Point', desc: 'A defesa devolveu uma tentativa de conversão até a outra end zone: 2 pontos.' },
};

const fixed = (key: string | undefined, label: string, dict: Record<string, Term>): Term | null =>
  (key && dict[key]) || Object.values(dict).find((t) => t.en.toLowerCase() === label.toLowerCase()) || null;

export const teamStatTerm = (key: string | undefined, label: string) => fixed(key, label, TEAM_STATS);
export const leaderTerm = (key: string | undefined, label: string) => fixed(key, label, LEADER_CATEGORIES);
export const scoreTypeTerm = (type: string) => SCORE_TYPES[type.toUpperCase()] ?? null;

/** Decimal no padrão brasileiro: "4.3" → "4,3" (só números isolados, não placares nem horários). */
export const decimalBR = (v: string) => (/^-?\d+\.\d+$/.test(v.trim()) ? v.replace('.', ',') : v);

/** "17/27, 107 YDS, 2 INT" → "17/27, 107 jardas, 2 INT"; "17 CAR, 41 YDS, 1 TD" → "17 corridas, 41 jardas, 1 TD". */
export function translateLeaderValue(v: string): string {
  return v
    .replace(/\bYDS\b/g, 'jardas')
    .replace(/(\d+) CAR\b/g, (_m, n) => `${n} ${n === '1' ? 'corrida' : 'corridas'}`)
    .replace(/(\d+) REC\b/g, (_m, n) => `${n} ${n === '1' ? 'recepção' : 'recepções'}`);
}

/** Complemento do touchdown (entre parênteses): ponto extra ou conversão de 2 pontos. */
function translateExtra(x: string): string {
  let m = x.match(/^(.+?) Kick$/i);
  if (m) return `ponto extra de ${m[1]}`;
  m = x.match(/^(.+?) Pass to (.+?) for Two-Point Conversion$/i);
  if (m) return `2 pontos: passe de ${m[1]} para ${m[2]}`;
  m = x.match(/^(.+?) (?:Run|Rush) for Two-Point Conversion$/i);
  if (m) return `2 pontos: corrida de ${m[1]}`;
  if (/two-point.*failed/i.test(x)) return 'conversão de 2 pontos falhou';
  if (/(kick|pat) failed|blocked/i.test(x)) return 'ponto extra perdido';
  return x;
}

/**
 * Descrições de pontuação mais comuns da ESPN, em português. Formato desconhecido → texto original.
 * Ex.: "J.K. Dobbins 4 Yd Rush (Wil Lutz Kick)" → "J.K. Dobbins: corrida de 4 jardas (ponto extra de Wil Lutz)".
 */
export function translateScoringText(text: string): string {
  const t = text.trim();
  const extra = (s?: string) => (s ? ` (${translateExtra(s)})` : '');
  const yd = (n: string) => `${n} ${n === '1' ? 'jarda' : 'jardas'}`;
  let m = t.match(/^(.+?) (\d+) Yd Field Goal$/i);
  if (m) return `${m[1]}: field goal de ${yd(m[2])}`;
  m = t.match(/^(.+?) (\d+) Yd (?:Rush|Run)(?: \((.+)\))?$/i);
  if (m) return `${m[1]}: corrida de ${yd(m[2])}${extra(m[3])}`;
  m = t.match(/^(.+?) (\d+) Yd pass from (.+?)(?: \((.+)\))?$/i);
  if (m) return `${m[1]}: recepção de ${yd(m[2])}, passe de ${m[3]}${extra(m[4])}`;
  m = t.match(/^(.+?) (\d+) Yd (Interception|Fumble|Punt|Kickoff|Blocked Punt|Blocked Field Goal) Return(?: \((.+)\))?$/i);
  if (m) {
    const kind: Record<string, string> = { interception: 'interceptação', fumble: 'fumble', punt: 'punt', kickoff: 'kickoff', 'blocked punt': 'punt bloqueado', 'blocked field goal': 'field goal bloqueado' };
    return `${m[1]}: retorno de ${kind[m[3].toLowerCase()]} de ${yd(m[2])}${extra(m[4])}`;
  }
  if (/safety/i.test(t)) return `Safety${t.replace(/safety/i, '').trim() ? `: ${t}` : ''}`;
  return t;
}

/** Situação do jogo ao vivo: "8:24 - 3rd" → "8:24 · 3º quarto"; "Halftime" → "Intervalo"; "Final/OT" → "Final · prorrogação". */
export function translateGameDetail(d: string): string {
  if (!d) return d;
  const ord = (s: string) => s.replace(/\b1st\b/g, '1º').replace(/\b2nd\b/g, '2º').replace(/\b3rd\b/g, '3º').replace(/\b4th\b/g, '4º');
  return ord(d)
    .replace(/^Halftime$/i, 'Intervalo')
    .replace(/^Final\/OT$/i, 'Final · prorrogação')
    .replace(/^Final\/(\d)OT$/i, 'Final · $1 prorrogações')
    .replace(/^End of (\d)º( Quarter)?$/i, 'Fim do $1º quarto')
    .replace(/^End of OT$/i, 'Fim da prorrogação')
    .replace(/(\d)º Quarter/i, '$1º quarto')
    .replace(/^([\d:]+) - (\d)º$/, '$1 · $2º quarto')
    .replace(/^([\d:]+) - OT$/, '$1 · prorrogação')
    .replace(/\bDelayed\b/i, 'Atrasado')
    .replace(/\bPostponed\b/i, 'Adiado')
    .replace(/\bCanceled\b/i, 'Cancelado');
}
