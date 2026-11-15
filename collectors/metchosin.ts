import { METCHOSIN_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

const base = {
  authority: METCHOSIN_AUTHORITY,
  municipalityName: "District of Metchosin",
  abmsName: "Metchosin",
  rulesUrl: "https://www.metchosin.ca/fire-department/burning-regulation",
};

export const metchosinCollector = standingBanCollector([
  {
    ...base,
    key: "beach-fires",
    activity: "beach-fire",
    description:
      "Fires are not permitted on any beach in the District of Metchosin, at any time of year (Fire Regulation and Prevention Bylaw No. 269, 1996). " +
      "Propane fire pits are allowed. " +
      "BC Wildfire Service orders do not apply inside the district.",
  },
  {
    ...base,
    key: "campfires",
    activity: "campfire",
    otherwise: "allowed-with-conditions",
    description:
      "The District of Metchosin allows campfires for cooking without a permit, on these conditions: " +
      "no larger than 0.6 metres across, in a designated fire pit or approved appliance, burning only clean dry firewood, " +
      "at least 6 metres from any structure or vegetation, with a hose or tool on hand, and fully extinguished with water by midnight. " +
      "Small open burns do not count as campfires. " +
      "Provincial campfire bans still apply.",
  },
  {
    ...base,
    key: "backyard-burning",
    activity: "backyard-burning",
    description:
      "The District of Metchosin allows residential backyard burning from October 1 to May 31, unless otherwise posted, without a permit, on these conditions: " +
      "dry leaves and yard waste under 10 cm across from the same property, a pile no larger than 3 metres across for no more than three consecutive days, " +
      "at least 20 metres from any structure and 10 metres from trees, fences or shrubs, with a hose or tools on hand, and fully extinguished by 6 pm. " +
      "It is not permitted from June 1 to September 30. " +
      "Burning larger debris needs a written permit.",
    periods: [
      { permission: "allowed-with-conditions", annual: { start: "10-01", end: "05-31" } },
    ],
  },
]);
