import { BansResponse, LoadStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { validBans } from '../utils/bans';
import { logger } from '../utils/logger';

interface Entry {
  bans: FireBan[];
  status: LoadStatus;
  hasData: boolean;
  retrying: boolean;
  updatedAt: number;
}

interface Options {
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
}

const EMPTY: Entry = { bans: [], status: 'pending', hasData: false, retrying: false, updatedAt: 0 };

/** Delay before retry number `attempt` (from 0), doubling from 1 s up to 30 s. */
const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 30000);

/** Runs `task`, retrying up to `retries` more times with a delay before each retry, and calling `onRetry` when one starts. */
async function withRetry<T>(
  task: () => Promise<T>,
  retries: number,
  delayMs: (attempt: number) => number,
  onRetry: () => void,
  attempt = 0,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (attempt >= retries) throw error;
    logger.log('[banStore] retrying after error', error);
    onRetry();
    await Bun.sleep(delayMs(attempt));
    return withRetry(task, retries, delayMs, onRetry, attempt + 1);
  }
}

/** Holds the latest bans from each collector and refreshes them on a schedule, keeping the last good data when a refresh fails. */
export function createBanStore(collectors: Collector[], { retries = 3, retryDelayMs = backoff }: Options = {}) {
  const entries = new Map<string, Entry>(collectors.map(collector => [collector.id, EMPTY]));

  /** Changes some fields of a collector's entry, keeping the rest. */
  const update = (id: string, changes: Partial<Entry>) => entries.set(id, { ...(entries.get(id) ?? EMPTY), ...changes });

  /** Runs one collector and records its bans, or marks it failed while keeping its previous bans; flags it as retrying between attempts. */
  async function refresh(collector: Collector): Promise<void> {
    const markRetrying = () => update(collector.id, { retrying: true });
    try {
      const bans = validBans(await withRetry(() => collector.collect(), retries, retryDelayMs, markRetrying), collector.id);
      entries.set(collector.id, { bans, status: 'success', hasData: true, retrying: false, updatedAt: Date.now() });
      logger.log(`[banStore] ${collector.id} refreshed`, bans.length, 'bans');
    } catch (error) {
      update(collector.id, { status: 'error', retrying: false });
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
        retrying: entry.retrying,
        updatedAt: entry.updatedAt,
      })),
    };
  }

  return { refresh, start, snapshot };
}
