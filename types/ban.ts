import type { MultiPolygon, Polygon } from 'geojson';

export const BAN_LEVELS = ['provincial', 'regional-district', 'municipal'] as const;

export type BanLevel = (typeof BAN_LEVELS)[number];

export const BAN_TYPES = ['campfire', 'open-burning', 'all-fires', 'category2-3', 'other'] as const;

export type BanType = (typeof BAN_TYPES)[number];

export interface FireBan {
  id: string;
  source: string;
  level: BanLevel;
  region: string;
  type: BanType;
  title?: string;
  description: string;
  effectiveDate?: string;
  expiryDate?: string;
  url?: string;
  geometry: Polygon | MultiPolygon;
}
