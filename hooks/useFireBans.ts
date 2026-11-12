import { useMemo } from 'react';
import { BanLevel, FireBan } from '../types/ban';
import { LatLng } from '../types/geo';
import { pointInGeometry } from '../utils/geometry';
import { logger } from '../utils/logger';

const LEVEL_ORDER: Record<BanLevel, number> = {
  provincial: 0,
  'regional-district': 1,
  municipal: 2,
};

/** Returns the bans whose area contains `location`, broadest first; empty when `location` is null. */
export function useFireBans(bans: FireBan[], location: LatLng | null): FireBan[] {
  return useMemo(() => {
    if (!location) return [];
    const hits = bans
      .filter(ban => pointInGeometry(location, ban.geometry))
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    logger.log('[useFireBans] bans at', location, hits.map(ban => ban.id));
    return hits;
  }, [bans, location]);
}
