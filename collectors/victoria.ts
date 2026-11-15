import { VICTORIA_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const victoriaCollector = standingBanCollector({
  authority: VICTORIA_AUTHORITY,
  municipalityName: "City of Victoria",
  abmsName: "Victoria",
  description:
    "The City of Victoria does not permit open fires, including beach fires, at any time of year. " +
    "The only exception in parks, on beaches and on boulevards is a CSA-approved natural gas or propane device used solely for cooking; fire rings are not permitted. " +
    "Open-air burning elsewhere needs a permit from the Victoria Fire Department, granted only for religious, cultural or special events, fire department training, or ecological or conservation purposes. " +
    "BC Wildfire Service orders do not apply inside the city.",
  rulesUrl:
    "https://www.victoria.ca/city-government/bylaw-services/fire-prevention-and-regulation-bylaw",
});
