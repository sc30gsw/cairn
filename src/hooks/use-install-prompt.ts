import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getStandaloneSnapshot(): boolean {
  const iosStandalone = "standalone" in navigator && navigator.standalone === true;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone;
}

function getStandaloneServerSnapshot(): boolean {
  return false;
}

export function useInstallPrompt(): {
  canPrompt: boolean;
  promptInstall: () => void;
  standalone: boolean;
} {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot,
  );

  useEffect(() => {
    function handlePrompt(nativeEvent: Event) {
      nativeEvent.preventDefault();
      setEvent(nativeEvent as InstallPromptEvent);
    }
    function handleInstalled() {
      setEvent(null);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return {
    canPrompt: event !== null,
    promptInstall: () => {
      if (event === null) {
        return;
      }
      void event.prompt();
      setEvent(null);
    },
    standalone,
  };
}
