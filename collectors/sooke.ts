import { SOOKE_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const sookeCollector = standingBanCollector({
  authority: SOOKE_AUTHORITY,
  municipalityName: "District of Sooke",
  abmsName: "Sooke",
  type: "open-burning",
  title: "Backyard burning not permitted",
  description:
    "The District of Sooke allows backyard burning only from November 1 to April 30 (Fire Protection Services Bylaw No. 292), and only when the ventilation index is good and no fire ban is in place. " +
    "It is not permitted from May 1 to October 31. " +
    "Campfires follow the BC Wildfire Service Coastal Fire Centre rules.",
  rulesUrl: "https://www.sooke.ca/municipal-hall/bylaws/burning-regulations/",
  annualEffectivePeriod: { start: "05-01", end: "10-31" },
});
