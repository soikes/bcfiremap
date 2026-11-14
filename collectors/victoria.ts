import { VICTORIA_AUTHORITY } from '../constants/authority';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { logger } from '../utils/logger';
import { fetchAreas } from '../utils/abms';

const SOURCE_ID = 'victoria';

const RULES_URL = 'https://www.victoria.ca/node/2500';

/** Builds the City of Victoria's standing open fire prohibition over the city boundary. */
export function buildVictoriaBan(geometry: FireBan['geometry']): FireBan {
  return {
    id: `${SOURCE_ID}:open-fires`,
    source: SOURCE_ID,
    level: 'municipal',
    region: 'City of Victoria',
    type: 'all-fires',
    title: 'Open fires not permitted',
    description:
      'The City of Victoria does not permit open fires, including beach fires, at any time of year. ' +
      'BC Wildfire Service orders do not apply inside the city.',
    url: RULES_URL,
    authorityId: VICTORIA_AUTHORITY.id,
    geometry,
  };
}

export const victoriaCollector: Collector = {
  id: SOURCE_ID,
  name: 'City of Victoria',
  coverage: 'The standing year-round open fire prohibition inside the City of Victoria boundary.',
  attribution:
    'City of Victoria fire rules; boundary contains information licensed under the Open Government Licence – British Columbia.',
  refetchIntervalMs: 24 * 60 * 60 * 1000,
  collect: async signal => {
    const [city] = await fetchAreas('municipality', "ADMIN_AREA_ABBREVIATION='Victoria'", signal);
    if (!city) throw new Error('City of Victoria boundary not found');
    logger.log('[victoria] built the standing open fire ban');
    return [buildVictoriaBan(city.geometry)];
  },
};
