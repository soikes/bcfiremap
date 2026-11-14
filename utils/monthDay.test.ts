import { describe, expect, it } from 'bun:test';
import {
  dateToMonthDay,
  isDateInMonthDayRange,
  formatMonthDay,
  formatMonthDayRange,
  type MonthDay,
  type MonthDayRange,
} from './monthDay';

describe('dateToMonthDay', () => {
  it('formats a date in local time', () => {
    const d = new Date(2026, 4, 15); // May 15, 2026
    expect(dateToMonthDay(d)).toBe('05-15');
  });

  it('formats a date in UTC', () => {
    const d = new Date(Date.UTC(2026, 4, 15)); // May 15, 2026 UTC
    expect(dateToMonthDay(d, true)).toBe('05-15');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3); // Jan 3
    expect(dateToMonthDay(d)).toBe('01-03');
  });

  it('handles leap day', () => {
    const d = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
    expect(dateToMonthDay(d)).toBe('02-29');
  });
});

describe('isDateInMonthDayRange', () => {
  const range: MonthDayRange = { start: '05-01', end: '10-15' };

  it('returns true for a date inside the range', () => {
    const d = new Date(2026, 5, 15); // Jun 15
    expect(isDateInMonthDayRange(d, range)).toBe(true);
  });

  it('returns true for the start date (inclusive)', () => {
    const d = new Date(2026, 4, 1); // May 1
    expect(isDateInMonthDayRange(d, range)).toBe(true);
  });

  it('returns true for the end date (inclusive)', () => {
    const d = new Date(2026, 9, 15); // Oct 15
    expect(isDateInMonthDayRange(d, range)).toBe(true);
  });

  it('returns false for a date before the range', () => {
    const d = new Date(2026, 3, 30); // Apr 30
    expect(isDateInMonthDayRange(d, range)).toBe(false);
  });

  it('returns false for a date after the range', () => {
    const d = new Date(2026, 9, 16); // Oct 16
    expect(isDateInMonthDayRange(d, range)).toBe(false);
  });

  it('handles year-wrapping range (e.g., Nov 15 to Mar 31)', () => {
    const wrappingRange: MonthDayRange = { start: '11-15', end: '03-31' };
    expect(isDateInMonthDayRange(new Date(2026, 10, 15), wrappingRange)).toBe(true); // Nov 15
    expect(isDateInMonthDayRange(new Date(2026, 11, 25), wrappingRange)).toBe(true); // Dec 25
    expect(isDateInMonthDayRange(new Date(2027, 0, 1), wrappingRange)).toBe(true); // Jan 1
    expect(isDateInMonthDayRange(new Date(2027, 2, 31), wrappingRange)).toBe(true); // Mar 31
    expect(isDateInMonthDayRange(new Date(2027, 3, 1), wrappingRange)).toBe(false); // Apr 1
    expect(isDateInMonthDayRange(new Date(2026, 9, 15), wrappingRange)).toBe(false); // Oct 15
  });

  it('handles single-day range', () => {
    const singleDay: MonthDayRange = { start: '07-04', end: '07-04' };
    expect(isDateInMonthDayRange(new Date(2026, 6, 4), singleDay)).toBe(true);
    expect(isDateInMonthDayRange(new Date(2026, 6, 3), singleDay)).toBe(false);
    expect(isDateInMonthDayRange(new Date(2026, 6, 5), singleDay)).toBe(false);
  });

  it('works with UTC flag', () => {
    const range: MonthDayRange = { start: '01-01', end: '12-31' };
    // Dec 31 23:00 UTC is still Dec 31 in UTC but Jan 1 in some timezones
    const d = new Date(Date.UTC(2026, 11, 31, 23, 0));
    expect(isDateInMonthDayRange(d, range, true)).toBe(true);
  });
});

describe('formatMonthDay', () => {
  it('formats a MonthDay in en-US short style', () => {
    expect(formatMonthDay('01-01')).toBe('Jan 1');
    expect(formatMonthDay('12-31')).toBe('Dec 31');
    expect(formatMonthDay('05-15')).toBe('May 15');
  });

  it('formats a MonthDay in en-US long style', () => {
    expect(formatMonthDay('01-01', 'en-US', 'long')).toBe('January 1');
    expect(formatMonthDay('12-31', 'en-US', 'long')).toBe('December 31');
  });

  it('formats leap day correctly', () => {
    expect(formatMonthDay('02-29')).toBe('Feb 29');
  });
});

describe('formatMonthDayRange', () => {
  it('formats a standard range', () => {
    const range: MonthDayRange = { start: '05-01', end: '10-15' };
    expect(formatMonthDayRange(range)).toBe('May 1 – Oct 15');
  });

  it('formats a year-wrapping range', () => {
    const range: MonthDayRange = { start: '11-15', end: '03-31' };
    expect(formatMonthDayRange(range)).toBe('Nov 15 – Mar 31');
  });

  it('formats a single-day range', () => {
    const range: MonthDayRange = { start: '07-04', end: '07-04' };
    expect(formatMonthDayRange(range)).toBe('Jul 4');
  });

  it('formats in long style', () => {
    const range: MonthDayRange = { start: '05-01', end: '10-15' };
    expect(formatMonthDayRange(range, 'en-US', 'long')).toBe('May 1 – October 15');
  });
});