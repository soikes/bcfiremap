import { useMemo } from 'react';
import { LatLng } from './useFireZones';
import { FireBan, EXAMPLE_FIRE_BANS } from '../data/fireBans';
import { pointInPolygon } from '../utils/pointInPolygon';

const LEVEL_ORDER: Record<FireBan['level'], number> = {
  provincial: 0,
  'regional-district': 1,
  municipal: 2,
};

/**
 * Returns all fire bans whose jurisdiction polygon contains `location`,
 * sorted from broadest to most local (provincial → regional → municipal).
 * Returns an empty array when `location` is null.
 */
export function useFireBans(location: LatLng | null): FireBan[] {
  return useMemo(() => {
    if (!location) return [];
    return EXAMPLE_FIRE_BANS
      .filter(ban => pointInPolygon(location, ban.polygon))
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  }, [location]);
}
