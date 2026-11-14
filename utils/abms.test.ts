import { describe, expect, it } from 'bun:test';
import { abmsUrl, parseAreas } from './abms';

const polygon = { type: 'Polygon' as const, coordinates: [[[-123.4, 48.4], [-123.3, 48.4], [-123.3, 48.5], [-123.4, 48.4]]] };

const feature = (properties: Record<string, unknown>, geometry: unknown = polygon) => ({
  type: 'Feature',
  properties,
  geometry,
});

describe('parseAreas', () => {
  it('converts a municipality feature, using the short name and the regional district as parent', () => {
    const areas = parseAreas(
      {
        features: [
          feature({
            LGL_ADMIN_AREA_ID: 269,
            ADMIN_AREA_NAME: 'The Corporation of the City of Victoria',
            ADMIN_AREA_ABBREVIATION: 'Victoria',
            ADMIN_AREA_GROUP_NAME: 'Capital Regional District',
          }),
        ],
      },
      'municipality',
    );
    expect(areas).toEqual([
      {
        id: 'abms:municipality:269',
        name: 'Victoria',
        kind: 'municipality',
        parentName: 'Capital Regional District',
        source: 'abms',
        geometry: polygon,
      },
    ]);
  });

  it('skips features without an id, a name or an area geometry', () => {
    const areas = parseAreas(
      {
        features: [
          feature({ ADMIN_AREA_NAME: 'No id' }),
          feature({ LGL_ADMIN_AREA_ID: 1 }),
          feature({ LGL_ADMIN_AREA_ID: 2, ADMIN_AREA_NAME: 'Point' }, { type: 'Point', coordinates: [0, 0] }),
        ],
      },
      'municipality',
    );
    expect(areas).toEqual([]);
  });

  it('throws on a service error or a body without features', () => {
    expect(() => parseAreas({ error: { message: 'boom' } }, 'municipality')).toThrow('boom');
    expect(() => parseAreas({}, 'municipality')).toThrow('no features');
    expect(() => parseAreas(null, 'municipality')).toThrow('Unexpected response');
  });
});

describe('abmsUrl', () => {
  it('targets the layer for the kind and encodes the where clause', () => {
    const url = abmsUrl('municipality', "ADMIN_AREA_ABBREVIATION='Victoria'");
    expect(url).toContain('/MapServer/18/query?');
    expect(new URL(url).searchParams.get('where')).toBe("ADMIN_AREA_ABBREVIATION='Victoria'");
  });

  it('throws for a kind with no ABMS layer', () => {
    expect(() => abmsUrl('fire-zone', '1=1')).toThrow('No ABMS layer');
  });
});
