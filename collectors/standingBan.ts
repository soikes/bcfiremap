import { FireBan } from '../types/ban';
import { Authority } from '../types/authority';
import { Collector } from '../types/collector';
import { fetchAreas } from '../utils/abms';
import { logger } from '../utils/logger';

export interface StandingBanConfig {
  authority: Authority;
  municipalityName: string;
  abmsName: string;
  title: string;
  description: string;
  rulesUrl: string;
}

/** Builds a municipality's standing year-round ban over its boundary. */
export function buildStandingBan(config: StandingBanConfig, geometry: FireBan['geometry']): FireBan {
  return {
    id: `${config.authority.id}:open-fires`,
    source: config.authority.id,
    level: 'municipal',
    region: config.municipalityName,
    type: 'all-fires',
    title: config.title,
    description: config.description,
    url: config.rulesUrl,
    authorityId: config.authority.id,
    geometry,
  };
}

/** Creates a collector that puts a municipality's standing ban on its ABMS boundary. */
export function standingBanCollector(config: StandingBanConfig): Collector {
  const { authority, municipalityName } = config;
  return {
    id: authority.id,
    name: municipalityName,
    coverage: `The standing year-round open fire prohibition inside the ${municipalityName} boundary.`,
    attribution: `${municipalityName} fire rules; boundary contains information licensed under the Open Government Licence – British Columbia.`,
    refetchIntervalMs: 24 * 60 * 60 * 1000,
    collect: async signal => {
      const [area] = await fetchAreas('municipality', `ADMIN_AREA_ABBREVIATION='${config.abmsName}'`, signal);
      if (!area) throw new Error(`${municipalityName} boundary not found`);
      logger.log(`[${authority.id}] built the standing open fire ban`);
      return [buildStandingBan(config, area.geometry)];
    },
  };
}
