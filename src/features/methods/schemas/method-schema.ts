import * as v from "valibot";

export const MethodTitleSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "方法のタイトルは必須です")),
});

export const MethodEditSchema = v.object({
  bodyText: v.string(),
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "方法のタイトルは必須です")),
});
