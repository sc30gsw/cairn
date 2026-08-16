import * as v from "valibot";

export const ObstacleSchema = v.object({
  ifText: v.pipe(v.string(), v.minLength(1, "if は必須です")),
  thenText: v.pipe(v.string(), v.minLength(1, "then は必須です")),
});
