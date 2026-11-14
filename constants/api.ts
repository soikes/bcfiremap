/** Path of the server endpoint that returns the server collectors' bans and source statuses. */
export const BANS_API_PATH = '/api/bans';

/** Every load status a source can report. */
export const LOAD_STATUSES = ['pending', 'success', 'error'] as const;
