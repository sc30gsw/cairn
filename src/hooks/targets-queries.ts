import { convexQuery } from "@convex-dev/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

export function targetsWithProgressQuery(weekStartJst: DateJst) {
  return convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst });
}
