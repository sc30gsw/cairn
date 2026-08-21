import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type TargetProgress = FunctionReturnType<
  typeof api.queries.targets.listWithProgress.listWithProgress
>[number];
