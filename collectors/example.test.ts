import type { Geometry, MultiPolygon, Polygon, Position } from 'geojson';
import { FIRE_ZONES_URL } from '../constants/map';
import { pointInGeometry } from '../utils/geometry';
import { buildExampleBans, exampleCollector } from './example';

const square = (west: number): Polygon => ({
  type: 'Polygon',
  coordinates: [[[west, 0], [west + 1, 0], [west + 1, 1], [west, 1], [west, 0]]],
});

const zone = (FIRE_CENTRE: string, FIRE_ZONE: string, geometry: Geometry) => ({
  type: 'Feature',
  properties: { FIRE_CENTRE, FIRE_ZONE },
  geometry,
});

const collection = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

const at = (west: number) => ({ latitude: 0.5, longitude: west + 0.5 });

/** Area of a ring by the shoelace formula. */
const ringArea = (ring: Position[]) =>
  Math.abs(ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + (x1 * y2 - x2 * y1);
  }, 0) / 2);

// Two zones that share an edge, as neighbouring zones do, and one in another fire centre.
const kamloops = zone('Kamloops Fire Centre', 'Kamloops Fire Zone', square(0));
const penticton = zone('Kamloops Fire Centre', 'Penticton Fire Zone', square(1));
const quesnel = zone('Cariboo Fire Centre', 'Quesnel Fire Zone', square(20));

describe('buildExampleBans', () => {
  const bans = buildExampleBans(collection(kamloops, penticton, quesnel));
  const byId = (id: string) => bans.find(ban => ban.id === id);

  it('merges the zones of the Kamloops Fire Centre into one contiguous area', () => {
    const geometry = byId('example:kamloops-fire-centre')!.geometry;
    expect(geometry.type).toBe('Polygon');
    expect((geometry as Polygon).coordinates).toHaveLength(1);
    expect(ringArea((geometry as Polygon).coordinates[0])).toBeCloseTo(2);
    expect(pointInGeometry(at(0), geometry)).toBe(true);
    expect(pointInGeometry(at(1), geometry)).toBe(true);
  });

  it('leaves zones from other fire centres out of the centre-wide ban', () => {
    expect(pointInGeometry(at(20), byId('example:kamloops-fire-centre')!.geometry)).toBe(false);
  });

  it('builds a single-zone ban from the Penticton Fire Zone only', () => {
    const ban = byId('example:penticton-fire-zone');
    expect(ban?.type).toBe('category2-3');
    expect(pointInGeometry(at(1), ban!.geometry)).toBe(true);
    expect(pointInGeometry(at(0), ban!.geometry)).toBe(false);
  });

  it('keeps zones that do not touch as separate parts', () => {
    const multi: MultiPolygon = { type: 'MultiPolygon', coordinates: [square(0).coordinates, square(5).coordinates] };
    const built = buildExampleBans(collection(zone('Kamloops Fire Centre', 'Kamloops Fire Zone', multi)));
    const geometry = built.find(b => b.id === 'example:kamloops-fire-centre')!.geometry as MultiPolygon;
    expect(geometry.type).toBe('MultiPolygon');
    expect(geometry.coordinates).toHaveLength(2);
  });

  it('drops interior holes, such as slivers left between simplified zones', () => {
    const withHole: Polygon = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
        [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]],
      ],
    };
    const built = buildExampleBans(collection(zone('Kamloops Fire Centre', 'Kamloops Fire Zone', withHole)));
    const geometry = built.find(b => b.id === 'example:kamloops-fire-centre')!.geometry as Polygon;
    expect(geometry.coordinates).toHaveLength(1);
    expect(pointInGeometry({ latitude: 1.5, longitude: 1.5 }, geometry)).toBe(true);
  });

  it('skips a provincial ban whose zones are missing', () => {
    const ids = buildExampleBans(collection(quesnel)).map(ban => ban.id);
    expect(ids).not.toContain('example:kamloops-fire-centre');
    expect(ids).not.toContain('example:penticton-fire-zone');
  });

  it('always includes the hand-drawn regional district and municipal bans', () => {
    const levels = buildExampleBans(collection()).map(ban => ban.level);
    expect(levels).toEqual(['regional-district', 'regional-district', 'municipal', 'municipal']);
  });

  it('gives every ban the example source and a unique id', () => {
    expect(bans.every(ban => ban.source === 'example')).toBe(true);
    expect(new Set(bans.map(ban => ban.id)).size).toBe(bans.length);
  });

  it('throws when the response has no features list', () => {
    expect(() => buildExampleBans({})).toThrow();
    expect(() => buildExampleBans(null)).toThrow();
  });
});

describe('exampleCollector', () => {
  it('fetches the fire zones and returns example bans built from them', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => collection(kamloops, penticton) }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const bans = await exampleCollector.collect();

    expect(fetchMock).toHaveBeenCalledWith(FIRE_ZONES_URL, expect.anything());
    expect(bans.map(ban => ban.id)).toContain('example:kamloops-fire-centre');
  });
});
