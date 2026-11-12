import { PROVINCIAL_URL, parseProvincialBans, provincialCollector } from './provincial';

// Fixtures are built from the layer's published schema; the live feed was empty when these were written.
const square = {
  type: 'Polygon',
  coordinates: [[[-120, 49], [-119, 49], [-119, 50], [-120, 50], [-120, 49]]],
};

const feature = (properties: Record<string, unknown>, geometry: unknown = square, id: unknown = 1) => ({
  type: 'Feature',
  id,
  properties,
  geometry,
});

const collection = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

describe('parseProvincialBans', () => {
  it('maps a full feature to a FireBan', () => {
    const [ban] = parseProvincialBans(
      collection(
        feature({
          PROT_BAP_SYSID: 42,
          TYPE: 'Campfire',
          CATEGORY: 'Category 1',
          ACCESS_PROHIBITION_DESCRIPTION: 'Campfires prohibited',
          ACCESS_STATUS_EFFECTIVE_DATE: Date.UTC(2026, 6, 1),
          FIRE_CENTRE_NAME: 'Kamloops Fire Centre',
          FIRE_ZONE_NAME: 'Kamloops Fire Zone',
          BULLETIN_URL: 'https://example.gov/bulletin',
        }),
      ),
    );

    expect(ban).toEqual({
      id: 'bcws:42',
      source: 'bcws',
      level: 'provincial',
      region: 'Kamloops Fire Zone',
      type: 'campfire',
      title: 'Campfire · Category 1',
      description: 'Campfires prohibited',
      effectiveDate: '2026-07-01',
      url: 'https://example.gov/bulletin',
      geometry: square,
    });
  });

  it('uses the fire centre, then a default, when there is no fire zone name', () => {
    const [withCentre, withNeither] = parseProvincialBans(
      collection(
        feature({ PROT_BAP_SYSID: 1, FIRE_CENTRE_NAME: 'Cariboo Fire Centre' }),
        feature({ PROT_BAP_SYSID: 2 }),
      ),
    );
    expect(withCentre.region).toBe('Cariboo Fire Centre');
    expect(withNeither.region).toBe('British Columbia');
  });

  it('falls back to OBJECTID, then the feature id, for the ban id', () => {
    const [byObjectId, byFeatureId] = parseProvincialBans(
      collection(feature({ OBJECTID: 7 }), feature({}, square, 'abc')),
    );
    expect(byObjectId.id).toBe('bcws:7');
    expect(byFeatureId.id).toBe('bcws:abc');
  });

  it('shows the type once when TYPE and CATEGORY are the same text', () => {
    const [ban] = parseProvincialBans(collection(feature({ PROT_BAP_SYSID: 1, TYPE: 'Campfire', CATEGORY: 'Campfire' })));
    expect(ban.title).toBe('Campfire');
  });

  it('classifies unrecognised text as other but keeps the source text', () => {
    const [ban] = parseProvincialBans(
      collection(feature({ PROT_BAP_SYSID: 1, TYPE: 'Fireworks', ACCESS_PROHIBITION_DESCRIPTION: 'No fireworks' })),
    );
    expect(ban.type).toBe('other');
    expect(ban.title).toBe('Fireworks');
    expect(ban.description).toBe('No fireworks');
  });

  it('drops bulletin URLs that are not https', () => {
    const bans = parseProvincialBans(
      collection(
        feature({ PROT_BAP_SYSID: 1, BULLETIN_URL: 'javascript:alert(1)' }),
        feature({ PROT_BAP_SYSID: 2, BULLETIN_URL: 'http://example.gov' }),
        feature({ PROT_BAP_SYSID: 3, BULLETIN_URL: '   ' }),
      ),
    );
    expect(bans.map(ban => ban.url)).toEqual([undefined, undefined, undefined]);
  });

  it('leaves the effective date empty when it is not a valid timestamp', () => {
    const bans = parseProvincialBans(
      collection(
        feature({ PROT_BAP_SYSID: 1, ACCESS_STATUS_EFFECTIVE_DATE: 'soon' }),
        feature({ PROT_BAP_SYSID: 2, ACCESS_STATUS_EFFECTIVE_DATE: 1e20 }),
        feature({ PROT_BAP_SYSID: 3 }),
      ),
    );
    expect(bans.map(ban => ban.effectiveDate)).toEqual([undefined, undefined, undefined]);
  });

  it('accepts MultiPolygon geometries', () => {
    const multi = { type: 'MultiPolygon', coordinates: [square.coordinates, square.coordinates] };
    const [ban] = parseProvincialBans(collection(feature({ PROT_BAP_SYSID: 1 }, multi)));
    expect(ban.geometry.type).toBe('MultiPolygon');
  });

  it('skips features without an area geometry and keeps the rest', () => {
    const bans = parseProvincialBans(
      collection(
        feature({ PROT_BAP_SYSID: 1 }, null),
        feature({ PROT_BAP_SYSID: 2 }, { type: 'Point', coordinates: [-120, 49] }),
        feature({ PROT_BAP_SYSID: 3 }),
        'not a feature',
        null,
      ),
    );
    expect(bans.map(ban => ban.id)).toEqual(['bcws:3']);
  });

  it('skips features that have no usable id', () => {
    const noId = { type: 'Feature', properties: {}, geometry: square };
    expect(parseProvincialBans(collection(noId))).toEqual([]);
  });

  it('returns an empty list for an empty collection', () => {
    expect(parseProvincialBans(collection())).toEqual([]);
  });

  it('throws on an ArcGIS error response', () => {
    expect(() => parseProvincialBans({ error: { code: 400, message: 'Invalid URL' } })).toThrow('Invalid URL');
  });

  it.each([[null], ['text'], [{}], [{ features: 'nope' }]])('throws on a malformed response: %p', body => {
    expect(() => parseProvincialBans(body)).toThrow();
  });
});

describe('provincialCollector', () => {
  it('describes what it covers, including what it leaves out', () => {
    expect(provincialCollector.coverage).toMatch(/Municipal/);
    expect(provincialCollector.attribution).toMatch(/Open Government Licence/);
  });

  it('asks the layer for simplified WGS84 GeoJSON', () => {
    expect(PROVINCIAL_URL).toContain('FeatureServer/14/query');
    expect(PROVINCIAL_URL).toContain('f=geojson');
    expect(PROVINCIAL_URL).toContain('outSR=4326');
    expect(PROVINCIAL_URL).toContain('maxAllowableOffset=');
  });

  it('fetches the layer and returns the parsed bans', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => collection(feature({ PROT_BAP_SYSID: 1 })),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const bans = await provincialCollector.collect();

    expect(bans).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(PROVINCIAL_URL, expect.anything());
  });

  it('rejects when the service answers with an error', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ error: { code: 500, message: 'Service unavailable' } }),
    })) as unknown as typeof fetch;
    await expect(provincialCollector.collect()).rejects.toThrow('Service unavailable');
  });
});
