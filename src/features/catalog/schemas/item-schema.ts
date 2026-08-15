import * as v from "valibot";

export const ItemSchema = v.object({
  categoryId: v.pipe(v.string(), v.minLength(1, "カテゴリーは必須です")),
  name: v.pipe(v.string(), v.minLength(1, "学習内容名は必須です")),
});
