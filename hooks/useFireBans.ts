import { useMemo } from "react";
import { BanLevel, FireBan } from "../types/ban";
import { LatLng } from "../types/geo";
import { pointInGeometry } from "../utils/geometry";
import { logger } from "../utils/logger";
import { isDateInMonthDayRange } from "../utils/monthDay";

const LEVEL_ORDER: Record<BanLevel, number> = {
  provincial: 0,
  "regional-district": 1,
  municipal: 2,
};

/** True if the ban's area contains the location; false, with a logged error, if its geometry can't be checked. */
function covers(ban: FireBan, location: LatLng): boolean {
  try {
    return pointInGeometry(location, ban.geometry);
  } catch (error) {
    logger.error(
      `[useFireBans] skipping ban ${ban.id} with an unreadable geometry`,
      error,
    );
    return false;
  }
}

/** True if the ban is active. Relevant for partial yearly standing bans. */
export function active(ban: FireBan): boolean {
  if (!ban.annualEffectivePeriod) return true;
  const now: Date = new Date();
  return isDateInMonthDayRange(now, ban.annualEffectivePeriod);
}

/** Returns the bans whose area contains `location`, broadest first; empty when `location` is null. */
export function useFireBans(
  bans: FireBan[],
  location: LatLng | null,
): FireBan[] {
  return useMemo(() => {
    if (!location) return [];
    const hits = bans
      .filter((ban) => covers(ban, location))
      .filter((ban) => active(ban))
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    logger.log(
      "[useFireBans] bans at",
      location,
      hits.map((ban) => ban.id),
    );
    return hits;
  }, [bans, location]);
}
