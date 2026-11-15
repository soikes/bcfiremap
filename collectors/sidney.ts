import { SIDNEY_AUTHORITY } from "../constants/authority";
import { standingBanCollector } from "./standingBan";

export const sidneyCollector = standingBanCollector({
  authority: SIDNEY_AUTHORITY,
  municipalityName: "Town of Sidney",
  abmsName: "Sidney",
  title: "Burning",
  description:
    "The Town of Sidney does not permit burning, including the burning of residential, construction site, demolition site or land-clearing waste, as well as beach fires. " +
    "Special permits for fires at community events, such as Halloween, July 1st, etc., may be issued at the discretion of the Fire Chief or Fire Prevention Officer. " +
    "The Fire Department is permitted to use controlled fires for training and demonstrations. " +
    "BC Wildfire Service orders do not apply inside the town.",
  rulesUrl:
    "https://www.sidney.ca/wp-content/uploads/2087-Fire-Dept-Fire-Regs.pdf",
  annualEffectivePeriod: { start: "01-01", end: "12-31" },
});
