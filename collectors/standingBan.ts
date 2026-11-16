import municipalBoundaries from "../data/boundaries/municipalities.json";
import { Area } from "../types/area";
import { Activity, FireBan, Period, Permission } from "../types/ban";
import { Authority } from "../types/authority";
import { Collector } from "../types/collector";
import { parseAreas } from "../utils/abms";
import { logger } from "../utils/logger";

const STORED_MUNICIPALITIES = parseAreas(municipalBoundaries, "municipality");

export interface StandingBanConfig {
  authority: Authority;
  municipalityName: string;
  abmsName: string;
  key?: string;
  activity?: Activity;
  description: string;
  rulesUrl: string;
  periods?: Period[];
  otherwise?: Permission;
}

/** Builds one of a municipality's standing rules over its boundary: prohibited outside its periods unless the config says otherwise. */
export function buildStandingBan(
  config: StandingBanConfig,
  geometry: FireBan["geometry"],
): FireBan {
  return {
    id: `${config.authority.id}:${config.key ?? "open-fires"}`,
    source: config.authority.id,
    level: "municipal",
    region: config.municipalityName,
    activity: config.activity ?? "all-fires",
    description: config.description,
    url: config.rulesUrl,
    authorityId: config.authority.id,
    periods: config.periods ?? [],
    otherwise: config.otherwise ?? "prohibited",
    geometry,
  };
}

/** Creates a collector that puts a municipality's standing rules (one config each, all for the same municipality) on its boundary from the stored ABMS copy. */
export function standingBanCollector(
  config: StandingBanConfig | StandingBanConfig[],
  municipalities: Area[] = STORED_MUNICIPALITIES,
): Collector {
  const configs = [config].flat();
  const { authority, municipalityName, abmsName } = configs[0];
  return {
    id: authority.id,
    name: municipalityName,
    coverage: `The standing open fire rules inside the ${municipalityName} boundary.`,
    attribution: `${municipalityName} fire rules; boundary contains information licensed under the Open Government Licence – British Columbia.`,
    collect: async () => {
      const area = municipalities.find((each) => each.name === abmsName);
      if (!area) throw new Error(`${municipalityName} boundary not found`);
      logger.log(`[${authority.id}] built ${configs.length} standing rule(s)`);
      return configs.map((each) => buildStandingBan(each, area.geometry));
    },
  };
}
