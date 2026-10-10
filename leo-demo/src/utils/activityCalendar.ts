// -----------------------------------------------------------------------------
// Activity Calendar Grid
//
// Builds the day grid behind the activity heat map (see ActivityCalendar).
// The grid shows the last 12 weeks as columns, each running Monday to Sunday,
// with the current week last.
// -----------------------------------------------------------------------------

import { toDateKey } from "./releaseDate";

export const ACTIVITY_WEEKS = 12;

export type ActivityDay = { key: string; date: Date; isFuture: boolean };

// Returns 12 weeks of 7 days each. Days after today are flagged so the
// calendar can draw them as empty.
export function buildActivityWeeks(today: Date): ActivityDay[][] {
  const todayKey = toDateKey(today);

  // Find the Monday 11 weeks before this week's Monday.
  // getDay() counts Sunday as 0, so (getDay() + 6) % 7 is days since Monday.
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (ACTIVITY_WEEKS - 1) * 7);

  // Walk forward one day at a time from that Monday.
  return Array.from({ length: ACTIVITY_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      const key = toDateKey(date);
      return { key, date, isFuture: key > todayKey };
    }),
  );
}

// Whole calendar days between two "YYYY-MM-DD" keys. Working in UTC avoids the
// 23 or 25 hour days that daylight saving creates in local time.
export function daysBetween(fromKey: string, toKey: string): number {
  const [fromYear, fromMonth, fromDay] = fromKey.split("-").map(Number);
  const [toYear, toMonth, toDay] = toKey.split("-").map(Number);
  const MS_PER_DAY = 86_400_000;

  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      MS_PER_DAY,
  );
}
