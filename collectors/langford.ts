import { LANGFORD_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

const base = {
  authority: LANGFORD_AUTHORITY,
  municipalityName: "City of Langford",
  abmsName: "Langford",
  type: "open-burning" as const,
  title: "Open burning not permitted",
  description:
    "The City of Langford allows open burning (Burning Bylaw No. 1532) only from November 1 to 30 and from March 15 to April 15, with a permit, on residential lots of about 0.5 acres or more, and not on long weekends. " +
    "It is not permitted at other times. " +
    "Campfires need a free permit and are not issued when the wildfire risk is extreme. " +
    "BC Wildfire Service orders do not apply inside the city.",
  rulesUrl: "https://langford.ca/?p=6391",
};

export const langfordCollector = standingBanCollector([
  {
    ...base,
    key: "open-burning-winter",
    annualEffectivePeriod: { start: "12-01", end: "03-14" },
  },
  {
    ...base,
    key: "open-burning-summer",
    annualEffectivePeriod: { start: "04-16", end: "10-31" },
  },
]);
