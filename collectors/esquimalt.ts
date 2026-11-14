import { ESQUIMALT_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const esquimaltCollector = standingBanCollector({
  authority: ESQUIMALT_AUTHORITY,
  municipalityName: "Township of Esquimalt",
  abmsName: "Esquimalt",
  title: "Outdoor fires not permitted",
  description:
    "The Township of Esquimalt does not permit outdoor fires, including backyard burning and beach fires. " +
    "A fire fuelled only by propane, natural gas or charcoal briquettes may be permitted under local and provincial rules. " +
    "BC Wildfire Service orders do not apply inside the township.",
  rulesUrl:
    "https://www.esquimalt.ca/municipal-services/esquimalt-fire-rescue-services/fire-bylaws-and-permits",
  annualEffectivePeriod: { start: "01-01", end: "12-31" },
});