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
    id: 'temporada',
    label: 'Temporada',
    items: [
      { to: '/season', label: 'Classificação', desc: 'Divisões, conferências e liga' },
      { to: '/season?tab=schedule', label: 'Calendário e resultados', desc: 'Todos os jogos, semana a semana' },
      { to: '/season?tab=playoffs', label: 'Playoffs', desc: 'Chave interativa de cada temporada' },
      { to: '/season?tab=leaders', label: 'Líderes', desc: 'Passe, corrida, recepção e defesa' },
      { to: '/season?tab=sos', label: 'Força de tabela', desc: 'Quem teve o caminho mais difícil' },
      { to: '/season?tab=efficiency', label: 'Eficiência dos times', desc: 'Ataque, defesa e times especiais com ranking' },
      { to: '/season?tab=market', label: 'Zebras e expectativa', desc: 'Quem superou o previsto pelo mercado' },
    ],
  },
  {
    id: 'times',
    label: 'Times',
    items: [
      { to: '/teams', label: 'Times', desc: 'As 32 franquias, com história e analytics' },
      { to: '/matchup', label: 'Confrontos e rivalidades', desc: 'Histórico entre dois times' },
      { to: '/stadiums', label: 'Estádios', desc: 'Casas da NFL, teto e gramado' },
    ],
  },
  {
    id: 'jogadores',
    label: 'Jogadores',
    items: [
      { to: '/players', label: 'Jogadores', desc: 'Busca, líderes e carreiras' },
      { to: '/compare', label: 'Comparador', desc: 'Jogador × jogador, time × time, temporadas' },
      { to: '/draft', label: 'Draft', desc: 'Escolhas desde 1980 e valor por pick' },
      { to: '/hall-of-fame', label: 'Hall of Fame', desc: 'Membros draftados desde 1980' },
    ],
  },
  {
    id: 'estatisticas',
    label: 'Estatísticas',
    items: [
      { to: '/rankings', label: 'Ranking de QBs', desc: 'Modelo com pesos ajustáveis' },
      { to: '/season?tab=power', label: 'Power ranking', desc: 'Modelo transparente da temporada' },
      { to: '/explorer', label: 'Explorador de dados', desc: 'Monte rankings, tabelas e gráficos' },
      { to: '/history#evolucao', label: 'Evolução do jogo', desc: 'Pontos, passes e corridas por temporada' },
      { to: '/referees', label: 'Árbitros', desc: 'Quem apita e o perfil dos jogos' },
    ],
  },
  {
    id: 'historia',
    label: 'História',
    items: [
      { to: '/super-bowl', label: 'Super Bowl', desc: 'Todas as edições, do I ao LX' },
      { to: '/records', label: 'Recordes', desc: 'Carreira, temporada, jogo e times' },
      { to: '/history', label: 'História da NFL', desc: 'Eras, mudanças e evolução do jogo' },
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
