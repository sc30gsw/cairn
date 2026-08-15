import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type DayPage = FunctionReturnType<typeof api.days.get>;
export type DayRow = DayPage["rows"][number];
export type DayDoc = NonNullable<DayPage["day"]>;
