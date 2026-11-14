import { SERVER_COLLECTORS } from '../collectors/server';
import { API_PORT } from '../constants/server';
import { logger } from '../utils/logger';
import index from '../web/index.html';
import { apiRoutes } from './api';

const server = Bun.serve({
  port: API_PORT,
  routes: { '/': index, ...apiRoutes(SERVER_COLLECTORS) },
  development: { hmr: true, console: true },
});

logger.log(`[dev] listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
