import type { Polygon } from 'geojson';
import { SourceStatus } from '../collectors/types';
import { FireBan } from '../types/ban';

/** Builds a closed rectangular Polygon from its edges. */
const rect = (south: number, west: number, north: number, east: number): Polygon => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

/** Five overlapping rectangular bans around Kamloops and Kelowna, for location lookup tests. */
export const SAMPLE_BANS: FireBan[] = [
  {
    id: 'provincial-kamloops-fc',
    source: 'test',
    level: 'provincial',
    region: 'Kamloops Fire Centre',
    type: 'campfire',
    description: 'Campfires prohibited.',
    geometry: rect(50, -123, 53, -117),
  },
  {
    id: 'provincial-okanagan-fc',
    source: 'test',
    level: 'provincial',
    region: 'Okanagan Fire Centre',
    type: 'campfire',
    description: 'Campfires prohibited.',
    geometry: rect(48.5, -120.5, 51, -117),
  },
  {
    id: 'rd-thompson-nicola',
    source: 'test',
    level: 'regional-district',
    region: 'Thompson-Nicola Regional District',
    type: 'open-burning',
    description: 'Open burning prohibited.',
    geometry: rect(49.5, -121.5, 51.5, -118.5),
  },
  {
    id: 'muni-kamloops',
    source: 'test',
    level: 'municipal',
    region: 'City of Kamloops',
    type: 'all-fires',
    description: 'All fires prohibited.',
    geometry: rect(50.62, -120.65, 50.78, -120.2),
  },
  {
    id: 'muni-kelowna',
    source: 'test',
    level: 'municipal',
    region: 'City of Kelowna',
    type: 'category2-3',
    description: 'Category 2 and 3 burning prohibited.',
    geometry: rect(49.8, -119.65, 49.97, -119.35),
  },
];

/** Builds a FireBan with sensible defaults, overridable per test. */
export const makeBan = (overrides: Partial<FireBan> = {}): FireBan => ({
  id: 'ban-1',
  source: 'test',
  level: 'provincial',
  region: 'Test Region',
  type: 'campfire',
  description: 'Test description.',
  effectiveDate: '2026-07-01',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-120, 49], [-119, 49], [-119, 50], [-120, 50], [-120, 49]]],
  },
  ...overrides,
});

/** Builds a SourceStatus for a source that loaded successfully, overridable per test. */
export const makeSource = (overrides: Partial<SourceStatus> = {}): SourceStatus => ({
  id: 'test',
  name: 'Test Source',
  coverage: 'Test coverage.',
  attribution: '',
  status: 'success',
  hasData: true,
  updatedAt: Date.UTC(2026, 6, 1, 19, 0),
  ...overrides,
});
