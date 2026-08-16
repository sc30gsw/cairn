import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useTrashList() {
  return useSuspenseQuery(convexQuery(api.queries.trash.list.list, {}));
}
