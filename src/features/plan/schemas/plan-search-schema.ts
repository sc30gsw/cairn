import * as v from "valibot";
import { BOARD_SCHEDULE_VIEWS } from "~domain/boardScheduleRange";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const PlanTabSchema = v.picklist(["plan", "schedule"]);
const PlanScheduleViewSchema = v.picklist(BOARD_SCHEDULE_VIEWS);

export const PlanSearchSchema = v.object({
  calendarSync: v.optional(v.boolean()),
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  tab: v.optional(PlanTabSchema),
  view: v.optional(PlanScheduleViewSchema),
  week: v.optional(DateJstSchema),
});

export type PlanSearch = v.InferOutput<typeof PlanSearchSchema>;
export type PlanTab = v.InferOutput<typeof PlanTabSchema>;
export type PlanScheduleView = v.InferOutput<typeof PlanScheduleViewSchema>;

export const planSearchDefaults = {
  calendarSync: undefined,
  date: undefined,
  month: undefined,
  tab: "plan",
  view: undefined,
  week: undefined,
} as const satisfies PlanSearch;
