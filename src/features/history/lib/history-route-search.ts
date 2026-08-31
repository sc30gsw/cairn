import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  HistorySearchSchema,
  historySearchDefaults,
  type HistorySearch,
} from "~/features/history/schemas/history-search-schema";

export const historySearchMiddlewares: SearchMiddleware<HistorySearch>[] = [
  stripSearchParams(historySearchDefaults),
];

export { HistorySearchSchema };
