import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BansResponse, LoadStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { validBans } from '../utils/bans';
import { logger } from '../utils/logger';

/** What is kept on disk for one source. */
interface StoredSource {
  bans: FireBan[];
  status: LoadStatus;
  updatedAt: number;
  attemptedAt: number;
}

interface DbData {
  sources: Record<string, StoredSource>;
}

interface Options {
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
  dbPath?: string;
  forceFetch?: boolean;
}

const DEFAULT_DB_PATH = 'data/bans.json';
const FAILED_RETRY_MS = 10 * 60 * 1000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

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

/** Opens the JSON file, starting empty when it is missing, empty, corrupt or in an older shape. */
async function loadDb(path: string): Promise<Low<DbData>> {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Low<DbData>(new JSONFile<DbData>(path), { sources: {} });
  try {
    await db.read();
  } catch (error) {
    logger.error('[banStore] ignoring unreadable cache file', path, error);
  }
  if (typeof db.data?.sources !== 'object' || db.data.sources === null) db.data = { sources: {} };
  return db;
}

/** Milliseconds until a source is due again, 0 if it is due now. */
function msUntilDue(stored: StoredSource | undefined, intervalMs: number, now: number): number {
  if (!stored || stored.attemptedAt <= 0) return 0;
  const every = stored.status === 'success' ? intervalMs : Math.min(intervalMs, FAILED_RETRY_MS);
  return Math.max(0, stored.attemptedAt + every - now);
}

/** Holds each source's bans on disk and refreshes them on their own schedules, keeping the last good bans when a refresh fails. */
export async function createBanStore(
  collectors: Collector[],
  { retries = 3, retryDelayMs = backoff, dbPath, forceFetch = process.env.FORCE_FETCH === 'true' }: Options = {},
) {
  const db = await loadDb(dbPath ?? process.env.BANS_DB_PATH ?? DEFAULT_DB_PATH);
  const sources = db.data.sources;
  const live = new Map<string, { fetching: boolean; retrying: boolean }>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  /** Drops stored bans that fail validation, so an old or edited file can't put bad bans on the map. */
  for (const collector of collectors) {
    const stored = sources[collector.id];
    if (!stored) continue;
    try {
      stored.bans = validBans(stored.bans, collector.id);
    } catch {
      delete sources[collector.id];
    }
  }
  logger.log('[banStore] loaded from disk', Object.fromEntries(Object.entries(sources).map(([id, s]) => [id, s.bans.length])));

  /** Runs one collector with retries and stores its bans, or marks it failed while keeping its previous bans. */
  async function refresh(collector: Collector): Promise<void> {
    const setLive = (changes: Partial<{ fetching: boolean; retrying: boolean }>) =>
      live.set(collector.id, { fetching: false, retrying: false, ...live.get(collector.id), ...changes });
    setLive({ fetching: true, retrying: false });
    const now = Date.now();
    const previous = sources[collector.id];
    try {
      const bans = validBans(await withRetry(() => collector.collect(), retries, retryDelayMs, () => setLive({ retrying: true })), collector.id);
      sources[collector.id] = { bans, status: 'success', updatedAt: now, attemptedAt: now };
      logger.log(`[banStore] ${collector.id} refreshed`, bans.length, 'bans');
    } catch (error) {
      sources[collector.id] = { bans: previous?.bans ?? [], status: 'error', updatedAt: previous?.updatedAt ?? 0, attemptedAt: now };
      logger.error(`[banStore] ${collector.id} refresh failed`, error);
    }
    setLive({ fetching: false, retrying: false });
    try {
      await db.write();
    } catch (error) {
      logger.error('[banStore] could not write the cache file', error);
    }
  }

  /** Waits until the collector is due (re-arming in chunks, since timers cap at about 24 days), refreshes it, and repeats. */
  function schedule(collector: Collector) {
    const arm = () => {
      if (stopped) return;
      const wait = msUntilDue(sources[collector.id], collector.refetchIntervalMs, Date.now());
      const timer = setTimeout(async () => {
        timers.delete(timer);
        if (msUntilDue(sources[collector.id], collector.refetchIntervalMs, Date.now()) > 0) return arm();
        await refresh(collector);
        arm();
      }, Math.min(wait, MAX_TIMEOUT_MS));
      timers.add(timer);
      logger.log(`[banStore] ${collector.id} next refresh in`, Math.round(wait / 1000), 's');
    };
    arm();
  }

  /** Starts every collector's schedule, fetching only the sources that are due (all of them with FORCE_FETCH); returns a function that stops it. */
  function start(): () => void {
    if (forceFetch) collectors.forEach(c => delete sources[c.id]);
    collectors.forEach(schedule);
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
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

  return { refresh, start, snapshot };
}
