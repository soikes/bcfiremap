import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';
import { makeBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { createBanStore } from './banStore';

const collector = (id: string, collect: () => Promise<FireBan[]>, refetchIntervalMs = 60000): Collector => ({
  id,
  name: `Source ${id}`,
  coverage: `Coverage ${id}`,
  attribution: '',
  refetchIntervalMs,
  collect: async () => (await collect()).map(b => ({ ...b, source: id })),
});

const noRetries = { retries: 0 };

describe('createBanStore', () => {
  it('reports every source as pending before its first refresh', async () => {
    const store = createBanStore([collector('a', async () => [])], noRetries);
    expect(store.snapshot()).toEqual({
      bans: [],
      sources: [
        { id: 'a', name: 'Source a', coverage: 'Coverage a', attribution: '', status: 'pending', hasData: false, fetching: false, retrying: false, updatedAt: 0 },
      ],
    });
  });

  it('merges the bans from every collector in collector order', async () => {
    const a = collector('a', async () => [makeBan({ id: 'a1' })]);
    const b = collector('b', async () => [makeBan({ id: 'b1' }), makeBan({ id: 'b2' })]);
    const store = createBanStore([a, b], noRetries);

    await Promise.all([a, b].map(store.refresh));

    const { bans, sources } = store.snapshot();
    expect(bans.map(ban => ban.id)).toEqual(['a1', 'b1', 'b2']);
    expect(sources.map(source => source.status)).toEqual(['success', 'success']);
    expect(sources.every(source => source.hasData && source.updatedAt > 0)).toBe(true);
  });

  it('reports a failing source and still returns the others', async () => {
    const good = collector('good', async () => [makeBan({ id: 'g1' })]);
    const bad = collector('bad', async () => {
      throw new Error('down');
    });
    const store = createBanStore([good, bad], noRetries);

    await Promise.all([good, bad].map(store.refresh));

    const { bans, sources } = store.snapshot();
    expect(bans.map(ban => ban.id)).toEqual(['g1']);
    expect(sources[1]).toMatchObject({ id: 'bad', status: 'error', hasData: false });
  });

  it('keeps the last good bans and their time when a later refresh fails', async () => {
    let fail = false;
    const flaky = collector('flaky', async () => {
      if (fail) throw new Error('down');
      return [makeBan({ id: 'f1' })];
    });
    const store = createBanStore([flaky], noRetries);

    await store.refresh(flaky);
    const goodTime = store.snapshot().sources[0].updatedAt;
    fail = true;
    await store.refresh(flaky);

    const { bans, sources } = store.snapshot();
    expect(bans.map(ban => ban.id)).toEqual(['f1']);
    expect(sources[0]).toMatchObject({ status: 'error', hasData: true, updatedAt: goodTime });
  });

  it('drops bans an upstream source no longer lists', async () => {
    let ids = ['x1', 'x2'];
    const shrinking = collector('shrinking', async () => ids.map(id => makeBan({ id })));
    const store = createBanStore([shrinking], noRetries);

    await store.refresh(shrinking);
    ids = ['x1'];
    await store.refresh(shrinking);

    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['x1']);
  });

  it('marks a collector that returns something other than a list as failed', async () => {
    const broken = collector('broken', async () => ({ features: [] }) as unknown as FireBan[]);
    const store = createBanStore([broken], noRetries);

    await store.refresh(broken);

    expect(store.snapshot()).toMatchObject({ bans: [], sources: [{ id: 'broken', status: 'error', hasData: false }] });
  });

  it('drops malformed bans from a collector and keeps its valid ones', async () => {
    const messy = collector('messy', async () => [makeBan({ id: 'ok' }), { id: 'bad' } as unknown as FireBan]);
    const store = createBanStore([messy], noRetries);

    await store.refresh(messy);

    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['ok']);
  });

  it('flags a source as retrying between attempts and fetching while it runs', async () => {
    let calls = 0;
    const seen: { fetching: boolean; retrying: boolean }[] = [];
    let store: ReturnType<typeof createBanStore>;
    const slow = collector('slow', async () => {
      seen.push(store.snapshot().sources[0]);
      if (++calls === 1) throw new Error('once');
      return [makeBan({ id: 's1' })];
    });
    store = createBanStore([slow], { retries: 1, retryDelayMs: () => 0 });

    await store.refresh(slow);

    expect(seen.map(s => [s.fetching, s.retrying])).toEqual([[true, false], [true, true]]);
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'success', fetching: false, retrying: false });
  });
});

describe('createBanStore schedule', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    mock.restore();
    jest.useRealTimers();
  });

  /** Lets the promises a refresh is waiting on settle, without moving the clock. */
  const settle = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  /** Moves the fake clock forward, then lets the refresh that fires settle. */
  const advance = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await settle();
  };

  it('fetches every collector once on start', async () => {
    const calls: string[] = [];
    const make = (id: string) => collector(id, async () => (calls.push(id), [makeBan({ id: `${id}1` })]), 60 * 60 * 1000);
    const store = createBanStore([make('a'), make('b')], noRetries);

    const stop = store.start();
    await settle();
    stop();

    expect(calls.sort()).toEqual(['a', 'b']);
    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['a1', 'b1']);
  });

  it('fetches again after the refetch interval, and not before', async () => {
    let calls = 0;
    const store = createBanStore([collector('a', async () => (calls++, []), 30)], noRetries);

    const stop = store.start();
    await settle();
    expect(calls).toBe(1);

    await advance(29);
    expect(calls).toBe(1);
    await advance(1);
    expect(calls).toBe(2);
    await advance(30);
    expect(calls).toBe(3);
    stop();
  });

  it('stops fetching after the returned stop function is called', async () => {
    let calls = 0;
    const store = createBanStore([collector('a', async () => (calls++, []), 20)], noRetries);

    const stop = store.start();
    await settle();
    stop();
    await advance(1000);

    expect(calls).toBe(1);
  });

  it('retries a source that keeps failing within ten minutes, however long its refetch interval is', async () => {
    let calls = 0;
    const failing = collector('a', async () => {
      calls++;
      throw new Error('down');
    }, 7 * 24 * 60 * 60 * 1000);
    const store = createBanStore([failing], noRetries);

    const stop = store.start();
    await settle();
    expect(calls).toBe(1);

    await advance(10 * 60 * 1000 - 1);
    expect(calls).toBe(1);
    await advance(1);
    expect(calls).toBe(2);
    stop();
  });

  it('waits out the refetch interval after a success', async () => {
    let calls = 0;
    const weekly = 7 * 24 * 60 * 60 * 1000;
    const store = createBanStore([collector('a', async () => (calls++, []), weekly)], noRetries);

    const stop = store.start();
    await settle();
    await advance(weekly - 1);
    expect(calls).toBe(1);
    await advance(1);
    expect(calls).toBe(2);
    stop();
  });

  it('does not refetch in a loop when the refetch interval exceeds the timer limit', async () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const timers = spyOn(globalThis, 'setTimeout');
    const store = createBanStore([collector('a', async () => [], thirtyDays)], noRetries);

    const stop = store.start();
    await settle();
    stop();

    const delays = timers.mock.calls.map(([, ms]) => Number(ms));
    expect(delays.length).toBeGreaterThan(0);
    expect(delays.every(ms => ms <= 2 ** 31 - 1)).toBe(true);
  });
});
