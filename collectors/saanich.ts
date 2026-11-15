import { SAANICH_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const saanichCollector = standingBanCollector({
  authority: SAANICH_AUTHORITY,
  municipalityName: "District of Saanich",
  abmsName: "Saanich",
  description:
    "The District of Saanich does not permit open fires, including backyard burning and beach fires from May 1 through October 15 inclusive. " +
    "The only exception in parks, on beaches and on boulevards is a CSA-approved natural gas or propane device used solely for cooking; fire rings are not permitted. " +
    "Open-air burning elsewhere needs a permit from the Saanich Fire Department, granted only for religious, cultural or special events, fire department training, or ecological or conservation purposes. " +
    "BC Wildfire Service orders do not apply inside the district.",
  rulesUrl:
    "https://www.saanich.ca/EN/main/community/fire-prevention-safety/outdoor-burning.html",
  periods: [{ permission: "prohibited", annual: { start: "05-01", end: "10-15" } }],
  otherwise: "allowed",
});
