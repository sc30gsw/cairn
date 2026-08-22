import type { FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";

export type TodaySummaryTarget = FunctionReturnType<
  typeof api.queries.targets.listWithProgress.listWithProgress
>[number];
