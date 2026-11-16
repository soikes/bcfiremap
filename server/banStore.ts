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
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Delay before retry number `attempt` (from 0), doubling from 1 s up to 30 s. */
const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 30000);

/** Runs `task`, retrying up to `retries` more times with a delay before each retry. */
async function withRetry<T>(task: () => Promise<T>, retries: number, delayMs: (attempt: number) => number, attempt = 0): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (attempt >= retries) throw error;
    logger.log('[banStore] retrying after error', error);
    await Bun.sleep(delayMs(attempt));
    return withRetry(task, retries, delayMs, attempt + 1);
  }
}

/** Holds each source's bans in memory: loads them on start and again on each collector's refetch interval, tries a failed source again within 10 minutes, and keeps the last good bans when a refresh fails. */
export function createBanStore(
  collectors: Collector[],
  { retries = 3, retryDelayMs = backoff }: Options = {},
) {
  const sources: Record<string, StoredSource> = {};
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  /** Runs one collector with retries and stores its bans, returning whether it worked; on failure keeps the last good bans, or marks it failed if it never loaded. */
  async function load(collector: Collector): Promise<boolean> {
    try {
      const bans = validBans(await withRetry(() => collector.collect(), retries, retryDelayMs), collector.id);
      sources[collector.id] = { bans, status: 'success', updatedAt: Date.now() };
      logger.log(`[banStore] ${collector.id} loaded`, bans.length, 'bans');
      return true;
    } catch (error) {
      if (sources[collector.id]?.status !== 'success') sources[collector.id] = { bans: [], status: 'error', updatedAt: 0 };
      logger.error(`[banStore] ${collector.id} failed to load`, error);
      return false;
    }
  }

  /** How long to wait before loading the collector again: its refetch interval after a success, at most 10 minutes after a failure, or never. */
  function nextLoadIn(collector: Collector, succeeded: boolean): number | null {
    const every = collector.refetchIntervalMs;
    if (succeeded) return every ?? null;
    return Math.min(every ?? FAILED_RETRY_MS, FAILED_RETRY_MS);
  }

  /** Loads the collector now, then again on its schedule until stopped; resolves after the first try. */
  async function run(collector: Collector): Promise<void> {
    if (stopped) return;
    const succeeded = await load(collector);
    if (stopped) return;
    const wait = nextLoadIn(collector, succeeded);
    if (wait === null) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      void run(collector);
    }, Math.min(wait, MAX_TIMEOUT_MS));
    timers.add(timer);
    logger.log(`[banStore] ${collector.id} next load in`, Math.round(wait / 1000), 's');
  }

  /** Starts loading every collector; resolves once each has had its first try. */
  function start(): Promise<void> {
    return Promise.all(collectors.map(run)).then(() => undefined);
  }

  /** Cancels every load still waiting. */
  function stop() {
    stopped = true;
    timers.forEach(clearTimeout);
  }

  /** Returns the bans of every collector in collector order, plus the status of each source. */
  function snapshot(): BansResponse {
    return {
      bans: collectors.flatMap(c => sources[c.id]?.bans ?? []),
      sources: collectors.map(c => ({
        id: c.id,
        name: c.name,
        coverage: c.coverage,
        attribution: c.attribution,
        status: sources[c.id]?.status ?? 'pending',
        updatedAt: sources[c.id]?.updatedAt ?? 0,
      })),
    };
  }

  return { load, start, stop, snapshot };
}
