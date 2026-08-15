import * as v from "valibot";

export const MemoSchema = v.object({
  memo: v.string(),
});

export type MemoInput = v.InferOutput<typeof MemoSchema>;
