/** Logs a message and any extra values to the console. */
const log = (message: string, ...args: unknown[]) => console.log(message, ...args);

/** Logs an error message and any extra values to the console. */
const error = (message: string, ...args: unknown[]) => console.error(message, ...args);

export const logger = { log, error };
