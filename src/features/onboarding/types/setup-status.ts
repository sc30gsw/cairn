import type { FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";

export type SetupStatus = FunctionReturnType<typeof api.queries.setup.status.status>;
