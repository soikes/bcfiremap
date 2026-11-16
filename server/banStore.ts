import { BansResponse, LoadStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { validBans } from '../utils/bans';
import { logger } from '../utils/logger';

/** What is kept in memory for one source. */
interface StoredSource {
  bans: FireBan[];
  status: LoadStatus;
  updatedAt: number;
}

interface Options {
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
}

const FAILED_RETRY_MS = 10 * 60 * 1000;

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

/** Holds each source's bans in memory: loads them once on start, and tries a failed source again every 10 minutes until it loads. */
export function createBanStore(
  collectors: Collector[],
  { retries = 3, retryDelayMs = backoff }: Options = {},
) {
  const sources: Record<string, StoredSource> = {};
  const live = new Map<string, { fetching: boolean; retrying: boolean }>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  /** Runs one collector with retries and stores its bans, or marks it failed. */
  async function load(collector: Collector): Promise<void> {
    const setLive = (changes: Partial<{ fetching: boolean; retrying: boolean }>) =>
      live.set(collector.id, { fetching: false, retrying: false, ...live.get(collector.id), ...changes });
    setLive({ fetching: true, retrying: false });
    try {
      const bans = validBans(await withRetry(() => collector.collect(), retries, retryDelayMs, () => setLive({ retrying: true })), collector.id);
      sources[collector.id] = { bans, status: 'success', updatedAt: Date.now() };
      logger.log(`[banStore] ${collector.id} loaded`, bans.length, 'bans');
    } catch (error) {
      sources[collector.id] = { bans: [], status: 'error', updatedAt: 0 };
      logger.error(`[banStore] ${collector.id} failed to load`, error);
    }
    setLive({ fetching: false, retrying: false });
  }

  /** Loads the collector, then tries again every 10 minutes while it keeps failing, until stopped; resolves after the first try. */
  async function run(collector: Collector): Promise<void> {
    if (stopped) return;
    await load(collector);
    if (stopped || sources[collector.id].status === 'success') return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      void run(collector);
    }, FAILED_RETRY_MS);
    timers.add(timer);
    logger.log(`[banStore] ${collector.id} trying again in`, FAILED_RETRY_MS / 1000, 's');
  }

  /** Starts loading every collector; resolves once each has had its first try. */
  function start(): Promise<void> {
    return Promise.all(collectors.map(run)).then(() => undefined);
  }

  /** Cancels any retries still waiting. */
  function stop() {
    stopped = true;
    timers.forEach(clearTimeout);
  }

  /** Returns the bans of every collector in collector order, plus the status of each source. */
  function snapshot(): BansResponse {
    return {
      bans: collectors.flatMap(c => sources[c.id]?.bans ?? []),
      sources: collectors.map(c => {
        const stored = sources[c.id];
        return {
          id: c.id,
          name: c.name,
          coverage: c.coverage,
          attribution: c.attribution,
          status: stored?.status ?? 'pending',
          hasData: (stored?.updatedAt ?? 0) > 0,
          fetching: live.get(c.id)?.fetching ?? false,
          retrying: live.get(c.id)?.retrying ?? false,
          updatedAt: stored?.updatedAt ?? 0,
        };
      }),
    };
  }

  return { load, start, stop, snapshot };
}
