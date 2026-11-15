import { COLWOOD_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const colwoodCollector = standingBanCollector({
  authority: COLWOOD_AUTHORITY,
  municipalityName: "City of Colwood",
  abmsName: "Colwood",
  description:
    "The City of Colwood prohibits open yard fires, beach fires and campfires, as well as land clearing, demolition and construction waste fires, at any time of year. " +
    "Outdoor fire appliances such as propane or natural gas fire pits are allowed, but not when the local fire rating is high or extreme. " +
    "BC Wildfire Service orders do not apply inside the city.",
  rulesUrl: "https://www.colwood.ca/community-services/safety/fire",
});
