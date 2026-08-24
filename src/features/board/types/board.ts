import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type BoardDayPage = FunctionReturnType<typeof api.queries.days.get.get>;
export type BoardRow = BoardDayPage["rows"][number];
export type BoardScheduleBlock = FunctionReturnType<
  typeof api.queries.boardSchedule.listForWeek.listForWeek
>[number];
