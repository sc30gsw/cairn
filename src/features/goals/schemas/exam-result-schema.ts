import * as v from "valibot";

import { DateJstSchema, ToeicScoreSchema } from "~/features/goals/schemas/goal-schema";

export const ExamResultSchema = v.object({
  recordedAt: DateJstSchema,
  score: ToeicScoreSchema,
});

export type ExamResultInput = v.InferOutput<typeof ExamResultSchema>;
