import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { makeBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { createBanStore } from './banStore';

const collector = (id: string, collect: () => Promise<FireBan[]>): Collector => ({
  id,
  name: `Source ${id}`,
  coverage: `Coverage ${id}`,
  attribution: '',
  collect: async () => (await collect()).map(b => ({ ...b, source: id })),
});

const noRetries = { retries: 0 };

const TEN_MINUTES = 10 * 60 * 1000;

describe('createBanStore', () => {
  it('reports every source as pending before it loads', async () => {
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

    await Promise.all([a, b].map(store.load));

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

    await Promise.all([good, bad].map(store.load));

    const { bans, sources } = store.snapshot();
    expect(bans.map(ban => ban.id)).toEqual(['g1']);
    expect(sources[1]).toMatchObject({ id: 'bad', status: 'error', hasData: false });
  });

  it('marks a collector that returns something other than a list as failed', async () => {
    const broken = collector('broken', async () => ({ features: [] }) as unknown as FireBan[]);
    const store = createBanStore([broken], noRetries);

    await store.load(broken);

    expect(store.snapshot()).toMatchObject({ bans: [], sources: [{ id: 'broken', status: 'error', hasData: false }] });
  });

  it('drops malformed bans from a collector and keeps its valid ones', async () => {
    const messy = collector('messy', async () => [makeBan({ id: 'ok' }), { id: 'bad' } as unknown as FireBan]);
    const store = createBanStore([messy], noRetries);

    await store.load(messy);

    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['ok']);
  });

  it('retries a failed attempt before giving up', async () => {
    let calls = 0;
    const flaky = collector('flaky', async () => {
      if (++calls === 1) throw new Error('once');
      return [makeBan({ id: 'f1' })];
    });
    const store = createBanStore([flaky], { retries: 1, retryDelayMs: () => 0 });

    await store.load(flaky);

    expect(calls).toBe(2);
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'success' });
  });
});

describe('createBanStore start', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /** Lets the promises a load is waiting on settle, without moving the clock. */
  const settle = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  /** Moves the fake clock forward, then lets the load that fires settle. */
  const advance = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await settle();
  };

  it('loads every collector once and resolves when each has had its first try', async () => {
    const calls: string[] = [];
    const store = createBanStore(
      [
        collector('a', async () => (calls.push('a'), [makeBan({ id: 'a1' })])),
        collector('b', async () => {
          calls.push('b');
          throw new Error('down');
        }),
      ],
      noRetries,
    );

    await store.start();
    store.stop();

    expect(calls.sort()).toEqual(['a', 'b']);
    expect(store.snapshot().sources.map(source => source.status)).toEqual(['success', 'error']);
  });

  it('never loads a source again once it has loaded', async () => {
    let calls = 0;
    const store = createBanStore([collector('a', async () => (calls++, []))], noRetries);

    await store.start();
    await advance(7 * 24 * 60 * 60 * 1000);
    store.stop();

    expect(calls).toBe(1);
  });

  it('tries a failed source again every ten minutes until it loads, then stops', async () => {
    let calls = 0;
    const store = createBanStore(
      [
        collector('a', async () => {
          if (++calls < 3) throw new Error('down');
          return [makeBan({ id: 'a1' })];
        }),
      ],
      noRetries,
    );

    await store.start();
    expect(calls).toBe(1);
    await advance(TEN_MINUTES - 1);
    expect(calls).toBe(1);
    await advance(1);
    expect(calls).toBe(2);
    await advance(TEN_MINUTES);
    expect(calls).toBe(3);
    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['a1']);
    await advance(TEN_MINUTES * 6);
    store.stop();

    expect(calls).toBe(3);
  });

  it('stops trying a failed source again after stop is called', async () => {
    let calls = 0;
    const store = createBanStore(
      [
        collector('a', async () => {
          calls++;
          throw new Error('down');
        }),
      ],
      noRetries,
    );

    await store.start();
    store.stop();
    await advance(TEN_MINUTES * 3);

    expect(calls).toBe(1);
  });
});
