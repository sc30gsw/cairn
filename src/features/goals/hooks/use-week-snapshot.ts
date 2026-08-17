import { useEffect, useRef } from "react";
import type { DateJst } from "~domain/jst";

import { useEnsureWeekSnapshot } from "~/features/goals/hooks/goals-mutations";
import { runMutation } from "~/lib/run-mutation";

//* 目標ページを開いた週のスナップショットを用意する。冪等なので、同じ週では1回だけ呼べば足りる。
export function useWeekSnapshot(weekStartJst: DateJst) {
  const ensureWeekSnapshot = useEnsureWeekSnapshot();
  const ensuredWeekRef = useRef<null | string>(null);

  useEffect(() => {
    if (ensuredWeekRef.current === weekStartJst) {
      return;
    }
    ensuredWeekRef.current = weekStartJst;
    void runMutation(() => ensureWeekSnapshot.mutateAsync({ weekStartJst }), {
      errorMessage: "週間ゴールの用意に失敗しました",
    });
  }, [ensureWeekSnapshot, weekStartJst]);
}
