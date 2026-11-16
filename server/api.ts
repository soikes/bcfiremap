import { BANS_API_PATH } from '../constants/api';
import { Collector } from '../types/collector';
import { createBanStore } from './banStore';

/** Starts loading the given collectors and returns the API routes that serve their bans, answering once every source has had its first try. */
export function apiRoutes(collectors: Collector[]) {
  const store = createBanStore(collectors);
  const ready = store.start();
  return {
    [BANS_API_PATH]: {
      GET: async () => {
        await ready;
        return Response.json(store.snapshot());
      },
    },
  };
}
