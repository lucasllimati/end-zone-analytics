/**
 * Título e descrição das páginas fixas. Usado pelas páginas (<Seo>) e pelo build, que gera um HTML
 * por rota com esses metadados (buscadores e prévias de links leem o HTML antes do JavaScript).
 */
import { GAME_TYPE_LABEL } from '../lib/teams';

export interface PageMeta {
  title: string;
  description: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  '/compare': { title: 'Comparador', description: 'Compare jogadores, times e temporadas lado a lado, com gráficos, percentis e ajuste de era.' },
  '/data': { title: 'Fontes e qualidade dos dados', description: 'De onde vem cada número do End Zone Analytics: fontes abertas, licenças, cobertura, limitações e verificações de qualidade.' },
  '/draft': { title: 'Draft', description: 'Draft da NFL desde 1980: todas as escolhas, melhores jogadores por rodada e o valor de cada pick.' },
  '/explorer': { title: 'Explorador de dados', description: 'Monte seus próprios rankings da NFL: escolha temporadas, posição, time e métrica e exporte o resultado.' },
  '/glossary': { title: 'Glossário', description: 'Glossário de futebol americano: definições simples e avançadas, exemplos e termos relacionados.' },
  '/hall-of-fame': { title: 'Hall of Fame', description: 'Membros do Pro Football Hall of Fame escolhidos no draft desde 1980: posição, rodada, time e estatísticas de carreira.' },
  '/history': { title: 'História da NFL', description: 'A história da NFL de 1920 até hoje: eras, mudanças de regras, Super Bowl e como o jogo evoluiu em números.' },
  '/': { title: '', description: 'Estatísticas, classificação, jogos, Super Bowls, recordes e explicações da NFL para iniciantes e especialistas.' },
  '/learn': { title: 'Comece aqui: a NFL em 10 minutos', description: 'Guia para iniciantes: objetivo do jogo, downs, como se pontua, posições e faltas, com exemplos visuais e simulador.' },
  '/playbook': { title: 'Playbook', description: 'Jogadas de corrida, rotas de passe, play action, RPO e coberturas defensivas (Cover 0 a Cover 6) animadas e explicadas.' },
  '/players': { title: 'Jogadores', description: 'Busque qualquer jogador da NFL desde 1999: estatísticas por temporada, carreira, comparação e jogadores semelhantes.' },
  '/positions': { title: 'Posições', description: 'Todas as posições do futebol americano explicadas em um campo interativo: ataque, defesa e times especiais.' },
  '/rankings': { title: 'Ranking de QBs', description: 'Quem é o maior quarterback? Ranking com pesos ajustáveis: títulos, playoffs, produção, eficiência, longevidade e ajuste de era.' },
  '/records': { title: 'Recordes', description: 'Recordes da NFL: carreira, temporada, playoffs, times e jogos. Oficiais e calculados desde 1999.' },
  '/referees': { title: 'Árbitros', description: 'Árbitros principais da NFL desde 1999: jogos apitados, pontos por jogo, vitórias do mandante e jogos acima do total esperado.' },
  '/rules': { title: 'Regras e faltas', description: 'Regras avançadas da NFL, tabela completa de penalidades com visualização no campo e a equipe de arbitragem.' },
  '/stadiums': { title: 'Estádios', description: 'Estádios da NFL: times, teto, gramado, clima, pontos por jogo, vantagem do mandante, aproveitamento de field goals e Super Bowls desde 1999.' },
  '/strategy': { title: 'Estratégia', description: 'Estratégia no futebol americano: gerenciamento do relógio, decisões de 4º down, red zone, blitz, coberturas e mais.' },
  '/super-bowl': { title: 'Super Bowl', description: 'Todos os Super Bowls, do I ao LX: campeões, placares, MVPs, estádios, recordes e linha do tempo.' },
  '/teams': { title: 'Times', description: 'As 32 franquias da NFL: logos, divisões, campanha da temporada, títulos e histórico.' },
  '/fantasy': { title: 'Fantasy', description: 'Fantasy da NFL (PPR): ranking semanal, consistência de cada jogador e quantos pontos cada defesa cede por posição.' },
  '/awards': { title: 'Prêmios', description: 'Prêmios da AP na NFL: MVP, jogadores ofensivo e defensivo do ano, novatos, volta por cima do ano (Comeback) e técnico do ano, temporada a temporada.' },
  '/about': { title: 'Sobre', description: 'O que é o End Zone Analytics, de onde vêm os dados (nflverse, ESPN, Wikipedia, Wikidata) e como o projeto funciona.' },
  '/privacy': { title: 'Privacidade', description: 'Política de privacidade: sem cadastro e sem cookies de rastreamento. O que fica no navegador, medição de audiência e relatos de erro.' },
};

/** Título e descrição de um jogo (página do jogo e HTML gerado no build): "Vikings × Lions (2026)". */
export function gameMeta(
  g: { away: string; home: string; season: number; type: keyof typeof GAME_TYPE_LABEL; homeScore: number | null; awayScore: number | null },
  nick: (abbr: string) => string,
): PageMeta {
  const a = nick(g.away);
  const h = nick(g.home);
  const phase = `${GAME_TYPE_LABEL[g.type]} de ${g.season}`;
  const played = g.homeScore !== null && g.awayScore !== null;
  return {
    title: `${a} × ${h} (${g.season})`,
    description: played
      ? `${a} ${g.awayScore} × ${g.homeScore} ${h}, ${phase}: placar por quarto, drives, jogadas de pontuação, box score e estatísticas.`
      : `Prévia de ${a} × ${h}, ${phase}: momento dos times, médias da temporada, destaques e expectativa do mercado.`,
  };
}
