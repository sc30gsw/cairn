import * as v from "valibot";

const itemName = v.pipe(v.string(), v.minLength(1, "学習内容名は必須です"));

export const ItemNameSchema = v.object({
  name: itemName,
});

export const ItemSchema = v.object({
  categoryId: v.pipe(v.string(), v.minLength(1, "カテゴリーは必須です")),
  name: itemName,
});
