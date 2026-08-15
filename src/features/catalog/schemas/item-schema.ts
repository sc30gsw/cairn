import * as v from "valibot";
import { CATEGORIES } from "~domain/categories";

export const ItemSchema = v.object({
  category: v.picklist(CATEGORIES),
  name: v.pipe(v.string(), v.minLength(1, "項目名は必須です")),
});
