import { useEffect, useState, useSyncExternalStore } from "react";

//? beforeinstallprompt は標準の TS lib に無い(Chromium 専用)。最小限だけ型に起こす。
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
  //? iOS Safari は display-mode を報告しないので navigator.standalone も見る。
  //? UA 文字列でのブラウザ判定はしない(docs/specs/pwa-mobile.md §8.3)。
  const iosStandalone = "standalone" in navigator && navigator.standalone === true;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone;
}

//? SSR とハイドレーションの初回値は「非 standalone」で揃える。
function getStandaloneServerSnapshot(): boolean {
  return false;
}

//* ホーム画面追加の状態。ナグは出さない — 自動で prompt() を呼ばず、マイページのボタンだけに置く
//? (docs/specs/pwa-mobile.md §8.3)。
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
      //? 既定のミニインフォバーは抑止し、マイページのボタンが押されたときだけ出す。
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
