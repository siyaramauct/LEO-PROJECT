export function oauthErrorFromUrl() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return hash.get("error_description") || query.get("error_description") || null;
}
