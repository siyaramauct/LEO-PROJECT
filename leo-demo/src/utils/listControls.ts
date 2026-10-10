// -----------------------------------------------------------------------------
// List Search and Sort
//
// Shared helpers behind every search box and sort menu (see SearchSortBar).
// Pages keep the query and sort choice in state, then filter with matchesSearch
// and order the result with the compare helpers below.
// -----------------------------------------------------------------------------

export type SortOption<T extends string> = { value: T; label: string };

// -- Search -------------------------------------------------------------------

// Word-by-word, case-insensitive search across several fields.
// Every word typed must appear somewhere, in any order, so "jo sm" finds
// "John Smith" and "smith john" does too.
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  // Split the query into lowercase words, dropping extra spaces.
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  // An empty search matches everything.
  if (!words.length) return true;

  // Join the searchable fields into one lowercase string to look inside.
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();

  return words.every((word) => haystack.includes(word));
}

// -- Sorting ------------------------------------------------------------------

// Alphabetical order that ignores case and accents, and puts "Lesson 2" before
// "Lesson 10" by reading the numbers as numbers.
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export const compareText = (a: string | null | undefined, b: string | null | undefined) =>
  collator.compare(a ?? "", b ?? "");

// Missing values always sort last, whichever direction is chosen.
export function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: "asc" | "desc",
) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

// Turns a date into a number for sorting, or null when there is no date.
export const toTime = (value: string | Date | null | undefined) =>
  value ? new Date(value).getTime() : null;
