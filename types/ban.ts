import type { MultiPolygon, Polygon } from 'geojson';

export type BanLevel = 'provincial' | 'regional-district' | 'municipal';

export type BanType = 'campfire' | 'open-burning' | 'all-fires' | 'category2-3' | 'other';

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
