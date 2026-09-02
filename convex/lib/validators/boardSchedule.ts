import { type Infer, v } from "convex/values";

import { boardScheduleColorValidator } from "../boardScheduleColors";
import { BOARD_SCHEDULE_VIEWS } from "../boardScheduleRange";

export const boardScheduleEventDtoValidator = v.object({
  _id: v.id("boardScheduleEvents"),
  color: boardScheduleColorValidator,
  endAt: v.string(),
  rowId: v.id("rows"),
  startAt: v.string(),
  title: v.string(),
});

export const boardScheduleViewValidator = v.union(
  ...BOARD_SCHEDULE_VIEWS.map((view) => v.literal(view)),
);

export type BoardScheduleEventDto = Infer<typeof boardScheduleEventDtoValidator>;
