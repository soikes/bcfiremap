import { FireBan, BanType } from "../types/ban";
import { Authority } from "../types/authority";
import { Collector } from "../types/collector";
import { fetchAreas } from "../utils/abms";
import { logger } from "../utils/logger";
import { MonthDay, MonthDayRange } from "../utils/monthDay";

export interface StandingBanConfig {
  authority: Authority;
  municipalityName: string;
  abmsName: string;
  key?: string;
  type?: BanType;
  title: string;
  description: string;
  rulesUrl: string;
  effectiveDate?: string;
  expiryDate?: string;
  annualEffectivePeriod?: MonthDayRange;
}

/** Builds one of a municipality's standing bans over its boundary. */
export function buildStandingBan(
  config: StandingBanConfig,
  geometry: FireBan["geometry"],
): FireBan {
  return {
    id: `${config.authority.id}:${config.key ?? "open-fires"}`,
    source: config.authority.id,
    level: "municipal",
    region: config.municipalityName,
    type: config.type ?? "all-fires",
    title: config.title,
    description: config.description,
    url: config.rulesUrl,
    authorityId: config.authority.id,
    effectiveDate: config.effectiveDate,
    expiryDate: config.expiryDate,
    annualEffectivePeriod: config.annualEffectivePeriod ?? {
      start: "01-01",
      end: "12-31",
    },
    geometry,
  };
}

/** Creates a collector that puts a municipality's standing bans (one config each, all for the same municipality) on its ABMS boundary. */
export function standingBanCollector(
  config: StandingBanConfig | StandingBanConfig[],
): Collector {
  const configs = [config].flat();
  const { authority, municipalityName, abmsName } = configs[0];
  return {
    id: authority.id,
    name: municipalityName,
    coverage: `The standing open fire prohibitions inside the ${municipalityName} boundary.`,
    attribution: `${municipalityName} fire rules; boundary contains information licensed under the Open Government Licence – British Columbia.`,
    refetchIntervalMs: 7 * 24 * 60 * 60 * 1000,
    collect: async (signal) => {
      const [area] = await fetchAreas(
        "municipality",
        `ADMIN_AREA_ABBREVIATION='${abmsName}'`,
        signal,
      );
      if (!area) throw new Error(`${municipalityName} boundary not found`);
      logger.log(`[${authority.id}] built ${configs.length} standing ban(s)`);
      return configs.map((each) => buildStandingBan(each, area.geometry));
    },
  };
}
