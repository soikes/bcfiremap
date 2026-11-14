type Month =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12";

type Day =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26"
  | "27"
  | "28"
  | "29"
  | "30"
  | "31";

export type MonthDay = `${Month}-${Day}`;

export interface MonthDayRange {
  start: MonthDay;
  end: MonthDay;
}

/**
 * Converts a JS Date into a MonthDay string.
 * Set `useUTC` to true if your Dates represent UTC midnight rather than local time.
 */
export function dateToMonthDay(date: Date, useUTC = false): MonthDay {
  const m = useUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const d = useUTC ? date.getUTCDate() : date.getDate();

  const mm = String(m).padStart(2, "0") as Month;
  const dd = String(d).padStart(2, "0") as Day;
  return `${mm}-${dd}`;
}

/**
 * Checks whether a JS Date falls inside an inclusive MonthDay range.
 * Supports ranges that wrap across New Year's (e.g., "12-15" to "01-10").
 */
export function isDateInMonthDayRange(
  date: Date,
  range: MonthDayRange,
  useUTC = false,
): boolean {
  const target = dateToMonthDay(date, useUTC);
  const { start, end } = range;

  // Standard same-year range (e.g., "03-01" to "05-31")
  if (start <= end) {
    return target >= start && target <= end;
  }

  // Year-wrapping range (e.g., "11-25" to "01-05")
  return target >= start || target <= end;
}

/**
 * Formats a single MonthDay into a human-readable string (e.g., "Jul 4").
 */
export function formatMonthDay(
  md: MonthDay,
  locale = "en-US",
  monthStyle: "short" | "long" = "short",
): string {
  const [month, day] = md.split("-").map(Number);
  // Use 2024 (a leap year) in UTC so "02-29" formats accurately without timezone shifts
  const proxyDate = new Date(Date.UTC(2024, month - 1, day));

  return new Intl.DateTimeFormat(locale, {
    month: monthStyle,
    day: "numeric",
    timeZone: "UTC",
  }).format(proxyDate);
}

/**
 * Prettifies a MonthDayRange into a clean string (e.g., "Dec 20 – Jan 5").
 */
export function formatMonthDayRange(
  range: MonthDayRange,
  locale = "en-US",
  monthStyle: "short" | "long" = "short",
): string {
  if (range.start === range.end) {
    return formatMonthDay(range.start, locale, monthStyle);
  }

  const startStr = formatMonthDay(range.start, locale, monthStyle);
  const endStr = formatMonthDay(range.end, locale, monthStyle);

  return `${startStr} – ${endStr}`;
}
