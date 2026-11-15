import { BANS_API_PATH } from '../constants/api';
import { Collector } from '../types/collector';
import { createBanStore } from './banStore';

/** Starts the given collectors' schedules and returns the API routes that serve their bans. */
export function apiRoutes(collectors: Collector[]) {
  const store = createBanStore(collectors);
  store.start();
  return {
    [BANS_API_PATH]: { GET: () => Response.json(store.snapshot()) },
  };
}
