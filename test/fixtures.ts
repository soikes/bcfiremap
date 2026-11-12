import { FireBan } from '../data/fireBans';
import { FireZone } from '../hooks/useFireZones';

/** Builds a FireBan with sensible defaults, overridable per test. */
export const makeBan = (overrides: Partial<FireBan> = {}): FireBan => ({
  id: 'ban-1',
  level: 'provincial',
  region: 'Test Region',
  type: 'campfire',
  description: 'Test description.',
  effectiveDate: '2026-07-01',
  polygon: [
    { latitude: 49, longitude: -120 },
    { latitude: 49, longitude: -119 },
    { latitude: 50, longitude: -119 },
    { latitude: 50, longitude: -120 },
  ],
  ...overrides,
});

/** Builds a FireZone with one polygon that has one hole. */
export const makeZone = (overrides: Partial<FireZone> = {}): FireZone => ({
  id: 'zone-0',
  name: 'Test Zone',
  centre: 'Test Centre',
  polygons: [
    {
      outer: [
        { latitude: 49, longitude: -120 },
        { latitude: 49, longitude: -119 },
        { latitude: 50, longitude: -119 },
      ],
      holes: [
        [
          { latitude: 49.1, longitude: -119.9 },
          { latitude: 49.1, longitude: -119.8 },
          { latitude: 49.2, longitude: -119.8 },
        ],
      ],
    },
  ],
  centroid: { latitude: 49.3, longitude: -119.6 },
  ...overrides,
});
