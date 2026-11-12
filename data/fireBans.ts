import { LatLng } from '../types/geo';

export type BanLevel = 'provincial' | 'regional-district' | 'municipal';

export type BanType =
  | 'campfire'
  | 'open-burning'
  | 'all-fires'
  | 'category2-3';

export interface FireBan {
  id: string;
  level: BanLevel;
  region: string;
  type: BanType;
  description: string;
  effectiveDate: string;
  expiryDate?: string;
  /** Closed polygon bounding this ban's jurisdiction. */
  polygon: LatLng[];
}

/**
 * Example fire bans for several BC jurisdictions.
 *
 * These are simplified rectangular polygons illustrating the layering system:
 *   - Tapping near Kamloops (~50.67°N, 120.33°W) hits bans 1, 3, and 4.
 *   - Tapping near Kelowna (~49.89°N, 119.50°W) hits bans 2 and 5.
 *   - Tapping in rural northern BC hits nothing.
 */
export const EXAMPLE_FIRE_BANS: FireBan[] = [
  {
    id: 'provincial-kamloops-fc',
    level: 'provincial',
    region: 'Kamloops Fire Centre',
    type: 'campfire',
    description:
      'No person shall light or maintain a campfire within the Kamloops Fire Centre area.',
    effectiveDate: '2026-07-01',
    polygon: [
      { latitude: 50.0, longitude: -123.0 },
      { latitude: 53.0, longitude: -123.0 },
      { latitude: 53.0, longitude: -117.0 },
      { latitude: 50.0, longitude: -117.0 },
    ],
  },
  {
    id: 'provincial-okanagan-fc',
    level: 'provincial',
    region: 'Okanagan Fire Centre',
    type: 'campfire',
    description:
      'No person shall light or maintain a campfire within the Okanagan Fire Centre area.',
    effectiveDate: '2026-07-01',
    polygon: [
      { latitude: 48.5, longitude: -120.5 },
      { latitude: 51.0, longitude: -120.5 },
      { latitude: 51.0, longitude: -117.0 },
      { latitude: 48.5, longitude: -117.0 },
    ],
  },
  {
    id: 'rd-thompson-nicola',
    level: 'regional-district',
    region: 'Thompson-Nicola Regional District',
    type: 'open-burning',
    description:
      'Category 2 and 3 open burning is prohibited throughout the Thompson-Nicola Regional District.',
    effectiveDate: '2026-06-15',
    polygon: [
      { latitude: 49.5, longitude: -121.5 },
      { latitude: 51.5, longitude: -121.5 },
      { latitude: 51.5, longitude: -118.5 },
      { latitude: 49.5, longitude: -118.5 },
    ],
  },
  {
    id: 'muni-kamloops',
    level: 'municipal',
    region: 'City of Kamloops',
    type: 'all-fires',
    description:
      'All open fires, including campfires and fire pits, are prohibited within City of Kamloops limits.',
    effectiveDate: '2026-06-01',
    polygon: [
      { latitude: 50.62, longitude: -120.65 },
      { latitude: 50.78, longitude: -120.65 },
      { latitude: 50.78, longitude: -120.20 },
      { latitude: 50.62, longitude: -120.20 },
    ],
  },
  {
    id: 'muni-kelowna',
    level: 'municipal',
    region: 'City of Kelowna',
    type: 'category2-3',
    description:
      'Category 2 and 3 open burning is prohibited within City of Kelowna limits year-round.',
    effectiveDate: '2026-05-15',
    polygon: [
      { latitude: 49.80, longitude: -119.65 },
      { latitude: 49.97, longitude: -119.65 },
      { latitude: 49.97, longitude: -119.35 },
      { latitude: 49.80, longitude: -119.35 },
    ],
  },
];
