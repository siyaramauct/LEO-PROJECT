// -----------------------------------------------------------------------------
// Release Dates
//
// Teachers can schedule a lesson for a later day. Days are handled as plain
// "YYYY-MM-DD" keys in the teacher's local time, which is also how they travel
// between pages in the URL (?releaseDate=2026-10-14).
//
// An empty key means "release now": the lessons.release_date column then
// falls back to its now() default.
// -----------------------------------------------------------------------------

// Date object to "YYYY-MM-DD", using local time rather than UTC.
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

// Cleans a date key from the URL or a date input.
// Returns the key only if it is a real calendar day after today, otherwise ""
// (release now).
export function parseFutureDateKey(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";

  // Rejects impossible days such as 2026-02-31, which Date would roll over.
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== value) return "";

  // Keys compare correctly as strings because they are zero-padded.
  return value >= tomorrowDateKey() ? value : "";
}

// Lessons release at midnight at the start of the chosen day, teacher's time zone.
export function releaseDateToIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toISOString();
}

// True while a lesson's release time (an ISO timestamp from the database) is
// still ahead, so students can't open it yet. Only scheduled lessons can have
// their flashcards edited or deleted; a missing date counts as released.
export function isScheduledRelease(releaseDateIso: string | null): boolean {
  if (!releaseDateIso) {
    return false;
  }

  return new Date(releaseDateIso).getTime() > Date.now();
}

// "2026-10-14" to "Wednesday, October 14".
export function formatDateKey(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
