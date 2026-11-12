import type { Geometry, MultiPolygon, Polygon } from 'geojson';
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

const kamloops = zone('Kamloops Fire Centre', 'Kamloops Fire Zone', square(0));
const penticton = zone('Kamloops Fire Centre', 'Penticton Fire Zone', square(10));
const quesnel = zone('Cariboo Fire Centre', 'Quesnel Fire Zone', square(20));

describe('buildExampleBans', () => {
  const bans = buildExampleBans(collection(kamloops, penticton, quesnel));
  const byId = (id: string) => bans.find(ban => ban.id === id);

  it('builds a centre-wide ban from every zone in the Kamloops Fire Centre', () => {
    const ban = byId('example:kamloops-fire-centre');
    expect(ban?.level).toBe('provincial');
    expect(ban?.geometry.type).toBe('MultiPolygon');
    expect((ban?.geometry as MultiPolygon).coordinates).toHaveLength(2);
    expect(pointInGeometry(at(0), ban!.geometry)).toBe(true);
    expect(pointInGeometry(at(10), ban!.geometry)).toBe(true);
  });

  it('leaves zones from other fire centres out of the centre-wide ban', () => {
    expect(pointInGeometry(at(20), byId('example:kamloops-fire-centre')!.geometry)).toBe(false);
  });

  it('builds a single-zone ban from the Penticton Fire Zone only', () => {
    const ban = byId('example:penticton-fire-zone');
    expect(ban?.type).toBe('category2-3');
    expect(pointInGeometry(at(10), ban!.geometry)).toBe(true);
    expect(pointInGeometry(at(0), ban!.geometry)).toBe(false);
  });

  it('combines the parts of MultiPolygon zones', () => {
    const multi: MultiPolygon = { type: 'MultiPolygon', coordinates: [square(0).coordinates, square(5).coordinates] };
    const built = buildExampleBans(collection(zone('Kamloops Fire Centre', 'Kamloops Fire Zone', multi)));
    const ban = built.find(b => b.id === 'example:kamloops-fire-centre');
    expect((ban?.geometry as MultiPolygon).coordinates).toHaveLength(2);
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
