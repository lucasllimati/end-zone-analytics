export interface NavItem {
  to: string;
  label: string;
  desc: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** Mapa do site — usado no menu, no menu mobile, no rodapé e na busca global. */
export const NAV: NavGroup[] = [
  {
    id: 'liga',
    label: 'Liga',
    items: [
      { to: '/season', label: 'Temporada', desc: 'Classificação, líderes e power ranking' },
      { to: '/season?tab=schedule', label: 'Calendário e resultados', desc: 'Todos os jogos, semana a semana' },
      { to: '/season?tab=playoffs', label: 'Playoffs', desc: 'Chave interativa de cada temporada' },
      { to: '/season?tab=sos', label: 'Força de tabela', desc: 'Quem teve o caminho mais difícil' },
    ],
  },
  {
    id: 'times',
    label: 'Times & Jogadores',
    items: [
      { to: '/teams', label: 'Times', desc: 'As 32 franquias, com história e analytics' },
      { to: '/players', label: 'Jogadores', desc: 'Busca, líderes e carreiras' },
      { to: '/compare', label: 'Comparador', desc: 'Jogador × jogador, time × time, temporadas' },
      { to: '/matchup', label: 'Confrontos e rivalidades', desc: 'Histórico entre dois times' },
      { to: '/stadiums', label: 'Estádios', desc: 'Casas da NFL, teto e gramado' },
    ],
  },
  {
    id: 'historia',
    label: 'História',
    items: [
      { to: '/super-bowl', label: 'Super Bowl', desc: 'Todas as edições, do I ao LX' },
      { to: '/records', label: 'Recordes', desc: 'Carreira, temporada, jogo e times' },
      { to: '/draft', label: 'Draft', desc: 'Escolhas desde 1980 e valor por pick' },
      { to: '/hall-of-fame', label: 'Hall of Fame', desc: 'Membros draftados desde 1980' },
      { to: '/history', label: 'História da NFL', desc: 'Eras, mudanças e evolução do jogo' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { to: '/rankings', label: 'Ranking de QBs', desc: 'Modelo com pesos ajustáveis' },
      { to: '/season?tab=power', label: 'Power ranking', desc: 'Modelo transparente da temporada' },
      { to: '/explorer', label: 'Explorador de dados', desc: 'Monte rankings, tabelas e gráficos' },
      { to: '/history#evolucao', label: 'Evolução do jogo', desc: 'Pontos, passes e corridas por temporada' },
    ],
  },
  {
    id: 'aprenda',
    label: 'Aprenda',
    items: [
      { to: '/learn', label: 'Comece aqui', desc: 'A NFL em 10 minutos, para iniciantes' },
      { to: '/rules', label: 'Regras e faltas', desc: 'Regras avançadas, penalidades e arbitragem' },
      { to: '/positions', label: 'Posições', desc: 'Campo interativo com todas as funções' },
      { to: '/playbook', label: 'Playbook', desc: 'Jogadas e coberturas animadas' },
      { to: '/strategy', label: 'Estratégia', desc: 'Relógio, 4º down, red zone e mais' },
      { to: '/glossary', label: 'Glossário', desc: 'Termos técnicos, do básico ao avançado' },
    ],
  },
];
