import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type DayPage = FunctionReturnType<typeof api.queries.days.get.get>;
export type DayRow = DayPage["rows"][number];
