import { SERVER_COLLECTORS } from './collectors/server';
import { apiRoutes } from './server/api';
import { logger } from './utils/logger';

const HOSTNAME = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 3000);
const MAX_REQUEST_BODY_BYTES = 1024;

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
  routes: apiRoutes(SERVER_COLLECTORS),
});

logger.log(`[server] API listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
