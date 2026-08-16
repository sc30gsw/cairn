import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  HistorySearchSchema,
  historySearchDefaults,
  type HistorySearch,
} from "~/features/history/schemas/history-search-schema";

/**
 * 履歴ルート: Valibot で validateSearch。
 * stripSearchParams でデフォルト search を URL から除き clean `/history` にする。
 * validateSearch は createFileRoute 内に直接書く（spread だとルート型が崩れる）。
 */
export const historySearchMiddlewares: SearchMiddleware<HistorySearch>[] = [
  stripSearchParams(historySearchDefaults),
];

export { HistorySearchSchema };
