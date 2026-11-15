import { SOOKE_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const sookeCollector = standingBanCollector({
  authority: SOOKE_AUTHORITY,
  municipalityName: "District of Sooke",
  abmsName: "Sooke",
  activity: "backyard-burning",
  description:
    "The District of Sooke allows backyard burning from November 1 to April 30 (Fire Protection Services Bylaw No. 292) on these conditions: " +
    "the ventilation index is good, the weather is safe, and no municipal or provincial fire ban is in place; " +
    "the fire is small, supervised, at least 15 metres from any building or property line, and burns only clean, dry firewood or yard debris. " +
    "Larger fires, yard waste burning and land clearing need a permit from Sooke Fire Rescue. " +
    "Backyard burning is not permitted from May 1 to October 31. " +
    "Campfires follow the BC Wildfire Service Coastal Fire Centre rules.",
  rulesUrl: "https://www.sooke.ca/municipal-hall/bylaws/burning-regulations/",
  periods: [
    { permission: "allowed-with-conditions", annual: { start: "11-01", end: "04-30" } },
  ],
});
