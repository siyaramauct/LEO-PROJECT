// -----------------------------------------------------------------------------
// Statistics
//
// Small number helpers the reports share. Percentages that are null mean
// "no score yet" and are left out of averages rather than counted as zero.
// -----------------------------------------------------------------------------

// The rounded mean, or null for an empty list.
export function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round(total / values.length);
}

// The middle value (the mean of the middle two for an even count), or null.
export function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// The higher of two percentages, where null means "no score yet".
export function bestOf(a: number | null, b: number | null) {
  if (a === null) {
    return b;
  }

  if (b === null) {
    return a;
  }

  return Math.max(a, b);
}

// Drops the nulls from a list of percentages.
export function scoredOnly(values: (number | null)[]) {
  return values.filter((value): value is number => value !== null);
}
