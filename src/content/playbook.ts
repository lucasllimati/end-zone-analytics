/**
 * Playbook animado. Coordenadas no viewBox 600×380 (ataque embaixo, avançando para cima).
 * 1 jarda ≈ 11,25 px (largura do campo = 53⅓ jardas). Linha de scrimmage em y = 218.
 */
export type Pt = [number, number];

export interface Actor {
  id: string;
  label: string;
  team: 'off' | 'def';
  at: Pt;
  path?: Pt[];
  kind?: 'route' | 'run' | 'block' | 'rush' | 'drop' | 'motion' | 'man';
  /** Destaque (rota principal / leitura). */
  key?: boolean;
  /** Intervalo da animação [início, fim] em 0–1. */
  t?: [number, number];
}

export interface Zone {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  label: string;
  deep?: boolean;
}

export interface Play {
  id: string;
  name: string;
  category: 'Corrida' | 'Passe' | 'Play action' | 'Defesa';
  simple: string;
  expert: string;
  goal: string;
  read: string;
  beats: string;
  weakness: string;
  actors: Actor[];
  ball?: { path: Pt[]; t: [number, number] };
  zones?: Zone[];
}

const LOS = 218;

/** Ataque base em shotgun 11 personnel. */
function gun(overrides: Record<string, Partial<Actor>> = {}): Actor[] {
  const base: Actor[] = [
    { id: 'X', label: 'X', team: 'off', at: [60, LOS] },
    { id: 'SL', label: 'SL', team: 'off', at: [170, LOS + 14] },
    { id: 'LT', label: 'LT', team: 'off', at: [236, LOS] },
    { id: 'LG', label: 'LG', team: 'off', at: [268, LOS] },
    { id: 'C', label: 'C', team: 'off', at: [300, LOS] },
    { id: 'RG', label: 'RG', team: 'off', at: [332, LOS] },
    { id: 'RT', label: 'RT', team: 'off', at: [364, LOS] },
    { id: 'TE', label: 'TE', team: 'off', at: [398, LOS + 2] },
    { id: 'Z', label: 'Z', team: 'off', at: [530, LOS + 14] },
    { id: 'QB', label: 'QB', team: 'off', at: [300, 280] },
    { id: 'RB', label: 'RB', team: 'off', at: [334, 282] },
  ];
  return base.map((a) => ({ ...a, ...(overrides[a.id] ?? {}) }));
}

/** Ataque base sob o center (singleback) para corridas. */
function under(overrides: Record<string, Partial<Actor>> = {}): Actor[] {
  return gun({ QB: { at: [300, LOS + 14] }, RB: { at: [300, 300] }, ...overrides });
}

/** Linha ofensiva em proteção de passe (recua levemente). */
const passPro = (): Record<string, Partial<Actor>> =>
  Object.fromEntries(
    (['LT', 'LG', 'C', 'RG', 'RT'] as const).map((id, i) => {
      const x = 236 + i * 32;
      const dx = i === 0 ? -10 : i === 4 ? 10 : 0;
      return [id, { path: [[x, LOS], [x + dx, LOS + 14]], kind: 'block', t: [0, 0.35] }];
    }),
  );

/** Linha em bloqueio de zona (todos deslocando para um lado). */
const zoneBlock = (dx: number, dy = -14): Record<string, Partial<Actor>> =>
  Object.fromEntries(
    (['LT', 'LG', 'C', 'RG', 'RT'] as const).map((id, i) => {
      const x = 236 + i * 32;
      return [id, { path: [[x, LOS], [x + dx, LOS + dy]], kind: 'block', t: [0, 0.3] }];
    }),
  );

const drop: Partial<Actor> = { path: [[300, 280], [300, 296]], kind: 'drop', t: [0, 0.25] };

/** Defesa base nickel (para coberturas). */
function nickel(overrides: Record<string, Partial<Actor>> = {}): Actor[] {
  const base: Actor[] = [
    { id: 'CB1', label: 'CB', team: 'def', at: [60, 172] },
    { id: 'NB', label: 'NB', team: 'def', at: [170, 168] },
    { id: 'DE1', label: 'DE', team: 'def', at: [222, 202] },
    { id: 'DT1', label: 'DT', team: 'def', at: [284, 202] },
    { id: 'DT2', label: 'DT', team: 'def', at: [318, 202] },
    { id: 'DE2', label: 'DE', team: 'def', at: [382, 202] },
    { id: 'WLB', label: 'W', team: 'def', at: [262, 150] },
    { id: 'MLB', label: 'M', team: 'def', at: [330, 148] },
    { id: 'CB2', label: 'CB', team: 'def', at: [530, 172] },
    { id: 'FS', label: 'FS', team: 'def', at: [240, 82] },
    { id: 'SS', label: 'SS', team: 'def', at: [400, 90] },
  ];
  const rush = (id: string, to: Pt): Partial<Actor> => ({ path: [base.find((b) => b.id === id)!.at, to], kind: 'rush', t: [0, 0.5] });
  const dl = { DE1: rush('DE1', [250, 262]), DT1: rush('DT1', [290, 240]), DT2: rush('DT2', [312, 240]), DE2: rush('DE2', [352, 262]) };
  return base.map((a) => ({ ...a, ...((dl as Record<string, Partial<Actor>>)[a.id] ?? {}), ...(overrides[a.id] ?? {}) }));
}

const toZone = (from: Pt, z: Pt): Partial<Actor> => ({ path: [from, z], kind: 'drop', t: [0, 0.45] });

/** Rotas do recebedor X (lado esquerdo; "dentro" = direção ao centro). */
const X = (path: Pt[], key = true): Partial<Actor> => ({ path: [[60, LOS], ...path], kind: 'route', key, t: [0.05, 0.75] });

export const PLAYS: Play[] = [
  // ------------------------------- CORRIDAS -------------------------------
  {
    id: 'inside-zone', name: 'Inside Zone', category: 'Corrida',
    simple: 'A linha toda empurra junto para um lado e o corredor procura o espaço pelo meio.',
    expert: 'Bloqueio em zona com double teams no primeiro nível que sobem para os LBs. O RB lê o DT de jogo (play-side A/B gap) e escolhe entre "bang" e "cutback".',
    goal: 'Ganhar 4+ jardas com segurança e cansar a defesa.', read: 'RB lê o primeiro defensor do meio da linha.', beats: 'Defesas leves (nickel/dime) e linebackers agressivos.', weakness: 'Defensive tackles que vencem o bloqueio rapidamente (penetração).',
    actors: under({ ...zoneBlock(14), QB: { path: [[300, LOS + 14], [314, LOS + 30]], kind: 'run', t: [0, 0.2] }, RB: { path: [[300, 300], [318, 254], [322, 200], [312, 110]], kind: 'run', key: true, t: [0.05, 0.85] } }),
  },
  {
    id: 'outside-zone', name: 'Outside Zone', category: 'Corrida',
    simple: 'A linha se desloca de lado e o corredor corre em direção à lateral, cortando para cima quando enxerga o buraco.',
    expert: 'O RB mira o "outside hip" do TE e lê o primeiro defensor de borda: bounce (fora), bang (no meio) ou bend (cutback). Base dos sistemas Shanahan/McVay, que dela derivam o bootleg.',
    goal: 'Esticar a defesa horizontalmente e criar cutbacks.', read: 'RB lê o defensor de borda (EDGE).', beats: 'Defesas lentas lateralmente.', weakness: 'Edge que fixa a borda e força a corrida para dentro cedo.',
    actors: under({ ...zoneBlock(30, -6), TE: { path: [[398, LOS + 2], [430, LOS - 6]], kind: 'block', t: [0, 0.3] }, QB: { path: [[300, LOS + 14], [330, LOS + 32]], kind: 'run', t: [0, 0.2] }, RB: { path: [[300, 300], [380, 262], [432, 214], [440, 120]], kind: 'run', key: true, t: [0.05, 0.85] } }),
  },
  {
    id: 'power', name: 'Power', category: 'Corrida',
    simple: 'Um guard sai do seu lugar e corre para o outro lado para abrir caminho, e o corredor vai atrás dele.',
    expert: 'Gap scheme: down blocks no play-side, o backside guard faz "pull" e "kick-out"/"wrap" no LB, ganhando superioridade numérica no ponto de ataque.',
    goal: 'Ganhar jardas curtas com força (3rd & 1, goal line).', read: 'RB segue o guard que puxou.', beats: 'Defesas que atacam em gaps previsíveis.', weakness: 'Penetração no backside quando o guard sai.',
    actors: under({
      LT: { path: [[236, LOS], [226, LOS - 12]], kind: 'block', t: [0, 0.3] }, C: { path: [[300, LOS], [288, LOS - 12]], kind: 'block', t: [0, 0.3] },
      RG: { path: [[332, LOS], [320, LOS - 12]], kind: 'block', t: [0, 0.3] }, RT: { path: [[364, LOS], [352, LOS - 12]], kind: 'block', t: [0, 0.3] },
      LG: { path: [[268, LOS], [280, LOS + 20], [360, LOS + 16], [372, LOS - 18]], kind: 'block', key: true, t: [0, 0.45] },
      RB: { path: [[300, 300], [330, 262], [366, 214], [372, 120]], kind: 'run', key: true, t: [0.15, 0.9] },
    }),
  },
  {
    id: 'counter', name: 'Counter', category: 'Corrida',
    simple: 'O corredor finge ir para um lado e volta para o outro, atrás de dois bloqueadores que trocam de lado.',
    expert: 'GT counter: backside guard faz kick-out no EDGE e o tackle (ou H-back) "wrap" para o LB. O jab step do RB congela os linebackers.',
    goal: 'Enganar a pursuit da defesa.', read: 'RB dá um passo falso (jab) e segue os pullers.', beats: 'Linebackers que reagem rápido ao primeiro passo.', weakness: 'Exige tempo; penetração destrói a jogada.',
    actors: under({
      LG: { path: [[268, LOS], [288, LOS + 22], [364, LOS + 18], [378, LOS - 18]], kind: 'block', key: true, t: [0, 0.45] },
      LT: { path: [[236, LOS], [258, LOS + 28], [372, LOS + 28], [394, LOS - 26]], kind: 'block', t: [0.05, 0.55] },
      C: { path: [[300, LOS], [288, LOS - 12]], kind: 'block', t: [0, 0.3] }, RG: { path: [[332, LOS], [320, LOS - 12]], kind: 'block', t: [0, 0.3] },
      RB: { path: [[300, 300], [282, 290], [332, 262], [372, 210], [382, 120]], kind: 'run', key: true, t: [0.1, 0.9] },
    }),
  },
  {
    id: 'sweep', name: 'Sweep / Toss', category: 'Corrida',
    simple: 'O corredor recebe a bola e corre direto para a lateral, tentando "virar a esquina" antes da defesa.',
    expert: 'Ataque à borda com bloqueios de "reach" e, muitas vezes, pullers. Velocidade do RB é decisiva; "crack block" do WR em safety/LB.',
    goal: 'Ganhar a borda contra defesas pesadas.', read: 'RB lê o bloqueio do TE/WR no defensor de contenção.', beats: 'Defesas lentas e congestionadas no meio.', weakness: 'Contenção disciplinada; perde muitas jardas se falhar.',
    actors: under({ ...zoneBlock(26, -4), Z: { path: [[530, LOS + 14], [470, LOS - 30]], kind: 'block', t: [0, 0.35] }, QB: { path: [[300, LOS + 14], [314, LOS + 30]], kind: 'run', t: [0, 0.15] }, RB: { path: [[300, 300], [430, 282], [500, 222], [510, 110]], kind: 'run', key: true, t: [0.05, 0.85] } }),
    ball: { path: [[300, LOS + 18], [400, 286]], t: [0.08, 0.2] },
  },
  {
    id: 'draw', name: 'Draw', category: 'Corrida',
    simple: 'Parece um passe — o QB recua e a linha protege —, mas a bola é entregue ao corredor no meio.',
    expert: 'Explora rushers que se lançam ao QB: a linha "convida" o rush para fora e abre o meio. Eficiente contra 3rd & longo com defesas em dime.',
    goal: 'Punir o pass rush agressivo.', read: 'RB espera a linha "vender" o passe.', beats: 'Pass rush agressivo e defesas em dime.', weakness: 'Defesas que leem a jogada e mantêm LBs no meio.',
    actors: under({ ...passPro(), QB: { path: [[300, LOS + 14], [300, LOS + 48]], kind: 'drop', t: [0, 0.3] }, RB: { path: [[300, 300], [302, 272], [300, 200], [296, 110]], kind: 'run', key: true, t: [0.3, 0.95] } }),
  },
  {
    id: 'trap', name: 'Trap', category: 'Corrida',
    simple: 'A linha deixa um defensor passar de propósito e um guard o derruba de lado, abrindo um buraco no meio.',
    expert: 'O DT é "convidado" a penetrar e é bloqueado de lado pelo puller (trap block); os demais sobem para o segundo nível.',
    goal: 'Usar a agressividade do DT contra ele mesmo.', read: 'RB corre direto, logo atrás do trap.', beats: 'DTs agressivos que atacam a penetração.', weakness: 'DTs que "leem" e esperam.',
    actors: under({ LG: { path: [[268, LOS], [282, LOS + 12], [316, LOS - 4]], kind: 'block', key: true, t: [0, 0.35] }, C: { path: [[300, LOS], [290, LOS - 30]], kind: 'block', t: [0, 0.3] }, RG: { path: [[332, LOS], [330, LOS - 50]], kind: 'block', t: [0, 0.35] }, RB: { path: [[300, 300], [300, 200], [302, 110]], kind: 'run', key: true, t: [0.1, 0.85] } }),
  },
  // -------------------------------- PASSES --------------------------------
  { id: 'slant', name: 'Slant', category: 'Passe', simple: 'O recebedor dá poucos passos para frente e corta em diagonal para o meio. Passe rápido.', expert: 'Rota de 3 passos; vence press man pela leverage interna e é a resposta clássica à blitz (hot route).', goal: 'Ganho rápido de 5–10 jardas.', read: 'Leverage do CB (por dentro ou por fora).', beats: 'Blitz, marcação por fora (outside leverage).', weakness: 'LB lendo o QB e caindo na janela.', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 288]], kind: 'drop', t: [0, 0.15] }, X: X([[60, 194], [150, 130]]) }), ball: { path: [[300, 288], [138, 138]], t: [0.3, 0.55] } },
  { id: 'curl', name: 'Curl', category: 'Passe', simple: 'O recebedor corre para frente e de repente volta em direção ao QB.', expert: 'Rota de 12 jardas com "comeback" para dentro; tempo do QB coincide com a quebra. Excelente contra coberturas profundas (off coverage).', goal: 'Ganho garantido de 10+ jardas.', read: 'Profundidade do CB e LB na zona de hook.', beats: 'Coberturas soltas (off/Cover 3).', weakness: 'LB que cai na zona do curl.', actors: gun({ ...passPro(), QB: drop, X: X([[60, 96], [74, 110]]) }), ball: { path: [[300, 296], [78, 112]], t: [0.55, 0.78] } },
  { id: 'out', name: 'Out', category: 'Passe', simple: 'O recebedor corre para frente e corta em direção à lateral do campo.', expert: 'Rota de 10–12 jardas com quebra de 90° para fora; exige braço forte (passe longo atravessando o campo).', goal: 'Ganhar jardas e sair pela lateral (para o relógio).', read: 'CB com leverage interna e velocidade de recuo.', beats: 'Marcação por dentro (inside leverage) e Cover 3.', weakness: 'CB em Cover 2 que fica na zona curta (flat).', actors: gun({ ...passPro(), QB: drop, X: X([[60, 110], [16, 110]]) }), ball: { path: [[300, 296], [24, 112]], t: [0.55, 0.8] } },
  { id: 'in', name: 'In', category: 'Passe', simple: 'O recebedor corre para frente e corta em direção ao meio do campo.', expert: 'Quebra a ~10 jardas; combina bem com rotas verticais que limpam a zona.', goal: 'First down em 3rd & médio.', read: 'Posição dos LBs na zona de hook/curl.', beats: 'Man coverage com leverage externa.', weakness: 'Zonas fechadas no meio.', actors: gun({ ...passPro(), QB: drop, X: X([[60, 106], [190, 106]]) }), ball: { path: [[300, 296], [180, 108]], t: [0.55, 0.8] } },
  { id: 'dig', name: 'Dig', category: 'Passe', simple: 'Como o "in", mas mais fundo (cerca de 15 jardas).', expert: 'Peça central do conceito "Dagger" (seam limpando + dig por baixo). Ataca o espaço entre LBs e safeties.', goal: 'Jogada de 15+ jardas no meio.', read: 'Safety alto x LB que recua.', beats: 'Cover 3 e Cover 1 (com rota de limpeza).', weakness: 'Safety que desce rápido; exige proteção longa.', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 304]], kind: 'drop', t: [0, 0.3] }, X: X([[60, 50], [232, 50]]), SL: { path: [[170, LOS + 14], [176, 20]], kind: 'route', t: [0.05, 0.75] } }), ball: { path: [[300, 304], [214, 52]], t: [0.6, 0.85] } },
  { id: 'post', name: 'Post', category: 'Passe', simple: 'Rota longa: o recebedor corre para frente e corta em diagonal para o meio, em direção às traves.', expert: 'Ataca o meio profundo; mortal contra Cover 2 (entre os safeties) e com play action contra Cover 1/3 quando o FS é atraído.', goal: 'Big play / touchdown.', read: 'Safety do meio (MOFC x MOFO).', beats: 'Cover 2 e Cover 4 com safeties agressivos.', weakness: 'Free safety com bom alcance (Cover 1/3).', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 304]], kind: 'drop', t: [0, 0.3] }, X: X([[60, 120], [196, 6]]) }), ball: { path: [[300, 304], [176, 22]], t: [0.55, 0.85] } },
  { id: 'corner', name: 'Corner', category: 'Passe', simple: 'O recebedor corre para frente e corta em diagonal para a lateral, em direção ao canto do campo.', expert: 'Também chamada "flag". Destrói a Cover 2 (o CB fica no flat) e é favorita na red zone.', goal: 'Jogada longa ou TD na red zone.', read: 'CB curto x safety por cima.', beats: 'Cover 2 e marcação com leverage interna.', weakness: 'Cover 3 com o CB profundo.', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 304]], kind: 'drop', t: [0, 0.3] }, X: X([[60, 116], [14, 24]]) }), ball: { path: [[300, 304], [22, 34]], t: [0.55, 0.85] } },
  { id: 'fade', name: 'Fade / Go', category: 'Passe', simple: 'O recebedor corre em linha reta o mais rápido possível; o QB lança uma bola longa por cima.', expert: 'Vertical "go" ou "fade" (desviando para a lateral). Ataca a velocidade e o tamanho; o "back-shoulder fade" é a variação de tempo.', goal: 'Touchdown ou big play.', read: 'Mano a mano sem safety por cima.', beats: 'Cover 0/Cover 1 com CB menor.', weakness: 'Safety profundo bem posicionado.', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 304]], kind: 'drop', t: [0, 0.3] }, X: X([[52, 100], [40, 4]]) }), ball: { path: [[300, 304], [42, 20]], t: [0.45, 0.85] } },
  { id: 'screen', name: 'Screen', category: 'Passe', simple: 'Passe curtinho, atrás da linha, para o corredor, com vários bloqueadores na frente dele.', expert: 'A linha deixa o pass rush passar e sai para bloquear no espaço. Funciona como uma "corrida" contra defesas que fazem blitz.', goal: 'Usar a agressividade da defesa contra ela.', read: 'RB espera os OL se posicionarem.', beats: 'Blitz e rush agressivo.', weakness: 'Defesas disciplinadas que leem a jogada.', actors: gun({ LT: { path: [[236, LOS], [232, LOS + 12]], kind: 'block', t: [0, 0.3] }, LG: { path: [[268, LOS], [264, LOS + 12]], kind: 'block', t: [0, 0.3] }, C: { path: [[300, LOS], [306, LOS + 8], [380, LOS - 8]], kind: 'block', t: [0.1, 0.5] }, RG: { path: [[332, LOS], [336, LOS + 8], [416, LOS - 14]], kind: 'block', t: [0.1, 0.5] }, RT: { path: [[364, LOS], [372, LOS + 6], [448, LOS - 4]], kind: 'block', t: [0.1, 0.5] }, QB: { path: [[300, 280], [296, 304]], kind: 'drop', t: [0, 0.3] }, RB: { path: [[334, 282], [350, 262], [420, 258], [440, 150]], kind: 'route', key: true, t: [0.05, 0.9] } }), ball: { path: [[296, 304], [418, 258]], t: [0.45, 0.6] } },
  { id: 'wheel', name: 'Wheel', category: 'Passe', simple: 'O corredor sai para a lateral e depois sobe em linha reta, como uma roda.', expert: 'Explora LBs marcando RBs em man; combinada com uma rota interna do WR que "pica" o defensor.', goal: 'Big play com o RB contra um LB.', read: 'Quem marca o RB (LB lento?).', beats: 'Man coverage com LB no RB.', weakness: 'Zona com o CB "afundando" na lateral.', actors: gun({ ...passPro(), QB: { path: [[300, 280], [300, 300]], kind: 'drop', t: [0, 0.3] }, RB: { path: [[334, 282], [440, 262], [486, 210], [490, 40]], kind: 'route', key: true, t: [0.05, 0.85] }, Z: { path: [[530, LOS + 14], [530, 160], [430, 130]], kind: 'route', t: [0.05, 0.6] } }), ball: { path: [[300, 300], [488, 70]], t: [0.6, 0.88] } },
  // ------------------------------ PLAY ACTION ------------------------------
  { id: 'play-action', name: 'Play action', category: 'Play action', simple: 'O QB finge que vai entregar ao corredor e, quando a defesa reage à "corrida", lança a bola.', expert: 'Gera EPA/dropback consistentemente maior que passes comuns, independentemente do volume de corridas do time. Atrai LBs e o safety de apoio, abrindo o meio.', goal: 'Big play no meio, atrás dos LBs.', read: 'LBs mordendo o fake; safety do meio.', beats: 'Defesas agressivas contra a corrida.', weakness: 'Exige proteção longa; QB de costas para a defesa no fake.', actors: under({ ...zoneBlock(10, -6), QB: { path: [[300, LOS + 14], [314, LOS + 30], [300, LOS + 64]], kind: 'drop', t: [0, 0.4] }, RB: { path: [[300, 300], [318, 250], [324, 228]], kind: 'run', t: [0.05, 0.4] }, TE: { path: [[398, LOS + 2], [380, 150], [240, 110]], kind: 'route', key: true, t: [0.1, 0.8] }, X: X([[60, 120], [190, 10]], false) }), ball: { path: [[300, LOS + 64], [254, 112]], t: [0.62, 0.84] } },
  { id: 'bootleg', name: 'Bootleg', category: 'Play action', simple: 'O QB finge a corrida para um lado e sai correndo com a bola para o outro, podendo passar ou correr.', expert: 'Move o pocket longe do pass rush e cria leitura alto-baixo (corner + flat) para o QB. Complemento natural do outside zone.', goal: 'Ganho fácil no flat ou big play no corner.', read: 'Defensor da zona do flat: se sobe, lança no corner; se fica, no flat.', beats: 'Defesas que perseguem a corrida.', weakness: 'EDGE do lado do bootleg que não morde o fake.', actors: under({ ...zoneBlock(-26, -6), QB: { path: [[300, LOS + 14], [284, LOS + 30], [420, LOS + 46]], kind: 'drop', key: true, t: [0, 0.55] }, RB: { path: [[300, 300], [250, 262], [230, 228]], kind: 'run', t: [0.05, 0.4] }, TE: { path: [[398, LOS + 2], [460, LOS - 30], [520, LOS - 34]], kind: 'route', key: true, t: [0.1, 0.65] }, Z: { path: [[530, LOS + 14], [520, 120], [570, 60]], kind: 'route', t: [0.05, 0.75] } }), ball: { path: [[420, LOS + 46], [514, LOS - 32]], t: [0.62, 0.8] } },
  { id: 'rpo', name: 'RPO', category: 'Play action', simple: 'Run-Pass Option: o QB decide depois do snap se entrega ao corredor ou passa, olhando um defensor.', expert: 'A linha bloqueia corrida (inside zone); o QB lê um conflict defender (aqui, o LB). Se ele fecha a corrida, o slant atrás dele fica aberto. O passe precisa sair em < 1 s para evitar "ineligible downfield".', goal: 'Sempre ter a jogada "certa" contra a defesa.', read: 'LB/Nickel: avança para a corrida → passe; recua → entrega.', beats: 'Defesas que precisam escolher entre corrida e passe.', weakness: 'Defesas que disfarçam o conflict defender.', actors: gun({ ...zoneBlock(12), QB: { path: [[300, 280], [314, 284]], kind: 'drop', t: [0, 0.2] }, RB: { path: [[334, 282], [300, 262], [292, 236]], kind: 'run', t: [0.05, 0.35] }, SL: { path: [[170, LOS + 14], [172, 196], [236, 150]], kind: 'route', key: true, t: [0.05, 0.5] } }), ball: { path: [[314, 284], [228, 156]], t: [0.32, 0.5] } },
  // -------------------------------- DEFESA --------------------------------
  { id: 'cover-0', name: 'Cover 0', category: 'Defesa', simple: 'Marcação individual em todos os recebedores, sem ninguém no fundo, e o máximo de jogadores atacando o QB.', expert: 'Man coverage sem safety alto, normalmente com 6–7 rushers. Força o QB a decidir em < 2 s; qualquer erro vira TD.', goal: 'Sack ou passe forçado.', read: 'Ataque precisa achar o "hot" rápido.', beats: 'QBs lentos e proteções confusas.', weakness: 'Rotas rápidas e qualquer jogada que vença um 1×1.', actors: [...gun({ ...passPro() }), ...nickel({ FS: { path: [[240, 82], [290, 238]], kind: 'rush', t: [0, 0.55] }, MLB: { path: [[330, 148], [330, 240]], kind: 'rush', t: [0, 0.5] }, SS: { path: [[400, 90], [404, 160]], kind: 'man', t: [0, 0.6] }, WLB: { path: [[262, 150], [326, 236]], kind: 'man', t: [0, 0.6] } })] },
  { id: 'cover-1', name: 'Cover 1', category: 'Defesa', simple: 'Marcação individual nos recebedores com um único safety protegendo o fundo, no meio do campo.', expert: '"Man-free": FS no meio profundo e um "robber"/"rat" na zona curta do meio. Permite 5 rushers com ajuda por cima.', goal: 'Cobertura agressiva com proteção contra a bola longa.', read: 'QB identifica o safety único (MOFC).', beats: 'Recebedores que não vencem o 1×1.', weakness: 'Mesh/crossing routes (rotas cruzadas) e rotas que tiram o FS do meio.', zones: [{ cx: 300, cy: 50, rx: 120, ry: 40, label: 'FS: meio profundo', deep: true }, { cx: 300, cy: 140, rx: 50, ry: 24, label: 'Robber' }], actors: [...gun({ ...passPro() }), ...nickel({ FS: toZone([240, 82], [300, 50]), SS: toZone([400, 90], [300, 140]), MLB: { path: [[330, 148], [350, 236]], kind: 'rush', t: [0, 0.5] } })] },
  { id: 'cover-2', name: 'Cover 2', category: 'Defesa', simple: 'Dois safeties dividem o fundo do campo ao meio; os outros defensores cuidam da parte curta.', expert: 'Cinco zonas curtas (2 flats, 2 hooks, 1 meio) e duas metades profundas. Os CBs "afundam" o WR e protegem o flat. "Tampa 2": o MLB corre para o meio profundo.', goal: 'Impedir big plays pelas laterais.', read: 'Dois safeties altos (MOFO).', beats: 'Rotas para as laterais e passes curtos para fora.', weakness: 'O "buraco" no meio entre os safeties e a lateral entre CB e S (honey hole).', zones: [{ cx: 150, cy: 48, rx: 140, ry: 36, label: 'Metade funda', deep: true }, { cx: 450, cy: 48, rx: 140, ry: 36, label: 'Metade funda', deep: true }, { cx: 60, cy: 150, rx: 54, ry: 26, label: 'Flat' }, { cx: 540, cy: 150, rx: 54, ry: 26, label: 'Flat' }, { cx: 230, cy: 130, rx: 52, ry: 24, label: 'Hook' }, { cx: 370, cy: 130, rx: 52, ry: 24, label: 'Hook' }], actors: [...gun({ ...passPro() }), ...nickel({ FS: toZone([240, 82], [150, 48]), SS: toZone([400, 90], [450, 48]), CB1: toZone([60, 172], [60, 150]), CB2: toZone([530, 172], [540, 150]), WLB: toZone([262, 150], [230, 130]), MLB: toZone([330, 148], [370, 130]), NB: toZone([170, 168], [300, 140]) })] },
  { id: 'cover-3', name: 'Cover 3', category: 'Defesa', simple: 'Três defensores dividem o fundo do campo em três faixas; quatro cuidam da parte curta.', expert: 'Dois CBs e o FS nos terços profundos; SS/nickel e LBs em 4 zonas curtas (curl/flat e hook). Muito sólida contra a corrida (8 no box possível).', goal: 'Proteger o fundo sem abrir mão de apoio contra a corrida.', read: 'Um safety alto (MOFC) + CBs recuando no snap.', beats: 'Bolas longas e corrida.', weakness: '"Four verticals" (sobrecarga dos terços) e rotas de curl/flat.', zones: [{ cx: 100, cy: 48, rx: 98, ry: 36, label: 'Terço', deep: true }, { cx: 300, cy: 40, rx: 98, ry: 36, label: 'Terço', deep: true }, { cx: 500, cy: 48, rx: 98, ry: 36, label: 'Terço', deep: true }, { cx: 110, cy: 150, rx: 56, ry: 24, label: 'Curl/flat' }, { cx: 490, cy: 150, rx: 56, ry: 24, label: 'Curl/flat' }, { cx: 250, cy: 132, rx: 46, ry: 22, label: 'Hook' }, { cx: 350, cy: 132, rx: 46, ry: 22, label: 'Hook' }], actors: [...gun({ ...passPro() }), ...nickel({ CB1: toZone([60, 172], [100, 48]), CB2: toZone([530, 172], [500, 48]), FS: toZone([240, 82], [300, 40]), NB: toZone([170, 168], [110, 150]), SS: toZone([400, 90], [490, 150]), WLB: toZone([262, 150], [250, 132]), MLB: toZone([330, 148], [350, 132]) })] },
  { id: 'cover-4', name: 'Cover 4 (Quarters)', category: 'Defesa', simple: 'Quatro defensores dividem o fundo do campo em quatro partes. Ideal contra passes longos.', expert: '"Quarters": CBs e safeties em quartos profundos com regras de leitura (os safeties leem o #2 recebedor e podem apoiar a corrida). Popular contra ataques verticais modernos.', goal: 'Eliminar o passe longo mantendo safeties ativos contra a corrida.', read: 'Dois safeties altos, CBs profundos.', beats: 'Quatro rotas verticais e ataques explosivos.', weakness: 'Passes curtos rápidos e o flat contra 3 recebedores.', zones: [{ cx: 75, cy: 50, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 225, cy: 44, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 375, cy: 44, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 525, cy: 50, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 170, cy: 146, rx: 58, ry: 22, label: 'Hook/curl' }, { cx: 300, cy: 134, rx: 48, ry: 22, label: 'Meio' }, { cx: 430, cy: 146, rx: 58, ry: 22, label: 'Hook/curl' }], actors: [...gun({ ...passPro() }), ...nickel({ CB1: toZone([60, 172], [75, 50]), FS: toZone([240, 82], [225, 44]), SS: toZone([400, 90], [375, 44]), CB2: toZone([530, 172], [525, 50]), NB: toZone([170, 168], [170, 146]), WLB: toZone([262, 150], [300, 134]), MLB: toZone([330, 148], [430, 146]) })] },
  { id: 'cover-6', name: 'Cover 6', category: 'Defesa', simple: 'Uma mistura: um lado do campo joga Cover 4 e o outro, Cover 2.', expert: '"Quarter-quarter-half": quartos no lado forte (trips) e metade no lado fraco. Permite ajustar a cobertura à formação.', goal: 'Equilibrar a defesa contra formações desbalanceadas.', read: 'Formação do ataque (lado com mais recebedores).', beats: 'Formações trips e ataques que sobrecarregam um lado.', weakness: 'Passes para o lado da metade (Cover 2) e o flat desse lado.', zones: [{ cx: 150, cy: 48, rx: 140, ry: 36, label: '½ (Cover 2)', deep: true }, { cx: 375, cy: 44, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 525, cy: 50, rx: 72, ry: 34, label: '¼', deep: true }, { cx: 60, cy: 150, rx: 54, ry: 24, label: 'Flat' }, { cx: 250, cy: 132, rx: 50, ry: 22, label: 'Hook' }, { cx: 400, cy: 140, rx: 56, ry: 22, label: 'Hook/curl' }], actors: [...gun({ ...passPro() }), ...nickel({ FS: toZone([240, 82], [150, 48]), SS: toZone([400, 90], [375, 44]), CB2: toZone([530, 172], [525, 50]), CB1: toZone([60, 172], [60, 150]), WLB: toZone([262, 150], [250, 132]), MLB: toZone([330, 148], [400, 140]), NB: toZone([170, 168], [170, 150]) })] },
  { id: 'man', name: 'Man (marcação individual)', category: 'Defesa', simple: 'Cada defensor segue um recebedor específico para onde ele for.', expert: 'Press man (contato na linha) ou off man. Exige CBs de elite; costuma vir com um safety alto (Cover 1) ou nenhum (Cover 0).', goal: 'Negar janelas de passe rápidas.', read: 'Defensores acompanham os recebedores em motion.', beats: 'Recebedores medianos e passes de tempo.', weakness: 'Rotas cruzadas (pick/mesh) e QBs que correm (defensores de costas).', actors: [...gun({ ...passPro(), X: X([[60, 120], [150, 80]], false), Z: { path: [[530, LOS + 14], [530, 110], [440, 90]], kind: 'route', t: [0.05, 0.75] }, SL: { path: [[170, LOS + 14], [180, 150], [300, 140]], kind: 'route', t: [0.05, 0.75] } }), ...nickel({ CB1: { path: [[60, 172], [64, 124], [150, 90]], kind: 'man', t: [0.08, 0.78] }, CB2: { path: [[530, 172], [526, 116], [446, 96]], kind: 'man', t: [0.08, 0.78] }, NB: { path: [[170, 168], [184, 150], [296, 148]], kind: 'man', t: [0.08, 0.78] }, FS: toZone([240, 82], [300, 50]) })] },
  { id: 'zone', name: 'Zone (cobertura por zona)', category: 'Defesa', simple: 'Cada defensor protege uma área do campo e marca quem entrar nela.', expert: 'Família de coberturas (Cover 2/3/4/6). Defensores olham para o QB, o que facilita interceptações e tackles após a recepção.', goal: 'Manter tudo à frente e reagir ao QB.', read: 'Defensores recuam para pontos de referência ("landmarks").', beats: 'Rotas de man (pick plays) e passes longos.', weakness: 'Recebedores que "sentam" nos espaços entre zonas.', zones: [{ cx: 100, cy: 48, rx: 98, ry: 36, label: 'Fundo', deep: true }, { cx: 300, cy: 40, rx: 98, ry: 36, label: 'Fundo', deep: true }, { cx: 500, cy: 48, rx: 98, ry: 36, label: 'Fundo', deep: true }, { cx: 150, cy: 146, rx: 70, ry: 24, label: 'Zona curta' }, { cx: 300, cy: 134, rx: 60, ry: 22, label: 'Zona curta' }, { cx: 450, cy: 146, rx: 70, ry: 24, label: 'Zona curta' }], actors: [...gun({ ...passPro() }), ...nickel({ CB1: toZone([60, 172], [100, 48]), CB2: toZone([530, 172], [500, 48]), FS: toZone([240, 82], [300, 40]), NB: toZone([170, 168], [150, 146]), WLB: toZone([262, 150], [300, 134]), MLB: toZone([330, 148], [450, 146]), SS: toZone([400, 90], [420, 120]) })] },
  { id: 'blitz', name: 'Blitz', category: 'Defesa', simple: 'A defesa manda jogadores extras (LBs ou DBs) para atacar o QB, além dos 4 da linha.', expert: 'Pressões com 5+ rushers; "simulated pressures" mostram blitz e recuam defensores para confundir a proteção. Contra blitz, o ataque usa hot routes e screens.', goal: 'Sack, passe apressado ou turnover.', read: 'QB identifica quem sobra sem bloqueio e lança no hot.', beats: 'Proteções mal ajustadas e QBs lentos.', weakness: 'Screens, slants rápidos e QBs que leem a blitz.', actors: [...gun({ ...passPro(), SL: { path: [[170, LOS + 14], [172, 196], [236, 150]], kind: 'route', key: true, t: [0.05, 0.5] } }), ...nickel({ MLB: { path: [[330, 148], [322, 250]], kind: 'rush', key: true, t: [0, 0.45] }, WLB: { path: [[262, 150], [276, 252]], kind: 'rush', key: true, t: [0, 0.45] }, NB: { path: [[170, 168], [230, 262]], kind: 'rush', key: true, t: [0, 0.5] }, FS: toZone([240, 82], [300, 50]) })], ball: { path: [[300, 284], [228, 156]], t: [0.3, 0.5] } },
];

export const PLAY_CATEGORIES = ['Corrida', 'Passe', 'Play action', 'Defesa'] as const;
