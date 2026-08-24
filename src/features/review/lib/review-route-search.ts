import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  ReviewSearchSchema,
  reviewSearchDefaults,
  type ReviewSearch,
} from "~/features/review/schemas/review-search-schema";

/**
 * レビュールート: Valibot で validateSearch。
 * stripSearchParams でデフォルト search を URL から除き clean `/review` にする。
 * validateSearch は createFileRoute 内に直接書く（spread だとルート型が崩れる）。
 */
export const reviewSearchMiddlewares: SearchMiddleware<ReviewSearch>[] = [
  stripSearchParams(reviewSearchDefaults),
];

export { ReviewSearchSchema };
