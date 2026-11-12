import { SourceStatus } from '../collectors/types';
import { FireBan } from '../types/ban';

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
