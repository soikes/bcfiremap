import type { MultiPolygon, Polygon } from 'geojson';
import { pointInGeometry } from './geometry';

const point = (latitude: number, longitude: number) => ({ latitude, longitude });

const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const hole = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
const farSquare = [[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]];

const plain: Polygon = { type: 'Polygon', coordinates: [square] };
const withHole: Polygon = { type: 'Polygon', coordinates: [square, hole] };
const twoParts: MultiPolygon = { type: 'MultiPolygon', coordinates: [[square], [farSquare]] };

describe('pointInGeometry', () => {
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
