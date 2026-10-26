import { describe, expect, test } from "vitest";
import { authErrorMessage, DataError, friendlyMessage } from "../../src/data/errors";

const FALLBACK = "The lesson could not be saved. Please try again.";

// What Supabase errors look like: a message, and a code or status.
const dbError = (message: string, code = "") => ({ message, code });

describe("friendlyMessage", () => {
  test("Test A - A refusal by RLS becomes a plain permission message", () => {
    const error = dbError(
      'new row violates row-level security policy for table "classrooms"',
      "42501",
    );

    expect(friendlyMessage(error, FALLBACK)).toBe(
      "You don't have permission to do that. If this seems wrong, sign out and back in.",
    );
  });

  test("Test B - It reads the original error inside a DataError", () => {
    const wrapped = new DataError("Saving failed", dbError("value too long for type", "22001"));

    expect(friendlyMessage(wrapped, FALLBACK)).toBe(
      "Some of the text is too long. Shorten it and try again.",
    );
  });

  test("Test C - No connection says so, whatever was being done", () => {
    expect(friendlyMessage(new TypeError("Failed to fetch"), FALLBACK)).toBe(
      "We couldn't reach LEO. Check your internet connection and try again.",
    );
  });

  test("Test D - Our own database messages for users are shown, reworded where needed", () => {
    expect(friendlyMessage(dbError("This classroom code is invalid", "P0001"), FALLBACK)).toBe(
      "That code doesn't match any classroom. Check it with your teacher and try again.",
    );
    expect(
      friendlyMessage(dbError("You have already joined this classroom", "P0001"), FALLBACK),
    ).toBe("You have already joined this classroom.");
  });

  test("Test E - Technical database messages fall back to the caller's message", () => {
    expect(
      friendlyMessage(dbError("completed_at cannot be in the future", "P0001"), FALLBACK),
    ).toBe(FALLBACK);
    expect(friendlyMessage(dbError("Score must be between 0 and 3", "P0001"), FALLBACK)).toBe(
      FALLBACK,
    );
  });

  test("Test F - An expired session asks the user to sign in again", () => {
    expect(friendlyMessage(dbError("JWT expired", "PGRST301"), FALLBACK)).toBe(
      "Your session has expired. Sign in again to continue.",
    );
  });

  test("Test G - Upload problems say what was wrong with the file", () => {
    expect(
      friendlyMessage(
        { message: "The object exceeded the maximum allowed size", statusCode: "413" },
        FALLBACK,
      ),
    ).toBe("That file is too large to upload.");
    expect(friendlyMessage({ message: "mime type image/heic is not supported" }, FALLBACK)).toBe(
      "That type of file can't be uploaded.",
    );
  });

  test("Test H - Anything unrecognised gets the caller's message, never the raw text", () => {
    expect(friendlyMessage(dbError('relation "lessonz" does not exist', "42P01"), FALLBACK)).toBe(
      FALLBACK,
    );
    expect(friendlyMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe("authErrorMessage", () => {
  const AUTH_FALLBACK = "Sign-in didn't work. Please try again.";

  test("Test A - Known sign-in problems get specific messages", () => {
    expect(
      authErrorMessage(dbError("Invalid login credentials", "invalid_credentials"), AUTH_FALLBACK),
    ).toBe("Incorrect email or password.");
    expect(
      authErrorMessage(dbError("User already registered", "user_already_exists"), AUTH_FALLBACK),
    ).toBe("An account with this email already exists. Sign in instead.");
    expect(
      authErrorMessage(dbError("New password should be different", "same_password"), AUTH_FALLBACK),
    ).toBe("Choose a password different from your current one.");
  });

  test("Test B - An expired session can carry page-specific advice", () => {
    const expired = dbError("Auth session missing!", "session_not_found");

    expect(authErrorMessage(expired, AUTH_FALLBACK)).toBe(
      "Your session has expired. Sign in again to continue.",
    );
    expect(authErrorMessage(expired, AUTH_FALLBACK, "This reset link has expired.")).toBe(
      "This reset link has expired.",
    );
  });

  test("Test C - No connection, and unknown problems, never show the raw text", () => {
    expect(authErrorMessage(new TypeError("Failed to fetch"), AUTH_FALLBACK)).toBe(
      "We couldn't reach LEO. Check your internet connection and try again.",
    );
    expect(
      authErrorMessage(
        dbError("Database error querying schema", "unexpected_failure"),
        AUTH_FALLBACK,
      ),
    ).toBe(AUTH_FALLBACK);
  });
});
