/**
 * Catálogo de fontes de dados. Usado pelo pipeline (download) e pela verificação de atualizações
 * (servidor e navegador). Todas as fontes são abertas: nflverse (licença CC-BY 4.0 para dados).
 */
export interface SourceDef {
  key: string;
  label: string;
  /** Tag do release em github.com/nflverse/nflverse-data. */
  tag: string;
  /** Nome do asset; `{season}` é substituído pela temporada. */
  assets: string[];
  seasonal: boolean;
  license: string;
  docs: string;
}

export const GITHUB_REPO = 'nflverse/nflverse-data';
export const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download`;
export const RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags`;

export const SOURCES: SourceDef[] = [
  {
    key: 'teams',
    label: 'Times, cores e logos',
    tag: 'teams',
    assets: ['teams_colors_logos.csv'],
    seasonal: false,
    license: 'CC-BY 4.0 (dados) · logos são marcas registradas de seus detentores',
    docs: 'https://nflreadr.nflverse.com/reference/load_teams.html',
  },
  {
    key: 'games',
    label: 'Calendário e resultados',
    tag: 'schedules',
    assets: ['games.csv'],
    seasonal: false,
    license: 'CC-BY 4.0',
    docs: 'https://nflreadr.nflverse.com/reference/load_schedules.html',
  },
  {
    key: 'players',
    label: 'Cadastro de jogadores',
    tag: 'players',
    assets: ['players.csv'],
    seasonal: false,
    license: 'CC-BY 4.0',
    docs: 'https://nflreadr.nflverse.com/reference/load_players.html',
  },
  {
    key: 'playerStats',
    label: 'Estatísticas de jogadores por temporada',
    tag: 'stats_player',
    assets: ['stats_player_reg_{season}.csv', 'stats_player_post_{season}.csv'],
    seasonal: true,
    license: 'CC-BY 4.0',
    docs: 'https://nflreadr.nflverse.com/reference/load_player_stats.html',
  },
  {
    key: 'teamStats',
    label: 'Estatísticas de times por temporada',
    tag: 'stats_team',
    assets: ['stats_team_reg_{season}.csv', 'stats_team_post_{season}.csv'],
    seasonal: true,
    license: 'CC-BY 4.0',
    docs: 'https://nflreadr.nflverse.com/reference/load_team_stats.html',
  },
  {
    key: 'draft',
    label: 'Draft (1980–hoje)',
    tag: 'draft_picks',
    assets: ['draft_picks.csv'],
    seasonal: false,
    license: 'CC-BY 4.0 (derivado de Pro Football Reference via nflverse)',
    docs: 'https://nflreadr.nflverse.com/reference/load_draft_picks.html',
  },
];

export const assetName = (template: string, season?: number) =>
  season === undefined ? template : template.replace('{season}', String(season));
