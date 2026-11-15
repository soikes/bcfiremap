import { LANGFORD_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

const base = {
  authority: LANGFORD_AUTHORITY,
  municipalityName: "City of Langford",
  abmsName: "Langford",
  rulesUrl: "https://langford.ca/residents/public-health-and-safety/fire-rescue/",
};

export const langfordCollector = standingBanCollector([
  {
    ...base,
    key: "campfires",
    activity: "campfire",
    otherwise: "by-permit-only",
    description:
      "The City of Langford requires a free online campfire permit (Burning Bylaw No. 1532): one per residential property per day, valid for three hours. " +
      "The fire can be no larger than 0.6 metres across, burn firewood only, be supervised by someone 16 or older, sit at least 6 metres from buildings and 3 metres from shrubs, fences and overhanging trees, and be soaked out by midnight. " +
      "Permits are not issued when the wildfire risk is extreme. " +
      "Portable CSA or ULC approved gas campfire devices with flames under 15 cm are allowed.",
  },
  {
    ...base,
    key: "open-fires",
    activity: "open-burning",
    description:
      "The City of Langford allows open burning (Burning Bylaw No. 1532) only from November 1 to 30 and from March 15 to April 15, with a permit, on residential lots of about 0.5 acres or more, and not on long weekends. " +
      "It is not permitted at other times. " +
      "Only leaves and tree trimmings may be burned, and only from sunrise to sunset.",
    periods: [
      { permission: "by-permit-only", annual: { start: "11-01", end: "11-30" } },
      { permission: "by-permit-only", annual: { start: "03-15", end: "04-15" } },
    ],
  },
]);
