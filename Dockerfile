FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

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
# Carga completa na primeira execução se não houver dados no volume.
CMD ["sh", "-c", "[ -f data/manifest.json ] || npx tsx server/etl/cli.ts full; npx tsx server/index.ts"]
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/health || exit 1
