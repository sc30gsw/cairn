import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  ReviewSearchSchema,
  reviewSearchDefaults,
  type ReviewSearch,
} from "~/features/review/schemas/review-search-schema";

export const reviewSearchMiddlewares: SearchMiddleware<ReviewSearch>[] = [
  stripSearchParams(reviewSearchDefaults),
];

export { ReviewSearchSchema };
