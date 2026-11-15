import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/** A fresh cache file path (not created) in the temp directory. */
function testDbPath(): string {
  const dir = join(tmpdir(), `bcfiremap-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return join(dir, 'bans.json');
}

/** A cache file path holding the given text. */
function dbWith(text: string): string {
  const path = testDbPath();
  writeFileSync(path, text);
  return path;
}

describe('createBanStore', () => {
  it('reports every source as pending before its first refresh', async () => {
    const store = await createBanStore([collector('a', async () => [])], { ...noRetries, dbPath: testDbPath() });
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
    const store = await createBanStore([a, b], { ...noRetries, dbPath: testDbPath() });

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
    const store = await createBanStore([good, bad], { ...noRetries, dbPath: testDbPath() });

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
    const store = await createBanStore([flaky], { ...noRetries, dbPath: testDbPath() });

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
    const store = await createBanStore([shrinking], { ...noRetries, dbPath: testDbPath() });

    await store.refresh(shrinking);
    ids = ['x1'];
    await store.refresh(shrinking);

    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['x1']);
  });

  it('marks a collector that returns something other than a list as failed', async () => {
    const broken = collector('broken', async () => ({ features: [] }) as unknown as FireBan[]);
    const store = await createBanStore([broken], { ...noRetries, dbPath: testDbPath() });

    await store.refresh(broken);

    expect(store.snapshot()).toMatchObject({ bans: [], sources: [{ id: 'broken', status: 'error', hasData: false }] });
  });

  it('drops malformed bans from a collector and keeps its valid ones', async () => {
    const messy = collector('messy', async () => [makeBan({ id: 'ok' }), { id: 'bad' } as unknown as FireBan]);
    const store = await createBanStore([messy], { ...noRetries, dbPath: testDbPath() });

    await store.refresh(messy);

    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['ok']);
  });

  it('flags a source as retrying between attempts and fetching while it runs', async () => {
    let calls = 0;
    const seen: { fetching: boolean; retrying: boolean }[] = [];
    let store: Awaited<ReturnType<typeof createBanStore>>;
    const slow = collector('slow', async () => {
      seen.push(store.snapshot().sources[0]);
      if (++calls === 1) throw new Error('once');
      return [makeBan({ id: 's1' })];
    });
    store = await createBanStore([slow], { retries: 1, retryDelayMs: () => 0, dbPath: testDbPath() });

    await store.refresh(slow);

    expect(seen.map(s => [s.fetching, s.retrying])).toEqual([[true, false], [true, true]]);
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'success', fetching: false, retrying: false });
  });
});

describe('createBanStore cache file', () => {
  it('starts empty instead of crashing when the file has only the old `bans` shape', async () => {
    const path = dbWith(JSON.stringify({ bans: { a1: { id: 'a1' } } }));
    const store = await createBanStore([collector('a', async () => [])], { ...noRetries, dbPath: path });

    expect(store.snapshot().sources[0]).toMatchObject({ status: 'pending', hasData: false });

    await store.refresh(collector('a', async () => [makeBan({ id: 'a1' })]));
    expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['a1']);
  });

  it.each([['an empty file', ''], ['a corrupt file', '{ "sources": {'], ['null', 'null'], ['an empty object', '{}']])(
    'starts empty and recovers from %s',
    async (_name, text) => {
      const c = collector('a', async () => [makeBan({ id: 'a1' })]);
      const store = await createBanStore([c], { ...noRetries, dbPath: dbWith(text) });

      expect(store.snapshot().bans).toEqual([]);
      await store.refresh(c);
      expect(store.snapshot().bans.map(ban => ban.id)).toEqual(['a1']);
    },
  );

  it('drops stored bans that fail validation', async () => {
    const path = dbWith(JSON.stringify({ sources: { a: { bans: [{ id: 'bad' }], status: 'success', updatedAt: 5, attemptedAt: 5 } } }));
    const store = await createBanStore([collector('a', async () => [])], { ...noRetries, dbPath: path });

    expect(store.snapshot().bans).toEqual([]);
  });

  it('serves bans from disk after a restart without fetching again', async () => {
    const path = testDbPath();
    let calls = 0;
    const make = () => collector('a', async () => (calls++, [makeBan({ id: 'a1' })]), 60 * 60 * 1000);

    const first = await createBanStore([make()], { ...noRetries, dbPath: path });
    await first.refresh(make());
    expect(calls).toBe(1);

    const second = await createBanStore([make()], { ...noRetries, dbPath: path });
    const stop = second.start();
    await Bun.sleep(20);
    stop();

    expect(calls).toBe(1);
    expect(second.snapshot()).toMatchObject({ bans: [{ id: 'a1' }], sources: [{ status: 'success', hasData: true }] });
  });

  it('fetches again on start when the stored data is older than the refetch interval', async () => {
    const path = dbWith(JSON.stringify({ sources: { a: { bans: [], status: 'success', updatedAt: 1, attemptedAt: 1 } } }));
    let calls = 0;
    const store = await createBanStore([collector('a', async () => (calls++, []), 1000)], { ...noRetries, dbPath: path });

    const stop = store.start();
    await Bun.sleep(50);
    stop();

    expect(calls).toBe(1);
  });

  it('refetches everything on start with forceFetch', async () => {
    const path = testDbPath();
    let calls = 0;
    const make = () => collector('a', async () => (calls++, []), 60 * 60 * 1000);
    await (await createBanStore([make()], { ...noRetries, dbPath: path })).refresh(make());

    const store = await createBanStore([make()], { ...noRetries, dbPath: path, forceFetch: true });
    const stop = store.start();
    await Bun.sleep(50);
    stop();

    expect(calls).toBe(2);
  });

  it('does not refetch in a loop when the refetch interval exceeds the timer limit', async () => {
    let calls = 0;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const store = await createBanStore([collector('a', async () => (calls++, []), thirtyDays)], { ...noRetries, dbPath: testDbPath() });

    const stop = store.start();
    await Bun.sleep(100);
    stop();

    expect(calls).toBe(1);
  });
});
