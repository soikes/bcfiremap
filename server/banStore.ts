import { Collector } from '../collectors/types';
import { BansResponse, LoadStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { logger } from '../utils/logger';

interface Entry {
  bans: FireBan[];
  status: LoadStatus;
  hasData: boolean;
  updatedAt: number;
}

interface Options {
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
}

const EMPTY: Entry = { bans: [], status: 'pending', hasData: false, updatedAt: 0 };

/** Delay before retry number `attempt` (from 0), doubling from 1 s up to 30 s. */
const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 30000);

/** Runs `task`, retrying up to `retries` more times with a delay before each retry. */
async function withRetry<T>(
  task: () => Promise<T>,
  retries: number,
  delayMs: (attempt: number) => number,
  attempt = 0,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (attempt >= retries) throw error;
    logger.log('[banStore] retrying after error', error);
    await Bun.sleep(delayMs(attempt));
    return withRetry(task, retries, delayMs, attempt + 1);
  }
}

/** Holds the latest bans from each collector and refreshes them on a schedule, keeping the last good data when a refresh fails. */
export function createBanStore(collectors: Collector[], { retries = 3, retryDelayMs = backoff }: Options = {}) {
  const entries = new Map<string, Entry>(collectors.map(collector => [collector.id, EMPTY]));

  /** Runs one collector and records its bans, or marks it failed while keeping its previous bans. */
  async function refresh(collector: Collector): Promise<void> {
    try {
      const bans = await withRetry(() => collector.collect(), retries, retryDelayMs);
      entries.set(collector.id, { bans, status: 'success', hasData: true, updatedAt: Date.now() });
      logger.log(`[banStore] ${collector.id} refreshed`, bans.length, 'bans');
    } catch (error) {
      entries.set(collector.id, { ...(entries.get(collector.id) ?? EMPTY), status: 'error' });
      logger.error(`[banStore] ${collector.id} refresh failed`, error);
    }
  }

  /** Refreshes a collector now, then again `refetchIntervalMs` after each run finishes. */
  function schedule(collector: Collector) {
    const run = async () => {
      await refresh(collector);
      setTimeout(run, collector.refetchIntervalMs);
    };
    void run();
  }

  /** Starts the refresh loop of every collector. */
  const start = () => collectors.forEach(schedule);

  /** Returns the bans of every collector merged, plus the status of each source. */
  function snapshot(): BansResponse {
    const states = collectors.map(collector => ({ collector, entry: entries.get(collector.id) ?? EMPTY }));
    return {
      bans: states.flatMap(({ entry }) => entry.bans),
      sources: states.map(({ collector, entry }) => ({
        id: collector.id,
        name: collector.name,
        coverage: collector.coverage,
        attribution: collector.attribution,
        status: entry.status,
        hasData: entry.hasData,
        updatedAt: entry.updatedAt,
      })),
    };
  }

  return { refresh, start, snapshot };
}
