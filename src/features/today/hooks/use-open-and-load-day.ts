import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { use, useMemo } from "react";
import { todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useOpenAndLoadDay(dateJst: string) {
  const today = todayJst();
  const open = useConvexMutation(api.days.open);
  const openPromise = useMemo(
    () => open.mutateAsync({ dateJst, todayJst: today }),
    [dateJst, open, today],
  );
  use(openPromise);
  return useSuspenseQuery(convexQuery(api.days.get, { dateJst, todayJst: today }));
}
