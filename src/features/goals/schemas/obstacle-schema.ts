import * as v from "valibot";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

export const ObstacleSchema = v.object({
  ifText: v.pipe(v.string(), v.minLength(1, "if は必須です")),
  thenText: ConcreteActionSchema,
});
