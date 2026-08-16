import * as v from "valibot";

export const ExamSchema = v.object({
  examDate: v.pipe(v.string(), v.minLength(1)),
  maxScore: v.pipe(v.number(), v.minValue(0)),
  minScore: v.pipe(v.number(), v.minValue(0)),
});

export type ExamInput = v.InferOutput<typeof ExamSchema>;
