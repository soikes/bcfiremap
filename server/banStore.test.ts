import { describe, expect, it } from 'bun:test';
import { makeBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { createBanStore } from './banStore';

const collector = (id: string, collect: () => Promise<FireBan[]>): Collector => ({
  id,
  name: `Source ${id}`,
  coverage: `Coverage ${id}`,
  attribution: '',
  refetchIntervalMs: 60000,
  collect,
});

const noRetries = { retries: 0 };

describe('createBanStore', () => {
  it('reports every source as pending before its first refresh', () => {
    const store = createBanStore([collector('a', async () => [])], noRetries);
    expect(store.snapshot()).toEqual({
      bans: [],
      sources: [
        {
          id: 'a',
          name: 'Source a',
          coverage: 'Coverage a',
          attribution: '',
          status: 'pending',
          hasData: false,
          fetching: false,
          retrying: false,
          updatedAt: 0,
        },
      ],
    });
  });

  it('merges the bans from every collector in collector order', async () => {
    const a = collector('a', async () => [makeBan({ id: 'a1' })]);
    const b = collector('b', async () => [makeBan({ id: 'b1' }), makeBan({ id: 'b2' })]);
    const store = createBanStore([a, b], noRetries);

    await store.refresh(b);
    await store.refresh(a);

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

    await store.refresh(good);
    await store.refresh(bad);

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

  it('flags a source as fetching while its collector runs, and clears it when it finishes', async () => {
    let answer: (bans: FireBan[]) => void = () => {};
    const slow = collector('slow', () => new Promise<FireBan[]>(resolve => (answer = resolve)));
    const store = createBanStore([slow], noRetries);

    const running = store.refresh(slow);
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'pending', fetching: true });

    answer([makeBan({ id: 's1' })]);
    await running;
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'success', fetching: false });
  });

  it('clears the fetching flag when the collector fails', async () => {
    const bad = collector('bad', async () => Promise.reject(new Error('down')));
    const store = createBanStore([bad], noRetries);

    await store.refresh(bad);

    expect(store.snapshot().sources[0]).toMatchObject({ status: 'error', fetching: false });
  });

  it('flags a source as retrying between attempts and clears it when the retry succeeds', async () => {
    let calls = 0;
    const flaky = collector('flaky', async () => {
      calls += 1;
      if (calls === 1) throw new Error('down');
      return [makeBan({ id: 'f1' })];
    });
    const store = createBanStore([flaky], { retries: 1, retryDelayMs: () => 50 });

    const running = store.refresh(flaky);
    await Bun.sleep(10);
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'pending', retrying: true });

    await running;
    expect(store.snapshot().sources[0]).toMatchObject({ status: 'success', retrying: false });
  });

  it('clears the retrying flag when every retry fails', async () => {
    const store = createBanStore([collector('bad', async () => Promise.reject(new Error('down')))], {
      retries: 2,
      retryDelayMs: () => 0,
    });

    await store.refresh(collector('bad', async () => Promise.reject(new Error('down'))));

    expect(store.snapshot().sources[0]).toMatchObject({ status: 'error', retrying: false, hasData: false });
  });

  it('retries a failing collector before giving up', async () => {
    let calls = 0;
    const flaky = collector('flaky', async () => {
      calls += 1;
      if (calls < 3) throw new Error('down');
      return [makeBan({ id: 'f1' })];
    });
    const store = createBanStore([flaky], { retries: 2, retryDelayMs: () => 0 });

    await store.refresh(flaky);

    expect(calls).toBe(3);
    expect(store.snapshot().sources[0].status).toBe('success');
  });
});
