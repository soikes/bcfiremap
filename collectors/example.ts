import type { Polygon } from 'geojson';
import { FireBan } from '../types/ban';
import { Collector } from './types';

/** Builds a closed rectangular Polygon from its edges. */
const rect = (south: number, west: number, north: number, east: number): Polygon => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

export const EXAMPLE_BANS: FireBan[] = [
  {
    id: 'provincial-kamloops-fc',
    source: 'example',
    level: 'provincial',
    region: 'Kamloops Fire Centre',
    type: 'campfire',
    description: 'No person shall light or maintain a campfire within the Kamloops Fire Centre area.',
    effectiveDate: '2026-07-01',
    geometry: rect(50, -123, 53, -117),
  },
  {
    id: 'provincial-okanagan-fc',
    source: 'example',
    level: 'provincial',
    region: 'Okanagan Fire Centre',
    type: 'campfire',
    description: 'No person shall light or maintain a campfire within the Okanagan Fire Centre area.',
    effectiveDate: '2026-07-01',
    geometry: rect(48.5, -120.5, 51, -117),
  },
  {
    id: 'rd-thompson-nicola',
    source: 'example',
    level: 'regional-district',
    region: 'Thompson-Nicola Regional District',
    type: 'open-burning',
    description: 'Category 2 and 3 open burning is prohibited throughout the Thompson-Nicola Regional District.',
    effectiveDate: '2026-06-15',
    geometry: rect(49.5, -121.5, 51.5, -118.5),
  },
  {
    id: 'muni-kamloops',
    source: 'example',
    level: 'municipal',
    region: 'City of Kamloops',
    type: 'all-fires',
    description: 'All open fires, including campfires and fire pits, are prohibited within City of Kamloops limits.',
    effectiveDate: '2026-06-01',
    geometry: rect(50.62, -120.65, 50.78, -120.2),
  },
  {
    id: 'muni-kelowna',
    source: 'example',
    level: 'municipal',
    region: 'City of Kelowna',
    type: 'category2-3',
    description: 'Category 2 and 3 open burning is prohibited within City of Kelowna limits year-round.',
    effectiveDate: '2026-05-15',
    geometry: rect(49.8, -119.65, 49.97, -119.35),
  },
];

export const exampleCollector: Collector = {
  id: 'example',
  name: 'Example data (not real)',
  coverage: 'Illustrative shapes for development only.',
  attribution: '',
  refetchIntervalMs: 60 * 60 * 1000,
  collect: async () => EXAMPLE_BANS,
};
