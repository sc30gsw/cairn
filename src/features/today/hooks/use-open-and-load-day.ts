import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { use, useState } from "react";
import { todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useOpenAndLoadDay(dateJst: string) {
  const today = todayJst();
  const open = useConvexMutation(api.days.open);
  const [openPromise] = useState(() =>
    open.mutateAsync({ dateJst, todayJst: today }).then(() => undefined),
  );
  use(openPromise);
  return useSuspenseQuery(convexQuery(api.days.get, { dateJst, todayJst: today }));
}
