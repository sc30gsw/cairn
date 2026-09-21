import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  PlanSearchSchema,
  planSearchDefaults,
  type PlanSearch,
} from "~/features/plan/schemas/plan-search-schema";

export const planSearchMiddlewares: SearchMiddleware<PlanSearch>[] = [
  stripSearchParams(planSearchDefaults),
];

export { PlanSearchSchema };
