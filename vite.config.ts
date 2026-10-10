import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const API_PORT = Number(process.env.API_PORT ?? 8787);
const DATA_DIR = path.resolve(__dirname, 'data');

/** Em desenvolvimento, serve /data/* direto da pasta data/ (gerada pelo pipeline), sem depender da API. */
function serveData(): Plugin {
  return {
    name: 'eza-serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const file = path.join(DATA_DIR, rel);
        if (!file.startsWith(DATA_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveData()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/health': `http://localhost:${API_PORT}`,
      '/ready': `http://localhost:${API_PORT}`,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/api/**/*.test.ts', 'tests/data/**/*.test.ts'],
  },
});
