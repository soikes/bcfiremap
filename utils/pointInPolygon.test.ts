import { pointInPolygon } from './pointInPolygon';

const ring = (points: [number, number][]) =>
  points.map(([latitude, longitude]) => ({ latitude, longitude }));

const point = (latitude: number, longitude: number) => ({ latitude, longitude });

const square = ring([[0, 0], [0, 10], [10, 10], [10, 0]]);

// L shape: lat 0-5 across lng 0-10, plus lat 5-10 across lng 0-5
const lShape = ring([[0, 0], [0, 10], [5, 10], [5, 5], [10, 5], [10, 0]]);

describe('pointInPolygon', () => {
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
