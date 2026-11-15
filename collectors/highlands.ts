import { HIGHLANDS_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const highlandsCollector = standingBanCollector({
  authority: HIGHLANDS_AUTHORITY,
  municipalityName: "District of Highlands",
  abmsName: "Highlands",
  otherwise: "by-permit-only",
  description:
    "The District of Highlands requires a permit from the Fire Chief for every open-air fire, campfires included, at any time of year (Fire Control and Protection Bylaw No. 474, 2025). " +
    "Permits are free and applied for online; campfires up to 0.5 metres and small open air fires are approved automatically. " +
    "Fires larger than a campfire may only be lit when the ventilation index is good. " +
    "Gas, propane and charcoal briquette appliances for residential use need no permit. " +
    "Provincial fire bans still apply.",
  rulesUrl:
    "https://www.highlands.ca/community-services/protective-services/fire-services/wood-and-backyard-burning/burning-permits",
});
