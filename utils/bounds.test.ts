import { describe, expect, it } from 'bun:test';
import { makeBan } from '../test/fixtures';
import { focusBounds } from './bounds';

const square = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon' as const,
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

describe('focusBounds', () => {
  it('is just the point when there are no bans', () => {
    expect(focusBounds([], { latitude: 49, longitude: -123 })).toEqual({ west: -123, south: 49, east: -123, north: 49 });
  });

  it('covers one ban’s area', () => {
    const ban = makeBan({ geometry: square(-120, 49, -119, 50) });
    expect(focusBounds([ban], { latitude: 49.5, longitude: -119.5 })).toEqual({ west: -120, south: 49, east: -119, north: 50 });
  });

  it('covers every ban together, including all parts of a MultiPolygon', () => {
    const multi = { type: 'MultiPolygon' as const, coordinates: [square(-125, 48, -124, 49).coordinates, square(-118, 52, -117, 53).coordinates] };
    const bans = [makeBan({ id: 'a', geometry: square(-120, 49, -119, 50) }), makeBan({ id: 'b', geometry: multi })];
    expect(focusBounds(bans, { latitude: 49.5, longitude: -119.5 })).toEqual({ west: -125, south: 48, east: -117, north: 53 });
  });

  it('stretches to include a point outside the bans', () => {
    const ban = makeBan({ geometry: square(-120, 49, -119, 50) });
    expect(focusBounds([ban], { latitude: 55, longitude: -110 })).toEqual({ west: -120, south: 49, east: -110, north: 55 });
  });
});
