import index from './index.html';
import { SERVER_COLLECTORS } from './collectors/server';
import { createBanStore } from './server/banStore';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT ?? 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MAX_REQUEST_BODY_BYTES = 1024;

const store = createBanStore(SERVER_COLLECTORS);
store.start();

const server = Bun.serve({
  port: PORT,
  maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
  routes: {
    '/': index,
    '/api/bans': { GET: () => Response.json(store.snapshot()) },
  },
  development: !IS_PRODUCTION && { hmr: true, console: true },
});

logger.log(`[server] listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
