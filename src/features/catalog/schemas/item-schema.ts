import * as v from "valibot";

const itemName = v.pipe(v.string(), v.minLength(1, "学習内容名は必須です"));

export const ItemNameSchema = v.object({
  name: itemName,
});
