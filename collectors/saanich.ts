import { SAANICH_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const saanichCollector = standingBanCollector({
  authority: SAANICH_AUTHORITY,
  municipalityName: "District of Saanich",
  abmsName: "Saanich",
  activity: "campfire",
  description:
    "The District of Saanich does not permit beach fires or wood-burning fire pits, fireplaces, pizza ovens or chimineas (Fire Prevention and Life Safety Bylaw No. 9712). " +
    "Propane, natural gas and charcoal cooking appliances are allowed. " +
    "All open burning is prohibited from May 1 to October 15. " +
    "Yard and garden refuse burning is never permitted inside the Urban Containment Boundary; outside it, it is allowed from October 16 to April 30, on Fridays and Saturday mornings without a permit or any day with one. " +
    "BC Wildfire Service orders do not apply inside the district.",
  rulesUrl:
    "https://www.saanich.ca/EN/main/community/fire-prevention-safety/outdoor-burning.html",
});
