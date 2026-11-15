import { VIEW_ROYAL_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const viewRoyalCollector = standingBanCollector({
  authority: VIEW_ROYAL_AUTHORITY,
  municipalityName: "Town of View Royal",
  abmsName: "View Royal",
  title: "Outdoor burning",
  description:
    "The Town of View Royal does not permit outdoor burning of any kind, including open air fires and fires in incinerators such as barrels and drums, at any time of year. " +
    "Indoor fireplaces and wood stoves, outdoor gas-fired appliances, outdoor appliances that burn charcoal briquettes and fire department training fires are exempt. " +
    "BC Wildfire Service orders do not apply inside the town.",
  rulesUrl:
    "https://www.viewroyal.ca/EN/main/municipal/emergency-services/fire-department/firesmart.html",
  annualEffectivePeriod: { start: "01-01", end: "12-31" },
});
