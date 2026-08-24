import { useNetwork } from "@mantine/hooks";

//* navigator.onLine の薄いラッパー。バナー表示にだけ使い、送信判断には使わない
//? (到達不能な LAN で true を返すため。docs/specs/pwa-mobile.md §9.2 / §19-9)。
//? ラッパーを1枚挟むのは、SSR とハイドレーションの初回値を true に固定して初回描画でバナーを出さないため。
export function useOnlineStatus(): boolean {
  const { online } = useNetwork();
  return online;
}
