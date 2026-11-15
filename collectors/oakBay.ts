import { OAK_BAY_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const oakBayCollector = standingBanCollector({
  authority: OAK_BAY_AUTHORITY,
  municipalityName: "District of Oak Bay",
  abmsName: "Oak Bay",
  description:
    "The District of Oak Bay does not permit outdoor fires, including backyard burning and beach fires. " +
    "A fire fuelled only by propane, natural gas or charcoal briquettes may be permitted under local and provincial rules. " +
    "BC Wildfire Service orders do not apply inside the district.",
  rulesUrl:
    "https://www.oakbay.ca/services/public-safety/oak-bay-fire/fire-prevention/",
});
