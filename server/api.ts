import { Collector } from '../collectors/types';
import { createBanStore } from './banStore';

/** Starts the given collectors' schedules and returns the API routes that serve their bans. */
export function apiRoutes(collectors: Collector[]) {
  const store = createBanStore(collectors);
  store.start();
  return {
    '/api/bans': { GET: () => Response.json(store.snapshot()) },
  };
}
