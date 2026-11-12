import { fetchJson } from './fetchJson';

const mockFetch = (impl: (url: string, init?: RequestInit) => Promise<unknown>) => {
  globalThis.fetch = jest.fn(impl) as unknown as typeof fetch;
};

/** A fetch that never answers and rejects as soon as its signal is, or becomes, aborted. */
const hangingFetch = (_url: string, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) reject(new Error('aborted'));
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

afterEach(() => {
  jest.useRealTimers();
});

describe('fetchJson', () => {
  it('returns the parsed JSON body', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ hello: 'world' }) }));
    expect(await fetchJson('https://example.test/data')).toEqual({ hello: 'world' });
  });

  it('throws with the status when the response is not ok', async () => {
    mockFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(fetchJson('https://example.test/data')).rejects.toThrow('status 503');
  });

  it('aborts when the caller aborts', async () => {
    mockFetch(hangingFetch);
    const controller = new AbortController();
    const request = fetchJson('https://example.test/data', controller.signal);
    const assertion = expect(request).rejects.toThrow('aborted');
    controller.abort();
    await assertion;
  });

  it('aborts when the caller signal is already aborted', async () => {
    mockFetch(hangingFetch);
    const controller = new AbortController();
    controller.abort();
    await expect(fetchJson('https://example.test/data', controller.signal)).rejects.toThrow('aborted');
  });

  it('aborts after the timeout', async () => {
    jest.useFakeTimers();
    mockFetch(hangingFetch);
    const request = fetchJson('https://example.test/data', undefined, 1000);
    const assertion = expect(request).rejects.toThrow('aborted');
    jest.advanceTimersByTime(1000);
    await assertion;
  });
});
