import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useOpenAndLoadDay(dateJst: string) {
  const today = todayJst();
  const open = useConvexMutation(api.days.open);
  const openDay = open.mutateAsync;
  useEffect(() => {
    void openDay({ dateJst, todayJst: today });
  }, [dateJst, openDay, today]);
  return useSuspenseQuery(convexQuery(api.days.get, { dateJst, todayJst: today }));
}
