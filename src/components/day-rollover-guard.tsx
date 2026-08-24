import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { todayJst } from "~domain/jst";

//* todayJst() はレンダー中に読まれるだけなので、常駐したまま JST の日が変わると「今日」がずれる。
//? ホーム画面アプリは何日も生き続けるので頻度が上がる(docs/specs/pwa-mobile.md §12.4)。
//? タイマーでのポーリングはしない — バッテリーを食い、CVX-14 の「時計で再実行しない」思想にも反する。
export function DayRolloverGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  //? 初期化は effect 内で1度だけ。レンダーごとに todayJst() を捨てない(react-doctor)。
  const seenRef = useRef<string | null>(null);

  useEffect(() => {
    seenRef.current ??= todayJst();

    function check() {
      const now = todayJst();
      if (now === seenRef.current) {
        return;
      }
      seenRef.current = now;
      void queryClient.invalidateQueries();
      void router.invalidate();
    }
    //? standalone は「再読み込み」ではなく「復帰」で戻ってくる。pageshow は iOS のページキャッシュ復帰用。
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [queryClient, router]);

  return null;
}
