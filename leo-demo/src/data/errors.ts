// -----------------------------------------------------------------------------
// Data Errors
//
// The one error type the data layer throws. Its message is safe to show to the
// user; the original Supabase error is kept as its cause for the console.
//
// Pages catch it, show error.message, and log the error itself.
// -----------------------------------------------------------------------------

export class DataError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "DataError";
  }
}

// The message to show for anything a page catches: a DataError's own message,
// otherwise the fallback.
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof DataError ? error.message : fallback;
}

// True when the failure was a unique-key clash (Postgres code 23505): the row
// being created already exists.
export function isDuplicateError(error: unknown) {
  const cause = error instanceof DataError ? error.cause : error;

  return (cause as { code?: string } | undefined)?.code === "23505";
}
