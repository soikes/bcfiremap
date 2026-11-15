import { describe, expect, it } from 'bun:test';
import type { MultiPolygon, Polygon } from 'geojson';
import { makeAllowedBan, makeBan, makePermitBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { bansToFeatureCollection, pointInGeometry, pointInPolygon, pointToFeatureCollection } from './geometry';

const point = (latitude: number, longitude: number) => ({ latitude, longitude });

describe('pointInPolygon', () => {
  const ring = (points: [number, number][]) => points.map(([latitude, longitude]) => ({ latitude, longitude }));

  const square = ring([[0, 0], [0, 10], [10, 10], [10, 0]]);

  // L shape: lat 0-5 across lng 0-10, plus lat 5-10 across lng 0-5
  const lShape = ring([[0, 0], [0, 10], [5, 10], [5, 5], [10, 5], [10, 0]]);

  it('returns true for a point inside', () => {
    expect(pointInPolygon(point(5, 5), square)).toBe(true);
  });

  it.each([
    ['south', point(-1, 5)],
    ['north', point(11, 5)],
    ['west', point(5, -1)],
    ['east', point(5, 11)],
  ])('returns false for a point outside to the %s', (_side, p) => {
    expect(pointInPolygon(p, square)).toBe(false);
  });

  it('returns false for an empty polygon', () => {
    expect(pointInPolygon(point(5, 5), [])).toBe(false);
  });

  it('gives the same answer when the ring repeats its first point', () => {
    const closed = [...square, square[0]];
    expect(pointInPolygon(point(5, 5), closed)).toBe(true);
    expect(pointInPolygon(point(11, 5), closed)).toBe(false);
  });

  it('handles a concave polygon', () => {
    expect(pointInPolygon(point(2, 8), lShape)).toBe(true);
    expect(pointInPolygon(point(8, 2), lShape)).toBe(true);
    expect(pointInPolygon(point(8, 8), lShape)).toBe(false);
  });

  it('is not fooled by a point level with a vertex', () => {
    expect(pointInPolygon(point(5, 12), lShape)).toBe(false);
    expect(pointInPolygon(point(5, 2), lShape)).toBe(true);
  });
});

describe('pointInGeometry', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
  const farSquare = [[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]];

  const plain: Polygon = { type: 'Polygon', coordinates: [square] };
  const withHole: Polygon = { type: 'Polygon', coordinates: [square, hole] };
  const twoParts: MultiPolygon = { type: 'MultiPolygon', coordinates: [[square], [farSquare]] };

  it('finds a point inside a Polygon and rejects one outside', () => {
    expect(pointInGeometry(point(5, 5), plain)).toBe(true);
    expect(pointInGeometry(point(15, 15), plain)).toBe(false);
  });

  it('treats positions as [longitude, latitude]', () => {
    const tall: Polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 10], [0, 10], [0, 0]]] };
    expect(pointInGeometry(point(5, 0.5), tall)).toBe(true);
    expect(pointInGeometry(point(0.5, 5), tall)).toBe(false);
  });

  it('excludes points inside a hole', () => {
    expect(pointInGeometry(point(5, 5), withHole)).toBe(false);
    expect(pointInGeometry(point(2, 2), withHole)).toBe(true);
  });

  it('matches any part of a MultiPolygon', () => {
    expect(pointInGeometry(point(5, 5), twoParts)).toBe(true);
    expect(pointInGeometry(point(25, 25), twoParts)).toBe(true);
    expect(pointInGeometry(point(15, 15), twoParts)).toBe(false);
  });

  it('returns false for a geometry with no rings', () => {
    expect(pointInGeometry(point(5, 5), { type: 'Polygon', coordinates: [] })).toBe(false);
    expect(pointInGeometry(point(5, 5), { type: 'MultiPolygon', coordinates: [] })).toBe(false);
  });
});

describe('bansToFeatureCollection', () => {
  const square = (west: number, south: number, size: number) => ({
    type: 'Polygon' as const,
    coordinates: [[[west, south], [west + size, south], [west + size, south + size], [west, south + size], [west, south]]],
  });
  const at = (longitude: number, latitude: number) => ({ latitude, longitude });
  /** Names the permissions whose drawn shapes contain the point. */
  const shownAt = (bans: FireBan[], point: { latitude: number; longitude: number }) =>
    bansToFeatureCollection(bans).features.filter(feature => pointInGeometry(point, feature.geometry)).map(feature => feature.properties?.permission);

  it('makes one feature per permission, carrying the permission as its only property', () => {
    const features = bansToFeatureCollection([
      makeAllowedBan({ id: 'c', geometry: square(20, 0, 1) }),
      makeBan({ id: 'a', geometry: square(0, 0, 1) }),
      makePermitBan({ id: 'b', geometry: square(10, 0, 1) }),
      makeBan({ id: 'd', otherwise: 'allowed-with-conditions', geometry: square(30, 0, 1) }),
    ]).features;
    expect(features.map(feature => feature.properties)).toEqual([
      { permission: 'prohibited' },
      { permission: 'by-permit-only' },
      { permission: 'allowed-with-conditions' },
      { permission: 'allowed' },
    ]);
  });

  it('shows a ban where it is the only one', () => {
    expect(shownAt([makeBan({ geometry: square(0, 0, 2) })], at(1, 1))).toEqual(['prohibited']);
    expect(shownAt([makeBan({ geometry: square(0, 0, 2) })], at(5, 5))).toEqual([]);
  });

  it('shows only the strictest permission where bans overlap', () => {
    const bans = [
      makeAllowedBan({ id: 'green', geometry: square(0, 0, 10) }),
      makePermitBan({ id: 'yellow', geometry: square(2, 2, 6) }),
      makeBan({ id: 'red', geometry: square(4, 4, 2) }),
    ];
    expect(shownAt(bans, at(5, 5))).toEqual(['prohibited']);
    expect(shownAt(bans, at(3, 3))).toEqual(['by-permit-only']);
    expect(shownAt(bans, at(1, 1))).toEqual(['allowed']);
    expect(shownAt(bans, at(11, 11))).toEqual([]);
  });

  it('shows green only where no stricter ban covers, whatever order the bans come in', () => {
    const red = makeBan({ id: 'red', geometry: square(0, 0, 4) });
    const green = makeAllowedBan({ id: 'green', geometry: square(2, 2, 4) });
    for (const bans of [[red, green], [green, red]]) {
      expect(shownAt(bans, at(3, 3))).toEqual(['prohibited']);
      expect(shownAt(bans, at(5, 5))).toEqual(['allowed']);
    }
  });

  it('treats allowed with conditions as stricter than allowed and softer than by permit only', () => {
    const conditions = makeBan({ id: 'c', otherwise: 'allowed-with-conditions', geometry: square(0, 0, 4) });
    expect(shownAt([makeAllowedBan({ geometry: square(0, 0, 10) }), conditions], at(1, 1))).toEqual(['allowed-with-conditions']);
    expect(shownAt([conditions, makePermitBan({ geometry: square(0, 0, 10) })], at(1, 1))).toEqual(['by-permit-only']);
  });

  it('leaves out a permission that a stricter ban fully covers', () => {
    const features = bansToFeatureCollection([
      makeBan({ id: 'red', geometry: square(0, 0, 10) }),
      makeAllowedBan({ id: 'green', geometry: square(2, 2, 2) }),
    ]).features;
    expect(features.map(feature => feature.properties?.permission)).toEqual(['prohibited']);
  });

  it('merges bans of the same permission into one shape', () => {
    const features = bansToFeatureCollection([
      makeBan({ id: 'a', geometry: square(0, 0, 4) }),
      makeBan({ id: 'b', geometry: square(2, 0, 4) }),
    ]).features;
    expect(features).toHaveLength(1);
    expect(features[0].geometry.type).toBe('MultiPolygon');
    expect((features[0].geometry as MultiPolygon).coordinates).toHaveLength(1);
  });

  it('keeps a ban with MultiPolygon geometry', () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [square(0, 0, 1).coordinates, square(5, 5, 1).coordinates],
    };
    expect(shownAt([makeBan({ geometry })], at(0.5, 0.5))).toEqual(['prohibited']);
    expect(shownAt([makeBan({ geometry })], at(5.5, 5.5))).toEqual(['prohibited']);
  });

  it('returns an empty collection for no bans', () => {
    expect(bansToFeatureCollection([]).features).toEqual([]);
  });
});

describe('pointToFeatureCollection', () => {
  it('makes a single point as [longitude, latitude]', () => {
    const { features } = pointToFeatureCollection({ latitude: 50.67, longitude: -120.33 });
    expect(features).toHaveLength(1);
    expect(features[0].geometry).toEqual({ type: 'Point', coordinates: [-120.33, 50.67] });
  });
});
