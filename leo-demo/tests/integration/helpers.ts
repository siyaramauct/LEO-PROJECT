// -----------------------------------------------------------------------------
// Integration Test Helpers
//
// Two clients talk to the local Supabase in Docker:
//   admin     the secret key, which bypasses RLS. Only for SETTING UP the data
//             a test needs; it and every seed helper live in tests/shared/
//             seed.ts, shared with the end-to-end tests, and are re-exported
//             here so integration tests import everything from "./helpers".
//   supabase  the app's own client (src/supabase-client.ts). signInAs signs it
//             in, so every service and data function then runs as that user,
//             with RLS deciding what they may see, exactly as in the browser.
//
// signInAs and signOut stay here because the app's client only loads under
// Vitest/Vite; the end-to-end tests sign in through the browser instead.
// -----------------------------------------------------------------------------

import { supabase } from "../../src/supabase-client";
import { TEST_PASSWORD, type TestUser } from "../shared/seed";

export * from "../shared/seed";

// Signs the app's client in as this user. Every call after this runs as them,
// so call it at the start of every test rather than relying on an earlier one.
export async function signInAs(user: TestUser): Promise<void> {
  // 1. Drop whoever was signed in before.
  await supabase.auth.signOut();

  // 2. Sign in as the test user.
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: TEST_PASSWORD,
  });

  if (error) {
    throw error;
  }
}

// Signs the app's client out, to act as a visitor who isn't signed in.
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
