import * as v from "valibot";

import { WeekdayFromSearchSchema } from "~/features/catalog/schemas/weekday-schema";

export const PresetSearchSchema = v.object({
  weekday: v.optional(WeekdayFromSearchSchema),
});

export type PresetSearch = v.InferOutput<typeof PresetSearchSchema>;
