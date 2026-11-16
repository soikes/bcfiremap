import type { Polygon } from 'geojson';
import { SourceStatus } from '../types/api';
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
    activity: 'campfire',
    description: 'Campfires prohibited.',
    periods: [],
    otherwise: 'prohibited',
    geometry: rect(50, -123, 53, -117),
  },
  {
    id: 'provincial-okanagan-fc',
    source: 'test',
    level: 'provincial',
    region: 'Okanagan Fire Centre',
    activity: 'campfire',
    description: 'Campfires prohibited.',
    periods: [],
    otherwise: 'prohibited',
    geometry: rect(48.5, -120.5, 51, -117),
  },
  {
    id: 'rd-thompson-nicola',
    source: 'test',
    level: 'regional-district',
    region: 'Thompson-Nicola Regional District',
    activity: 'open-burning',
    description: 'Open burning prohibited.',
    periods: [],
    otherwise: 'prohibited',
    geometry: rect(49.5, -121.5, 51.5, -118.5),
  },
  {
    id: 'muni-kamloops',
    source: 'test',
    level: 'municipal',
    region: 'City of Kamloops',
    activity: 'all-fires',
    description: 'All fires prohibited.',
    periods: [],
    otherwise: 'prohibited',
    geometry: rect(50.62, -120.65, 50.78, -120.2),
  },
  {
    id: 'muni-kelowna',
    source: 'test',
    level: 'municipal',
    region: 'City of Kelowna',
    activity: 'category2-3',
    description: 'Category 2 and 3 burning prohibited.',
    periods: [],
    otherwise: 'prohibited',
    geometry: rect(49.8, -119.65, 49.97, -119.35),
  },
];

/** Builds a FireBan with sensible defaults, overridable per test. */
export const makeBan = (overrides: Partial<FireBan> = {}): FireBan => ({
  id: 'ban-1',
  source: 'test',
  level: 'provincial',
  region: 'Test Region',
  activity: 'campfire',
  description: 'Test description.',
  periods: [],
  otherwise: 'prohibited',
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
  updatedAt: Date.UTC(2026, 6, 1, 19, 0),
  ...overrides,
});

/** Like `makeBan`, but an activity that is allowed everywhere all year. */
export const makeAllowedBan = (overrides: Partial<FireBan> = {}): FireBan => makeBan({ otherwise: 'allowed', ...overrides });

/** Like `makeBan`, but an activity that is allowed only by permit everywhere all year. */
export const makePermitBan = (overrides: Partial<FireBan> = {}): FireBan => makeBan({ otherwise: 'by-permit-only', ...overrides });
