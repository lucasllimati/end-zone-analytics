export interface Penalty {
  id: string;
  name: string;
  pt: string;
  side: 'Ataque' | 'Defesa' | 'Ambos';
  yards: number;
  autoFirst?: boolean;
  lossOfDown?: boolean;
  spot?: boolean;
  deadBall?: boolean;
  simple: string;
  detail: string;
  /** Sinal do árbitro descrito em texto. */
  signal: string;
}

/** Penalidades mais comuns (Regulamento oficial da NFL; valores para temporada regular). */
export const PENALTIES: Penalty[] = [
  { id: 'false-start', name: 'False start', pt: 'Saída falsa', side: 'Ataque', yards: 5, deadBall: true, simple: 'Jogador do ataque se mexe antes do snap.', detail: 'Jogada morta: nem começa. Muito comum em estádios barulhentos.', signal: 'Antebraços girando um sobre o outro na frente do corpo.' },
  { id: 'offside', name: 'Offside', pt: 'Impedimento', side: 'Defesa', yards: 5, simple: 'Defensor além da linha de scrimmage no snap.', detail: 'Se a jogada continuar, o ataque tem "free play": pode recusar a falta se ganhar mais jardas.', signal: 'Mãos na cintura.' },
  { id: 'encroachment', name: 'Encroachment', pt: 'Invasão com contato', side: 'Defesa', yards: 5, deadBall: true, simple: 'Defensor cruza a linha e toca um adversário antes do snap.', detail: 'Jogada morta, 5 jardas. Diferente do offside porque há contato antes do snap.', signal: 'Mãos na cintura.' },
  { id: 'neutral-zone', name: 'Neutral zone infraction', pt: 'Invasão da zona neutra', side: 'Defesa', yards: 5, deadBall: true, simple: 'Defensor entra na zona neutra e provoca a reação de um jogador do ataque.', detail: 'O jogador do ataque que reagiu não é punido.', signal: 'Mãos na cintura e braço apontando para frente.' },
  { id: 'delay', name: 'Delay of game', pt: 'Retardar o jogo', side: 'Ambos', yards: 5, deadBall: true, simple: 'O ataque não faz o snap antes do fim do play clock (40 s).', detail: 'Também se aplica a atrasos deliberados de qualquer equipe.', signal: 'Braços cruzados na frente do peito.' },
  { id: 'illegal-formation', name: 'Illegal formation', pt: 'Formação ilegal', side: 'Ataque', yards: 5, simple: 'O ataque não tem 7 jogadores na linha de scrimmage no snap.', detail: 'Os recebedores das pontas devem estar na linha ou fora dela de forma clara; jogadores "cobertos" não podem receber.', signal: 'Antebraços girando um sobre o outro (mesmo sinal do false start).' },
  { id: 'illegal-motion', name: 'Illegal motion', pt: 'Movimento ilegal', side: 'Ataque', yards: 5, simple: 'Jogador em movimento em direção à linha no momento do snap.', detail: 'Só um jogador pode estar em movimento, e lateralmente ou para trás. (A regra de "motion" para frente não é permitida na NFL.)', signal: 'Mão aberta passando lateralmente na frente do corpo.' },
  { id: 'illegal-shift', name: 'Illegal shift', pt: 'Troca de posição ilegal', side: 'Ataque', yards: 5, simple: 'Jogadores mudam de posição e não ficam parados por 1 segundo antes do snap.', detail: 'Após um shift, todos os 11 devem ficar "set" por ao menos 1 segundo.', signal: 'Duas mãos passando lateralmente na frente do corpo.' },
  { id: 'holding-off', name: 'Offensive holding', pt: 'Agarrar (ataque)', side: 'Ataque', yards: 10, spot: true, simple: 'Jogador do ataque agarra ou segura um defensor ilegalmente.', detail: 'Se ocorrer na própria end zone, é safety. Medido a partir do local da falta quando atrás da linha.', signal: 'Agarrar o pulso com a outra mão, na altura do peito.' },
  { id: 'holding-def', name: 'Defensive holding', pt: 'Agarrar (defesa)', side: 'Defesa', yards: 5, autoFirst: true, simple: 'Defensor segura um recebedor ou bloqueador de forma ilegal.', detail: '5 jardas e first down automático para o ataque.', signal: 'Agarrar o pulso com a outra mão.' },
  { id: 'dpi', name: 'Defensive pass interference', pt: 'Interferência de passe (defesa)', side: 'Defesa', yards: 0, spot: true, autoFirst: true, simple: 'Defensor impede o recebedor de pegar a bola com contato ilegal enquanto ela está no ar.', detail: 'Bola no local da falta + first down. Se for na end zone, bola na linha de 1. Uma das faltas mais caras do jogo.', signal: 'Mãos abertas empurrando para frente, na altura dos ombros.' },
  { id: 'opi', name: 'Offensive pass interference', pt: 'Interferência de passe (ataque)', side: 'Ataque', yards: 10, simple: 'Recebedor empurra o defensor para abrir espaço com a bola no ar.', detail: '10 jardas a partir da linha anterior.', signal: 'Mãos empurrando para frente.' },
  { id: 'illegal-contact', name: 'Illegal contact', pt: 'Contato ilegal', side: 'Defesa', yards: 5, autoFirst: true, simple: 'Defensor faz contato com o recebedor depois de 5 jardas da linha, antes do passe.', detail: 'A "zona de 5 jardas" foi reforçada em 2004 e é um dos motivos da explosão do jogo aéreo.', signal: 'Mão aberta empurrando para frente.' },
  { id: 'roughing-passer', name: 'Roughing the passer', pt: 'Excesso contra o QB', side: 'Defesa', yards: 15, autoFirst: true, simple: 'Atingir o QB depois que ele lançou, na cabeça/pescoço ou com o peso do corpo.', detail: 'Proteção ao QB é uma das áreas mais fiscalizadas desde os anos 2000.', signal: 'Sinal de falta pessoal + braço simulando um lançamento.' },
  { id: 'roughing-kicker', name: 'Roughing the kicker', pt: 'Excesso contra o chutador', side: 'Defesa', yards: 15, autoFirst: true, simple: 'Atingir o kicker/punter que já chutou.', detail: 'Se o contato for leve, pode ser "running into the kicker" (5 jardas, sem first down).', signal: 'Sinal de falta pessoal + chute simulado.' },
  { id: 'grounding', name: 'Intentional grounding', pt: 'Arremesso intencional ao chão', side: 'Ataque', yards: 10, lossOfDown: true, spot: true, simple: 'QB joga a bola fora, sem recebedor por perto, para evitar o sack.', detail: 'Perda do down; se a falta for na end zone, é safety. Não é falta se o QB estiver fora do "tackle box" e a bola passar da linha.', signal: 'Braços paralelos girando em diagonal para o chão.' },
  { id: 'facemask', name: 'Face mask', pt: 'Puxar a máscara', side: 'Ambos', yards: 15, autoFirst: true, simple: 'Agarrar e puxar a grade do capacete de um adversário.', detail: 'Falta pessoal. Se for da defesa, first down automático.', signal: 'Mão agarrando e puxando para baixo na frente do rosto.' },
  { id: 'unnecessary-roughness', name: 'Unnecessary roughness', pt: 'Violência desnecessária', side: 'Ambos', yards: 15, autoFirst: true, simple: 'Contato violento desnecessário, como bater em alguém já fora da jogada.', detail: 'Inclui golpes em jogador indefeso e "late hits". Pode resultar em expulsão.', signal: 'Sinal de falta pessoal (um pulso batendo no outro acima da cabeça).' },
  { id: 'unsportsmanlike', name: 'Unsportsmanlike conduct', pt: 'Conduta antidesportiva', side: 'Ambos', yards: 15, deadBall: true, simple: 'Provocações, xingamentos ou comemorações proibidas.', detail: 'Duas no mesmo jogo = expulsão.', signal: 'Braços abertos, palmas para baixo.' },
  { id: 'too-many', name: 'Too many men on the field', pt: 'Jogadores a mais', side: 'Ambos', yards: 5, simple: 'Mais de 11 jogadores em campo no snap.', detail: 'Também ocorre se um jogador não sair a tempo na substituição.', signal: 'Mãos sobre a cabeça.' },
  { id: 'illegal-hands', name: 'Illegal use of hands', pt: 'Uso ilegal das mãos', side: 'Ambos', yards: 10, simple: 'Golpear o rosto/capacete do adversário com as mãos.', detail: 'Pelo ataque: 10 jardas. Pela defesa: 5 jardas e first down automático.', signal: 'Agarrar o pulso e estender a mão aberta para frente.' },
  { id: 'horse-collar', name: 'Horse-collar tackle', pt: 'Tackle pela gola', side: 'Defesa', yards: 15, autoFirst: true, simple: 'Derrubar o adversário puxando por dentro da gola das ombreiras.', detail: 'Proibido desde 2005 por causar lesões graves de joelho e tornozelo.', signal: 'Sinal de falta pessoal + mão puxando a gola.' },
];
