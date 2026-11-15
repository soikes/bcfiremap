import { useMemo } from "react";
import { BanLevel, FireBan } from "../types/ban";
import { LatLng } from "../types/geo";
import { active } from "../utils/bans";
import { pointInGeometry } from "../utils/geometry";
import { logger } from "../utils/logger";

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

/** Returns the bans whose area contains `location`, active ones first and each group broadest first; empty when `location` is null. */
export function useFireBans(
  bans: FireBan[],
  location: LatLng | null,
): FireBan[] {
  return useMemo(() => {
    if (!location) return [];
    const hits = bans
      .filter((ban) => covers(ban, location))
      .sort(
        (a, b) =>
          Number(active(b)) - Number(active(a)) ||
          LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level],
      );
    logger.log(
      "[useFireBans] bans at",
      location,
      hits.map((ban) => ban.id),
    );
    return hits;
  }, [bans, location]);
}
