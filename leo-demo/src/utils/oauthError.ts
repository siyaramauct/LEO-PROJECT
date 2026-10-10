// -----------------------------------------------------------------------------
// OAuth Error Reader
//
// When Google sign-in fails, Supabase redirects back with the reason in the URL
// (in the hash or the query string). The login and signup pages call this to
// show that reason to the user.
// -----------------------------------------------------------------------------

export function oauthErrorFromUrl() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return hash.get("error_description") || query.get("error_description") || null;
}
