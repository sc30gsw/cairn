import * as v from "valibot";
import { BOARD_SCHEDULE_VIEWS } from "~domain/boardScheduleRange";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const BoardTabSchema = v.picklist(["kanban", "schedule"]);
const BoardScheduleViewSchema = v.picklist(BOARD_SCHEDULE_VIEWS);

export const BoardSearchSchema = v.object({
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  tab: v.optional(BoardTabSchema),
  view: v.optional(BoardScheduleViewSchema),
  week: v.optional(DateJstSchema),
});

export type BoardSearch = v.InferOutput<typeof BoardSearchSchema>;
export type BoardTab = v.InferOutput<typeof BoardTabSchema>;
export type BoardScheduleView = v.InferOutput<typeof BoardScheduleViewSchema>;

export const boardSearchDefaults = {
  date: undefined,
  month: undefined,
  tab: "kanban",
  view: undefined,
  week: undefined,
} as const satisfies BoardSearch;
