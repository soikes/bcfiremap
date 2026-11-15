import { SERVER_COLLECTORS } from '../collectors/constants/server';
import { API_PORT } from '../constants/server';
import { logger } from '../utils/logger';
import { apiRoutes } from './api';

const HOSTNAME = '127.0.0.1';
const MAX_REQUEST_BODY_BYTES = 1024;

const routes = apiRoutes(SERVER_COLLECTORS);

const server = Bun.serve({
  hostname: HOSTNAME,
  port: API_PORT,
  maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
  routes,
});

logger.log(`[server] API listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
