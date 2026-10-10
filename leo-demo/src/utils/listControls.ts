// Shared helpers for the search + sort controls on teacher lists.

export type SortOption<T extends string> = { value: T; label: string };

// Case-insensitive match of every search word against any of the given fields,
// so "jo sm" finds "John Smith".
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}

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

export const toTime = (value: string | Date | null | undefined) =>
  value ? new Date(value).getTime() : null;
