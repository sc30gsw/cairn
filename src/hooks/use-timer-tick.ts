import { useEffect, useState } from "react";

import { serverNowMs } from "~/lib/server-clock";

//* 計測中の行があるときだけ1秒刻みで再描画する。止まっているときは interval を張らない。
//? 毎ティックで時計を読み直す(前回値に 1000 を足さない)。間引きやスリープでずれが累積しない。
//? 背面タブの時間もそのまま学習時間に数える。visibilitychange は復帰時に表示を合わせ直すだけ
//? (docs/specs/study-timer.md §8.2)。
export function useTimerTick(active: boolean): number {
  const [nowMs, setNowMs] = useState(() => serverNowMs());

  useEffect(() => {
    if (!active) {
      return;
    }
    const sync = () => setNowMs(serverNowMs());
    sync();
    const id = window.setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [active]);

  return nowMs;
}
