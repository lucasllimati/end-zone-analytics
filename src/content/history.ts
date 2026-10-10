/** Linha do tempo da NFL por eras. Conteúdo editorial próprio baseado em fatos históricos amplamente documentados. */
export interface Era {
  id: string;
  period: string;
  title: string;
  summary: string;
  events: { year: string; text: string }[];
  changes: string[];
}

export const ERAS: Era[] = [
  {
    id: 'origens', period: '1920–1929', title: 'Origens',
    summary: 'A American Professional Football Association é fundada em 1920 em Canton, Ohio, e vira National Football League em 1922. Times de cidades pequenas, jogos com muita corrida e pouco passe.',
    events: [
      { year: '1920', text: 'Fundação da APFA em uma concessionária de carros em Canton, Ohio.' },
      { year: '1922', text: 'A liga passa a se chamar National Football League.' },
      { year: '1925', text: 'Red Grange assina com o Chicago Bears e atrai multidões: o futebol profissional ganha popularidade.' },
    ],
    changes: ['Sem playoffs: campeão definido pela melhor campanha', 'Franquias entram e saem da liga todo ano'],
  },
  {
    id: '1930s', period: '1930–1939', title: 'Organização',
    summary: 'A liga se estabiliza, cria o jogo de campeonato (1933) e o draft (1936). A bola fica mais fina, facilitando o passe.',
    events: [
      { year: '1933', text: 'Primeiro NFL Championship Game; divisões Leste e Oeste. O passe para frente passa a ser permitido de qualquer ponto atrás da linha.' },
      { year: '1936', text: 'Primeiro draft da NFL (Jay Berwanger é a 1ª escolha).' },
    ],
    changes: ['Campeonato decidido em jogo final', 'Draft para equilibrar a liga'],
  },
  {
    id: '1940s', period: '1940–1949', title: 'Guerra e formação T',
    summary: 'A formação "T" (QB sob o center) dos Bears revoluciona o ataque. A Segunda Guerra reduz elencos; capacetes passam a ser obrigatórios (1943).',
    events: [
      { year: '1940', text: 'Bears 73 × 0 Washington na final: a maior goleada da história.' },
      { year: '1946', text: 'Integração racial é retomada (Kenny Washington e Woody Strode nos Rams). Surge a liga rival AAFC.' },
    ],
    changes: ['Formação T', 'Substituições ilimitadas (a partir de 1950) criam especialistas de ataque e defesa'],
  },
  {
    id: '1950s', period: '1950–1959', title: 'A era da televisão',
    summary: 'Browns, Rams e Lions dominam. A final de 1958 (Colts × Giants, com prorrogação) é transmitida nacionalmente e vira "o maior jogo já disputado", impulsionando a NFL na TV.',
    events: [
      { year: '1950', text: 'Browns, 49ers e Colts entram vindos da AAFC.' },
      { year: '1958', text: 'Colts 23 × 17 Giants: primeira final decidida na prorrogação.' },
    ],
    changes: ['Televisão nacional', 'Máscaras faciais nos capacetes se popularizam'],
  },
  {
    id: '1960s', period: '1960–1969', title: 'AFL e o nascimento do Super Bowl',
    summary: 'A American Football League (1960) desafia a NFL com ataques aéreos e salários altos. As ligas acertam a fusão em 1966 e criam o Super Bowl.',
    events: [
      { year: '1960', text: 'Início da AFL com 8 times (Chiefs, Raiders, Broncos, Bills, Jets — então Titans —, entre outros).' },
      { year: '1967', text: 'Super Bowl I: Packers 35 × 10 Chiefs.' },
      { year: '1969', text: 'Super Bowl III: os Jets de Joe Namath vencem os Colts e provam a força da AFL.' },
    ],
    changes: ['Conversão de 2 pontos na AFL', 'Nomes nas camisas (AFL)', 'Contratos de TV milionários'],
  },
  {
    id: '1970s', period: '1970–1979', title: 'Fusão e dinastias',
    summary: 'Em 1970 a fusão se completa: 26 times em duas conferências (AFC e NFC). Dolphins perfeitos (1972) e a "Steel Curtain" de Pittsburgh (4 títulos).',
    events: [
      { year: '1970', text: 'Fusão NFL-AFL; estreia do Monday Night Football.' },
      { year: '1972', text: 'Dolphins 17-0: única temporada perfeita com título.' },
      { year: '1978', text: 'Temporada de 16 jogos; regras protegem recebedores (contato só nas primeiras 5 jardas), abrindo o jogo aéreo.' },
    ],
    changes: ['AFC e NFC', 'Regra de 5 jardas (1978)', 'Linemen podem estender os braços para bloquear'],
  },
  {
    id: '1980s', period: '1980–1989', title: 'West Coast Offense',
    summary: 'Bill Walsh e Joe Montana levam os 49ers a 4 títulos com passes curtos e precisos. Os Bears de 1985 têm uma das maiores defesas da história.',
    events: [
      { year: '1982', text: 'Greve reduz a temporada a 9 jogos; sacks passam a ser estatística oficial.' },
      { year: '1985', text: 'Bears 15-1 e Super Bowl XX (46 × 10).' },
      { year: '1986', text: 'Primeira versão do replay instantâneo.' },
    ],
    changes: ['West Coast Offense', 'Defesa 46', 'Replay (1986–1991)'],
  },
  {
    id: '1990s', period: '1990–1999', title: 'Free agency e teto salarial',
    summary: 'O acordo de 1993 cria a free agency e o salary cap, aumentando a paridade. Cowboys de Aikman, Smith e Irvin vencem 3 títulos em 4 anos.',
    events: [
      { year: '1993', text: 'Free agency plena e salary cap (1994).' },
      { year: '1994', text: 'Conversão de 2 pontos chega à NFL.' },
      { year: '1999', text: 'Retorno do replay com challenges dos técnicos. Início da cobertura de dados detalhados desta plataforma (nflverse).' },
    ],
    changes: ['Salary cap', 'Franquias se mudam (Rams, Raiders, Oilers, Browns→Ravens)', 'Expansão: Panthers e Jaguars (1995)'],
  },
  {
    id: '2000s', period: '2000–2009', title: 'A dinastia Patriots e a era dos QBs',
    summary: 'Brady e Belichick vencem 3 Super Bowls em 4 anos. Peyton Manning redefine o pré-snap. Realinhamento em 8 divisões com a entrada dos Texans (2002).',
    events: [
      { year: '2002', text: 'Houston Texans: 32 times e 8 divisões de 4.' },
      { year: '2004', text: 'Fiscalização rígida do "illegal contact" — o jogo aéreo explode.' },
      { year: '2007', text: 'Patriots 16-0 na temporada regular; perdem o Super Bowl XLII para os Giants.' },
    ],
    changes: ['8 divisões de 4 times', 'Regras de proteção ao QB', 'Shotgun vira formação comum'],
  },
  {
    id: '2010s', period: '2010–2019', title: 'Analytics e segurança',
    summary: 'Ataques espalhados (spread), RPOs vindos do college e mais 4th downs. Regras de segurança (concussões) mudam tackles e kickoffs.',
    events: [
      { year: '2011', text: 'Kickoff move para a linha de 35.' },
      { year: '2013', text: 'Broncos de Peyton Manning marcam 606 pontos (recorde).' },
      { year: '2015', text: 'Ponto extra passa para a linha de 15 jardas.' },
      { year: '2018', text: 'Dados de rastreamento (Next Gen Stats) se popularizam; explosão do uso de analytics nas decisões.' },
    ],
    changes: ['EPA e win probability nas decisões', 'RPO', 'Proteção contra golpes na cabeça'],
  },
  {
    id: '2020s', period: '2020–hoje', title: 'Era moderna',
    summary: 'Playoffs com 14 times (2020), temporada de 17 jogos (2021), kickoff dinâmico (2024). Chiefs de Mahomes dominam a primeira metade da década.',
    events: [
      { year: '2020', text: 'Playoffs com 7 times por conferência; temporada disputada com protocolos de pandemia.' },
      { year: '2021', text: 'Temporada regular de 17 jogos.' },
      { year: '2024', text: 'Kickoff dinâmico e "hip-drop tackle" proibido.' },
      { year: '2025', text: 'Posse garantida para os dois times também na prorrogação da temporada regular.' },
    ],
    changes: ['17 jogos', 'Mais agressividade no 4º down', 'Ataques com motion pré-snap em mais de 50% das jogadas'],
  },
];
