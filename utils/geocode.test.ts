import { afterEach, describe, expect, it, mock } from 'bun:test';
import { searchPlaces } from './geocode';

const realFetch = globalThis.fetch;
const answer = (body: unknown) => {
  const fetchMock = mock(async (_url: string) => ({ ok: true, status: 200, json: async () => body }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('searchPlaces', () => {
  it('asks Nominatim for places in British Columbia only', async () => {
    const fetchMock = answer([]);
    await searchPlaces('  Kamloops ');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ q: 'Kamloops', format: 'jsonv2', countrycodes: 'ca', bounded: '1', limit: '5' });
    expect(url.searchParams.get('viewbox')).toBe('-139.06,60,-114.03,48.3');
  });

  it('returns each result as a named place with numeric coordinates', async () => {
    answer([{ display_name: 'Kamloops, BC', lat: '50.67', lon: '-120.33' }]);
    expect(await searchPlaces('Kamloops')).toEqual([{ name: 'Kamloops, BC', location: { latitude: 50.67, longitude: -120.33 } }]);
  });

  it('skips results without a name or a usable position', async () => {
    answer([{ display_name: 'No position' }, { lat: '1', lon: '2' }, null, 'text', { display_name: 'Ok', lat: '49', lon: '-123' }]);
    expect((await searchPlaces('x')).map(place => place.name)).toEqual(['Ok']);
  });

  it('makes no request for an empty query', async () => {
    const fetchMock = answer([]);
    expect(await searchPlaces('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the answer is not a list', async () => {
    answer({ error: 'rate limited' });
    await expect(searchPlaces('x')).rejects.toThrow('unexpected response');
  });

  it('throws when the request fails', async () => {
    globalThis.fetch = mock(async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    await expect(searchPlaces('x')).rejects.toThrow('429');
  });
});
