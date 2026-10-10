/** Conteúdo das páginas "Aprenda" (básico) e "Regras" (avançado). */

export interface Lesson {
  id: string;
  title: string;
  body: string[];
  example?: string;
}

/** "A NFL em 10 minutos" — em ordem, para quem nunca viu um jogo. */
export const BASICS: Lesson[] = [
  { id: 'objetivo', title: '1. O objetivo', body: ['Dois times de 11 jogadores. Quem tem a bola (o ataque) tenta levá-la até a end zone do adversário, no fim do campo, para marcar pontos. Quem não tem (a defesa) tenta impedir.', 'O campo tem 100 jardas (~91 m) entre as duas end zones, mais 10 jardas de end zone em cada ponta.'], example: 'Pense em um "cabo de guerra" de território: cada jogada ganha ou perde algumas jardas.' },
  { id: 'downs', title: '2. Quatro tentativas para avançar 10 jardas', body: ['O ataque tem 4 tentativas (downs) para avançar 10 jardas. Se conseguir, ganha mais 4 tentativas (um "first down").', 'Se não conseguir em 4, perde a bola no local. Por isso, no 4º down quase sempre o time chuta: um punt (para longe) ou um field goal (para pontuar).'], example: '"2nd & 7" = segunda tentativa, faltam 7 jardas para o first down.' },
  { id: 'jogada', title: '3. Como funciona uma jogada', body: ['Toda jogada começa com o snap: o center passa a bola por entre as pernas para o quarterback.', 'A jogada termina quando quem está com a bola é derrubado, sai pela lateral, marca pontos ou quando um passe cai no chão (incompleto). Depois, os times se reorganizam (cerca de 40 segundos) e começa outra jogada.'], example: 'Um jogo tem ~130 jogadas, mas só ~11 minutos de bola rolando.' },
  { id: 'avancar', title: '4. Duas formas de avançar: correr ou passar', body: ['Corrida: o QB entrega a bola a um corredor (running back), que tenta passar pela defesa.', 'Passe: o QB lança para frente para um recebedor. Só um passe para frente por jogada, e ele precisa sair de trás da linha de scrimmage.'], example: 'Passes ganham mais jardas em média; corridas são mais seguras e gastam o relógio.' },
  { id: 'pontos', title: '5. Como se pontua', body: ['Touchdown (6 pontos): levar a bola até a end zone, correndo ou recebendo um passe lá dentro.', 'Depois do TD: chute de 1 ponto extra ou uma jogada de 2 pontos.', 'Field goal (3 pontos): chutar a bola entre as traves.', 'Safety (2 pontos para a defesa): derrubar o ataque dentro da própria end zone.'], example: 'Por isso placares como 24 × 17 são comuns: combinações de 7 e 3.' },
  { id: 'defesa', title: '6. O que a defesa faz', body: ['Derrubar quem está com a bola (tackle), pressionar o quarterback (sack) e tentar roubar a bola: interceptando um passe ou recuperando um fumble (bola solta).', 'Roubar a bola é chamado de turnover e costuma decidir jogos.'] },
  { id: 'tempo', title: '7. Tempo de jogo', body: ['São 4 quartos de 15 minutos, com intervalo após o 2º quarto. O relógio para em várias situações (passe incompleto, saída de campo em momentos-chave, pontuação, pedido de tempo).', 'Empate no fim: prorrogação de 10 minutos na temporada regular. Nos playoffs, joga-se até alguém vencer.'] },
  { id: 'temporada', title: '8. A temporada', body: ['32 times divididos em duas conferências (AFC e NFC), cada uma com 4 divisões de 4 times.', 'Temporada regular de 17 jogos (desde 2021). Classificam-se 7 times por conferência para os playoffs: os 4 campeões de divisão e 3 "wild cards".', 'Os campeões da AFC e da NFC se enfrentam no Super Bowl, em fevereiro.'] },
  { id: 'faltas', title: '9. Faltas (penalidades)', body: ['Quando um jogador comete uma falta, o árbitro joga uma bandeira amarela. A punição é perder jardas (5, 10 ou 15) e, às vezes, dar um first down automático ao adversário.'], example: 'False start: um jogador do ataque se mexe antes do snap → 5 jardas para trás.' },
];

export const ADVANCED: Lesson[] = [
  { id: 'passe-legal', title: 'Passe para frente legal', body: ['Só um passe para frente por jogada, lançado de trás da linha de scrimmage. Passes laterais/para trás (lateral) são ilimitados, mas uma bola lateral solta no chão é fumble (bola viva).', 'Recebedores elegíveis: os jogadores nas pontas da linha e os que estão atrás dela (backs). Linemen só podem receber se reportarem ao árbitro como elegíveis.'] },
  { id: 'recepcao', title: 'O que é uma recepção', body: ['O recebedor precisa ter controle da bola, tocar o chão com os dois pés (ou outra parte do corpo que não as mãos) dentro do campo e manter o controle tempo suficiente para fazer um "ato comum ao jogo" (ex.: dar um passo, esticar a bola).', 'A regra foi simplificada em 2018, após polêmicas como a "Dez caught it" (2014).'] },
  { id: 'relogio', title: 'Gerenciamento do relógio', body: ['Relógio para: passe incompleto; jogador fora de campo (somente nos últimos 2 min do 1º tempo e 5 min do 2º, caso contrário ele reinicia no "ready for play"); pontuação; troca de posse; faltas; pedido de tempo; two-minute warning.', 'Play clock de 40 segundos entre jogadas (25 s após certas paradas administrativas). Cada time tem 3 tempos por metade.'] },
  { id: 'prorrogacao', title: 'Prorrogação', body: ['Temporada regular: um período de 10 minutos. Desde 2025, os dois times têm garantida ao menos uma posse (antes, um TD na primeira posse encerrava o jogo). Se continuar empatado, o jogo termina empatado.', 'Playoffs: períodos de 15 minutos, com posse garantida aos dois times desde 2022, até sair um vencedor.'] },
  { id: 'challenge', title: 'Replay e challenges', body: ['O técnico pode desafiar (challenge) uma marcação jogando a bandeira vermelha: 2 por jogo (3 se acertar os dois). Pontuações, turnovers e jogadas nos últimos 2 minutos de cada tempo são revisadas automaticamente pelo replay central em Nova York.'] },
  { id: 'kickoff', title: 'Kickoff dinâmico (desde 2024)', body: ['Os jogadores de cobertura alinham na linha de 40 adversária e os bloqueadores entre a 30 e a 35; ninguém (exceto kicker e retornadores) se move até a bola tocar o chão ou um jogador na "landing zone". O objetivo é ter mais retornos com menos choques em alta velocidade.', 'As linhas de touchback foram ajustadas em 2024 e 2025 para incentivar retornos.'] },
  { id: 'playoffs', title: 'Desempates e seeding', body: ['Os seeds 1–4 são os campeões de divisão (ordenados pelo recorde); 5–7 são os wild cards. O seed 1 folga na rodada de Wild Card.', 'Critérios de desempate (resumo): confronto direto → recorde na divisão → recorde contra adversários comuns → recorde na conferência → força de vitória → força de tabela → e outros. Nesta plataforma, a classificação usa um desempate simplificado (PCT → saldo de pontos), sempre indicado.'] },
  { id: 'teto', title: 'Teto salarial e draft', body: ['Cada time tem o mesmo limite de gastos com salários (salary cap), o que equilibra a liga. O draft dá as primeiras escolhas aos piores times. Por isso a NFL tem muita alternância de campeões.'] },
];

/** Fluxo de um jogo (Game flow). */
export const GAME_FLOW: { step: string; text: string }[] = [
  { step: 'Cara ou coroa', text: 'Define quem escolhe receber ou chutar. Normalmente quem vence adia a escolha para o 2º tempo.' },
  { step: 'Kickoff', text: 'Um time chuta para o outro. O retornador tenta avançar ou aceita o touchback.' },
  { step: 'Drive', text: 'Sequência de jogadas de um time com a bola. Termina em pontuação, punt, turnover ou fim do tempo.' },
  { step: 'Snap e jogada', text: 'Cada jogada começa no snap e termina com o tackle, saída de campo, passe incompleto ou pontuação.' },
  { step: 'Down e first down', text: 'O ataque tem 4 downs para ganhar 10 jardas; conseguindo, recomeça no 1st & 10.' },
  { step: 'Turnover', text: 'Interceptação, fumble perdido ou falha no 4º down: a bola troca de lado.' },
  { step: 'Punt ou field goal', text: 'No 4º down o time costuma chutar: punt para ganhar território ou FG para 3 pontos.' },
  { step: 'Touchdown e conversão', text: '6 pontos; depois, tentativa de 1 (chute) ou 2 pontos (jogada).' },
  { step: 'Intervalo', text: 'Após o 2º quarto. O time que não recebeu no início recebe o kickoff do 2º tempo.' },
  { step: 'Two-minute warning', text: 'Parada automática a 2 minutos do fim de cada tempo; começa o "jogo do relógio".' },
  { step: 'Prorrogação', text: 'Se empatar: 10 minutos (temporada regular) ou até haver vencedor (playoffs).' },
];

export const SCORING = [
  { id: 'td', name: 'Touchdown', pts: 6, how: 'A bola, com posse, cruza o plano da linha de gol (corrida) ou é recebida dentro da end zone.' },
  { id: 'xp', name: 'Ponto extra', pts: 1, how: 'Chute após o TD, com snap na linha de 15 jardas.' },
  { id: '2pt', name: 'Conversão de 2', pts: 2, how: 'Jogada (corrida ou passe) a partir da linha de 2 jardas após o TD.' },
  { id: 'fg', name: 'Field goal', pts: 3, how: 'Chute entre as traves (e acima do travessão) em jogada normal.' },
  { id: 'safety', name: 'Safety', pts: 2, how: 'O ataque é derrubado (ou comete certas faltas) dentro da própria end zone. A defesa ainda recebe a bola.' },
];

export const OFFICIALS = [
  { id: 'R', name: 'Referee', pt: 'Árbitro principal', role: 'Chefe da equipe (boné branco). Fica atrás do ataque, cuida do QB e anuncia as faltas.' },
  { id: 'U', name: 'Umpire', pt: 'Umpire', role: 'Fica atrás do QB/linha ofensiva; observa holding e contato entre linemen.' },
  { id: 'DJ', name: 'Down judge', pt: 'Juiz de descida', role: 'Na lateral, na linha de scrimmage. Controla offside, false start e a marcação da bola.' },
  { id: 'LJ', name: 'Line judge', pt: 'Juiz de linha', role: 'Lateral oposta ao down judge; mesma linha. Ajuda com o relógio e passes para frente.' },
  { id: 'SJ', name: 'Side judge', pt: 'Juiz lateral', role: 'Profundo na lateral; cobre recebedores e interferências.' },
  { id: 'FJ', name: 'Field judge', pt: 'Juiz de campo', role: 'Profundo na lateral oposta; cobre recebedores e o play clock.' },
  { id: 'BJ', name: 'Back judge', pt: 'Juiz de fundo', role: 'O mais profundo, no meio; cobre passes longos e chutes de FG.' },
];
