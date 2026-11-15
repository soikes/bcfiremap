import { NORTH_SAANICH_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

const base = {
  authority: NORTH_SAANICH_AUTHORITY,
  municipalityName: "District of North Saanich",
  abmsName: "North Saanich",
  rulesUrl: "https://www.northsaanich.ca/outdoor-burning",
};

export const northSaanichCollector = standingBanCollector([
  {
    ...base,
    key: "campfires",
    activity: "campfire",
    otherwise: "by-permit-only",
    description:
      "The District of North Saanich requires an annual permit ($25) from the Fire Department for outdoor fire appliances such as fire bowls, chimneys, outdoor fireplaces and pizza ovens. " +
      "They are for cooking and quiet enjoyment only, burning clean dry wood or charcoal, between sunrise and 10 pm, at least 10 feet from any building and 25 feet from the property line. " +
      "They may not be used while a provincial fire ban is in effect.",
  },
  {
    ...base,
    key: "open-burning",
    activity: "open-burning",
    description:
      "The District of North Saanich allows open burning of yard waste only in its burning season, which opens in early November and closes in mid-May, with a permit ($25 or $35 a year), only on the burn days listed in the district's yearly calendar (the first and third Thursday, Friday and Saturday), from sunrise to sunset, and only when the ventilation index is good. " +
      "Open burning is not permitted outside the season. " +
      "No burning other than appliances is allowed in the Dean Park area, west of East Saanich Road and south of Forest Park Drive to the district's southern border.",
    periods: [
      { permission: "by-permit-only", annual: { start: "11-01", end: "05-15" } },
    ],
  },
]);
