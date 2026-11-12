import { FireBan } from '../data/fireBans';

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
