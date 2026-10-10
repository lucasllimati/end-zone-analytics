export type Unit = 'offense' | 'defense' | 'special';

export interface Position {
  id: string;
  abbr: string;
  name: string;
  pt: string;
  unit: Unit;
  simple: string;
  duties: string[];
  movement: string;
  expert: string;
  examples: string;
  size: string;
}

export const POSITIONS: Position[] = [
  // ATAQUE
  { id: 'QB', abbr: 'QB', name: 'Quarterback', pt: 'Lançador / armador', unit: 'offense', simple: 'O "cérebro" do ataque. Recebe o snap e decide: lança, entrega ao corredor ou corre.', duties: ['Chamar a jogada no huddle', 'Ler a defesa antes e depois do snap', 'Lançar, entregar ou correr', 'Ajustar proteções e rotas (audibles)'], movement: 'Recua para o pocket (3, 5 ou 7 passos sob o center, ou já em shotgun) e lança; em jogadas de opção, corre.', expert: 'Avaliado por EPA/dropback, CPOE, taxa de sacks e desempenho sob pressão. Posição de maior impacto no esporte.', examples: 'Tom Brady, Patrick Mahomes, Peyton Manning', size: '1,85–1,96 m · 95–110 kg' },
  { id: 'RB', abbr: 'RB', name: 'Running back', pt: 'Corredor', unit: 'offense', simple: 'Recebe a bola do QB e corre. Também pega passes curtos e ajuda a proteger o QB.', duties: ['Correr com a bola', 'Bloquear blitzes (pass protection)', 'Receber passes curtos (checkdowns, screens)'], movement: 'Alinha ao lado ou atrás do QB; lê os bloqueios para achar o buraco ("hole").', expert: 'Valor muito dependente da linha ofensiva; métricas como yards after contact e rushing yards over expected isolam o mérito do corredor.', examples: 'Emmitt Smith, Barry Sanders, Derrick Henry', size: '1,75–1,85 m · 90–105 kg' },
  { id: 'FB', abbr: 'FB', name: 'Fullback', pt: 'Bloqueador de corrida', unit: 'offense', simple: 'Corredor mais pesado que normalmente abre caminho para o RB.', duties: ['Bloquear linebackers', 'Correr em jardas curtas', 'Proteger o QB'], movement: 'Alinha atrás do QB, à frente do RB (formação "I").', expert: 'Posição em declínio: menos de 10% dos snaps da liga usam 21 personnel.', examples: 'Kyle Juszczyk, Larry Csonka', size: '1,80–1,88 m · 110–115 kg' },
  { id: 'WR', abbr: 'WR', name: 'Wide receiver', pt: 'Recebedor', unit: 'offense', simple: 'Corre rotas para se livrar da marcação e pegar os passes.', duties: ['Correr rotas precisas', 'Pegar a bola', 'Ganhar jardas após a recepção', 'Bloquear em corridas'], movement: 'Alinha perto das laterais (X/Z) ou no meio (slot) e corre rotas: slant, out, go, post etc.', expert: 'Separação, target share, YPRR (yards per route run) e taxa de drops são as métricas-chave.', examples: 'Jerry Rice, Randy Moss, Justin Jefferson', size: '1,75–1,96 m · 80–100 kg' },
  { id: 'TE', abbr: 'TE', name: 'Tight end', pt: 'Ala', unit: 'offense', simple: 'Metade bloqueador, metade recebedor. Alinha ao lado da linha ofensiva.', duties: ['Bloquear em corridas', 'Correr rotas e receber', 'Ajudar na proteção do QB'], movement: 'Na ponta da linha (in-line), afastado (flexed) ou em movimento antes do snap.', expert: 'TEs versáteis criam problemas de personnel: a defesa não sabe se coloca um LB (lento) ou um DB (leve) para marcá-lo.', examples: 'Tony Gonzalez, Rob Gronkowski, Travis Kelce', size: '1,93–2,01 m · 110–120 kg' },
  { id: 'OT', abbr: 'OT', name: 'Offensive tackle', pt: 'Tackle ofensivo', unit: 'offense', simple: 'Os dois jogadores das pontas da linha ofensiva. Protegem o QB contra os rushers mais rápidos.', duties: ['Proteger o QB (pass protection)', 'Abrir espaço em corridas', 'Bloquear os edge rushers'], movement: 'Recua lateralmente (kick slide) para acompanhar o rusher em volta do pocket.', expert: 'O left tackle protege o "lado cego" de um QB destro — por isso é historicamente bem pago.', examples: 'Anthony Muñoz, Jonathan Ogden, Trent Williams', size: '1,96–2,03 m · 140–155 kg' },
  { id: 'OG', abbr: 'OG', name: 'Offensive guard', pt: 'Guard ofensivo', unit: 'offense', simple: 'Ficam ao lado do center. Bloqueiam os defensores do meio.', duties: ['Bloquear defensive tackles', 'Puxar ("pull") para bloquear do outro lado em corridas', 'Proteger o meio do pocket'], movement: 'Bloqueio direto ou "pull" lateral em corridas de power/counter.', expert: 'Pressão pelo meio é a que mais atrapalha o QB, o que valorizou guards de elite.', examples: 'John Hannah, Larry Allen, Quenton Nelson', size: '1,90–1,98 m · 140–150 kg' },
  { id: 'C', abbr: 'C', name: 'Center', pt: 'Center', unit: 'offense', simple: 'Faz o snap (passa a bola ao QB) e bloqueia no meio da linha.', duties: ['Executar o snap', 'Identificar a defesa e chamar as proteções', 'Bloquear o nose tackle'], movement: 'Faz o snap e imediatamente bloqueia.', expert: 'Funciona como "QB da linha": define quem bloqueia quem contra blitzes.', examples: 'Mike Webster, Dwight Stephenson, Jason Kelce', size: '1,88–1,96 m · 135–145 kg' },
  // DEFESA
  { id: 'DE', abbr: 'DE', name: 'Defensive end', pt: 'End defensivo', unit: 'defense', simple: 'Fica nas pontas da linha defensiva. Persegue o QB e fecha as corridas pelo lado de fora.', duties: ['Pressionar o QB', 'Conter corridas pelas laterais', 'Derrubar o QB (sack)'], movement: 'Explode na direção do QB contornando o tackle (edge) ou por dentro.', expert: 'Pressure rate e pass-rush win rate são mais estáveis que sacks.', examples: 'Reggie White, Bruce Smith, Myles Garrett', size: '1,90–2,00 m · 115–130 kg' },
  { id: 'DT', abbr: 'DT', name: 'Defensive tackle', pt: 'Tackle defensivo', unit: 'defense', simple: 'Jogadores pesados do meio da linha defensiva. Param corridas e pressionam pelo centro.', duties: ['Ocupar bloqueadores', 'Parar corridas pelo meio', 'Pressionar o QB por dentro'], movement: 'Ataca os "gaps" (espaços) entre os bloqueadores.', expert: 'Um DT dominante (ex.: Aaron Donald) gera pressão interna, a mais difícil de evitar.', examples: 'Aaron Donald, Warren Sapp, Joe Greene', size: '1,88–1,96 m · 135–150 kg' },
  { id: 'NT', abbr: 'NT', name: 'Nose tackle', pt: 'Nose tackle', unit: 'defense', simple: 'O defensor que fica bem à frente do center, em defesas com 3 homens na linha.', duties: ['Absorver dois bloqueadores (double team)', 'Liberar os linebackers'], movement: 'Fica "0-technique", alinhado no nariz do center.', expert: 'Peça central da defesa 3-4; seu sucesso aparece nas estatísticas dos LBs.', examples: 'Vince Wilfork, Casey Hampton', size: '1,88–1,93 m · 150–160 kg' },
  { id: 'EDGE', abbr: 'EDGE', name: 'Edge rusher', pt: 'Rusher de borda', unit: 'defense', simple: 'Termo moderno para quem ataca o QB pelas pontas — pode ser um DE ou um OLB.', duties: ['Pressionar o QB pela borda', 'Conter corridas externas', 'Às vezes recuar em cobertura'], movement: 'Alinha bem aberto e ataca a "quina" do pocket.', expert: 'A posição defensiva mais valorizada no mercado depois do QB no ataque.', examples: 'Lawrence Taylor, T. J. Watt, Micah Parsons', size: '1,90–1,98 m · 110–125 kg' },
  { id: 'LB', abbr: 'LB', name: 'Linebacker', pt: 'Linebacker', unit: 'defense', simple: 'A segunda linha da defesa. Faz tackles, cobre passes curtos e às vezes ataca o QB.', duties: ['Parar corridas', 'Cobrir TEs e RBs', 'Blitz', 'Comunicar ajustes'], movement: 'Lê o ataque (reads de corrida/passe) e reage.', expert: 'Na NFL moderna, LBs precisam cobrir espaço: a defesa base passou a ter só 2 LBs (nickel).', examples: 'Ray Lewis, Dick Butkus, Fred Warner', size: '1,85–1,93 m · 105–115 kg' },
  { id: 'MLB', abbr: 'MLB', name: 'Middle linebacker', pt: 'Linebacker central ("Mike")', unit: 'defense', simple: 'O linebacker do meio, geralmente o líder da defesa.', duties: ['Chamar a jogada defensiva', 'Fechar corridas pelo meio', 'Cobrir a zona central'], movement: 'Alinha atrás da linha defensiva, no centro.', expert: 'Usa o rádio no capacete (o "green dot") para receber a chamada do coordenador.', examples: 'Ray Lewis, Mike Singletary', size: '1,85–1,93 m · 108–115 kg' },
  { id: 'OLB', abbr: 'OLB', name: 'Outside linebacker', pt: 'Linebacker externo', unit: 'defense', simple: 'Linebackers das pontas. Em defesas 3-4 são os principais rushers.', duties: ['Pressionar o QB (3-4)', 'Conter corridas externas', 'Cobrir o flat'], movement: 'Alinha fora dos tackles; ataca ou recua em cobertura.', expert: 'Em esquemas 4-3, os OLBs são "Sam" (lado forte) e "Will" (lado fraco).', examples: 'Lawrence Taylor, Derrick Thomas', size: '1,88–1,96 m · 108–118 kg' },
  { id: 'CB', abbr: 'CB', name: 'Cornerback', pt: 'Cornerback', unit: 'defense', simple: 'Marca os recebedores, normalmente perto das laterais. Tenta impedir passes e interceptar.', duties: ['Cobrir WRs (man ou zone)', 'Desviar e interceptar passes', 'Ajudar contra corridas externas'], movement: 'Espelha o recebedor (press, off ou bail).', expert: 'Métricas: passer rating permitido quando alvo, yards per coverage snap, taxa de alvos.', examples: 'Deion Sanders, Darrelle Revis, Sauce Gardner', size: '1,78–1,88 m · 85–92 kg' },
  { id: 'S', abbr: 'S', name: 'Safety', pt: 'Safety', unit: 'defense', simple: 'Os últimos defensores. Protegem o fundo do campo contra passes longos.', duties: ['Cobertura profunda', 'Ajudar os CBs', 'Apoiar contra corridas'], movement: 'Alinha 10–15 jardas atrás da linha; disfarça a cobertura antes do snap.', expert: 'A rotação dos safeties no snap define a cobertura real (ex.: 2 altos → 1 alto = Cover 3/1).', examples: 'Ed Reed, Troy Polamalu, Ronnie Lott', size: '1,80–1,88 m · 90–100 kg' },
  { id: 'FS', abbr: 'FS', name: 'Free safety', pt: 'Safety livre', unit: 'defense', simple: 'Safety mais distante, "livre" para ir onde a bola for.', duties: ['Proteger o meio profundo', 'Ler o QB', 'Interceptar passes longos'], movement: 'Centro do campo, bem no fundo ("center field").', expert: 'Alcance (range) e leitura dos olhos do QB são decisivos para a Cover 1 e a Cover 3.', examples: 'Ed Reed, Earl Thomas', size: '1,80–1,85 m · 88–95 kg' },
  { id: 'SS', abbr: 'SS', name: 'Strong safety', pt: 'Safety forte', unit: 'defense', simple: 'Safety mais próximo da linha, do lado do TE ("lado forte"). Mais físico.', duties: ['Ajudar contra corridas', 'Marcar TEs', 'Blitz'], movement: 'Desce para perto da linha (box) ou cobre a zona intermediária.', expert: 'Funciona como um "LB extra" contra a corrida em Cover 1/Cover 3 com um safety alto.', examples: 'Troy Polamalu, Brian Dawkins', size: '1,80–1,88 m · 95–100 kg' },
  // TIMES ESPECIAIS
  { id: 'K', abbr: 'K', name: 'Kicker', pt: 'Chutador', unit: 'special', simple: 'Chuta field goals (3 pts), pontos extras (1 pt) e kickoffs.', duties: ['Field goals', 'Pontos extras', 'Kickoffs'], movement: 'Chute de bola segura no chão (pelo holder) ou em tee (kickoff).', expert: 'A precisão em FGs de 50+ subiu de forma dramática nos últimos 20 anos.', examples: 'Adam Vinatieri, Justin Tucker', size: '1,80–1,88 m · 80–95 kg' },
  { id: 'P', abbr: 'P', name: 'Punter', pt: 'Punter', unit: 'special', simple: 'Chuta a bola longe (punt) quando o ataque desiste da posse no 4º down.', duties: ['Punts longos ou direcionados', 'Muitas vezes é o holder do field goal'], movement: 'Recebe o snap a ~15 jardas da linha e chuta da mão.', expert: 'Net average e hang time importam mais que a distância bruta.', examples: 'Ray Guy, Shane Lechler', size: '1,83–1,93 m · 90–100 kg' },
  { id: 'LS', abbr: 'LS', name: 'Long snapper', pt: 'Snapper longo', unit: 'special', simple: 'Especialista em passar a bola entre as pernas por 7 a 15 jardas para o holder ou o punter.', duties: ['Snap de field goals e punts', 'Bloquear e cobrir o retorno'], movement: 'Snap em ~0,7 s até o punter, com a costura da bola na posição certa.', expert: 'Raramente notado — até errar. Um snap ruim muda a rotação da bola e o chute.', examples: 'Morgan Cox, Patrick Mannelly', size: '1,85–1,93 m · 105–115 kg' },
  { id: 'KR', abbr: 'KR', name: 'Kick returner', pt: 'Retornador de kickoff', unit: 'special', simple: 'Pega o kickoff e tenta correr o máximo possível — ou até o touchdown.', duties: ['Pegar o chute', 'Ler os bloqueios', 'Decidir entre retornar e aceitar o touchback'], movement: 'Fica perto da própria end zone e ataca o "corredor" formado pelos bloqueadores.', expert: 'O kickoff dinâmico (2024) aumentou bastante a taxa de retornos.', examples: 'Devin Hester, Cordarrelle Patterson', size: 'variado (geralmente WRs ou RBs rápidos)' },
  { id: 'PR', abbr: 'PR', name: 'Punt returner', pt: 'Retornador de punt', unit: 'special', simple: 'Pega o punt e decide: retornar, pedir fair catch ou deixar a bola quicar.', duties: ['Pegar o punt com segurança', 'Retornar', 'Pedir fair catch quando necessário'], movement: 'Posiciona-se onde a bola deve cair, 35–50 jardas da linha.', expert: 'Segurar a bola (ball security) vale mais que jardas de retorno.', examples: 'Devin Hester, Deion Sanders', size: 'variado' },
];

/** Coordenadas (viewBox 600×380; ataque embaixo, avançando para cima). */
export interface Dot {
  pos: string;
  label: string;
  x: number;
  y: number;
  team: 'off' | 'def';
}

export const FORMATIONS: Record<Unit, { title: string; note: string; dots: Dot[] }> = {
  offense: {
    title: 'Ataque — shotgun, 11 personnel (1 RB, 1 TE, 3 WR)',
    note: 'A formação mais usada na NFL moderna. São 11 jogadores; 7 precisam estar na linha de scrimmage.',
    dots: [
      { pos: 'WR', label: 'X', x: 60, y: 218, team: 'off' },
      { pos: 'WR', label: 'SL', x: 170, y: 232, team: 'off' },
      { pos: 'OT', label: 'LT', x: 236, y: 218, team: 'off' },
      { pos: 'OG', label: 'LG', x: 268, y: 218, team: 'off' },
      { pos: 'C', label: 'C', x: 300, y: 218, team: 'off' },
      { pos: 'OG', label: 'RG', x: 332, y: 218, team: 'off' },
      { pos: 'OT', label: 'RT', x: 364, y: 218, team: 'off' },
      { pos: 'TE', label: 'TE', x: 398, y: 220, team: 'off' },
      { pos: 'WR', label: 'Z', x: 530, y: 232, team: 'off' },
      { pos: 'QB', label: 'QB', x: 300, y: 280, team: 'off' },
      { pos: 'RB', label: 'RB', x: 334, y: 282, team: 'off' },
    ],
  },
  defense: {
    title: 'Defesa — nickel 4-2-5 (4 DL, 2 LB, 5 DB)',
    note: 'Formação base atual: 5 defensive backs para enfrentar 3 recebedores.',
    dots: [
      { pos: 'CB', label: 'CB', x: 60, y: 172, team: 'def' },
      { pos: 'CB', label: 'NB', x: 170, y: 166, team: 'def' },
      { pos: 'EDGE', label: 'DE', x: 222, y: 190, team: 'def' },
      { pos: 'DT', label: 'DT', x: 284, y: 190, team: 'def' },
      { pos: 'NT', label: 'NT', x: 318, y: 190, team: 'def' },
      { pos: 'DE', label: 'DE', x: 382, y: 190, team: 'def' },
      { pos: 'OLB', label: 'WLB', x: 262, y: 145, team: 'def' },
      { pos: 'MLB', label: 'MLB', x: 330, y: 142, team: 'def' },
      { pos: 'CB', label: 'CB', x: 530, y: 172, team: 'def' },
      { pos: 'FS', label: 'FS', x: 240, y: 70, team: 'def' },
      { pos: 'SS', label: 'SS', x: 400, y: 92, team: 'def' },
    ],
  },
  special: {
    title: 'Times especiais — formação de punt',
    note: 'O time que chuta (embaixo) e o retornador adversário (em cima). Gunners correm para derrubar o retornador.',
    dots: [
      { pos: 'WR', label: 'G', x: 50, y: 218, team: 'off' },
      { pos: 'OT', label: 'T', x: 236, y: 218, team: 'off' },
      { pos: 'OG', label: 'G', x: 268, y: 218, team: 'off' },
      { pos: 'LS', label: 'LS', x: 300, y: 218, team: 'off' },
      { pos: 'OG', label: 'G', x: 332, y: 218, team: 'off' },
      { pos: 'OT', label: 'T', x: 364, y: 218, team: 'off' },
      { pos: 'TE', label: 'W', x: 214, y: 232, team: 'off' },
      { pos: 'TE', label: 'W', x: 386, y: 232, team: 'off' },
      { pos: 'WR', label: 'G', x: 550, y: 218, team: 'off' },
      { pos: 'FB', label: 'PP', x: 300, y: 268, team: 'off' },
      { pos: 'P', label: 'P', x: 300, y: 336, team: 'off' },
      { pos: 'PR', label: 'PR', x: 300, y: 34, team: 'def' },
    ],
  },
};
