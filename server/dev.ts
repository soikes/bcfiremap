import { SERVER_COLLECTORS } from '../collectors/server';
import { logger } from '../utils/logger';
import index from '../web/index.html';
import { apiRoutes } from './api';

const PORT = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port: PORT,
  routes: { '/': index, ...apiRoutes(SERVER_COLLECTORS) },
  development: { hmr: true, console: true },
});

logger.log(`[dev] listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
