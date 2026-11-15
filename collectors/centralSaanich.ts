import { CENTRAL_SANICH_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const centralSaanichCollector = standingBanCollector({
  authority: CENTRAL_SANICH_AUTHORITY,
  municipalityName: "District of Central Saanich",
  abmsName: "Central Saanich",
  type: "open-burning",
  title: "Open burning",
  description:
    "The District of Central Saanich allows open burning only from October 16 to May 15 (Open Burning Regulation Bylaw 2058), and only with a permit except for recreational campfires. " +
    "It is not permitted from May 16 to October 15. " +
    "Beach fires are not allowed at Island View Beach. " +
    "BC Wildfire Service orders do not apply inside the district.",
  rulesUrl: "https://www.centralsaanich.ca/burning",
  annualEffectivePeriod: { start: "05-16", end: "10-15" },
});
