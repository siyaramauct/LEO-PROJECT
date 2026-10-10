import { toDateKey } from "./releaseDate";

export const ACTIVITY_WEEKS = 12;

export type ActivityDay = { key: string; date: Date; isFuture: boolean };

// Columns are Monday-to-Sunday weeks, ending with the current one.
export function buildActivityWeeks(today: Date): ActivityDay[][] {
  const todayKey = toDateKey(today);
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (ACTIVITY_WEEKS - 1) * 7);
  return Array.from({ length: ACTIVITY_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      const key = toDateKey(date);
      return { key, date, isFuture: key > todayKey };
    }),
  );
}

// Whole calendar days between two "YYYY-MM-DD" keys, ignoring daylight-saving shifts.
export function daysBetween(fromKey: string, toKey: string): number {
  const [fromYear, fromMonth, fromDay] = fromKey.split("-").map(Number);
  const [toYear, toMonth, toDay] = toKey.split("-").map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}
