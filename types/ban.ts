import type { MultiPolygon, Polygon } from "geojson";
import type { BAN_LEVELS, BAN_TYPES } from "../constants/ban";
import type { Applicability } from "./area";
import { MonthDay, MonthDayRange } from "../utils/monthDay";

export type BanLevel = (typeof BAN_LEVELS)[number];

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
  annualEffectivePeriod?: MonthDayRange;
  url?: string;
  authorityId?: string;
  applicability?: Applicability;
  geometry: Polygon | MultiPolygon;
}
