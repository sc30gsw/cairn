import * as v from "valibot";

import { PaceDaysSchema, PaceFloorMinutesSchema } from "~/features/goals/schemas/goal-schema";

//* 「この週だけ変える」週間ゴール。ペース目標と同じ値制約を共有する。
export const WeeklySchema = v.object({
  dailyFloorMinutes: PaceFloorMinutesSchema,
  days: PaceDaysSchema,
});
