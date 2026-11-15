import { describe, expect, it } from 'bun:test';
import { BCWS_APPLICABILITY } from '../constants/area';
import { Area, AreaKind } from '../types/area';
import { FireBan } from '../types/ban';
import { appliesAt, areasAt } from './areas';

const box = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon' as const,
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

const area = (id: string, kind: AreaKind, geometry = box(-124, 48, -123, 49)): Area => ({
  id,
  name: id,
  kind,
  source: 'test',
  geometry,
});

const bcwsBan: FireBan = {
  id: 'bcws:1',
  source: 'bcws',
  level: 'provincial',
  region: 'South Island Fire Zone',
  activity: 'campfire',
  periods: [],
  otherwise: 'prohibited',
  description: '',
  applicability: BCWS_APPLICABILITY,
  geometry: box(-125, 47, -122, 50),
};

const inside = { latitude: 48.5, longitude: -123.5 };
const outside = { latitude: 48.5, longitude: -122.5 };

describe('areasAt', () => {
  it('returns only the areas that contain the location', () => {
    const areas = [area('city', 'municipality'), area('elsewhere', 'municipality', box(-122, 48, -121, 49))];
    expect(areasAt(areas, inside).map(a => a.id)).toEqual(['city']);
  });
});

describe('appliesAt', () => {
  it('applies a ban with no applicability rule everywhere it is declared', () => {
    expect(appliesAt({ ...bcwsBan, applicability: undefined }, inside, [area('city', 'municipality')])).toBe(true);
  });

  it('skips a BCWS ban inside a municipality', () => {
    expect(appliesAt(bcwsBan, inside, [area('city', 'municipality')])).toBe(false);
  });

  it('applies a BCWS ban outside municipalities', () => {
    expect(appliesAt(bcwsBan, outside, [area('city', 'municipality')])).toBe(true);
  });

  it('applies a BCWS ban in a provincial park inside a municipality', () => {
    const areas = [area('city', 'municipality'), area('park', 'provincial-park')];
    expect(appliesAt(bcwsBan, inside, areas)).toBe(true);
  });
});
