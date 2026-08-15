import { stripSearchParams } from "@tanstack/react-router";

import {
  DaySearchSchema,
  daySearchDefaults,
} from "~/features/today/schemas/day-search-schema";

/**
 * 日画面ルート共通: Valibot 1.0+ は Standard Schema 対応のため adapter なしで validateSearch に渡せる。
 * stripSearchParams でデフォルト search を URL から除く。
 */
export const dayRouteSearch = {
  search: {
    middlewares: [stripSearchParams(daySearchDefaults)],
  },
  validateSearch: DaySearchSchema,
} as const;
