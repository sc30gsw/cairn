import { useEffect, useState } from "react";

import { serverNowMs } from "~/lib/server-clock";

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
