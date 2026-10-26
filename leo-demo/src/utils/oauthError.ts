// -----------------------------------------------------------------------------
// OAuth Error Reader
//
// When Google sign-in fails, Supabase redirects back with the reason in the URL
// (in the hash or the query string). The login and home pages call this to
// show a plain message instead of that raw reason, which is written for
// developers ("Unable to exchange external code: ..."). The raw reason goes to
// the console.
// -----------------------------------------------------------------------------

export function oauthErrorFromUrl(): string | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get("error") || query.get("error");
  const description = hash.get("error_description") || query.get("error_description");

  if (!code && !description) {
    return null;
  }

  console.error("Google sign-in failed:", code, description);

  // The user closed or declined the Google consent screen.
  if (code === "access_denied") {
    return "Google sign-in was cancelled. Try again whenever you're ready.";
  }

  return "Google sign-in didn't work. Please try again, or sign in with your email and password.";
}
