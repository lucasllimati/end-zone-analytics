import { buildApp } from './app';
import { config } from './config';

const app = await buildApp();

const shutdown = async (signal: string) => {
  app.log.info(`${signal} recebido, encerrando…`);
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (e) {
  app.log.error(e);
  process.exit(1);
}
