import { SERVER_COLLECTORS } from '../collectors/constants/server';
import { DEV_PORT } from '../constants/server';
import { logger } from '../utils/logger';
import index from '../web/index.html';
import { apiRoutes } from './api';

const FONTS_DIR = `${import.meta.dir}/../assets/fonts`;

/** Serves each file in assets/fonts at /fonts/<name>, the path the page's CSS loads them from. */
const fontRoutes = () =>
  Object.fromEntries(
    [...new Bun.Glob('*').scanSync(FONTS_DIR)].map(name => [
      `/fonts/${name}`,
      () => new Response(Bun.file(`${FONTS_DIR}/${name}`)),
    ]),
  );

const routes = await apiRoutes(SERVER_COLLECTORS);

const server = Bun.serve({
  port: DEV_PORT,
  routes: { '/': index, ...fontRoutes(), ...routes },
  development: { hmr: true, console: true },
});

logger.log(`[dev] listening on ${server.url}`, 'server collectors:', SERVER_COLLECTORS.map(collector => collector.id));
