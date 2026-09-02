import * as v from "valibot";

import { DateJstSchema, ToeicScoreSchema } from "~/features/goals/schemas/goal-schema";

//? 本番の結果はスコア1値と入れた日。スコアの規則は目標帯（下限・上限）と同じ
export const ExamResultSchema = v.object({
  recordedAt: DateJstSchema,
  score: ToeicScoreSchema,
});

export type ExamResultInput = v.InferOutput<typeof ExamResultSchema>;
