import * as v from "valibot";

export const CategorySchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "カテゴリー名は必須です")),
});

export type CategoryInput = v.InferOutput<typeof CategorySchema>;
