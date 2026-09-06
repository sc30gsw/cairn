import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CalendarSyncSettings = FunctionReturnType<
  typeof api.queries.calendarSync.status.status
>;
export type CalendarConnection = CalendarSyncSettings["connections"][number];
export type CalendarOutput = NonNullable<CalendarSyncSettings["output"]>;
