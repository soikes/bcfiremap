import { SERVER_COLLECTORS } from './collectors/server';
import index from './index.html';
import { apiRoutes } from './server/api';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port: PORT,
  routes: { '/': index, ...apiRoutes(SERVER_COLLECTORS) },
  development: { hmr: true, console: true },
});

logger.log(`[dev] listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
