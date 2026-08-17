import * as v from "valibot";

import { VolumeAmountSchema } from "~/features/goals/schemas/goal-schema";

//* 達成量目標の現在量だけを動かす。目標そのものの編集とは別導線(setVolumeProgress)。
export const VolumeProgressSchema = v.object({
  currentAmount: VolumeAmountSchema,
});
