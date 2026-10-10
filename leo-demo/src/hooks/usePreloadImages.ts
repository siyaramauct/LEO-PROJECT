// -----------------------------------------------------------------------------
// usePreloadImages
//
// Downloads a list of images before a page reveals itself, so the page appears
// fully drawn instead of having pictures pop in one by one. Pages show their
// loading screen until this hook returns true.
//
// Pass null while the image URLs are still unknown (data still loading).
// Broken images count as finished, and a timeout stops one slow image from
// holding the whole page back.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";

const IMAGE_PRELOAD_TIMEOUT_MS = 5000;

export default function usePreloadImages(urls: string[] | null) {
  // The URL list is turned into one string so the effect re-runs only when the
  // set of images actually changes, not on every render.
  const key = urls ? [...new Set(urls)].join("\n") : null;
  const [preloadedKey, setPreloadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) return;

    // Ignore results from an older list if the URLs changed mid-download.
    let isCurrent = true;
    const finish = () => {
      if (isCurrent) setPreloadedKey(key);
    };

    // One promise per image. Success and failure both resolve.
    const loads = (key ? key.split("\n") : []).map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = src;
        }),
    );

    // Whichever comes first: every image settled, or the timeout.
    const timeout = window.setTimeout(finish, IMAGE_PRELOAD_TIMEOUT_MS);
    void Promise.all(loads).then(finish);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [key]);

  return key !== null && preloadedKey === key;
}
