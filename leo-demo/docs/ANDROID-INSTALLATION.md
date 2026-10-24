# Android installation warning and privacy review

## Finding

The reported Google Play Protect warning says the installed package targets an older Android version. The user confirmed that installation fails in **Samsung Internet** but succeeds in **Chrome on the same phone**. This isolates the failure to the Samsung installation path; it is not evidence that LEO needs a different website privacy policy to become installable.

Chrome packages an installed PWA into a browser-generated WebAPK. This repository is a React/Vite website: it contains no native Android project, Gradle build or AndroidManifest.xml where we could set targetSdkVersion. Adding an invented targetSdkVersion, Android version, or privacy_policy member to the web manifest would not fix the native package. Do not change the manifest identity or install scope merely to try to evade the warning.

There are matching reports in Samsung's browser support tracker. The precise native package problem still requires browser/device diagnostics; we have not inspected the APK and should not claim a confirmed target SDK value. Android installation restrictions and Play Store submission rules are different requirements.

## Safe workaround and diagnosis

1. Keep Google Play Protect enabled. Do not bypass its warning or sideload a modified APK.
2. Use current Google Chrome to open the same HTTPS LEO address directly, then choose the browser's install/Add to Home screen option. This has already worked on the affected phone.
3. Update Samsung Internet through its normal store and install available Android/Google Play system updates. Retry Samsung installation after the update; an update is not guaranteed to fix it.
4. Record the phone model, Android/One UI version, Samsung Internet version, Chrome version, exact site address, screenshot and whether the warning's More details section identifies a package. Do not include login tokens or passwords.
5. Report the issue through Samsung Internet's Contact us/feedback option. Include the same-device Chrome success and matching Samsung support report below.

iOS installation does not use an Android WebAPK, so its success does not test this Android packaging path. No website code change can guarantee that Samsung/Play Protect accepts a package generated outside our build.

## Local website hardening

`public/_headers` now supplies these headers through Cloudflare static assets:

- `Permissions-Policy` disables camera, microphone, location, payments and USB APIs. The current application uses none of these APIs. Choosing an image/PDF with a file picker and playing text aloud through speech synthesis are different capabilities and remain available. Review this restriction before adding a future recording/location/payment feature.
- `Referrer-Policy: strict-origin-when-cross-origin` prevents the page path and query string from being sent in cross-origin Referer headers. It still permits the origin to be sent and is not a blanket promise that URLs cannot appear in application or infrastructure logs.
- `X-Content-Type-Options: nosniff` prevents browsers treating response content as a different MIME type.
- Existing worker/manifest revalidation rules remain intact. The service worker still caches only static application files and public branding, not Supabase responses or signed document links.

These are website hardening measures, **not a Samsung installer fix or a certification of complete privacy compliance**. They apply after a reviewed deployment; Vite preview does not implement Cloudflare's `_headers` format. Use Wrangler's local static-asset server or the deployed HTTPS site to verify the actual response headers. No UI, authentication, database policy or production settings were changed for this fix.

## Privacy release checks still owned by the team

- Verify deployed database/storage RLS and teacher/student access using separate accounts. This review did not access production Supabase policies or private data.
- Confirm that the `documents` bucket is private and that any images in a public bucket are genuinely intended to be public. Signed download links should expire and should not be added to offline caches.
- Review session and shared-device behaviour: Supabase persists a login session, and quiz results are temporarily stored in sessionStorage. The service-worker cache restriction does not mean no personal data is stored anywhere in the browser.
- Publish an accurate privacy notice after the responsible organisation confirms its identity/contact, collected data, purposes, hosting/third-party services, retention/deletion process and any requirements for student/minor accounts. Do not invent these details or promise retention periods the system does not enforce. Review any AI processing separately.
- Verify account deletion and sign-out end to end; review telemetry/error logging and third-party font requests. Do not claim that installing a PWA collects no information beyond what the website already does.
- Revisit the existing dependency audit advisories as a separate tested upgrade. They are not proof of the cause of this installation warning.

## Sources

- [Google: WebAPKs on Android](https://web.dev/articles/webapks)
- [Google: Play Protect warning descriptions](https://support.google.com/work/android/answer/15162069?hl=en)
- [Samsung browser support: matching installation report](https://github.com/SamsungInternet/support/issues/123) (user report, not a confirmed vendor root-cause analysis)
- [Android: minimum target SDK installation restrictions](https://developer.android.com/about/versions/15/behavior-changes-all#minimum-target-api-level)
- [MDN: Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy)
- [MDN: Referrer Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [Cloudflare: static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
