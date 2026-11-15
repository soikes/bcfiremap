import type { MultiPolygon, Polygon } from "geojson";
import type { ACTIVITIES, BAN_LEVELS, PERMISSIONS } from "../constants/ban";
import type { Applicability } from "./area";
import { MonthDayRange } from "../utils/monthDay";

export type BanLevel = (typeof BAN_LEVELS)[number];

export type Activity = (typeof ACTIVITIES)[number];

export type Permission = (typeof PERMISSIONS)[number];

/** A stretch of time with its own permission: between `from` and `until` (dates or timestamps, either optional), and, if `annual` is set, only on those days of each year. */
export interface Period {
  permission: Permission;
  annual?: MonthDayRange;
  from?: string;
  until?: string;
}

/** What one authority says about one activity inside one area: the permission in the first of its periods that covers today, or `otherwise` when none does. */
export interface FireBan {
  id: string;
  source: string;
  level: BanLevel;
  region: string;
  activity: Activity;
  title?: string;
  description: string;
  periods: Period[];
  otherwise: Permission;
  url?: string;
  authorityId?: string;
  applicability?: Applicability;
  geometry: Polygon | MultiPolygon;
}
