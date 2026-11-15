import { METCHOSIN_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

const base = {
  authority: METCHOSIN_AUTHORITY,
  municipalityName: "District of Metchosin",
  abmsName: "Metchosin",
  rulesUrl: "https://www.metchosin.ca/node/448",
};

export const metchosinCollector = standingBanCollector([
  {
    ...base,
    key: "beach-fires",
    activity: "beach-fire",
    description:
      "The District of Metchosin prohibits beach fires at any time of year (Fire Regulation and Prevention Bylaw No. 269, 1996). " +
      "Propane fire pits are allowed. " +
      "BC Wildfire Service orders do not apply inside the district.",
  },
  {
    ...base,
    key: "backyard-burning",
    activity: "backyard-burning",
    description:
      "The District of Metchosin allows backyard open burning only from October 1 to May 31, in daylight hours and with only dry yard debris from the same property. " +
      "It is not permitted from June 1 to September 30. " +
      "BC Wildfire Service orders do not apply inside the district.",
    periods: [
      { permission: "allowed", annual: { start: "10-01", end: "05-31" } },
    ],
  },
]);
