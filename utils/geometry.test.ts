import { describe, expect, it } from 'bun:test';
import type { MultiPolygon, Polygon } from 'geojson';
import { makeBan, makeInactiveBan } from '../test/fixtures';
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
  it('makes one feature per ban that keeps the ban geometry', () => {
    const ban = makeBan();
    const [feature] = bansToFeatureCollection([ban]).features;
    expect(feature.geometry).toBe(ban.geometry);
  });

  it('marks a ban outside its yearly period as not active', () => {
    const [on, off] = bansToFeatureCollection([makeBan({ id: 'on' }), makeInactiveBan({ id: 'off' })]).features;
    expect([on.properties?.active, off.properties?.active]).toEqual([true, false]);
  });

  it('carries id, level and region as properties', () => {
    const [feature] = bansToFeatureCollection([
      makeBan({ id: 'rd-1', level: 'regional-district', region: 'Some District' }),
    ]).features;
    expect(feature.id).toBe('rd-1');
    expect(feature.properties).toEqual({ id: 'rd-1', level: 'regional-district', region: 'Some District', active: true });
  });

  it('keeps MultiPolygon geometries', () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
    };
    const [feature] = bansToFeatureCollection([makeBan({ geometry })]).features;
    expect(feature.geometry.type).toBe('MultiPolygon');
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
