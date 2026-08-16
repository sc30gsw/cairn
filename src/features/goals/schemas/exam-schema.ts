import * as v from "valibot";

export const ExamSchema = v.object({
  examDate: v.pipe(v.string(), v.minLength(1, "本番日を入力してください")),
  maxScore: v.pipe(v.number(), v.minValue(0, "上限は0以上で入力してください")),
  minScore: v.pipe(v.number(), v.minValue(0, "下限は0以上で入力してください")),
});
