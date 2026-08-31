import * as v from "valibot";

export const LaneSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "レーン名は必須です")),
});
