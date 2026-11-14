/** Port the Bun server listens on, in dev and behind nginx in production. */
export const API_PORT = Number(process.env.PORT ?? 3000);

/** Port the hot-reload dev server listens on, the same as the Docker dev setup's. */
export const DEV_PORT = Number(process.env.PORT ?? 8080);
