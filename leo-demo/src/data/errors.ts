// -----------------------------------------------------------------------------
// Data Errors
//
// The one error type the data layer throws. Its message is safe to show to the
// user; the original Supabase error is kept as its cause for the console.
//
// Pages catch it, show error.message, and log the error itself.
//
// Raw Supabase and database messages are written for developers ("new row
// violates row-level security policy", "Failed to fetch"), so they never reach
// the user directly: friendlyMessage and authErrorMessage turn them into plain
// messages, specific where we know what went wrong, and otherwise the caller's
// "please try again" fallback.
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

// -- Turning raw errors into messages for the user ---------------------------

// Messages our own database functions and triggers raise (Postgres code
// P0001). Those written for users are shown as they are or reworded; any
// other raised message is technical and falls back to the caller's message.
const DATABASE_MESSAGES: Record<string, string> = {
  "Your role has already been set": "Your role has already been set.",
  "You must be logged in to join a classroom": "Sign in to join a classroom.",
  "Sign in to join a classroom": "Sign in to join a classroom.",
  "Sign in to submit a quiz": "Sign in to submit your quiz.",
  "Sign in to delete your account": "Sign in again to delete your account.",
  "You have already joined this classroom": "You have already joined this classroom.",
  "Only student accounts can join classrooms": "Only student accounts can join classrooms.",
  "This classroom code is invalid":
    "That code doesn't match any classroom. Check it with your teacher and try again.",
  "Invalid join code":
    "That code doesn't match any classroom. Check it with your teacher and try again.",
  "This classroom has reached its 30-student limit":
    "This classroom is full (30 students). Ask your teacher about another classroom.",
  "This classroom has reached its 50-lesson limit":
    "This classroom has reached its 50-lesson limit. Delete an old lesson to add a new one.",
  "This lesson has reached its 15-flashcard limit": "A lesson can hold at most 15 flashcards.",
  "You do not have access to this lesson": "You don't have access to this lesson.",
  "Could not find a free username, please try again":
    "We couldn't set up your username. Please try again.",
  "Classroom not found or access denied":
    "This classroom couldn't be found. It may have been deleted.",
};

type RawError = { message?: string; code?: string; status?: number; statusCode?: string | number };

function rawParts(error: unknown) {
  const raw = (error instanceof DataError ? error.cause : error) as RawError | null | undefined;

  return {
    message: typeof raw?.message === "string" ? raw.message : "",
    code: typeof raw?.code === "string" ? raw.code : "",
    status: Number(raw?.status ?? raw?.statusCode ?? 0),
  };
}

// No connection, or the request never reached Supabase.
function isNetworkFailure(message: string) {
  return (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(message)
  );
}

const OFFLINE_MESSAGE = "We couldn't reach LEO. Check your internet connection and try again.";
const SESSION_MESSAGE = "Your session has expired. Sign in again to continue.";

// A plain message for anything that went wrong talking to the database or
// storage: specific when we know the cause, otherwise the fallback, which
// should say what failed and that it's worth trying again.
export function friendlyMessage(error: unknown, fallback: string): string {
  const { message, code, status } = rawParts(error);

  if (isNetworkFailure(message)) {
    return OFFLINE_MESSAGE;
  }

  if (code === "P0001") {
    return DATABASE_MESSAGES[message] ?? fallback;
  }

  if (code === "PGRST301" || /jwt expired|invalid jwt|auth session missing/i.test(message)) {
    return SESSION_MESSAGE;
  }

  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "You don't have permission to do that. If this seems wrong, sign out and back in.";
  }

  if (code === "22001") {
    return "Some of the text is too long. Shorten it and try again.";
  }

  if (code === "23503") {
    return "Something this depends on no longer exists. Refresh the page and try again.";
  }

  if (status === 413 || /maximum allowed size|payload too large|too large/i.test(message)) {
    return "That file is too large to upload.";
  }

  if (/mime type|invalid_mime_type/i.test(message)) {
    return "That type of file can't be uploaded.";
  }

  return fallback;
}

// Supabase Auth error codes, as plain messages for the sign-in and password forms.
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed:
    "Please confirm your email first. Check your inbox for the confirmation link.",
  user_already_exists: "An account with this email already exists. Sign in instead.",
  email_exists: "An account with this email already exists. Sign in instead.",
  weak_password:
    "That password is too weak. Use at least 8 characters, mixing letters and numbers.",
  same_password: "Choose a password different from your current one.",
  current_password_mismatch: "Your current password is incorrect.",
  current_password_required: "Enter your current password.",
  email_address_invalid: "Enter a valid email address.",
  validation_failed: "Check your details and try again.",
  over_email_send_rate_limit:
    "Too many emails have been sent. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  signup_disabled: "New sign-ups are closed right now.",
  user_banned: "This account has been suspended.",
};

// A plain message for a Supabase Auth error. sessionMessage replaces the
// default when an expired session needs page-specific advice (e.g. a reset
// link that has expired).
export function authErrorMessage(
  error: unknown,
  fallback: string,
  sessionMessage = SESSION_MESSAGE,
) {
  const { message, code } = rawParts(error);

  if (isNetworkFailure(message)) {
    return OFFLINE_MESSAGE;
  }

  if (/session_not_found|session_expired|refresh_token_not_found|otp_expired/.test(code)) {
    return sessionMessage;
  }

  if (/auth session missing/i.test(message)) {
    return sessionMessage;
  }

  return AUTH_MESSAGES[code] ?? fallback;
}

// True when the failure was a unique-key clash (Postgres code 23505): the row
// being created already exists.
export function isDuplicateError(error: unknown) {
  const cause = error instanceof DataError ? error.cause : error;

  return (cause as { code?: string } | undefined)?.code === "23505";
}
