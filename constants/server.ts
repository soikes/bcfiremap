/** Port the Bun server listens on, in dev and behind nginx in production. */
export const API_PORT = Number(process.env.PORT ?? 3000);
