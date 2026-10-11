# --- Build do frontend (precisa das dependências de desenvolvimento) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Imagem final: só o necessário para rodar API + site, como usuário sem privilégios ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 API_PORT=8787
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/lib ./src/lib
COPY data-curated ./data-curated
COPY public ./public
# Diretórios gravados em tempo de execução (volumes): dados publicados, cache das fontes e log operacional.
RUN mkdir -p data data-raw ops && chown -R node:node data data-raw ops
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
# Carga completa na primeira execução (volume vazio); depois o agendador interno mantém os dados atualizados.
CMD ["sh", "-c", "[ -f data/manifest.json ] || node_modules/.bin/tsx server/etl/cli.ts full; exec node_modules/.bin/tsx server/index.ts"]
