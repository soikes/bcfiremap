import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { ReactNode } from 'react';
import { Collector } from '../collectors/types';
import { makeBan, makeSource } from '../test/fixtures';
import { BansResponse } from '../types/api';
import { FireBan } from '../types/ban';
import { SERVER_BANS_URL, useBans } from './useBans';

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

const serverAnswers = (body: BansResponse) => async () => ({ ok: true, json: async () => body });

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

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

    expect(fetchMock).toHaveBeenCalledWith(SERVER_BANS_URL, expect.anything());
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
