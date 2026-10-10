/**
 * Simulador educacional de Down & Distance.
 * Heurísticas didáticas — NÃO é um modelo oficial de decisão. As faixas de probabilidade
 * são aproximações arredondadas de médias públicas da liga na era moderna e servem para ensinar o raciocínio.
 */

export interface DownInput {
  down: 1 | 2 | 3 | 4;
  distance: number;
  /** Jardas até a end zone adversária (1–99). */
  yardsToGoal: number;
}

export interface DownOption {
  id: 'run' | 'pass' | 'punt' | 'fg' | 'go' | 'kneel';
  label: string;
  note: string;
  recommended: boolean;
}

export interface DownAdvice {
  headline: string;
  plain: string;
  objective: string;
  zone: 'own-deep' | 'own' | 'midfield' | 'opp' | 'fg-range' | 'red-zone' | 'goal-line';
  zoneLabel: string;
  fieldPosition: string;
  fgDistance: number;
  fgChance: string;
  conversionChance: string;
  risk: 'baixo' | 'médio' | 'alto';
  riskWhy: string;
  options: DownOption[];
  strategy: string;
  expert: string;
}

const ORD = ['', '1st', '2nd', '3rd', '4th'];
const ORD_PT = ['', 'primeira', 'segunda', 'terceira', 'quarta'];

/** Distância do field goal = jardas até a linha de gol + 10 (end zone) + ~7 (snap/hold). */
export const fieldGoalDistance = (yardsToGoal: number) => yardsToGoal + 17;

export function fgChanceLabel(dist: number): string {
  if (dist <= 33) return 'muito alta (≈95%+)';
  if (dist <= 39) return 'alta (≈90%)';
  if (dist <= 49) return 'boa (≈80%)';
  if (dist <= 54) return 'média (≈65–70%)';
  if (dist <= 59) return 'baixa (≈50%)';
  if (dist <= 64) return 'muito baixa (<35%)';
  return 'praticamente fora de alcance';
}

export function conversionLabel(distance: number): string {
  if (distance <= 1) return '≈65–70%';
  if (distance <= 2) return '≈55–60%';
  if (distance <= 3) return '≈50%';
  if (distance <= 5) return '≈40–45%';
  if (distance <= 10) return '≈30–35%';
  return '≈20% ou menos';
}

export function fieldPositionText(yardsToGoal: number): string {
  if (yardsToGoal === 50) return 'meio de campo (50)';
  return yardsToGoal > 50 ? `próprio campo, linha de ${100 - yardsToGoal}` : `campo adversário, linha de ${yardsToGoal}`;
}

export function zoneOf(ytg: number): { zone: DownAdvice['zone']; label: string } {
  if (ytg <= 3) return { zone: 'goal-line', label: 'Goal line (a menos de 4 jardas do TD)' };
  if (ytg <= 20) return { zone: 'red-zone', label: 'Red zone (dentro das 20 jardas)' };
  if (ytg <= 37) return { zone: 'fg-range', label: 'Alcance de field goal' };
  if (ytg < 50) return { zone: 'opp', label: 'Campo adversário' };
  if (ytg <= 60) return { zone: 'midfield', label: 'Meio de campo' };
  if (ytg <= 90) return { zone: 'own', label: 'Próprio campo' };
  return { zone: 'own-deep', label: 'Coladinho na própria end zone' };
}

export function adviseDown(input: DownInput): DownAdvice {
  const down = input.down;
  const distance = Math.max(1, Math.min(99, Math.round(input.distance)));
  const ytg = Math.max(1, Math.min(99, Math.round(input.yardsToGoal)));
  const goalToGo = distance >= ytg;
  const dist = Math.min(distance, ytg);
  const { zone, label } = zoneOf(ytg);
  const fgDist = fieldGoalDistance(ytg);
  const headline = `${ORD[down]} & ${goalToGo ? 'Goal' : dist}`;
  const plain = goalToGo
    ? `É a ${ORD_PT[down]} tentativa e o ataque está a ${ytg} jarda${ytg > 1 ? 's' : ''} do touchdown. Não há mais first down a buscar: o objetivo é marcar.`
    : `É a ${ORD_PT[down]} tentativa (down). O ataque precisa avançar pelo menos ${dist} jarda${dist > 1 ? 's' : ''} para ganhar uma nova série de quatro tentativas.`;

  const options: DownOption[] = [];
  let strategy = '';
  let risk: DownAdvice['risk'] = 'baixo';
  let riskWhy = '';
  let expert = '';
  const short = dist <= 3;
  const long = dist >= 8;

  if (down < 4) {
    options.push(
      { id: 'run', label: 'Corrida', note: short ? 'Boa para ganhar poucas jardas com segurança.' : 'Mantém o relógio correndo, mas ganha menos jardas em média.', recommended: short || down === 1 },
      { id: 'pass', label: 'Passe', note: long ? 'Necessário para ganhar muitas jardas de uma vez.' : 'Versátil; um passe curto e rápido costuma bastar.', recommended: long || down === 3 },
    );
    if (down === 1) {
      strategy = 'Primeira descida é o momento de equilíbrio: a defesa não sabe se virá corrida ou passe. Ganhar 4 jardas ou mais deixa o ataque em situação confortável.';
      expert = 'Em 1st & 10, a taxa de passe em situação neutra é um dos melhores indicadores de filosofia ofensiva. Uma jogada é considerada "sucesso" se ganhar ≥40% da distância.';
    } else if (down === 2) {
      strategy = short
        ? 'Distância curta na segunda descida dá liberdade: muitos treinadores arriscam um passe longo (shot play), já que ainda sobra a terceira tentativa.'
        : 'O objetivo é encurtar a distância para a terceira descida. Uma 3rd & curta é muito mais fácil de converter.';
      expert = 'Sucesso em 2nd down = ganhar ≥60% da distância restante. 2nd & curto é a situação clássica para play action profundo.';
    } else {
      risk = long ? 'alto' : 'médio';
      riskWhy = long ? 'Terceira e longa: a defesa sabe que virá passe e pode pressionar.' : 'Falhar aqui normalmente força um punt ou field goal.';
      strategy = long
        ? 'Terceira e longa: quase sempre um passe. A defesa sabe disso, por isso usa blitz e coberturas profundas.'
        : 'Terceira e curta: corrida forte ou passe rápido. Converter mantém o drive vivo.';
      expert = 'Conversão de 3rd down varia muito com a distância: ~55–60% em 3rd & 1–2 contra ~20% em 3rd & 10+. EPA por jogada em 3rd down é altamente volátil.';
    }
    if (!riskWhy) riskWhy = 'Ainda restam tentativas; um insucesso não entrega a bola ao adversário.';
  } else {
    // Quarta descida
    const fgRealistic = fgDist <= 57;
    const goForIt = (short && ytg <= 60) || (dist <= 1) || (zone === 'goal-line');
    const puntZone = ytg > 40 && !(short && ytg <= 60);
    options.push(
      { id: 'go', label: 'Tentar converter (go for it)', note: `Chance aproximada de conversão: ${conversionLabel(dist)}. Se falhar, o adversário recebe a bola neste ponto.`, recommended: goForIt },
      { id: 'fg', label: `Field goal (${fgDist} jardas)`, note: `Chance aproximada: ${fgChanceLabel(fgDist)}. Vale 3 pontos.`, recommended: fgRealistic && !goForIt && ytg <= 40 },
      { id: 'punt', label: 'Punt', note: 'Chuta a bola para longe, entregando a posse ao adversário em posição pior para ele.', recommended: puntZone && !goForIt },
    );
    risk = goForIt ? 'médio' : 'alto';
    riskWhy = 'Na quarta descida, falhar significa entregar a bola (turnover on downs).';
    strategy = goForIt
      ? 'Distância curta e boa posição de campo: a análise moderna favorece tentar a conversão. O valor de manter a bola supera o risco.'
      : fgRealistic && ytg <= 40
        ? 'Dentro do alcance do kicker: o field goal garante 3 pontos com boa probabilidade.'
        : 'Longe do alcance e com muitas jardas a percorrer: o punt protege a posição de campo.';
    expert =
      'Modelos de decisão de 4ª descida comparam o win probability esperado de cada opção (go/FG/punt). Desde ~2018 as equipes tentam muito mais conversões em 4th & curto no campo adversário.';
  }
  return {
    headline,
    plain,
    objective: goalToGo ? 'Marcar o touchdown' : `Ganhar ${dist} jarda${dist > 1 ? 's' : ''} para o first down`,
    zone,
    zoneLabel: label,
    fieldPosition: fieldPositionText(ytg),
    fgDistance: fgDist,
    fgChance: fgChanceLabel(fgDist),
    conversionChance: conversionLabel(dist),
    risk,
    riskWhy,
    options,
    strategy,
    expert,
  };
}
