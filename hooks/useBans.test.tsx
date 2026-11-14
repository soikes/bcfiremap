import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { ReactNode } from 'react';
import { BANS_API_PATH } from '../constants/api';
import { makeBan, makeSource } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { useBans } from './useBans';

const realFetch = globalThis.fetch;

const collector = (id: string, collect: () => Promise<FireBan[]>): Collector => ({
  id,
  name: `Source ${id}`,
  coverage: `Coverage ${id}`,
  attribution: '',
  refetchIntervalMs: 60000,
  collect,
});

/** Replaces fetch, which only the server request uses here, and returns the mock. */
const mockServer = (impl: () => Promise<unknown>) => {
  const fetchMock = mock(impl);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const serverAnswers = (body: unknown) => async () => ({ ok: true, json: async () => body });

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

/** Renders useBans with its own query client (no retries unless given) and returns both, so a test can trigger refreshes. */
const renderBans = (collectors: Collector[], retry: { retry: number; retryDelay: number } | { retry: false } = { retry: false }) => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, ...retry } } });
  const clientWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useBans(collectors), { wrapper: clientWrapper });
  return { result, client };
};

const failing = (id: string) =>
  collector(id, async () => {
    throw new Error(`${id} is down`);
  });

const serverPlaceholder = (status: string) => expect.objectContaining({ id: 'server', status, hasData: false });

beforeEach(() => {
  mockServer(serverAnswers({ bans: [], sources: [] }));
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('useBans browser collectors', () => {
  it('merges the bans from every collector', async () => {
    const collectors = [
      collector('a', async () => [makeBan({ id: 'a1' })]),
      collector('b', async () => [makeBan({ id: 'b1' }), makeBan({ id: 'b2' })]),
    ];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.bans).toHaveLength(3));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['a1', 'b1', 'b2']);
    expect(result.current.sources.map(source => source.status)).toEqual(['success', 'success']);
  });

  it('reports a failing source and still returns the others', async () => {
    const collectors = [
      collector('good', async () => [makeBan({ id: 'g1' })]),
      collector('bad', async () => {
        throw new Error('down');
      }),
    ];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.sources[1].status).toBe('error'));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['g1']);
    expect(result.current.sources[1]).toMatchObject({ id: 'bad', hasData: false });
    expect(result.current.sources[0]).toMatchObject({ id: 'good', status: 'success', hasData: true });
  });

  it('reports a source as pending until it answers', () => {
    const collectors = [collector('slow', () => new Promise<FireBan[]>(() => {}))];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    expect(result.current.bans).toEqual([]);
    expect(result.current.sources[0]).toMatchObject({ status: 'pending', hasData: false });
  });

  it('carries each collector name, coverage and attribution through', () => {
    const collectors = [{ ...collector('a', async () => []), attribution: 'Credit a' }];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    expect(result.current.sources[0]).toMatchObject({
      id: 'a',
      name: 'Source a',
      coverage: 'Coverage a',
      attribution: 'Credit a',
    });
  });
});

describe('useBans server sources', () => {
  it('shows a pending placeholder for the server until it answers', () => {
    mockServer(() => new Promise(() => {}));
    const { result } = renderHook(() => useBans([]), { wrapper });
    expect(result.current.sources).toEqual([expect.objectContaining({ id: 'server', status: 'pending', hasData: false })]);
  });

  it('adds the bans and sources the server sent after the browser ones', async () => {
    const fetchMock = mockServer(
      serverAnswers({ bans: [makeBan({ id: 's1' })], sources: [makeSource({ id: 'muni' })] }),
    );
    const collectors = [collector('a', async () => [makeBan({ id: 'a1' })])];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.bans).toHaveLength(2));

    expect(fetchMock).toHaveBeenCalledWith(BANS_API_PATH, expect.anything());
    expect(result.current.bans.map(ban => ban.id)).toEqual(['a1', 's1']);
    expect(result.current.sources.map(source => source.id)).toEqual(['a', 'muni']);
  });

  it('drops the placeholder when the server has no sources', async () => {
    const { result } = renderHook(() => useBans([]), { wrapper });
    await waitFor(() => expect(result.current.sources).toEqual([]));
  });

  it('shows the server as failed when it cannot be reached, keeping the browser bans', async () => {
    mockServer(async () => {
      throw new Error('offline');
    });
    const collectors = [collector('a', async () => [makeBan({ id: 'a1' })])];
    const { result } = renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.sources[1]?.status).toBe('error'));

    expect(result.current.sources[1]).toMatchObject({ id: 'server', hasData: false });
    await waitFor(() => expect(result.current.bans.map(ban => ban.id)).toEqual(['a1']));
  });
});

describe('useBans when browser collectors fail', () => {
  it('keeps the bans of the collectors that worked when one fails', async () => {
    const { result } = renderBans([collector('good', async () => [makeBan({ id: 'g1' })]), failing('bad')]);

    await waitFor(() => expect(result.current.sources[1].status).toBe('error'));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['g1']);
  });

  it('returns no bans, and every source as failed, when every collector and the server fail', async () => {
    mockServer(async () => {
      throw new Error('offline');
    });
    const { result } = renderBans([failing('a'), failing('b')]);

    await waitFor(() => expect(result.current.sources.every(source => source.status === 'error')).toBe(true));

    expect(result.current.bans).toEqual([]);
    expect(result.current.sources.map(source => [source.id, source.hasData])).toEqual([
      ['a', false],
      ['b', false],
      ['server', false],
    ]);
  });

  it('treats a collector that returns something other than a list as failed', async () => {
    const broken = collector('broken', async () => ({ features: [] }) as unknown as FireBan[]);
    const { result } = renderBans([collector('good', async () => [makeBan({ id: 'g1' })]), broken]);

    await waitFor(() => expect(result.current.sources[1].status).toBe('error'));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['g1']);
    expect(result.current.sources[1]).toMatchObject({ id: 'broken', hasData: false });
  });

  it('drops malformed bans from a collector and keeps its valid ones', async () => {
    const messy = collector('messy', async () => [makeBan({ id: 'ok' }), { id: 'no-geometry' } as unknown as FireBan]);
    const { result } = renderBans([messy]);

    await waitFor(() => expect(result.current.sources[0].status).toBe('success'));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['ok']);
  });

  it('keeps the last good bans, marked as failed, when a refresh fails', async () => {
    let fail = false;
    const flaky = collector('flaky', async () => {
      if (fail) throw new Error('down');
      return [makeBan({ id: 'f1' })];
    });
    const { result, client } = renderBans([flaky]);
    await waitFor(() => expect(result.current.sources[0].status).toBe('success'));
    const goodTime = result.current.sources[0].updatedAt;

    fail = true;
    await client.refetchQueries({ queryKey: ['bans', 'flaky'] });

    await waitFor(() => expect(result.current.sources[0].status).toBe('error'));
    expect(result.current.bans.map(ban => ban.id)).toEqual(['f1']);
    expect(result.current.sources[0]).toMatchObject({ hasData: true, updatedAt: goodTime });
  });
});

describe('useBans when the server fails', () => {
  const browserBan = () => [collector('a', async () => [makeBan({ id: 'a1' })])];

  it.each([
    ['is rate limited', async () => ({ ok: false, status: 429, json: async () => ({}) })],
    ['answers with a server error', async () => ({ ok: false, status: 502, json: async () => ({}) })],
    [
      'answers with an HTML page',
      async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }),
    ],
    ['answers with an empty object', serverAnswers({})],
    ['answers with an error object', serverAnswers({ error: 'unavailable' })],
    ['answers with bans that are not a list', serverAnswers({ bans: 'none', sources: [] })],
    [
      'cannot be reached',
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])('shows the server as failed and keeps the browser bans when it %s', async (_case, impl) => {
    mockServer(impl);
    const { result } = renderBans(browserBan());

    await waitFor(() => expect(result.current.sources[1]).toEqual(serverPlaceholder('error')));
    await waitFor(() => expect(result.current.bans.map(ban => ban.id)).toEqual(['a1']));
  });

  it('drops malformed bans and sources from the server and keeps the valid ones', async () => {
    mockServer(
      serverAnswers({
        bans: [makeBan({ id: 's1' }), { id: 'bad' }],
        sources: [makeSource({ id: 'muni' }), { id: 'broken' }],
      }),
    );
    const { result } = renderBans([]);

    await waitFor(() => expect(result.current.bans.map(ban => ban.id)).toEqual(['s1']));

    expect(result.current.sources.map(source => source.id)).toEqual(['muni']);
  });

  it('passes through a server source that failed on the server', async () => {
    mockServer(serverAnswers({ bans: [], sources: [makeSource({ id: 'muni', status: 'error', hasData: false })] }));
    const { result } = renderBans([]);

    await waitFor(() => expect(result.current.sources).toEqual([expect.objectContaining({ id: 'muni', status: 'error' })]));
  });

  it('keeps the last server answer when a later server request fails', async () => {
    let fail = false;
    mockServer(async () => {
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => ({ bans: [makeBan({ id: 's1' })], sources: [makeSource({ id: 'muni' })] }) };
    });
    const { result, client } = renderBans([]);
    await waitFor(() => expect(result.current.bans.map(ban => ban.id)).toEqual(['s1']));

    fail = true;
    await client.refetchQueries({ queryKey: ['server-bans'] });

    expect(result.current.bans.map(ban => ban.id)).toEqual(['s1']);
    expect(result.current.sources.map(source => source.id)).toEqual(['muni']);
  });
});

describe('useBans while retrying', () => {
  it('flags a browser source as retrying after a failed attempt, and clears it when the retry succeeds', async () => {
    let calls = 0;
    const flaky = collector('flaky', async () => {
      calls += 1;
      if (calls === 1) throw new Error('down');
      return [makeBan({ id: 'f1' })];
    });
    const { result } = renderBans([flaky], { retry: 1, retryDelay: 100 });

    await waitFor(() => expect(result.current.sources[0]).toMatchObject({ status: 'pending', retrying: true }));

    await waitFor(() => expect(result.current.sources[0]).toMatchObject({ status: 'success', retrying: false }));
    expect(result.current.bans.map(ban => ban.id)).toEqual(['f1']);
  });

  it('stops flagging a browser source as retrying once every retry has failed', async () => {
    const { result } = renderBans([failing('bad')], { retry: 1, retryDelay: 10 });

    await waitFor(() => expect(result.current.sources[0]).toMatchObject({ status: 'error', retrying: false }));
  });

  it('flags the server placeholder as retrying while the first server request is retried', async () => {
    mockServer(async () => {
      throw new Error('offline');
    });
    const { result } = renderBans([], { retry: 1, retryDelay: 1000 });

    await waitFor(() =>
      expect(result.current.sources).toEqual([expect.objectContaining({ id: 'server', status: 'pending', retrying: true })]),
    );
  });

  it('adds a retrying server entry next to the server sources when a later request is retried', async () => {
    let fail = false;
    mockServer(async () => {
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => ({ bans: [makeBan({ id: 's1' })], sources: [makeSource({ id: 'muni' })] }) };
    });
    const { result, client } = renderBans([], { retry: 1, retryDelay: 1000 });
    await waitFor(() => expect(result.current.bans.map(ban => ban.id)).toEqual(['s1']));

    fail = true;
    void client.refetchQueries({ queryKey: ['server-bans'] });

    await waitFor(() =>
      expect(result.current.sources).toEqual([
        expect.objectContaining({ id: 'muni' }),
        expect.objectContaining({ id: 'server', hasData: true, retrying: true }),
      ]),
    );
    expect(result.current.bans.map(ban => ban.id)).toEqual(['s1']);
  });
});
