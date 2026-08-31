import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { todayJst } from "~domain/jst";

export function DayRolloverGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const seenRef = useRef<string | null>(null);

  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = todayJst();
    }

    function check() {
      const now = todayJst();
      if (now === seenRef.current) {
        return;
      }
      seenRef.current = now;
      void queryClient.invalidateQueries();
      void router.invalidate();
    }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [queryClient, router]);

  return null;
}
