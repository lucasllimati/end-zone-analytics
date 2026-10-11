/** Especificação OpenAPI 3.1 da API (servida em /api/openapi.json). Mantenha em sincronia com server/app.ts. */
const season = { name: 'season', in: 'query', schema: { type: 'integer', minimum: 1920 }, description: 'Temporada (ano de início). Padrão: temporada atual.' };
const err = (d: string) => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const ok = (d: string, ref?: string) => ({
  description: d,
  content: { 'application/json': { schema: ref ? { $ref: `#/components/schemas/${ref}` } : { type: 'object' } } },
});

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'End Zone Analytics API',
    version: '1.0.0',
    description:
      'API pública somente leitura com dados da NFL (nflverse, 1999+) e curadoria histórica. Valores ausentes são `null` — nunca 0. Endpoints de /api/admin exigem acesso local ou ADMIN_TOKEN.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': { get: { summary: 'Liveness', tags: ['Observabilidade'], responses: { 200: ok('Processo vivo') } } },
    '/ready': { get: { summary: 'Readiness (dados carregados)', tags: ['Observabilidade'], responses: { 200: ok('Pronto'), 503: err('Sem dados') } } },
    '/api/meta': { get: { summary: 'Manifest: cobertura, fontes, versões e qualidade', tags: ['Meta'], responses: { 200: ok('Manifest', 'Manifest'), 503: err('Sem dados') } } },
    '/api/quality': { get: { summary: 'Relatório de qualidade de dados', tags: ['Meta'], responses: { 200: ok('Verificações') } } },
    '/api/changes': { get: { summary: 'Histórico de ingestões (versionamento)', tags: ['Meta'], responses: { 200: ok('Lista de ingestões') } } },
    '/api/teams': { get: { summary: 'As 32 franquias ativas', tags: ['Times'], responses: { 200: ok('Times') } } },
    '/api/teams/{abbr}': {
      get: {
        summary: 'Perfil de um time: dados, temporadas e Super Bowls',
        tags: ['Times'],
        parameters: [{ name: 'abbr', in: 'path', required: true, schema: { type: 'string', example: 'KC' } }],
        responses: { 200: ok('Time'), 404: err('Time não encontrado') },
      },
    },
    '/api/games': {
      get: {
        summary: 'Jogos com filtros',
        tags: ['Jogos'],
        parameters: [
          season,
          { name: 'week', in: 'query', schema: { type: 'integer' } },
          { name: 'team', in: 'query', schema: { type: 'string', example: 'GB' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['REG', 'WC', 'DIV', 'CON', 'SB', 'POST'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 500, maximum: 5000 } },
        ],
        responses: { 200: ok('Lista de jogos'), 400: err('Parâmetros inválidos') },
      },
    },
    '/api/games/{id}': {
      get: { summary: 'Um jogo pelo ID nflverse (ex.: 2025_22_SEA_NE)', tags: ['Jogos'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Jogo'), 404: err('Não encontrado') } },
    },
    '/api/standings': { get: { summary: 'Classificação (temporada regular)', tags: ['Jogos'], parameters: [season], responses: { 200: ok('Classificação'), 404: err('Temporada inexistente') } } },
    '/api/players': {
      get: {
        summary: 'Busca de jogadores',
        tags: ['Jogadores'],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', example: 'mahomes' } },
          { name: 'pos', in: 'query', schema: { type: 'string', example: 'QB' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: { 200: ok('Resultados') },
      },
    },
    '/api/players/{id}': {
      get: { summary: 'Carreira de um jogador (bio, temporadas, semelhantes)', tags: ['Jogadores'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: '00-0033873' } }], responses: { 200: ok('Carreira'), 404: err('Não encontrado') } },
    },
    '/api/stats/leaders': {
      get: {
        summary: 'Líderes de uma estatística',
        tags: ['Estatísticas'],
        parameters: [
          season,
          { name: 'stat', in: 'query', schema: { type: 'string', default: 'passYds' }, description: 'Qualquer campo de PlayerSeasonLine (passYds, rushYds, recYds, sacks…)' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['REG', 'POST'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: ok('Ranking'), 400: err('Estatística inválida') },
      },
    },
    '/api/super-bowls': { get: { summary: 'Todos os Super Bowls (I–LX)', tags: ['História'], responses: { 200: ok('Lista') } } },
    '/api/super-bowls/{n}': { get: { summary: 'Um Super Bowl pelo número', tags: ['História'], parameters: [{ name: 'n', in: 'path', required: true, schema: { type: 'integer', example: 51 } }], responses: { 200: ok('Super Bowl'), 404: err('Não encontrado') } } },
    '/api/records': { get: { summary: 'Recordes oficiais (curadoria) e calculados (1999+)', tags: ['História'], responses: { 200: ok('Recordes') } } },
    '/api/draft': { get: { summary: 'Escolhas do draft', tags: ['História'], parameters: [{ name: 'season', in: 'query', schema: { type: 'integer' } }], responses: { 200: ok('Escolhas') } } },
    '/api/rankings/qb': {
      get: {
        summary: 'Ranking de QBs com pesos configuráveis (modelo EZA-QB v1)',
        tags: ['Modelos'],
        parameters: ['championships', 'playoffs', 'production', 'efficiency', 'longevity', 'era', 'honors'].map((k) => ({ name: k, in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } })),
        responses: { 200: ok('Ranking com componentes') },
      },
    },
    '/api/live/scoreboard': { get: { summary: 'Placar ao vivo da semana (fonte: ESPN, cache 30 s)', tags: ['Ao vivo'], responses: { 200: ok('Jogos'), 502: err('Fonte indisponível') } } },
    '/api/live/game/{espnId}': { get: { summary: 'Detalhes do jogo: quartos, drives, pontuações, probabilidade de vitória', tags: ['Ao vivo'], parameters: [{ name: 'espnId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Detalhes'), 502: err('Fonte indisponível') } } },
    '/api/admin/check': { get: { summary: 'Verifica se há dados novos nas fontes', tags: ['Admin'], parameters: [{ name: 'force', in: 'query', schema: { type: 'string', enum: ['1'] } }], responses: { 200: ok('Resultado da verificação') } } },
    '/api/admin/sync': {
      post: {
        summary: 'Dispara carga completa ou parcial',
        tags: ['Admin'],
        security: [{ bearer: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mode: { type: 'string', enum: ['full', 'partial'] },
                  datasets: { type: 'array', items: { type: 'string', enum: ['teams', 'games', 'players', 'playerStats', 'teamStats', 'draft'] } },
                  seasons: { type: 'array', items: { type: 'integer' } },
                },
              },
              example: { mode: 'partial', datasets: ['games', 'playerStats'], seasons: [2026] },
            },
          },
        },
        responses: { 202: ok('Job iniciado'), 401: err('Não autorizado'), 409: ok('Já existe um job em execução') },
      },
    },
    '/api/admin/session': { get: { summary: 'Estado da sessão administrativa (sem segredos)', tags: ['Admin'], responses: { 200: ok('Sessão') } } },
    '/api/admin/login': {
      post: {
        summary: 'Login com ADMIN_TOKEN; cria sessão em cookie HttpOnly (8 h)',
        tags: ['Admin'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } } },
        responses: { 200: ok('Autenticado'), 401: err('Token inválido'), 503: err('ADMIN_TOKEN não configurado') },
      },
    },
    '/api/admin/logout': { post: { summary: 'Encerra a sessão', tags: ['Admin'], responses: { 200: ok('Sessão encerrada') } } },
    '/api/admin/overview': { get: { summary: 'Saúde, arquivos publicados, última publicação e última tentativa', tags: ['Admin'], security: [{ bearer: [] }], responses: { 200: ok('Painel'), 401: err('Não autorizado') } } },
    '/api/admin/events': {
      get: {
        summary: 'Logs e alertas operacionais',
        tags: ['Admin'],
        security: [{ bearer: [] }],
        parameters: [
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] } },
          { name: 'component', in: 'query', schema: { type: 'string', enum: ['pipeline', 'sources', 'quality', 'auth', 'api'] } },
          { name: 'jobId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 } },
        ],
        responses: { 200: ok('Eventos'), 400: err('Parâmetro inválido'), 401: err('Não autorizado') },
      },
    },
    '/api/admin/jobs/{id}': { get: { summary: 'Status e log de um job de sincronização', tags: ['Admin'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Job'), 404: err('Não encontrado') } } },
  },
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } }, required: ['error'] },
      Manifest: {
        type: 'object',
        properties: {
          generatedAt: { type: 'string', format: 'date-time' },
          ingestionVersion: { type: 'integer' },
          coverage: { type: 'object' },
          datasets: { type: 'object' },
          quality: { type: 'object' },
        },
      },
    },
  },
} as const;
