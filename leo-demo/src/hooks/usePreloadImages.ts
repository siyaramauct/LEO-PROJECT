import { useEffect, useState } from "react";

// Safety net so one slow or broken image can't keep a page behind its loader forever.
const IMAGE_PRELOAD_TIMEOUT_MS = 5000;

/**
 * Downloads every image in `urls` before reporting ready, so a page can reveal
 * itself fully rendered instead of having pictures pop in afterwards.
 * Pass null while the urls are still unknown (data still loading).
 * Failed images count as done — the page shows its fallback instead of waiting.
 */
export default function usePreloadImages(urls: string[] | null) {
  const key = urls ? [...new Set(urls)].join("\n") : null;
  const [preloadedKey, setPreloadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) return;

    let isCurrent = true;
    const finish = () => {
      if (isCurrent) setPreloadedKey(key);
    };

    const loads = (key ? key.split("\n") : []).map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = src;
        })
    );

    const timeout = window.setTimeout(finish, IMAGE_PRELOAD_TIMEOUT_MS);
    void Promise.all(loads).then(finish);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [key]);

  return key !== null && preloadedKey === key;
}
