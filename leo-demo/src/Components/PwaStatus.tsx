import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const reloadRequested = useRef(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      // The native controllerchange listener below reloads only this consenting tab.
    },
    onRegisteredSW(_url, value) {
      registration.current = value;
    },
    onRegisterError(error) {
      console.error("LEO offline support could not start:", error);
    },
  });

  useEffect(() => {
    const checkForUpdate = () => {
      if (navigator.onLine && document.visibilityState === "visible") {
        void registration.current?.update().catch((error) => {
          console.warn("Could not check for a LEO update:", error);
        });
      }
    };
    const onOnline = () => {
      setOnline(true);
      checkForUpdate();
    };
    const onOffline = () => setOnline(false);
    const onControllerChange = () => {
      if (reloadRequested.current) window.location.reload();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", checkForUpdate);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", checkForUpdate);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    // Another tab may already have activated the waiting worker.
    if (!registration.current?.waiting) {
      window.location.reload();
      return;
    }
    reloadRequested.current = true;
    void updateServiceWorker(true);
  };

  if (online && !needRefresh) return null;

  // Keep the current page mounted: losing connectivity must not erase form input.
  return (
    <aside
      aria-label="App status"
      className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 z-[100] rounded-lg border border-purple-200 bg-white p-4 text-gray-900 shadow-lg sm:left-auto sm:w-96"
    >
      {!online ? (
        <div role="status" className="flex items-start gap-3">
          <WifiOff size={20} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">You are offline</p>
            <p className="mt-1 text-sm text-gray-600">
              Reconnect before submitting work. Changes are not saved offline.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div role="status">
              <p className="font-semibold">A LEO update is ready</p>
              <p className="mt-1 text-sm text-gray-600">
                Save your work in all LEO tabs before reloading.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss update"
              title="Update later"
              onClick={() => setNeedRefresh(false)}
              className="shrink-0 rounded p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-purple-700"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="mt-3 flex items-center gap-2 rounded-md bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
          >
            <RefreshCw size={16} aria-hidden="true" /> Reload
          </button>
        </>
      )}
    </aside>
  );
}
