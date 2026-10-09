// Release dates are picked as calendar days ("YYYY-MM-DD" in the teacher's
// local time) and passed between pages in the URL. An empty value means the
// lesson is released immediately (the column defaults to now()).

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function tomorrowDateKey(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
}

// Only days after today can be scheduled; anything else falls back to "now".
export function parseFutureDateKey(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== value) return "";
  return value >= tomorrowDateKey() ? value : "";
}

// Lessons release at the start of the chosen day in the teacher's time zone.
export function releaseDateToIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toISOString();
}

export function formatDateKey(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
