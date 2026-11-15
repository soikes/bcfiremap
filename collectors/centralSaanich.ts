import { CENTRAL_SANICH_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const centralSaanichCollector = standingBanCollector({
  authority: CENTRAL_SANICH_AUTHORITY,
  municipalityName: "District of Central Saanich",
  abmsName: "Central Saanich",
  key: "campfires",
  activity: "campfire",
  otherwise: "allowed",
  description:
    "The District of Central Saanich allows recreational fires all year without a permit (Open Burning Regulation Bylaw 2058), unless a fire ban is in place. " +
    "A recreational fire is a campfire no larger than 0.5 metres high and wide, burning clean firewood, at least 3 metres from any building, fence, property line, tree or other combustible. " +
    "Beach fires are not allowed at Island View Beach. " +
    "Yard waste burning is a separate matter: it needs a permit and is allowed only from October 16 to May 15.",
  rulesUrl: "https://www.centralsaanich.ca/burning",
});
